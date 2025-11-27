// Redis Caching Strategy for Dujyo
// Optimized TTL, warming, and invalidation strategies

use redis::{AsyncCommands, RedisResult};
use serde::{Serialize, Deserialize};
use std::time::Duration;
use tracing::{info, warn, error};

/// Cache TTL strategies based on data type
pub struct CacheTTL;

impl CacheTTL {
    /// Static data that rarely changes
    pub const STATIC: usize = 3600; // 1 hour
    
    /// User balances (updated frequently)
    pub const BALANCE: usize = 30; // 30 seconds
    
    /// DEX pool stats
    pub const POOL_STATS: usize = 60; // 1 minute
    
    /// User session data
    pub const SESSION: usize = 1800; // 30 minutes
    
    /// Transaction history (semi-static)
    pub const TX_HISTORY: usize = 300; // 5 minutes
    
    /// Staking positions
    pub const STAKING_POSITION: usize = 120; // 2 minutes
    
    /// Global stats (heavy query)
    pub const GLOBAL_STATS: usize = 180; // 3 minutes
    
    /// User profile
    pub const USER_PROFILE: usize = 600; // 10 minutes
    
    /// Content metadata
    pub const CONTENT_METADATA: usize = 900; // 15 minutes
}

/// Cache key prefixes for organization
pub struct CacheKeys;

impl CacheKeys {
    pub fn balance(address: &str, token: &str) -> String {
        format!("balance:{}:{}", address, token)
    }
    
    pub fn pool_stats(pool_id: &str) -> String {
        format!("pool:stats:{}", pool_id)
    }
    
    pub fn user_session(user_id: &str) -> String {
        format!("session:{}", user_id)
    }
    
    pub fn tx_history(address: &str, page: usize) -> String {
        format!("tx:history:{}:{}", address, page)
    }
    
    pub fn staking_position(address: &str) -> String {
        format!("staking:position:{}", address)
    }
    
    pub fn global_stats() -> String {
        "global:stats".to_string()
    }
    
    pub fn user_profile(user_id: &str) -> String {
        format!("user:profile:{}", user_id)
    }
    
    pub fn hot_content(content_id: &str) -> String {
        format!("content:hot:{}", content_id)
    }
}

/// Redis Cache Manager
pub struct RedisCacheManager {
    client: redis::Client,
    prefix: String,
}

impl RedisCacheManager {
    pub fn new(redis_url: &str, prefix: &str) -> RedisResult<Self> {
        let client = redis::Client::open(redis_url)?;
        Ok(Self {
            client,
            prefix: prefix.to_string(),
        })
    }
    
    /// Get connection
    async fn get_connection(&self) -> RedisResult<redis::aio::Connection> {
        self.client.get_async_connection().await
    }
    
    /// Add prefix to key
    fn prefixed_key(&self, key: &str) -> String {
        format!("{}:{}", self.prefix, key)
    }
    
    /// Get cached value
    pub async fn get<T>(&self, key: &str) -> RedisResult<Option<T>>
    where
        T: for<'de> Deserialize<'de>,
    {
        let mut con = self.get_connection().await?;
        let prefixed = self.prefixed_key(key);
        
        let value: Option<String> = con.get(&prefixed).await?;
        
        match value {
            Some(json_str) => {
                match serde_json::from_str(&json_str) {
                    Ok(data) => {
                        info!("Cache HIT: {}", key);
                        Ok(Some(data))
                    },
                    Err(e) => {
                        warn!("Cache deserialization error for {}: {}", key, e);
                        Ok(None)
                    }
                }
            },
            None => {
                info!("Cache MISS: {}", key);
                Ok(None)
            }
        }
    }
    
    /// Set cached value with TTL
    pub async fn set<T>(&self, key: &str, value: &T, ttl: usize) -> RedisResult<()>
    where
        T: Serialize,
    {
        let mut con = self.get_connection().await?;
        let prefixed = self.prefixed_key(key);
        
        let json_str = serde_json::to_string(value)
            .map_err(|e| redis::RedisError::from((redis::ErrorKind::TypeError, "Serialization error", e.to_string())))?;
        
        con.set_ex(&prefixed, json_str, ttl).await?;
        info!("Cache SET: {} (TTL: {}s)", key, ttl);
        
        Ok(())
    }
    
