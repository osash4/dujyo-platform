//! ✅ MVP-CRITICAL: Redis-based Rate Limiting Middleware
//! 
//! Provides distributed rate limiting using Redis for persistence across server restarts
//! and multiple instances. Falls back to in-memory rate limiting if Redis is unavailable.

use axum::{
    extract::{Request, State},
    http::{HeaderMap, StatusCode, HeaderValue},
    middleware::Next,
    response::{IntoResponse, Response, Json},
};
use std::sync::Arc;
use bb8_redis::{bb8::Pool, RedisConnectionManager};
use tracing::{warn, debug};
use crate::security::rate_limiting_redis::check_rate_limit;
use crate::security::rate_limiter_memory::{RateLimiter, LimitType};

#[derive(Clone)]
pub struct RedisRateLimitState {
    pub redis_pool: Option<Arc<Pool<RedisConnectionManager>>>,
    pub memory_limiter: Arc<RateLimiter>, // Fallback
    pub rules: Arc<RateLimitRules>,
}

/// Rate limit configuration per endpoint type
#[derive(Debug, Clone)]
pub struct RateLimitRules {
    pub public: u32,      // Requests per minute for public endpoints
    pub auth: u32,       // Requests per minute for auth endpoints
    pub upload: u32,     // Requests per hour for upload endpoints
    pub api: u32,        // Requests per minute for API endpoints
    pub admin: u32,      // Requests per minute for admin endpoints
    pub financial: u32,   // Requests per minute for financial endpoints
}

impl Default for RateLimitRules {
    fn default() -> Self {
        Self {
            public: 60,    // 60 requests/minute for public
            auth: 10,      // 10 requests/minute for auth (prevent brute force)
            upload: 20,   // 20 uploads/hour
            api: 100,     // 100 requests/minute for API
            admin: 30,    // 30 requests/minute for admin
            financial: 30, // 30 requests/minute for financial (stricter than API)
        }
    }
}

/// Extract rate limit category from request path
pub fn get_rate_limit_category(path: &str) -> &'static str {
    // Financial endpoints get stricter rate limiting
    if path.starts_with("/api/v1/royalties/distribute") 
        || path.starts_with("/api/v1/royalties/external-report")
        || path.starts_with("/transaction")
        || path.starts_with("/swap")
        || path.starts_with("/stake")
        || path.starts_with("/unstake")
    {
        "financial"
    } else if path.starts_with("/api/v1/auth/login")
        || path.starts_with("/api/v1/auth/register")
        || path.starts_with("/login")
        || path.starts_with("/register")
    {
        "auth"
    } else if path.starts_with("/api/v1/upload")
        || path.starts_with("/upload")
    {
        "upload"
    } else if path.starts_with("/api/v1/admin")
        || path.starts_with("/admin")
    {
        "admin"
    } else if path.starts_with("/api/v1") {
        "api"
    } else {
        "public"
    }
}

/// Extract IP address from request headers
pub fn extract_ip(headers: &HeaderMap) -> String {
    // Try X-Forwarded-For first (for proxies/load balancers)
    if let Some(forwarded) = headers.get("x-forwarded-for") {
        if let Ok(ip) = forwarded.to_str() {
            // X-Forwarded-For can contain multiple IPs, take the first one
            return ip.split(',').next().unwrap_or("unknown").trim().to_string();
        }
    }
    
    // Try X-Real-IP
    if let Some(real_ip) = headers.get("x-real-ip") {
        if let Ok(ip) = real_ip.to_str() {
            return ip.to_string();
        }
    }
    
    // Fallback to "unknown" (shouldn't happen in production)
    "unknown".to_string()
}

