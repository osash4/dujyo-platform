//! Redis Cache Layer for Dujyo Database Optimization
//! 
//! This module provides high-performance caching for frequently accessed data:
//! - User balances (TTL: 30 seconds)
//! - Content metadata (TTL: 5 minutes)
//! - DEX pool information (TTL: 10 seconds)
//! - Transaction history (TTL: 1 minute)
//! - Blockchain stats (TTL: 30 seconds)

use redis::{Client, ConnectionManager, RedisResult};
use bb8::{Pool, PooledConnection};
use bb8_redis::{RedisConnectionManager, RedisConnectionManagerError};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::{info, warn, error, debug};
use crate::blockchain::real_blockchain::TokenBalance;

/// Cache configuration with TTL settings
#[derive(Debug, Clone)]
pub struct CacheConfig {
    pub redis_url: String,
    pub max_connections: u32,
    pub min_connections: u32,
    pub connection_timeout: Duration,
    pub command_timeout: Duration,
    pub ttl_balances: Duration,
    pub ttl_content: Duration,
    pub ttl_dex_pools: Duration,
    pub ttl_transactions: Duration,
    pub ttl_blockchain_stats: Duration,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            redis_url: "redis://localhost:6379".to_string(),
            max_connections: 20,
            min_connections: 5,
            connection_timeout: Duration::from_secs(5),
            command_timeout: Duration::from_secs(3),
            ttl_balances: Duration::from_secs(30),
            ttl_content: Duration::from_secs(300), // 5 minutes
            ttl_dex_pools: Duration::from_secs(10),
            ttl_transactions: Duration::from_secs(60),
            ttl_blockchain_stats: Duration::from_secs(30),
        }
    }
}

/// Cache key prefixes for different data types
pub mod cache_keys {
    pub const BALANCE_PREFIX: &str = "balance:";
    pub const TOKEN_BALANCE_PREFIX: &str = "token_balance:";
    pub const CONTENT_PREFIX: &str = "content:";
    pub const DEX_POOL_PREFIX: &str = "dex_pool:";
    pub const TRANSACTION_PREFIX: &str = "tx:";
    pub const BLOCKCHAIN_STATS_PREFIX: &str = "blockchain_stats";
    pub const USER_ACTIVITY_PREFIX: &str = "user_activity:";
}