    /// Delete cached value
    pub async fn delete(&self, key: &str) -> RedisResult<()> {
        let mut con = self.get_connection().await?;
        let prefixed = self.prefixed_key(key);
        
        con.del(&prefixed).await?;
        info!("Cache DELETE: {}", key);
        
        Ok(())
    }
    
    /// Delete multiple keys matching pattern
    pub async fn delete_pattern(&self, pattern: &str) -> RedisResult<usize> {
        let mut con = self.get_connection().await?;
        let prefixed_pattern = self.prefixed_key(pattern);
        
        // Use SCAN for safer iteration
        let keys: Vec<String> = redis::cmd("SCAN")
            .arg("0")
            .arg("MATCH")
            .arg(&prefixed_pattern)
            .arg("COUNT")
            .arg("100")
            .query_async(&mut con)
            .await?;
        
        if !keys.is_empty() {
            con.del(&keys).await?;
            info!("Cache DELETE PATTERN: {} ({} keys)", pattern, keys.len());
            Ok(keys.len())
        } else {
            Ok(0)
        }
    }
    
    /// Increment counter
    pub async fn increment(&self, key: &str, by: i64) -> RedisResult<i64> {
        let mut con = self.get_connection().await?;
        let prefixed = self.prefixed_key(key);
        
        let new_value: i64 = con.incr(&prefixed, by).await?;
        Ok(new_value)
    }
    
    /// Check if key exists
    pub async fn exists(&self, key: &str) -> RedisResult<bool> {
        let mut con = self.get_connection().await?;
        let prefixed = self.prefixed_key(key);
        
        con.exists(&prefixed).await
    }
    
    /// Get TTL of key
    pub async fn ttl(&self, key: &str) -> RedisResult<i64> {
        let mut con = self.get_connection().await?;
        let prefixed = self.prefixed_key(key);
        
        con.ttl(&prefixed).await
    }
    
    /// Refresh TTL without changing value
    pub async fn touch(&self, key: &str, ttl: usize) -> RedisResult<()> {
        let mut con = self.get_connection().await?;
        let prefixed = self.prefixed_key(key);
        
        con.expire(&prefixed, ttl).await?;
        Ok(())
    }
}

/// Cache warming strategies
pub struct CacheWarmer {
    cache: RedisCacheManager,
}

impl CacheWarmer {
    pub fn new(cache: RedisCacheManager) -> Self {
        Self { cache }
    }
    
    /// Warm cache for frequently accessed data
    pub async fn warm_hot_data(&self) -> Result<(), String> {
        info!("Starting cache warming for hot data...");
        
        // TODO: Implement actual data fetching from database
        // For now, this is a template
        
        // 1. Warm top 100 user balances
        // 2. Warm DEX pool stats
        // 3. Warm global platform stats
        // 4. Warm popular content metadata
        
        info!("Cache warming completed");
        Ok(())
    }
    
    /// Warm cache for specific user
    pub async fn warm_user_data(&self, user_address: &str) -> Result<(), String> {
        info!("Warming cache for user: {}", user_address);
        
        // Pre-load user-specific data:
        // - Balance (DYO, DYS)
        // - Staking positions
        // - Recent transactions
        // - User profile
        
        Ok(())
    }
}

/// Cache invalidation strategies
pub struct CacheInvalidator {
    cache: RedisCacheManager,
}

impl CacheInvalidator {
    pub fn new(cache: RedisCacheManager) -> Self {
        Self { cache }
    }
    
    /// Invalidate balance cache when transaction occurs
    pub async fn invalidate_balance(&self, address: &str) -> Result<(), String> {
        let pattern = format!("balance:{}:*", address);
        self.cache.delete_pattern(&pattern).await
            .map_err(|e| format!("Failed to invalidate balance cache: {}", e))?;
        Ok(())
    }
    
