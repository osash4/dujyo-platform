//! Rate Limiting and Anti-Abuse System for Dujyo
//! 
//! This module provides comprehensive rate limiting and abuse prevention:
//! - Token bucket algorithm for rate limiting
//! - Sliding window implementation
//! - Redis-backed distributed counters
//! - Anti-farming detection
//! - IP and user-based limits

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error, debug};
use redis::{Client, RedisResult};
use redis::aio::ConnectionManager;
use bb8::{Pool, PooledConnection};
use bb8_redis::RedisConnectionManager;

/// Rate limiting configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub redis_url: String,
    pub max_connections: u32,
    pub window_size: Duration,
    pub max_requests_per_window: u32,
    pub max_requests_per_minute: u32,
    pub max_requests_per_hour: u32,
    pub max_requests_per_day: u32,
    pub burst_limit: u32,
    pub recovery_time: Duration,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            redis_url: "redis://:dujyo_redis_2024@localhost:6379".to_string(),
            max_connections: 10,
            window_size: Duration::from_secs(60), // 1 minute window
            max_requests_per_window: 100,         // 100 requests per minute
            max_requests_per_minute: 100,
            max_requests_per_hour: 1000,
            max_requests_per_day: 10000,
            burst_limit: 20,                      // Allow 20 requests in burst
            recovery_time: Duration::from_secs(300), // 5 minutes recovery
        }
    }
}

/// Rate limit result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitResult {
    pub allowed: bool,
    pub remaining: u32,
    pub reset_time: u64,
    pub retry_after: Option<u64>,
    pub reason: Option<String>,
}

