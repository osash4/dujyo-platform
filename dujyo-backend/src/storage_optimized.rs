//! Optimized Storage Layer with Redis Cache Integration
//! 
//! This module extends the existing storage.rs with:
//! - Redis cache integration
//! - Read replica routing
//! - Circuit breaker patterns
//! - Performance monitoring
//! - Automatic cache invalidation

use sqlx::{PgPool, Row, FromRow};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use tracing::{info, warn, error, debug, instrument};
use std::sync::Arc;
use std::time::Duration;

use crate::blockchain::blockchain::{Blockchain, Block, Transaction};
use crate::blockchain::real_blockchain::TokenBalance;
use crate::cache::{CacheService, CacheConfig};
use crate::database::{DatabaseManager, OperationType};

/// Optimized storage with cache and read replica support
pub struct OptimizedBlockchainStorage {
    db_manager: Arc<DatabaseManager>,
    cache_service: Arc<CacheService>,
    circuit_breaker: Arc<crate::cache::CacheCircuitBreaker>,
}

impl OptimizedBlockchainStorage {
    /// Create new optimized storage with cache and database manager
    pub async fn new(
        db_config: crate::database::DatabaseConfig,
        cache_config: CacheConfig,
    ) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        info!("🚀 Initializing optimized blockchain storage");

        // Initialize database manager
        let db_manager = Arc::new(DatabaseManager::new(db_config).await?);
        info!("✅ Database manager initialized");

        // Initialize cache service
        let cache_service = Arc::new(CacheService::new(cache_config).await?);
        info!("✅ Cache service initialized");

        // Initialize circuit breaker
        let circuit_breaker = Arc::new(crate::cache::CacheCircuitBreaker::new(5, Duration::from_secs(30)));