    /// Invalidate pool stats when swap/liquidity changes
    pub async fn invalidate_pool(&self, pool_id: &str) -> Result<(), String> {
        let key = CacheKeys::pool_stats(pool_id);
        self.cache.delete(&key).await
            .map_err(|e| format!("Failed to invalidate pool cache: {}", e))?;
        Ok(())
    }
    
    /// Invalidate staking position when stake/unstake
    pub async fn invalidate_staking(&self, address: &str) -> Result<(), String> {
        let key = CacheKeys::staking_position(address);
        self.cache.delete(&key).await
            .map_err(|e| format!("Failed to invalidate staking cache: {}", e))?;
        
        // Also invalidate global stats
        self.cache.delete(&CacheKeys::global_stats()).await
            .map_err(|e| format!("Failed to invalidate global stats: {}", e))?;
        Ok(())
    }
    
    /// Invalidate all user-related caches
    pub async fn invalidate_user(&self, user_address: &str) -> Result<(), String> {
        // Invalidate all user data
        self.invalidate_balance(user_address).await?;
        self.invalidate_staking(user_address).await?;
        
        let profile_key = CacheKeys::user_profile(user_address);
        self.cache.delete(&profile_key).await
            .map_err(|e| format!("Failed to invalidate user profile: {}", e))?;
        
        // Invalidate transaction history
        let tx_pattern = format!("tx:history:{}:*", user_address);
        self.cache.delete_pattern(&tx_pattern).await
            .map_err(|e| format!("Failed to invalidate tx history: {}", e))?;
        
        Ok(())
    }
    
    /// Invalidate global stats
    pub async fn invalidate_global_stats(&self) -> Result<(), String> {
        self.cache.delete(&CacheKeys::global_stats()).await
            .map_err(|e| format!("Failed to invalidate global stats: {}", e))?;
        Ok(())
    }
}

/// Smart caching wrapper with automatic invalidation
pub struct SmartCache {
    pub manager: RedisCacheManager,
    pub warmer: CacheWarmer,
    pub invalidator: CacheInvalidator,
}

impl SmartCache {
    pub fn new(redis_url: &str) -> Result<Self, String> {
        let manager = RedisCacheManager::new(redis_url, "dujyo")
            .map_err(|e| format!("Failed to create Redis cache manager: {}", e))?;
        
        let warmer = CacheWarmer::new(manager.clone());
        let invalidator = CacheInvalidator::new(manager.clone());
        
        Ok(Self {
            manager,
            warmer,
            invalidator,
        })
    }
    
    /// Get or fetch pattern
    pub async fn get_or_fetch<T, F, Fut>(
        &self,
        key: &str,
        ttl: usize,
        fetch_fn: F,
    ) -> Result<T, String>
    where
        T: Serialize + for<'de> Deserialize<'de>,
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<T, String>>,
    {
        // Try cache first
        match self.manager.get::<T>(key).await {
            Ok(Some(cached)) => return Ok(cached),
            Ok(None) => {},
            Err(e) => {
                warn!("Redis error, falling back to direct fetch: {}", e);
            }
        }
        
        // Cache miss, fetch from source
        let data = fetch_fn().await?;
        
        // Cache for future requests
        if let Err(e) = self.manager.set(key, &data, ttl).await {
            warn!("Failed to cache data for key {}: {}", key, e);
        }
        
        Ok(data)
    }
}

// Clone implementation for manager (using Arc internally)
impl Clone for RedisCacheManager {
    fn clone(&self) -> Self {
        Self {
            client: self.client.clone(),
            prefix: self.prefix.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_cache_set_get() {
        // This requires a running Redis instance
        // Skip in CI if Redis is not available
        if std::env::var("REDIS_URL").is_err() {
            return;
        }
        
        let cache = RedisCacheManager::new(
            &std::env::var("REDIS_URL").unwrap(),
            "test"
        ).unwrap();
        
        let test_data = vec!["test1", "test2", "test3"];
        cache.set("test_key", &test_data, 60).await.unwrap();
        
        let retrieved: Option<Vec<String>> = cache.get("test_key").await.unwrap();
        assert_eq!(retrieved, Some(test_data.iter().map(|s| s.to_string()).collect()));
    }
}

