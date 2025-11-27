//! ✅ P2.2: Redis-based Rate Limiting
//! 
//! Provides distributed rate limiting using Redis for persistence across server restarts
//! and multiple instances.
//! 
//! ✅ SECURITY FIX: FAIL-CLOSED behavior - rejects requests when Redis is unavailable

use bb8_redis::{bb8::Pool, RedisConnectionManager};
use bb8_redis::redis::{cmd, RedisError, pipe};
use tracing::{debug, warn, error};

/// ✅ SECURITY FIX: Custom error type for rate limiting failures
#[derive(Debug)]
pub enum RateLimitError {
    ServiceUnavailable,
    RedisError(RedisError),
}

impl std::fmt::Display for RateLimitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RateLimitError::ServiceUnavailable => write!(f, "Rate limiting service unavailable"),
            RateLimitError::RedisError(e) => write!(f, "Redis error: {}", e),
        }
    }
}

impl std::error::Error for RateLimitError {}

impl From<RedisError> for RateLimitError {
    fn from(e: RedisError) -> Self {
        RateLimitError::RedisError(e)
    }
}

/// ✅ P2.2: Check rate limit using Redis
/// 
/// Uses Redis INCR + EXPIRE pattern for distributed rate limiting:
/// - Key pattern: "rate_limit:{endpoint}:{identifier}"
/// - Returns true if within limit, false if exceeded
/// - Automatically expires after time_window seconds
/// 
/// ✅ SECURITY FIX: FAIL-CLOSED - Returns error if Redis is unavailable
pub async fn check_rate_limit(
    redis_pool: &Pool<RedisConnectionManager>,
    key: &str,
    max_requests: u32,
    time_window: u64, // in seconds
) -> Result<bool, RateLimitError> {
    let redis_key = format!("rate_limit:{}", key);
    
    // ✅ SECURITY FIX: FAIL-CLOSED - Return error if connection fails
    let mut conn = redis_pool.get().await.map_err(|e| {
        error!(error = %e, key = %redis_key, "CRITICAL: Failed to get Redis connection for rate limiting");
        warn!(key = %redis_key, "Rate limiting service unavailable - REJECTING request (fail-closed)");
        RateLimitError::ServiceUnavailable
    })?;
    
    // ✅ SECURITY FIX: Use atomic pipeline for INCR + EXPIRE
    // This ensures both operations succeed or both fail
    let (count,): (i64,) = pipe()
        .atomic()
        .cmd("INCR").arg(&redis_key)
        .cmd("EXPIRE").arg(&redis_key).arg(time_window as i64)
        .query_async(&mut *conn)
        .await
        .map_err(|e| {
            error!(error = %e, key = %redis_key, "CRITICAL: Redis command failed in rate limiting");
            warn!(key = %redis_key, "Rate limiting service error - REJECTING request (fail-closed)");
            RateLimitError::RedisError(e)
        })?;
    
    let count_u32 = count as u32;
    let within_limit = count_u32 <= max_requests;
    
    debug!(
        key = %redis_key,
        count = count_u32,
        max_requests = max_requests,
        within_limit = within_limit,
        "Rate limit check"
    );
    
    Ok(within_limit)
}

/// ✅ P2.2: Get remaining requests for a rate limit key
pub async fn get_remaining_requests(
    redis_pool: &Pool<RedisConnectionManager>,
    key: &str,
    max_requests: u32,
) -> Result<u32, RedisError> {
    let redis_key = format!("rate_limit:{}", key);
    
    let mut conn = redis_pool.get().await.map_err(|e| {
        error!(error = %e, key = %redis_key, "Failed to get Redis connection");
        RedisError::from((bb8_redis::redis::ErrorKind::IoError, "Connection failed"))
    })?;
    
    let count_result: Result<i64, RedisError> = cmd("GET")
        .arg(&redis_key)
        .query_async(&mut *conn)
        .await;
    
    let count: u32 = count_result.map(|c| c as u32).unwrap_or(0);
    Ok(max_requests.saturating_sub(count))
}

/// ✅ P2.2: Reset rate limit for a key (useful for testing/admin)
pub async fn reset_rate_limit(
    redis_pool: &Pool<RedisConnectionManager>,
    key: &str,
) -> Result<(), RedisError> {
    let redis_key = format!("rate_limit:{}", key);
    
    let mut conn = redis_pool.get().await.map_err(|e| {
        error!(error = %e, key = %redis_key, "Failed to get Redis connection");
        RedisError::from((bb8_redis::redis::ErrorKind::IoError, "Connection failed"))
    })?;
    
    let _: Result<i32, RedisError> = cmd("DEL")
        .arg(&redis_key)
        .query_async(&mut *conn)
        .await;
    
    // Ignore result - DEL always succeeds (returns 0 if key doesn't exist)
    
    debug!(key = %redis_key, "Rate limit reset");
    Ok(())
}