/// Abuse detection patterns
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbusePattern {
    pub pattern_type: AbuseType,
    pub threshold: u32,
    pub window: Duration,
    pub action: AbuseAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AbuseType {
    RapidRequests,      // Too many requests in short time
    StreamFarming,      // Fake streaming patterns
    BalanceManipulation, // Suspicious balance changes
    TransactionSpam,    // Spam transactions
    LoginAttempts,      // Brute force login
    ApiAbuse,          // API endpoint abuse
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AbuseAction {
    Block,              // Block the user/IP
    Throttle,           // Throttle requests
    RequireCaptcha,     // Require CAPTCHA
    Alert,              // Send alert to admins
    Log,                // Just log the event
}

/// Rate limiter service
pub struct RateLimiter {
    redis_pool: Pool<RedisConnectionManager>,
    config: RateLimitConfig,
    abuse_patterns: Vec<AbusePattern>,
    blocked_ips: Arc<RwLock<HashMap<String, Instant>>>,
    blocked_users: Arc<RwLock<HashMap<String, Instant>>>,
}

impl RateLimiter {
    /// Create new rate limiter
    pub async fn new(config: RateLimitConfig) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        info!("🛡️ Initializing rate limiter with Redis backend");

        let redis_client = Client::open(config.redis_url.as_str())?;
        let manager = RedisConnectionManager::new(redis_client)?;
        
        let redis_pool = Pool::builder()
            .max_size(config.max_connections)
            .build(manager)
            .await?;

        // Define abuse patterns
        let abuse_patterns = vec![
            AbusePattern {
                pattern_type: AbuseType::RapidRequests,
                threshold: 200, // 200 requests
                window: Duration::from_secs(60), // in 1 minute
                action: AbuseAction::Throttle,
            },
            AbusePattern {
                pattern_type: AbuseType::StreamFarming,
                threshold: 1000, // 1000 streams
                window: Duration::from_secs(3600), // in 1 hour
                action: AbuseAction::Block,
            },
            AbusePattern {
                pattern_type: AbuseType::BalanceManipulation,
                threshold: 50, // 50 balance changes
                window: Duration::from_secs(300), // in 5 minutes
                action: AbuseAction::Alert,
            },
            AbusePattern {
                pattern_type: AbuseType::TransactionSpam,
                threshold: 100, // 100 transactions
                window: Duration::from_secs(60), // in 1 minute
                action: AbuseAction::Throttle,
            },
            AbusePattern {
                pattern_type: AbuseType::LoginAttempts,
                threshold: 10, // 10 failed attempts
                window: Duration::from_secs(300), // in 5 minutes
                action: AbuseAction::Block,
            },
        ];

        Ok(Self {
            redis_pool,
            config,
            abuse_patterns,
            blocked_ips: Arc::new(RwLock::new(HashMap::new())),
            blocked_users: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// Check rate limit for IP address
    pub async fn check_ip_rate_limit(&self, ip: &str, endpoint: &str) -> Result<RateLimitResult, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("rate_limit:ip:{}:{}", ip, endpoint);
        self.check_rate_limit(&key, self.config.max_requests_per_window).await
    }

    /// Check rate limit for user
    pub async fn check_user_rate_limit(&self, user_id: &str, endpoint: &str) -> Result<RateLimitResult, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("rate_limit:user:{}:{}", user_id, endpoint);
        self.check_rate_limit(&key, self.config.max_requests_per_window).await
    }

    /// Check rate limit for streaming operations
    pub async fn check_stream_rate_limit(&self, user_id: &str) -> Result<RateLimitResult, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("rate_limit:stream:{}", user_id);
        // Limit to 60 streams per minute (1 per second)
        self.check_rate_limit(&key, 60).await
    }

    /// Check rate limit for balance operations
    pub async fn check_balance_rate_limit(&self, user_id: &str) -> Result<RateLimitResult, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("rate_limit:balance:{}", user_id);
        // Limit to 10 balance checks per minute
        self.check_rate_limit(&key, 10).await
    }

    /// Check rate limit for transaction operations
    pub async fn check_transaction_rate_limit(&self, user_id: &str) -> Result<RateLimitResult, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("rate_limit:transaction:{}", user_id);
        // Limit to 20 transactions per minute
        self.check_rate_limit(&key, 20).await
    }

    /// Core rate limiting logic using sliding window
    async fn check_rate_limit(&self, key: &str, limit: u32) -> Result<RateLimitResult, Box<dyn std::error::Error + Send + Sync>> {
        let mut conn = self.redis_pool.get().await?;
        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
        let window_start = now - self.config.window_size.as_secs();

        // Use Redis sorted set for sliding window
        let script = r#"
            local key = KEYS[1]
            local window_start = tonumber(ARGV[1])
            local limit = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])
            
            -- Remove old entries
            redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
            
            -- Count current entries
            local current = redis.call('ZCARD', key)
            
            if current < limit then
                -- Add current request
                redis.call('ZADD', key, now, now)
                redis.call('EXPIRE', key, 3600) -- Expire after 1 hour
                return {1, limit - current - 1, now + 60}
            else
                -- Rate limit exceeded
                local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
                local retry_after = 0
                if #oldest > 0 then
                    retry_after = tonumber(oldest[2]) + 60 - now
                end
                return {0, 0, now + 60, retry_after}
            end
        "#;

        let result: RedisResult<Vec<i64>> = redis::Script::new(script)
            .key(key)
            .arg(window_start)
            .arg(limit)
            .arg(now)
            .invoke_async(&mut *conn)
            .await;

        match result {
            Ok(response) => {
                let allowed = response[0] == 1;
                let remaining = response[1] as u32;
                let reset_time = response[2] as u64;
                let retry_after = if response.len() > 3 { Some(response[3] as u64) } else { None };

                Ok(RateLimitResult {
                    allowed,
                    remaining,
                    reset_time,
                    retry_after,
                    reason: if !allowed { Some("Rate limit exceeded".to_string()) } else { None },
                })
            }
            Err(e) => {
                error!("CRITICAL: Redis rate limit check failed: {}", e);
                // ✅ SECURITY FIX: FAIL-CLOSED - reject request if rate limiting fails
                warn!("Rate limiting service unavailable - REJECTING request (fail-closed)");
                Ok(RateLimitResult {
                    allowed: false,
                    remaining: 0,
                    reset_time: now + 60,
                    retry_after: Some(60),
                    reason: Some("Rate limiting service unavailable".to_string()),
                })
            }
        }
    }

    /// Detect abuse patterns
    pub async fn detect_abuse(&self, user_id: &str, ip: &str, action: &str, metadata: Option<serde_json::Value>) -> Result<Option<AbuseAction>, Box<dyn std::error::Error + Send + Sync>> {
        debug!("🔍 Checking for abuse patterns: user={}, ip={}, action={}", user_id, ip, action);

        for pattern in &self.abuse_patterns {
            if let Some(abuse_action) = self.check_abuse_pattern(user_id, ip, action, pattern, metadata.clone()).await? {
                warn!("🚨 Abuse detected: {:?} for user {} from IP {}", pattern.pattern_type, user_id, ip);
                return Ok(Some(abuse_action));
            }
        }

        Ok(None)
    }

    /// Check specific abuse pattern
    async fn check_abuse_pattern(
        &self,
        user_id: &str,
        ip: &str,
        action: &str,
        pattern: &AbusePattern,
        metadata: Option<serde_json::Value>,
    ) -> Result<Option<AbuseAction>, Box<dyn std::error::Error + Send + Sync>> {
        let mut conn = self.redis_pool.get().await?;
        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
        let window_start = now - pattern.window.as_secs();

        let key = match pattern.pattern_type {
            AbuseType::RapidRequests => format!("abuse:requests:{}:{}", user_id, ip),
            AbuseType::StreamFarming => format!("abuse:streams:{}", user_id),
            AbuseType::BalanceManipulation => format!("abuse:balance:{}", user_id),
            AbuseType::TransactionSpam => format!("abuse:transactions:{}", user_id),
            AbuseType::LoginAttempts => format!("abuse:login:{}:{}", user_id, ip),
            AbuseType::ApiAbuse => format!("abuse:api:{}:{}", user_id, action),
        };

        // Count occurrences in window
        let count: RedisResult<i32> = redis::cmd("ZCOUNT")
            .arg(&key)
            .arg(window_start)
            .arg("+inf")
            .query_async(&mut *conn)
            .await;

        match count {
            Ok(current_count) => {
                if current_count >= pattern.threshold as i32 {
                    // Record the abuse event
                    redis::cmd("ZADD")
                        .arg(&key)
                        .arg(now)
                        .arg(format!("{}:{}", now, action))
                        .query_async::<_, ()>(&mut *conn)
                        .await?;

                    redis::cmd("EXPIRE")
                        .arg(&key)
                        .arg(pattern.window.as_secs() * 2) // Keep for 2x window
                        .query_async::<_, ()>(&mut *conn)
                        .await?;

                    return Ok(Some(pattern.action.clone()));
                }

                // Record the event
                redis::cmd("ZADD")
                    .arg(&key)
                    .arg(now)
                    .arg(format!("{}:{}", now, action))
                    .query_async::<_, ()>(&mut *conn)
                    .await?;

                redis::cmd("EXPIRE")
                    .arg(&key)
                    .arg(pattern.window.as_secs() * 2)
                    .query_async::<_, ()>(&mut *conn)
                    .await?;
            }
            Err(e) => {
                error!("Failed to check abuse pattern: {}", e);
            }
        }

        Ok(None)
    }

    /// Block IP address
    pub async fn block_ip(&self, ip: &str, duration: Duration) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut blocked_ips = self.blocked_ips.write().await;
        blocked_ips.insert(ip.to_string(), Instant::now() + duration);
        
        // Also store in Redis for persistence
        let mut conn = self.redis_pool.get().await?;
        let key = format!("blocked:ip:{}", ip);
        redis::cmd("SETEX")
            .arg(&key)
            .arg(duration.as_secs())
            .arg("blocked")
            .query_async::<_, ()>(&mut *conn)
            .await?;

        warn!("🚫 IP {} blocked for {:?}", ip, duration);
        Ok(())
    }

    /// Block user
    pub async fn block_user(&self, user_id: &str, duration: Duration) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut blocked_users = self.blocked_users.write().await;
        blocked_users.insert(user_id.to_string(), Instant::now() + duration);
        
        // Also store in Redis for persistence
        let mut conn = self.redis_pool.get().await?;
        let key = format!("blocked:user:{}", user_id);
        redis::cmd("SETEX")
            .arg(&key)
            .arg(duration.as_secs())
            .arg("blocked")
            .query_async::<_, ()>(&mut *conn)
            .await?;

        warn!("🚫 User {} blocked for {:?}", user_id, duration);
        Ok(())
    }

    /// Check if IP is blocked
    pub async fn is_ip_blocked(&self, ip: &str) -> bool {
        // Check local cache first
        {
            let blocked_ips = self.blocked_ips.read().await;
            if let Some(block_until) = blocked_ips.get(ip) {
                if *block_until > Instant::now() {
                    return true;
                }
            }
        }

        // Check Redis
        if let Ok(mut conn) = self.redis_pool.get().await {
            let key = format!("blocked:ip:{}", ip);
            let result: RedisResult<Option<String>> = redis::cmd("GET")
                .arg(&key)
                .query_async(&mut *conn)
                .await;
            
            if let Ok(Some(_)) = result {
                return true;
            }
        }

        false
    }

    /// Check if user is blocked
    pub async fn is_user_blocked(&self, user_id: &str) -> bool {
        // Check local cache first
        {
            let blocked_users = self.blocked_users.read().await;
            if let Some(block_until) = blocked_users.get(user_id) {
                if *block_until > Instant::now() {
                    return true;
                }
            }
        }

        // Check Redis
        if let Ok(mut conn) = self.redis_pool.get().await {
            let key = format!("blocked:user:{}", user_id);
            let result: RedisResult<Option<String>> = redis::cmd("GET")
                .arg(&key)
                .query_async(&mut *conn)
                .await;
            
            if let Ok(Some(_)) = result {
                return true;
            }
        }

        false
    }

    /// Get rate limit statistics
    pub async fn get_stats(&self) -> Result<RateLimitStats, Box<dyn std::error::Error + Send + Sync>> {
        let mut conn = self.redis_pool.get().await?;
        
        // Get blocked IPs count
        let blocked_ips: RedisResult<i32> = redis::cmd("KEYS")
            .arg("blocked:ip:*")
            .query_async(&mut *conn)
            .await
            .map(|keys: Vec<String>| keys.len() as i32);

        // Get blocked users count
        let blocked_users: RedisResult<i32> = redis::cmd("KEYS")
            .arg("blocked:user:*")
            .query_async(&mut *conn)
            .await
            .map(|keys: Vec<String>| keys.len() as i32);

        // Get abuse events count
        let abuse_events: RedisResult<i32> = redis::cmd("KEYS")
            .arg("abuse:*")
            .query_async(&mut *conn)
            .await
            .map(|keys: Vec<String>| keys.len() as i32);

        Ok(RateLimitStats {
            blocked_ips: blocked_ips.unwrap_or(0) as u32,
            blocked_users: blocked_users.unwrap_or(0) as u32,
            abuse_events: abuse_events.unwrap_or(0) as u32,
            active_rate_limits: 0, // TODO: Implement
        })
    }

    /// Clean up expired blocks
    pub async fn cleanup_expired_blocks(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let now = Instant::now();
        
        // Clean local cache
        {
            let mut blocked_ips = self.blocked_ips.write().await;
            blocked_ips.retain(|_, block_until| *block_until > now);
        }
        
        {
            let mut blocked_users = self.blocked_users.write().await;
            blocked_users.retain(|_, block_until| *block_until > now);
        }

        // Redis cleanup is handled by TTL
        Ok(())
    }
}