/// Cached balance data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedBalance {
    pub address: String,
    pub balance: u64,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Cached token balance data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedTokenBalance {
    pub address: String,
    pub dyo: f64,
    pub dys: f64,
    pub staked: f64,
    pub total: f64,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Cached content metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedContent {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub genre: String,
    pub duration: u64,
    pub play_count: u64,
    pub last_played: Option<chrono::DateTime<chrono::Utc>>,
}

/// Cached DEX pool information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedDexPool {
    pub pool_id: String,
    pub token_a: String,
    pub token_b: String,
    pub reserve_a: f64,
    pub reserve_b: f64,
    pub total_liquidity: f64,
    pub price_impact: f64,
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

/// Cached blockchain statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedBlockchainStats {
    pub total_blocks: u64,
    pub total_transactions: u64,
    pub pending_transactions: u64,
    pub total_addresses: u64,
    pub total_supply: u64,
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

/// Redis cache service with connection pooling
pub struct CacheService {
    pool: Pool<RedisConnectionManager>,
    config: CacheConfig,
}

impl CacheService {
    /// Create new cache service with configuration
    pub async fn new(config: CacheConfig) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        info!("🔗 Initializing Redis cache service: {}", config.redis_url);
        
        let redis_client = Client::open(config.redis_url.as_str())?;
        let manager = RedisConnectionManager::new(redis_client)?;
        
        let pool = Pool::builder()
            .max_size(config.max_connections)
            .min_idle(Some(config.min_connections))
            .connection_timeout(config.connection_timeout)
            .build(manager)
            .await?;

        info!("✅ Redis cache service initialized with {} max connections", config.max_connections);
        
        Ok(Self { pool, config })
    }

    /// Get connection from pool
    async fn get_connection(&self) -> Result<PooledConnection<RedisConnectionManager>, Box<dyn std::error::Error + Send + Sync>> {
        self.pool.get().await.map_err(|e| e.into())
    }

    /// Generic cache get operation
    async fn get<T>(&self, key: &str) -> Result<Option<T>, Box<dyn std::error::Error + Send + Sync>>
    where
        T: for<'de> Deserialize<'de>,
    {
        let mut conn = self.get_connection().await?;
        let result: RedisResult<Option<String>> = redis::cmd("GET")
            .arg(key)
            .query_async(&mut *conn)
            .await;

        match result {
            Ok(Some(data)) => {
                let parsed: T = serde_json::from_str(&data)?;
                debug!("📖 Cache HIT for key: {}", key);
                Ok(Some(parsed))
            }
            Ok(None) => {
                debug!("📭 Cache MISS for key: {}", key);
                Ok(None)
            }
            Err(e) => {
                error!("❌ Cache GET error for key {}: {}", key, e);
                Err(e.into())
            }
        }
    }

    /// Generic cache set operation with TTL
    async fn set<T>(&self, key: &str, value: &T, ttl: Duration) -> Result<(), Box<dyn std::error::Error + Send + Sync>>
    where
        T: Serialize,
    {
        let mut conn = self.get_connection().await?;
        let serialized = serde_json::to_string(value)?;
        
        let result: RedisResult<()> = redis::cmd("SETEX")
            .arg(key)
            .arg(ttl.as_secs())
            .arg(serialized)
            .query_async(&mut *conn)
            .await;

        match result {
            Ok(_) => {
                debug!("💾 Cache SET for key: {} (TTL: {}s)", key, ttl.as_secs());
                Ok(())
            }
            Err(e) => {
                error!("❌ Cache SET error for key {}: {}", key, e);
                Err(e.into())
            }
        }
    }

    /// Delete cache entry
    async fn delete(&self, key: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut conn = self.get_connection().await?;
        let result: RedisResult<i32> = redis::cmd("DEL")
            .arg(key)
            .query_async(&mut *conn)
            .await;

        match result {
            Ok(deleted_count) => {
                if deleted_count > 0 {
                    debug!("🗑️ Cache DELETE for key: {}", key);
                }
                Ok(())
            }
            Err(e) => {
                error!("❌ Cache DELETE error for key {}: {}", key, e);
                Err(e.into())
            }
        }
    }

    /// Invalidate cache pattern (for related data)
    async fn invalidate_pattern(&self, pattern: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut conn = self.get_connection().await?;
        let keys: RedisResult<Vec<String>> = redis::cmd("KEYS")
            .arg(pattern)
            .query_async(&mut *conn)
            .await;

        match keys {
            Ok(keys_to_delete) => {
                if !keys_to_delete.is_empty() {
                    let result: RedisResult<i32> = redis::cmd("DEL")
                        .arg(&keys_to_delete)
                        .query_async(&mut *conn)
                        .await;
                    
                    match result {
                        Ok(deleted_count) => {
                            info!("🗑️ Cache pattern invalidation: {} keys deleted for pattern: {}", deleted_count, pattern);
                        }
                        Err(e) => {
                            error!("❌ Cache pattern invalidation error: {}", e);
                        }
                    }
                }
                Ok(())
            }
            Err(e) => {
                error!("❌ Cache KEYS error for pattern {}: {}", pattern, e);
                Err(e.into())
            }
        }
    }

    // ===== BALANCE CACHING METHODS =====

    /// Get cached user balance
    pub async fn get_balance(&self, address: &str) -> Result<Option<u64>, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("{}{}", cache_keys::BALANCE_PREFIX, address);
        let cached: Option<CachedBalance> = self.get(&key).await?;
        
        Ok(cached.map(|c| c.balance))
    }

    /// Cache user balance
    pub async fn set_balance(&self, address: &str, balance: u64) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("{}{}", cache_keys::BALANCE_PREFIX, address);
        let cached = CachedBalance {
            address: address.to_string(),
            balance,
            updated_at: chrono::Utc::now(),
        };
        
        self.set(&key, &cached, self.config.ttl_balances).await
    }

    /// Get cached token balance
    pub async fn get_token_balance(&self, address: &str) -> Result<Option<TokenBalance>, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("{}{}", cache_keys::TOKEN_BALANCE_PREFIX, address);
        let cached: Option<CachedTokenBalance> = self.get(&key).await?;
        
        Ok(cached.map(|c| TokenBalance {
            dyo: c.dyo,
            dys: c.dys,
            staked: c.staked,
            total: c.total,
        }))
    }

    /// Cache token balance
    pub async fn set_token_balance(&self, address: &str, balance: &TokenBalance) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("{}{}", cache_keys::TOKEN_BALANCE_PREFIX, address);
        let cached = CachedTokenBalance {
            address: address.to_string(),
            dyo: balance.dyo,
            dys: balance.dys,
            staked: balance.staked,
            total: balance.total,
            updated_at: chrono::Utc::now(),
        };
        
        self.set(&key, &cached, self.config.ttl_balances).await
    }

    /// Invalidate balance cache for address
    pub async fn invalidate_balance(&self, address: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let balance_key = format!("{}{}", cache_keys::BALANCE_PREFIX, address);
        let token_balance_key = format!("{}{}", cache_keys::TOKEN_BALANCE_PREFIX, address);
        
        self.delete(&balance_key).await?;
        self.delete(&token_balance_key).await?;
        
        Ok(())
    }

    // ===== DEX POOL CACHING METHODS =====

    /// Get cached DEX pool
    pub async fn get_dex_pool(&self, pool_id: &str) -> Result<Option<CachedDexPool>, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("{}{}", cache_keys::DEX_POOL_PREFIX, pool_id);
        self.get(&key).await
    }

    /// Cache DEX pool
    pub async fn set_dex_pool(&self, pool: &CachedDexPool) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("{}{}", cache_keys::DEX_POOL_PREFIX, pool.pool_id);
        self.set(&key, pool, self.config.ttl_dex_pools).await
    }

    /// Invalidate DEX pool cache
    pub async fn invalidate_dex_pool(&self, pool_id: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("{}{}", cache_keys::DEX_POOL_PREFIX, pool_id);
        self.delete(&key).await
    }

    // ===== BLOCKCHAIN STATS CACHING =====

    /// Get cached blockchain stats
    pub async fn get_blockchain_stats(&self) -> Result<Option<CachedBlockchainStats>, Box<dyn std::error::Error + Send + Sync>> {
        self.get(cache_keys::BLOCKCHAIN_STATS_PREFIX).await
    }

    /// Cache blockchain stats
    pub async fn set_blockchain_stats(&self, stats: &CachedBlockchainStats) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        self.set(cache_keys::BLOCKCHAIN_STATS_PREFIX, stats, self.config.ttl_blockchain_stats).await
    }

    // ===== CONTENT CACHING METHODS =====

    /// Get cached content
    pub async fn get_content(&self, content_id: &str) -> Result<Option<CachedContent>, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("{}{}", cache_keys::CONTENT_PREFIX, content_id);
        self.get(&key).await
    }

    /// Cache content
    pub async fn set_content(&self, content: &CachedContent) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("{}{}", cache_keys::CONTENT_PREFIX, content.id);
        self.set(&key, content, self.config.ttl_content).await
    }

    // ===== HEALTH CHECK =====

    /// Check Redis connection health
    pub async fn health_check(&self) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        let mut conn = self.get_connection().await?;
        let result: RedisResult<String> = redis::cmd("PING")
            .query_async(&mut *conn)
            .await;

        match result {
            Ok(response) => Ok(response == "PONG"),
            Err(e) => {
                error!("❌ Redis health check failed: {}", e);
                Ok(false)
            }
        }
    }

    /// Get cache statistics
    pub async fn get_stats(&self) -> Result<serde_json::Value, Box<dyn std::error::Error + Send + Sync>> {
        let mut conn = self.get_connection().await?;
        let info: RedisResult<String> = redis::cmd("INFO")
            .arg("memory")
            .query_async(&mut *conn)
            .await;

        match info {
            Ok(info_str) => {
                // Parse Redis INFO output (simplified)
                let mut stats = serde_json::json!({
                    "status": "healthy",
                    "pool_size": self.pool.state().connections,
                    "pool_idle": self.pool.state().idle_connections,
                });

                // Extract memory usage from INFO
                for line in info_str.lines() {
                    if line.starts_with("used_memory_human:") {
                        if let Some(value) = line.split(':').nth(1) {
                            stats["memory_used"] = serde_json::Value::String(value.trim().to_string());
                        }
                    }
                }

                Ok(stats)
            }
            Err(e) => {
                error!("❌ Failed to get Redis stats: {}", e);
                Err(e.into())
            }
        }
    }
}

