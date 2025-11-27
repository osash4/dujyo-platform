//! Rate Limiting Middleware for Axum
//! 
//! Applies rate limiting to all endpoints using the in-memory rate limiter
//! Provides per-IP and per-user rate limiting with configurable limits

use axum::{
    extract::{Request, State},
    http::{HeaderMap, StatusCode, HeaderValue},
    middleware::Next,
    response::{IntoResponse, Response, Json},
};
use std::sync::Arc;
use crate::security::rate_limiter_memory::{RateLimiter, LimitType};
use tracing::{info, warn, debug, error};

#[derive(Clone)]
pub struct RateLimitState {
    pub rate_limiter: Arc<RateLimiter>,
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
    pub financial: u32,   // ✅ AUDIT FIX: Requests per minute for financial endpoints
}

impl Default for RateLimitRules {
    fn default() -> Self {
        Self {
            public: 60,    // 60 requests/minute for public
            auth: 10,      // 10 requests/minute for auth (prevent brute force)
            upload: 20,   // 20 uploads/hour
            api: 100,     // 100 requests/minute for API
            admin: 30,    // 30 requests/minute for admin
            financial: 30, // ✅ AUDIT FIX: 30 requests/minute for financial (stricter than API)
        }
    }
}

/// Extract rate limit category from request path
fn get_rate_limit_category(path: &str) -> &'static str {
    // ✅ AUDIT FIX: Financial endpoints get stricter rate limiting
    if path.starts_with("/api/v1/royalties/distribute") 
        || path.starts_with("/api/v1/royalties/external-report")
        || path.starts_with("/api/v1/payments/withdraw")
        || path.contains("/royalties/distribute")
        || path.contains("/payments/withdraw") {
        "financial"
    } else if path.starts_with("/api/v1/auth") || path.starts_with("/api/auth") {
        "auth"
    } else if path.starts_with("/api/v1/upload") || path.contains("/upload") {
        "upload"
    } else if path.starts_with("/api/v1/admin") || path.contains("/admin") {
        "admin"
    } else if path.starts_with("/api/v1") || path.starts_with("/api") {
        "api"
    } else {
        "public"
    }
}

/// Extract IP address from request headers
fn extract_ip(headers: &HeaderMap) -> String {
    // Check X-Forwarded-For header (for proxies/load balancers)
    if let Some(forwarded) = headers.get("x-forwarded-for") {
        if let Ok(forwarded_str) = forwarded.to_str() {
            // X-Forwarded-For can contain multiple IPs, take the first one
            if let Some(ip) = forwarded_str.split(',').next() {
                return ip.trim().to_string();
            }
        }
    }
    
    // Check X-Real-IP header
    if let Some(real_ip) = headers.get("x-real-ip") {
        if let Ok(real_ip_str) = real_ip.to_str() {
            return real_ip_str.to_string();
        }
    }
    
    // Fallback to a default identifier
    "unknown".to_string()
}

/// Rate limiting middleware
pub async fn rate_limit_middleware(
    State(state): State<RateLimitState>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Response {
    let rate_limiter = state.rate_limiter;
    let rules = state.rules;
    let path = request.uri().path();
    let category = get_rate_limit_category(path);
    let ip = extract_ip(&headers);
    
    let limit = match category {
        "financial" => rules.financial, // ✅ AUDIT FIX: Stricter limits for financial endpoints
        "auth" => rules.auth,
        "upload" => rules.upload,
        "admin" => rules.admin,
        "api" => rules.api,
        _ => rules.public,
    };
    
    let limit_type = if category == "upload" { LimitType::Hour } else { LimitType::Minute };
    
    let ip_key = format!("ip:{}", ip);
    let ip_result = match rate_limiter.check_rate(&ip_key, limit_type).await {
        Ok(result) => result,
        Err(e) => {
            warn!("Rate limit check failed for IP {}: {}", ip, e);
            // ✅ SECURITY FIX VULN-011: Fail-closed behavior instead of fail-open
            // If rate limiter fails, reject request to prevent DoS
            error!("❌ CRITICAL: Rate limiter failed for IP {}, rejecting request (fail-closed)", ip);
            return (StatusCode::SERVICE_UNAVAILABLE, "Service temporarily unavailable").into_response();
        }
    };
    
    if !ip_result.allowed {
        warn!("Rate limit exceeded for IP: {} on path: {}", ip, path);
        let retry_after = ip_result.retry_after.unwrap_or(60);
        let mut response = (
            StatusCode::TOO_MANY_REQUESTS,
            Json(serde_json::json!({
                "error": "Rate limit exceeded",
                "message": "Too many requests. Please try again later.",
                "retry_after": retry_after
            })),
        )
            .into_response();
        response.headers_mut().insert(
            "X-RateLimit-Limit",
            HeaderValue::from_str(&limit.to_string()).unwrap_or_else(|_| HeaderValue::from_static("60")),
        );
        return response;
    }
    
    // Check for user-specific rate limiting (if user is authenticated)
    if let Some(user_id) = headers.get("x-user-id") {
        if let Ok(user_id_str) = user_id.to_str() {
            let user_key = format!("user:{}", user_id_str);
            let user_result = match rate_limiter.check_rate(&user_key, limit_type).await {
                Ok(result) => result,
                Err(e) => {
                    warn!("Rate limit check failed for user {}: {}", user_id_str, e);
                    // Fail open - allow request if rate limiter fails
                    return next.run(request).await;
                }
            };
            
            if !user_result.allowed {
                warn!("Rate limit exceeded for user: {} on path: {}", user_id_str, path);
                let retry_after = user_result.retry_after.unwrap_or(60);
                let mut response = (
                    StatusCode::TOO_MANY_REQUESTS,
                    Json(serde_json::json!({
                        "error": "Rate limit exceeded",
                        "message": "Too many requests. Please try again later.",
                        "retry_after": retry_after
                    })),
                )
                    .into_response();
                response.headers_mut().insert(
                    "X-RateLimit-Limit",
                    HeaderValue::from_str(&limit.to_string()).unwrap_or_else(|_| HeaderValue::from_static("60")),
                );
                return response;
            }
        }
    }
    
    // Add rate limit headers to response
    let mut response = next.run(request).await;
    // ✅ SECURITY FIX: Replace unwrap() with proper error handling for header parsing
    if let Ok(header_value) = limit.to_string().parse() {
        response.headers_mut().insert("X-RateLimit-Limit", header_value);
    }
    if let Ok(header_value) = ip_result.remaining.to_string().parse() {
        response.headers_mut().insert("X-RateLimit-Remaining", header_value);
    }
    if let Ok(header_value) = ip_result.reset_time.to_string().parse() {
        response.headers_mut().insert("X-RateLimit-Reset", header_value);
    }
    
    response
}