/// Rate limit statistics
#[derive(Debug, Serialize, Deserialize)]
pub struct RateLimitStats {
    pub blocked_ips: u32,
    pub blocked_users: u32,
    pub abuse_events: u32,
    pub active_rate_limits: u32,
}

/// Rate limiting middleware for Axum
pub async fn rate_limit_middleware(
    ip: String,
    user_id: Option<String>,
    endpoint: String,
    rate_limiter: Arc<RateLimiter>,
) -> Result<(), (axum::http::StatusCode, String)> {
    // Check if IP is blocked
    if rate_limiter.is_ip_blocked(&ip).await {
        return Err((axum::http::StatusCode::TOO_MANY_REQUESTS, "IP blocked".to_string()));
    }

    // Check if user is blocked
    if let Some(ref uid) = user_id {
        if rate_limiter.is_user_blocked(uid).await {
            return Err((axum::http::StatusCode::TOO_MANY_REQUESTS, "User blocked".to_string()));
        }
    }

    // Check rate limits
    let result = rate_limiter.check_ip_rate_limit(&ip, &endpoint).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !result.allowed {
        let retry_after = result.retry_after.unwrap_or(60);
        return Err((
            axum::http::StatusCode::TOO_MANY_REQUESTS,
            format!("Rate limit exceeded. Retry after {} seconds", retry_after)
        ));
    }

    // Check abuse patterns
    if let Some(abuse_action) = rate_limiter.detect_abuse(
        user_id.as_deref().unwrap_or("anonymous"),
        &ip,
        &endpoint,
        None,
    ).await.map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))? {
        
        match abuse_action {
            AbuseAction::Block => {
                if let Some(ref uid) = user_id {
                    rate_limiter.block_user(uid, Duration::from_secs(3600)).await
                        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                }
                rate_limiter.block_ip(&ip, Duration::from_secs(3600)).await
                    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                return Err((axum::http::StatusCode::TOO_MANY_REQUESTS, "Abuse detected - blocked".to_string()));
            }
            AbuseAction::Throttle => {
                return Err((axum::http::StatusCode::TOO_MANY_REQUESTS, "Abuse detected - throttled".to_string()));
            }
            AbuseAction::RequireCaptcha => {
                return Err((axum::http::StatusCode::BAD_REQUEST, "CAPTCHA required".to_string()));
            }
            AbuseAction::Alert => {
                // Log alert but allow request
                warn!("🚨 Abuse alert: user={:?}, ip={}, endpoint={}", user_id, ip, endpoint);
            }
            AbuseAction::Log => {
                // Just log
                debug!("Abuse pattern detected: user={:?}, ip={}, endpoint={}", user_id, ip, endpoint);
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio::test]
    async fn test_rate_limit_config_default() {
        let config = RateLimitConfig::default();
        assert_eq!(config.max_requests_per_window, 100);
        assert_eq!(config.window_size.as_secs(), 60);
    }

    #[tokio::test]
    async fn test_abuse_pattern_creation() {
        let pattern = AbusePattern {
            pattern_type: AbuseType::RapidRequests,
            threshold: 100,
            window: Duration::from_secs(60),
            action: AbuseAction::Block,
        };
        
        assert_eq!(pattern.threshold, 100);
    }
}