/// Circuit breaker for cache operations
pub struct CacheCircuitBreaker {
    failure_count: std::sync::atomic::AtomicUsize,
    last_failure: std::sync::Mutex<Option<std::time::Instant>>,
    threshold: usize,
    timeout: Duration,
}

impl CacheCircuitBreaker {
    pub fn new(threshold: usize, timeout: Duration) -> Self {
        Self {
            failure_count: std::sync::atomic::AtomicUsize::new(0),
            last_failure: std::sync::Mutex::new(None),
            threshold,
            timeout,
        }
    }

    pub fn can_execute(&self) -> bool {
        let failure_count = self.failure_count.load(std::sync::atomic::Ordering::Relaxed);
        
        if failure_count < self.threshold {
            return true;
        }

        // Check if timeout has passed
        if let Ok(last_failure) = self.last_failure.lock() {
            if let Some(last) = *last_failure {
                if last.elapsed() > self.timeout {
                    // Reset circuit breaker
                    self.failure_count.store(0, std::sync::atomic::Ordering::Relaxed);
                    return true;
                }
            }
        }

        false
    }

    pub fn record_success(&self) {
        self.failure_count.store(0, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn record_failure(&self) {
        self.failure_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        if let Ok(mut last_failure) = self.last_failure.lock() {
            *last_failure = Some(std::time::Instant::now());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio::test]
    async fn test_cache_config_default() {
        let config = CacheConfig::default();
        assert_eq!(config.redis_url, "redis://localhost:6379");
        assert_eq!(config.max_connections, 20);
        assert_eq!(config.ttl_balances.as_secs(), 30);
    }

    #[tokio::test]
    async fn test_circuit_breaker() {
        let breaker = CacheCircuitBreaker::new(3, Duration::from_secs(5));
        
        // Should allow execution initially
        assert!(breaker.can_execute());
        
        // Record failures
        breaker.record_failure();
        breaker.record_failure();
        breaker.record_failure();
        
        // Should block execution after threshold
        assert!(!breaker.can_execute());
        
        // Record success should reset
        breaker.record_success();
        assert!(breaker.can_execute());
    }
}