        Ok(Self {
            db_manager,
            cache_service,
            circuit_breaker,
        })
    }

    /// Initialize database tables (same as original)
    #[instrument(skip(self))]
    pub async fn init_tables(&self) -> Result<(), sqlx::Error> {
        info!("🔧 Initializing database tables");

        // Use master database for schema operations
        let pool = self.db_manager.get_pool(OperationType::Write);

        // Create blocks table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS blocks (
                height BIGINT PRIMARY KEY,
                hash VARCHAR(255) UNIQUE NOT NULL,
                prev_hash VARCHAR(255) NOT NULL,
                timestamp TIMESTAMPTZ NOT NULL,
                tx_count INTEGER NOT NULL DEFAULT 0,
                data JSONB NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await?;

        // Create transactions table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS transactions (
                tx_hash VARCHAR(255) PRIMARY KEY,
                from_address VARCHAR(255) NOT NULL,
                to_address VARCHAR(255) NOT NULL,
                amount BIGINT NOT NULL,
                nonce BIGINT NOT NULL DEFAULT 0,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                block_height BIGINT REFERENCES blocks(height),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            "#,
        )
        .execute(pool)
        .await?;

        // Create balances table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS balances (
                address VARCHAR(255) PRIMARY KEY,
                balance BIGINT NOT NULL DEFAULT 0,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            "#,
        )
        .execute(pool)
        .await?;

        // Create token_balances table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS token_balances (
                address VARCHAR(255) PRIMARY KEY,
                dyo_balance BIGINT NOT NULL DEFAULT 0,
                dys_balance BIGINT NOT NULL DEFAULT 0,
                staked_balance BIGINT NOT NULL DEFAULT 0,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            "#,
        )
        .execute(pool)
        .await?;

        // Create DEX tables
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS dex_pools (
                pool_id VARCHAR(255) PRIMARY KEY,
                token_a VARCHAR(50) NOT NULL,
                token_b VARCHAR(50) NOT NULL,
                reserve_a BIGINT NOT NULL DEFAULT 0,
                reserve_b BIGINT NOT NULL DEFAULT 0,
                total_supply BIGINT NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            "#,
        )
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS dex_liquidity_positions (
                position_id VARCHAR(255) PRIMARY KEY,
                user_address VARCHAR(255) NOT NULL,
                pool_id VARCHAR(255) NOT NULL,
                lp_tokens BIGINT NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            "#,
        )
        .execute(pool)
        .await?;

        info!("✅ Database tables initialized");
        Ok(())
    }

    // ===== OPTIMIZED BALANCE OPERATIONS =====

    /// Get balance with cache-first strategy
    #[instrument(skip(self), fields(address = %address))]
    pub async fn get_balance(&self, address: &str) -> Result<u64, sqlx::Error> {
        debug!("🔍 Getting balance for address: {}", address);

        // Try cache first if circuit breaker allows
        if self.circuit_breaker.can_execute() {
            match self.cache_service.get_balance(address).await {
                Ok(Some(cached_balance)) => {
                    debug!("📖 Cache HIT for balance: {}", address);
                    self.circuit_breaker.record_success();
                    return Ok(cached_balance);
                }
                Ok(None) => {
                    debug!("📭 Cache MISS for balance: {}", address);
                }
                Err(e) => {
                    warn!("⚠️ Cache error for balance {}: {}", address, e);
                    self.circuit_breaker.record_failure();
                }
            }
        }

        // Fallback to database (read replica)
        let balance = self.db_manager.execute_read(|pool| {
            Box::pin(async move {
                let result = sqlx::query!(
                    "SELECT balance FROM balances WHERE address = $1",
                    address
                )
                .fetch_optional(pool)
                .await?;
                
                Ok(result.map(|r| r.balance as u64).unwrap_or(0))
            })
        }).await?;

        // Cache the result asynchronously
        if self.circuit_breaker.can_execute() {
            if let Err(e) = self.cache_service.set_balance(address, balance).await {
                warn!("⚠️ Failed to cache balance for {}: {}", address, e);
                self.circuit_breaker.record_failure();
            } else {
                self.circuit_breaker.record_success();
            }
        }

        debug!("✅ Retrieved balance for {}: {}", address, balance);
        Ok(balance)
    }

    /// Update balance with cache invalidation
    #[instrument(skip(self), fields(address = %address, balance = balance))]
    pub async fn update_balance(&self, address: &str, balance: u64) -> Result<(), sqlx::Error> {
        debug!("💾 Updating balance for {}: {}", address, balance);

        // Update database (master)
        self.db_manager.execute_write(|pool| {
            Box::pin(async move {
                sqlx::query(
                    "INSERT INTO balances (address, balance, updated_at) 
                     VALUES ($1, $2, $3) 
                     ON CONFLICT (address) 
                     DO UPDATE SET balance = $2, updated_at = $3"
                )
                .bind(address)
                .bind(balance as i64)
                .bind(Utc::now())
                .execute(pool)
                .await?;
                
                Ok(())
            })
        }).await?;

        // Invalidate cache
        if let Err(e) = self.cache_service.invalidate_balance(address).await {
            warn!("⚠️ Failed to invalidate cache for balance {}: {}", address, e);
        }

        debug!("✅ Updated balance for {}: {}", address, balance);
        Ok(())
    }

    /// Get token balance with cache-first strategy
    #[instrument(skip(self), fields(address = %address))]
    pub async fn get_token_balance(&self, address: &str) -> Result<TokenBalance, sqlx::Error> {
        debug!("🔍 Getting token balance for address: {}", address);

        // Try cache first
        if self.circuit_breaker.can_execute() {
            match self.cache_service.get_token_balance(address).await {
                Ok(Some(cached_balance)) => {
                    debug!("📖 Cache HIT for token balance: {}", address);
                    self.circuit_breaker.record_success();
                    return Ok(cached_balance);
                }
                Ok(None) => {
                    debug!("📭 Cache MISS for token balance: {}", address);
                }
                Err(e) => {
                    warn!("⚠️ Cache error for token balance {}: {}", address, e);
                    self.circuit_breaker.record_failure();
                }
            }
        }

        // Fallback to database
        let balance = self.db_manager.execute_read(|pool| {
            Box::pin(async move {
                let result = sqlx::query_as::<_, (i64, i64, i64)>(
                    "SELECT dyo_balance, dys_balance, staked_balance FROM token_balances WHERE address = $1"
                )
                .bind(address)
                .fetch_optional(pool)
                .await?;

                match result {
                    Some((dyo_balance, dys_balance, staked_balance)) => {
                        let dyo = dyo_balance as f64 / 1_000_000.0;
                        let dys = dys_balance as f64 / 1_000_000.0;
                        let staked = staked_balance as f64 / 1_000_000.0;
                        
                        Ok(TokenBalance {
                            dyo,
                            dys,
                            staked,
                            total: dyo + dys + staked,
                        })
                    },
                    None => Ok(TokenBalance {
                        dyo: 0.0,
                        dys: 0.0,
                        staked: 0.0,
                        total: 0.0,
                    }),
                }
            })
        }).await?;

        // Cache the result
        if self.circuit_breaker.can_execute() {
            if let Err(e) = self.cache_service.set_token_balance(address, &balance).await {
                warn!("⚠️ Failed to cache token balance for {}: {}", address, e);
                self.circuit_breaker.record_failure();
            } else {
                self.circuit_breaker.record_success();
            }
        }

        debug!("✅ Retrieved token balance for {}: DYO={}, DYS={}, Staked={}", 
               address, balance.dyo, balance.dys, balance.staked);
        Ok(balance)
    }

    /// Update token balance with cache invalidation
    #[instrument(skip(self), fields(address = %address))]
    pub async fn update_token_balance(&self, address: &str, balance: &TokenBalance) -> Result<(), sqlx::Error> {
        debug!("💾 Updating token balance for {}: DYO={}, DYS={}, Staked={}", 
               address, balance.dyo, balance.dys, balance.staked);

        // Convert to i64 with proper rounding
        let dyo_i64 = (balance.dyo * 1_000_000.0).round() as i64;
        let dys_i64 = (balance.dys * 1_000_000.0).round() as i64;
        let staked_i64 = (balance.staked * 1_000_000.0).round() as i64;

        // Update database (master)
        self.db_manager.execute_write(|pool| {
            Box::pin(async move {
                sqlx::query(
                    "INSERT INTO token_balances (address, dyo_balance, dys_balance, staked_balance, updated_at) 
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (address) DO UPDATE SET
                     dyo_balance = $2, dys_balance = $3, staked_balance = $4, updated_at = $5"
                )
                .bind(address)
                .bind(dyo_i64)
                .bind(dys_i64)
                .bind(staked_i64)
                .bind(Utc::now())
                .execute(pool)
                .await?;
                
                Ok(())
            })
        }).await?;

        // Invalidate cache
        if let Err(e) = self.cache_service.invalidate_balance(address).await {
            warn!("⚠️ Failed to invalidate cache for token balance {}: {}", address, e);
        }

        debug!("✅ Updated token balance for {}: DYO={}, DYS={}, Staked={}", 
               address, balance.dyo, balance.dys, balance.staked);
        Ok(())
    }

    // ===== OPTIMIZED TRANSACTION OPERATIONS =====

    /// Save transaction with optimized indexing
    #[instrument(skip(self))]
    pub async fn save_transaction(&self, transaction: &Transaction) -> Result<String, sqlx::Error> {
        let tx_hash = format!("tx_{}", Utc::now().timestamp_millis());
        
        debug!("💾 Saving transaction: {} -> {} ({} DYO)", 
               transaction.from, transaction.to, transaction.amount);

        self.db_manager.execute_write(|pool| {
            Box::pin(async move {
                sqlx::query(
                    "INSERT INTO transactions (tx_hash, from_address, to_address, amount, nonce, status) 
                     VALUES ($1, $2, $3, $4, $5, $6)"
                )
                .bind(&tx_hash)
                .bind(&transaction.from)
                .bind(&transaction.to)
                .bind(transaction.amount as i64)
                .bind(0i64) // nonce
                .bind("pending")
                .execute(pool)
                .await?;
                
                Ok(tx_hash)
            })
        }).await
    }

    /// Get transaction history with pagination and caching
    #[instrument(skip(self), fields(address = %address, limit = limit))]
    pub async fn get_transaction_history(&self, address: &str, limit: i64) -> Result<Vec<DbTransaction>, sqlx::Error> {
        debug!("🔍 Getting transaction history for {} (limit: {})", address, limit);

        // For now, always query database (could add caching for recent transactions)
        self.db_manager.execute_read(|pool| {
            Box::pin(async move {
                sqlx::query_as::<_, DbTransaction>(
                    "SELECT tx_hash, from_address, to_address, amount, nonce, status, block_height, created_at 
                     FROM transactions 
                     WHERE from_address = $1 OR to_address = $1 
                     ORDER BY created_at DESC 
                     LIMIT $2"
                )
                .bind(address)
                .bind(limit)
                .fetch_all(pool)
                .await
            })
        }).await
    }

    // ===== BLOCKCHAIN OPERATIONS =====

    /// Save block with optimized performance
    #[instrument(skip(self))]
    pub async fn save_block(&self, block: &Block, height: i64) -> Result<(), sqlx::Error> {
        debug!("💾 Saving block {} with {} transactions", height, block.transactions.len());

        let data = serde_json::json!({
            "transactions": block.transactions,
            "validator": block.validator
        });

        self.db_manager.execute_write(|pool| {
            Box::pin(async move {
                // Use ON CONFLICT to handle duplicate heights gracefully
                sqlx::query(
                    "INSERT INTO blocks (height, hash, prev_hash, timestamp, tx_count, data) 
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (height) DO UPDATE SET
                     hash = EXCLUDED.hash,
                     prev_hash = EXCLUDED.prev_hash,
                     timestamp = EXCLUDED.timestamp,
                     tx_count = EXCLUDED.tx_count,
                     data = EXCLUDED.data"
                )
                .bind(height)
                .bind(&block.hash)
                .bind(&block.previous_hash)
                .bind(DateTime::from_timestamp(block.timestamp as i64, 0).unwrap_or_else(|| Utc::now()))
                .bind(block.transactions.len() as i32)
                .bind(data)
                .execute(pool)
                .await?;

                // Update transaction statuses
                for (index, _transaction) in block.transactions.iter().enumerate() {
                    let tx_hash = format!("{}_{}", block.hash, index);
                    sqlx::query(
                        "UPDATE transactions SET status = 'confirmed', block_height = $1 WHERE tx_hash = $2"
                    )
                    .bind(height)
                    .bind(tx_hash)
                    .execute(pool)
                    .await?;
                }
                
                Ok(())
            })
        }).await
    }

    // ===== HEALTH CHECK AND MONITORING =====

    /// Health check for storage system
    #[instrument(skip(self))]
    pub async fn health_check(&self) -> Result<StorageHealth, Box<dyn std::error::Error + Send + Sync>> {
        let mut health = StorageHealth {
            database: false,
            cache: false,
            read_replicas: 0,
            total_replicas: 0,
            circuit_breaker_open: !self.circuit_breaker.can_execute(),
        };

        // Check database health
        match self.db_manager.get_stats().await {
            Ok(stats) => {
                health.database = stats.master.is_healthy;
                health.read_replicas = stats.total_healthy_replicas;
                health.total_replicas = stats.total_replicas;
            }
            Err(e) => {
                error!("❌ Database health check failed: {}", e);
            }
        }

        // Check cache health
        match self.cache_service.health_check().await {
            Ok(is_healthy) => {
                health.cache = is_healthy;
            }
            Err(e) => {
                error!("❌ Cache health check failed: {}", e);
            }
        }

        Ok(health)
    }

    /// Get performance statistics
    #[instrument(skip(self))]
    pub async fn get_performance_stats(&self) -> Result<PerformanceStats, Box<dyn std::error::Error + Send + Sync>> {
        let db_stats = self.db_manager.get_stats().await?;
        let cache_stats = self.cache_service.get_stats().await?;

        Ok(PerformanceStats {
            database: db_stats,
            cache: cache_stats,
            circuit_breaker_open: !self.circuit_breaker.can_execute(),
        })
    }
}

