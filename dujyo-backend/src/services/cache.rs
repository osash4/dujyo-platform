//! Redis Caching Service
//! 
//! Provides caching layer for frequently accessed data:
//! - User balances
//! - Content metadata
//! - Analytics data
//! - API responses

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tracing::{info, warn, error, debug};
use bb8_redis::{bb8::Pool, RedisConnectionManager};
use bb8_redis::redis::{RedisResult, cmd, RedisError};

/// Cache configuration
#[derive(Debug, Clone)]
pub struct CacheConfig {
    pub redis_url: String,
    pub default_ttl: Duration,
    pub max_connections: u32,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            redis_url: std::env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            default_ttl: Duration::from_secs(300), // 5 minutes
            max_connections: 10,
        }
    }
}

/// Cache service
pub struct CacheService {
    pool: Pool<RedisConnectionManager>,
    config: CacheConfig,
}

impl CacheService {
    /// Create new cache service
    pub async fn new(config: CacheConfig) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let manager = RedisConnectionManager::new(config.redis_url.clone())
            .map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, format!("Redis connection failed: {}", e))) as Box<dyn std::error::Error + Send + Sync>)?;
        let pool = Pool::builder()
            .max_size(config.max_connections)
            .build(manager)
            .await
            .map_err(|e| {
                error!("Failed to create Redis pool: {}", e);
                Box::new(std::io::Error::new(std::io::ErrorKind::Other, format!("Pool creation failed: {}", e))) as Box<dyn std::error::Error + Send + Sync>
            })?;
        
        info!("Redis cache service initialized");
        Ok(Self { pool, config })
    }
    
    /// Get value from cache
    pub async fn get<T>(&self, key: &str) -> Result<Option<T>, RedisError>
    where
        T: for<'de> Deserialize<'de>,
    {
        let mut conn = self.pool.get().await.map_err(|e| {
            error!("Failed to get Redis connection: {}", e);
            RedisError::from((bb8_redis::redis::ErrorKind::IoError, "Connection failed"))
        })?;
        
        let result: RedisResult<Option<String>> = cmd("GET")
            .arg(key)
            .query_async(&mut *conn)
            .await;
        
        let value: Option<String> = result?;
        
        if let Some(value_str) = value {
            match serde_json::from_str::<T>(&value_str) {
                Ok(parsed) => {
                    debug!("Cache hit for key: {}", key);
                    Ok(Some(parsed))
                }
                Err(e) => {
                    warn!("Failed to deserialize cache value for key {}: {}", key, e);
                    Ok(None)
                }
            }
        } else {
            debug!("Cache miss for key: {}", key);
            Ok(None)
        }
    }
    
    /// Set value in cache
    pub async fn set<T>(&self, key: &str, value: &T, ttl: Option<Duration>) -> Result<(), RedisError>
    where
        T: Serialize,
    {
        let mut conn = self.pool.get().await.map_err(|e| {
            error!("Failed to get Redis connection: {}", e);
            RedisError::from((bb8_redis::redis::ErrorKind::IoError, "Connection failed"))
        })?;
        
        let serialized = serde_json::to_string(value).map_err(|e| {
            error!("Failed to serialize value for cache: {}", e);
            RedisError::from((bb8_redis::redis::ErrorKind::TypeError, "Serialization failed"))
        })?;
        
        let ttl_secs = ttl.unwrap_or(self.config.default_ttl).as_secs() as usize;
        let result: RedisResult<()> = cmd("SETEX")
            .arg(key)
            .arg(ttl_secs)
            .arg(serialized)
            .query_async(&mut *conn)
            .await;
        result?;
        
        debug!("Cached value for key: {} (TTL: {}s)", key, ttl_secs);
        Ok(())
    }
    
    /// Delete value from cache
    pub async fn delete(&self, key: &str) -> Result<(), RedisError> {
        let mut conn = self.pool.get().await.map_err(|e| {
            error!("Failed to get Redis connection: {}", e);
            RedisError::from((bb8_redis::redis::ErrorKind::IoError, "Connection failed"))
        })?;
        
        let result: RedisResult<i32> = cmd("DEL")
            .arg(key)
            .query_async(&mut *conn)
            .await;
        result?;
        debug!("Deleted cache key: {}", key);
        Ok(())
    }
    
    /// Delete multiple keys matching pattern
    pub async fn delete_pattern(&self, pattern: &str) -> Result<usize, RedisError> {
        let mut conn = self.pool.get().await.map_err(|e| {
            error!("Failed to get Redis connection: {}", e);
            RedisError::from((bb8_redis::redis::ErrorKind::IoError, "Connection failed"))
        })?;
        
        let keys: RedisResult<Vec<String>> = cmd("KEYS")
            .arg(pattern)
            .query_async(&mut *conn)
            .await;
        let keys: Vec<String> = keys?;
        if keys.is_empty() {
            return Ok(0);
        }
        
        let count: RedisResult<i32> = cmd("DEL")
            .arg(keys)
            .query_async(&mut *conn)
            .await;
        let count: i32 = count?;
        debug!("Deleted {} keys matching pattern: {}", count, pattern);
        Ok(count as usize)
    }
    
    /// Check if key exists
    pub async fn exists(&self, key: &str) -> Result<bool, RedisError> {
        let mut conn = self.pool.get().await.map_err(|e| {
            error!("Failed to get Redis connection: {}", e);
            RedisError::from((bb8_redis::redis::ErrorKind::IoError, "Connection failed"))
        })?;
        
        let exists: RedisResult<bool> = cmd("EXISTS")
            .arg(key)
            .query_async(&mut *conn)
            .await;
        let exists: bool = exists?;
        Ok(exists)
    }
    
    /// Get TTL for a key
    pub async fn ttl(&self, key: &str) -> Result<Option<Duration>, RedisError> {
        let mut conn = self.pool.get().await.map_err(|e| {
            error!("Failed to get Redis connection: {}", e);
            RedisError::from((bb8_redis::redis::ErrorKind::IoError, "Connection failed"))
        })?;
        
        let ttl_secs: RedisResult<i64> = cmd("TTL")
            .arg(key)
            .query_async(&mut *conn)
            .await;
        let ttl_secs: i64 = ttl_secs?;
        if ttl_secs < 0 {
            Ok(None)
        } else {
            Ok(Some(Duration::from_secs(ttl_secs as u64)))
        }
    }
    
    /// Increment a counter
    pub async fn increment(&self, key: &str, amount: i64) -> Result<i64, RedisError> {
        let mut conn = self.pool.get().await.map_err(|e| {
            error!("Failed to get Redis connection: {}", e);
            RedisError::from((bb8_redis::redis::ErrorKind::IoError, "Connection failed"))
        })?;
        
        let result: RedisResult<i64> = cmd("INCRBY")
            .arg(key)
            .arg(amount)
            .query_async(&mut *conn)
            .await;
        let result: i64 = result?;
        Ok(result)
    }
}

