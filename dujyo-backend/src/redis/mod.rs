//! Redis Module for DUJYO Backend
//! 
//! Provides Redis connection pool and utilities for:
//! - Rate limiting (distributed)
//! - Session management
//! - Caching
//! - Real-time data

use bb8_redis::{bb8::Pool, RedisConnectionManager};
use tracing::{info, warn, error};
use std::time::Duration;

/// Redis connection pool configuration
pub struct RedisConfig {
    pub url: String,
    pub max_connections: u32,
    pub connection_timeout: Duration,
}

impl Default for RedisConfig {
    fn default() -> Self {
        Self {
            url: std::env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string()),
            max_connections: 10,
            connection_timeout: Duration::from_secs(5),
        }
    }
}

/// Create Redis connection pool
pub async fn create_redis_pool(config: Option<RedisConfig>) -> Result<Pool<RedisConnectionManager>, String> {
    let config = config.unwrap_or_else(RedisConfig::default);
    
    info!(url = %config.url, "Connecting to Redis...");
    
    let manager = RedisConnectionManager::new(config.url.clone())
        .map_err(|e| {
            error!(error = %e, url = %config.url, "Failed to create Redis connection manager");
            format!("Failed to create Redis connection manager: {}", e)
        })?;
    
    let pool = Pool::builder()
        .max_size(config.max_connections)
        .connection_timeout(config.connection_timeout)
        .build(manager)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to create Redis pool");
            format!("Failed to create Redis pool: {}", e)
        })?;
    
    // Test connection
    {
        let mut conn = pool.get().await.map_err(|e| {
            error!(error = %e, "Failed to get Redis connection for test");
            format!("Failed to get Redis connection: {}", e)
        })?;
        
        // Simple PING test
        let result: Result<String, bb8_redis::redis::RedisError> = bb8_redis::redis::cmd("PING")
            .query_async(&mut *conn)
            .await;
        
        match result {
            Ok(_) => {
                info!("✅ Redis connection pool created successfully");
            }
            Err(e) => {
                error!(error = %e, "Redis PING test failed");
                return Err(format!("Redis connection test failed: {}", e));
            }
        }
    }
    
    Ok(pool)
}

/// Health check for Redis
pub async fn check_redis_health(pool: &Pool<RedisConnectionManager>) -> bool {
    match pool.get().await {
        Ok(mut conn) => {
            let result: Result<String, bb8_redis::redis::RedisError> = bb8_redis::redis::cmd("PING")
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

#[cfg(test)]
pub mod test_helpers;

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    #[ignore] // Requires Redis instance
    async fn test_redis_connection() {
        let pool = create_redis_pool(None).await;
        assert!(pool.is_ok());
        
        if let Ok(pool) = pool {
            assert!(check_redis_health(&pool).await);
        }
    }
}