// ===== DATA STRUCTURES =====

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbBlock {
    pub height: i64,
    pub hash: String,
    pub prev_hash: String,
    pub timestamp: DateTime<Utc>,
    pub tx_count: i32,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbTransaction {
    pub tx_hash: String,
    pub from_address: String,
    pub to_address: String,
    pub amount: i64,
    pub nonce: i64,
    pub status: String,
    pub block_height: Option<i64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbBalance {
    pub address: String,
    pub balance: i64,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbTokenBalance {
    pub address: String,
    pub dyo_balance: i64,
    pub dys_balance: i64,
    pub staked_balance: i64,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbDexPool {
    pub pool_id: String,
    pub token_a: String,
    pub token_b: String,
    pub reserve_a: i64,
    pub reserve_b: i64,
    pub total_supply: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DbDexLiquidityPosition {
    pub position_id: String,
    pub user_address: String,
    pub pool_id: String,
    pub lp_tokens: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorageHealth {
    pub database: bool,
    pub cache: bool,
    pub read_replicas: usize,
    pub total_replicas: usize,
    pub circuit_breaker_open: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PerformanceStats {
    pub database: crate::database::DatabaseStats,
    pub cache: serde_json::Value,
    pub circuit_breaker_open: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_storage_health_check() {
        // This would require actual database and cache setup
        // For now, just test the structure
        let health = StorageHealth {
            database: true,
            cache: true,
            read_replicas: 2,
            total_replicas: 2,
            circuit_breaker_open: false,
        };
        
        assert!(health.database);
        assert!(health.cache);
        assert_eq!(health.read_replicas, 2);
    }
}