/// Cache key generators
pub mod keys {
    use super::*;
    
    pub fn user_balance(user_id: &str) -> String {
        format!("balance:{}", user_id)
    }
    
    pub fn content_metadata(content_id: &str) -> String {
        format!("content:{}", content_id)
    }
    
    pub fn analytics(artist_id: &str, period: &str) -> String {
        format!("analytics:{}:{}", artist_id, period)
    }
    
    pub fn royalties(artist_id: &str, period: &str) -> String {
        format!("royalties:{}:{}", artist_id, period)
    }
    
    pub fn api_response(endpoint: &str, params: &str) -> String {
        format!("api:{}:{}", endpoint, params)
    }
}

/// Cache helper functions
impl CacheService {
    /// Cache user balance with short TTL (30 seconds)
    pub async fn cache_balance(&self, user_id: &str, balance: &u64) -> Result<(), RedisError> {
        let key = keys::user_balance(user_id);
        self.set(&key, balance, Some(Duration::from_secs(30))).await
    }
    
    /// Get cached user balance
    pub async fn get_cached_balance(&self, user_id: &str) -> Result<Option<u64>, RedisError> {
        let key = keys::user_balance(user_id);
        self.get::<u64>(&key).await
    }
    
    /// Cache content metadata with longer TTL (1 hour)
    pub async fn cache_content_metadata<T>(&self, content_id: &str, metadata: &T) -> Result<(), RedisError>
    where
        T: Serialize,
    {
        let key = keys::content_metadata(content_id);
        self.set(&key, metadata, Some(Duration::from_secs(3600))).await
    }
    
    /// Get cached content metadata
    pub async fn get_cached_content_metadata<T>(&self, content_id: &str) -> Result<Option<T>, RedisError>
    where
        T: for<'de> Deserialize<'de>,
    {
        let key = keys::content_metadata(content_id);
        self.get::<T>(&key).await
    }
    
    /// Cache analytics data with medium TTL (5 minutes)
    pub async fn cache_analytics<T>(&self, artist_id: &str, period: &str, data: &T) -> Result<(), RedisError>
    where
        T: Serialize,
    {
        let key = keys::analytics(artist_id, period);
        self.set(&key, data, Some(Duration::from_secs(300))).await
    }
    
    /// Get cached analytics data
    pub async fn get_cached_analytics<T>(&self, artist_id: &str, period: &str) -> Result<Option<T>, RedisError>
    where
        T: for<'de> Deserialize<'de>,
    {
        let key = keys::analytics(artist_id, period);
        self.get::<T>(&key).await
    }
}

