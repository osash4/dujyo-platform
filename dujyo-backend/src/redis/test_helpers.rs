//! Test Helpers for Redis Testing
//! 
//! Provides utilities for setting up and tearing down Redis connections
//! in tests, including cleanup and health checks.

use bb8_redis::{bb8::Pool, RedisConnectionManager};
use std::time::Duration;
use tracing::{info, warn};

/// Configuration for test Redis connection
pub struct TestRedisConfig {
    pub url: String,
    pub max_connections: u32,
    pub connection_timeout: Duration,
}

impl Default for TestRedisConfig {
    fn default() -> Self {
        Self {
            url: std::env::var("TEST_REDIS_URL")
                .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string()),
            max_connections: 5,
            connection_timeout: Duration::from_secs(5),
        }
    }
}

/// Create a Redis connection pool for testing
pub async fn create_test_redis_pool(
    config: Option<TestRedisConfig>,
) -> Result<Pool<RedisConnectionManager>, String> {
    let config = config.unwrap_or_else(TestRedisConfig::default);
    
    info!(url = %config.url, "Creating test Redis pool...");
    
    let manager = RedisConnectionManager::new(config.url.clone())
        .map_err(|e| format!("Failed to create Redis connection manager: {}", e))?;
    
    let pool = Pool::builder()
        .max_size(config.max_connections)
        .connection_timeout(config.connection_timeout)
        .build(manager)
        .await
        .map_err(|e| format!("Failed to create Redis pool: {}", e))?;
    
    // Test connection
    let mut conn = pool.get().await
        .map_err(|e| format!("Failed to get Redis connection: {}", e))?;
    
    let _: String = bb8_redis::redis::cmd("PING")
        .query_async(&mut *conn)
        .await
        .map_err(|e| format!("Redis PING failed: {}", e))?;
    
    info!("✅ Test Redis pool created successfully");
    Ok(pool)
}

/// Check if Redis is available for testing
pub async fn is_redis_available(url: Option<&str>) -> bool {
    let url = url.unwrap_or("redis://127.0.0.1:6379");
    
    match RedisConnectionManager::new(url.to_string()) {
        Ok(manager) => {
            match Pool::builder()
                .max_size(1)
                .connection_timeout(Duration::from_secs(2))
                .build(manager)
                .await
            {
                Ok(pool) => {
                    match pool.get().await {
                        Ok(mut conn) => {
                            let result: Result<String, _> = bb8_redis::redis::cmd("PING")
                                .query_async(&mut *conn)
                                .await;
                            result.is_ok()
                        }
                        Err(_) => false,
                    }
                }
                Err(_) => false,
            }
        }
        Err(_) => false,
    }
}

/// Clean up test keys from Redis
pub async fn cleanup_test_keys(
    pool: &Pool<RedisConnectionManager>,
    pattern: &str,
) -> Result<u64, String> {
    let mut conn = pool.get().await
        .map_err(|e| format!("Failed to get Redis connection: {}", e))?;
    
    // Use SCAN to find keys matching pattern
    let mut cursor = 0u64;
    let mut deleted_count = 0u64;
    
    loop {
        let result: (u64, Vec<String>) = bb8_redis::redis::cmd("SCAN")
            .arg(cursor)
            .arg("MATCH")
            .arg(pattern)
            .arg("COUNT")
            .arg(100)
            .query_async(&mut *conn)
            .await
            .map_err(|e| format!("SCAN failed: {}", e))?;
        
        cursor = result.0;
        let keys = result.1;
        
        if !keys.is_empty() {
            let deleted: u64 = bb8_redis::redis::cmd("DEL")
                .arg(&keys)
                .query_async(&mut *conn)
                .await
                .map_err(|e| format!("DEL failed: {}", e))?;
            
            deleted_count += deleted;
        }
        
        if cursor == 0 {
            break;
        }
    }
    
    if deleted_count > 0 {
        info!(pattern = %pattern, count = deleted_count, "Cleaned up test keys");
    }
    
    Ok(deleted_count)
}

/// Clear all rate limit keys for testing
pub async fn clear_rate_limit_keys(
    pool: &Pool<RedisConnectionManager>,
) -> Result<u64, String> {
    cleanup_test_keys(pool, "rate_limit:*").await
}

/// Clear all test keys (for cleanup after tests)
pub async fn clear_all_test_keys(
    pool: &Pool<RedisConnectionManager>,
) -> Result<u64, String> {
    cleanup_test_keys(pool, "test:*").await
}

/// Setup Redis for testing (create pool and verify connection)
pub async fn setup_test_redis() -> Result<Pool<RedisConnectionManager>, String> {
    let pool = create_test_redis_pool(None).await?;
    
    // Clear any existing test keys
    let _ = clear_all_test_keys(&pool).await;
    
    Ok(pool)
}

/// Teardown Redis after testing (cleanup test keys)
pub async fn teardown_test_redis(
    pool: &Pool<RedisConnectionManager>,
) -> Result<(), String> {
    let deleted = clear_all_test_keys(pool).await?;
    info!(count = deleted, "Teardown: cleaned up test keys");
    Ok(())
}

/// Health check for test Redis connection
pub async fn check_test_redis_health(
    pool: &Pool<RedisConnectionManager>,
) -> bool {
    match pool.get().await {
        Ok(mut conn) => {
            let result: Result<String, _> = bb8_redis::redis::cmd("PING")
                .query_async(&mut *conn)
                .await;
            result.is_ok()
        }
        Err(e) => {
            warn!(error = %e, "Redis health check failed");
            false
        }
    }
}

/// Get Redis connection pool stats for testing
pub async fn get_redis_pool_stats(
    pool: &Pool<RedisConnectionManager>,
) -> Result<PoolStats, String> {
    // Note: bb8 doesn't expose pool stats directly
    // This is a placeholder for future implementation
    Ok(PoolStats {
        size: 0,
        idle: 0,
        active: 0,
    })
}

#[derive(Debug, Clone)]
pub struct PoolStats {
    pub size: u32,
    pub idle: u32,
    pub active: u32,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    #[ignore] // Requires Redis running
    async fn test_create_test_redis_pool() {
        let pool = create_test_redis_pool(None).await;
        assert!(pool.is_ok(), "Should create Redis pool");
    }
    
    #[tokio::test]
    #[ignore] // Requires Redis running
    async fn test_is_redis_available() {
        let available = is_redis_available(None).await;
        assert!(available, "Redis should be available");
    }
    
    #[tokio::test]
    #[ignore] // Requires Redis running
    async fn test_cleanup_test_keys() {
        let pool = create_test_redis_pool(None).await.unwrap();
        
        // Create some test keys
        let mut conn = pool.get().await.unwrap();
        let _: () = bb8_redis::redis::cmd("SET")
            .arg("test:key1")
            .arg("value1")
            .query_async(&mut *conn)
            .await
            .unwrap();
        
        let _: () = bb8_redis::redis::cmd("SET")
            .arg("test:key2")
            .arg("value2")
            .query_async(&mut *conn)
            .await
            .unwrap();
        
        // Cleanup
        let deleted = cleanup_test_keys(&pool, "test:*").await.unwrap();
        assert!(deleted >= 2, "Should delete at least 2 keys");
    }
}