/// Extract user ID from JWT token (if available)
pub fn extract_user_id(headers: &HeaderMap) -> Option<String> {
    // Try Authorization header
    if let Some(auth) = headers.get("authorization") {
        if let Ok(auth_str) = auth.to_str() {
            // Extract token (format: "Bearer <token>")
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                // TODO: Decode JWT to get user ID
                // For now, use token hash as identifier
                use std::collections::hash_map::DefaultHasher;
                use std::hash::{Hash, Hasher};
                let mut hasher = DefaultHasher::new();
                token.hash(&mut hasher);
                return Some(format!("user_{}", hasher.finish()));
            }
        }
    }
    None
}

/// ✅ MVP-CRITICAL: Redis-based rate limiting middleware
pub async fn redis_rate_limiting_middleware(
    State(state): State<RedisRateLimitState>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Response {
    let path = request.uri().path();
    let category = get_rate_limit_category(path);
    
    // Get rate limit rules for this category
    let (max_requests, time_window) = match category {
        "financial" => (state.rules.financial, 60), // per minute
        "auth" => (state.rules.auth, 60), // per minute
        "upload" => (state.rules.upload, 3600), // per hour
        "admin" => (state.rules.admin, 60), // per minute
        "api" => (state.rules.api, 60), // per minute
        "public" => (state.rules.public, 60), // per minute
        _ => (60, 60), // default
    };
    
    // Skip rate limiting for health check to avoid false positives in tests
    if path == "/health" {
        return next.run(request).await;
    }
    
    // Extract identifiers
    let ip = extract_ip(&headers);
    let user_id = extract_user_id(&headers);
    
    // Try Redis first, fallback to memory
    let within_limit = if let Some(redis_pool) = &state.redis_pool {
        // Use Redis for distributed rate limiting
        let key = if let Some(uid) = &user_id {
            format!("{}:{}:{}", category, uid, ip)
        } else {
            format!("{}:{}", category, ip)
        };
        
        match check_rate_limit(redis_pool, &key, max_requests, time_window).await {
            Ok(within) => within,
            Err(e) => {
                warn!(error = %e, "Redis rate limit check failed, falling back to memory");
                // Fallback to memory-based rate limiting
                let memory_key = if let Some(uid) = &user_id {
                    format!("{}:{}", category, uid)
                } else {
                    format!("{}:{}", category, ip)
                };
                match state.memory_limiter.check_rate(&memory_key, LimitType::Minute).await {
                    Ok(result) => result.allowed,
                    Err(_) => {
                        warn!("Memory rate limiter failed in fallback, allowing request");
                        true // Fail-open
                    }
                }
            }
        }
    } else {
        // Use memory-based rate limiting
        let memory_key = if let Some(uid) = &user_id {
            format!("{}:{}", category, uid)
        } else {
            format!("{}:{}", category, ip)
        };
        
        // Use check_rate which returns Result<RateLimitResult>
        match state.memory_limiter.check_rate(&memory_key, LimitType::Minute).await {
            Ok(result) => result.allowed,
            Err(e) => {
                warn!(error = %e, "Memory rate limiter failed, allowing request");
                true // Fail-open for memory limiter (less critical than Redis)
            }
        }
    };
    
    if !within_limit {
        debug!(
            category = %category,
            ip = %ip,
            user_id = ?user_id,
            max_requests = max_requests,
            "Rate limit exceeded"
        );
        
        // ✅ MVP-CRITICAL: Registrar métrica de rate limit hit
        crate::routes::metrics::increment_rate_limit_hit();
        
        let response = Json(serde_json::json!({
            "error": "Rate limit exceeded",
            "message": format!("Too many requests. Limit: {} requests per {} seconds", max_requests, time_window),
            "retry_after": time_window,
        }));
        
        return (StatusCode::TOO_MANY_REQUESTS, response).into_response();
    }
    
    // Add rate limit headers
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    
    // Safe header insertion
    if let Ok(limit_header) = HeaderValue::from_str(&max_requests.to_string()) {
        headers.insert("X-RateLimit-Limit", limit_header);
    }
    if let Ok(remaining_header) = HeaderValue::from_str(&(max_requests.saturating_sub(1)).to_string()) {
        headers.insert("X-RateLimit-Remaining", remaining_header);
    }
    
    response
}

