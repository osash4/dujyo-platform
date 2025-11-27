//! Optimized Database Connection Pool and Read Replica Management
//! 
//! This module provides:
//! - Master/Read replica routing
//! - Optimized connection pooling
//! - Circuit breaker patterns
//! - Connection health monitoring
//! - Automatic failover

use sqlx::{PgPool, Postgres, Row};
use std::time::Duration;
use tracing::{info, warn, error, debug};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

/// Database configuration for master and read replicas
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub master_url: String,
    pub read_replica_urls: Vec<String>,
    pub max_connections: u32,
    pub min_connections: u32,
    pub connection_timeout: Duration,
    pub idle_timeout: Duration,
    pub max_lifetime: Duration,
    pub acquire_timeout: Duration,
    pub test_before_acquire: bool,
    pub read_replica_load_balance: bool,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            master_url: "postgresql://yare@localhost:5432/dujyo_blockchain".to_string(),
            read_replica_urls: vec![
                "postgresql://yare@localhost:5433/dujyo_blockchain".to_string(),
                "postgresql://yare@localhost:5434/dujyo_blockchain".to_string(),
            ],
            max_connections: 50,
            min_connections: 10,
            connection_timeout: Duration::from_secs(10),
            idle_timeout: Duration::from_secs(600), // 10 minutes
            max_lifetime: Duration::from_secs(1800), // 30 minutes
            acquire_timeout: Duration::from_secs(5),
            test_before_acquire: true,
            read_replica_load_balance: true,
        }
    }
}

/// Database operation type for routing decisions
#[derive(Debug, Clone, Copy)]
pub enum OperationType {
    Read,
    Write,
    Transaction,
}

/// Read replica health status
#[derive(Debug, Clone)]
pub struct ReplicaHealth {
    pub url: String,
    pub is_healthy: bool,
    pub last_check: chrono::DateTime<chrono::Utc>,
    pub response_time_ms: u64,
    pub error_count: AtomicUsize,
}

/// Database pool manager with read replica support
pub struct DatabaseManager {
    master_pool: PgPool,
    read_replica_pools: Vec<PgPool>,
    replica_health: Vec<Arc<ReplicaHealth>>,
    config: DatabaseConfig,
    round_robin_counter: AtomicUsize,
}

impl DatabaseManager {
    /// Create new database manager with optimized pools
    pub async fn new(config: DatabaseConfig) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        info!("🔗 Initializing database manager with {} read replicas", config.read_replica_urls.len());

        // Create master pool with optimized settings
        let master_pool = Self::create_optimized_pool(&config.master_url, &config).await?;
        info!("✅ Master database pool created");

        // Create read replica pools
        let mut read_replica_pools = Vec::new();
        let mut replica_health = Vec::new();

        for (index, replica_url) in config.read_replica_urls.iter().enumerate() {
            match Self::create_optimized_pool(replica_url, &config).await {
                Ok(pool) => {
                    read_replica_pools.push(pool);
                    replica_health.push(Arc::new(ReplicaHealth {
                        url: replica_url.clone(),
                        is_healthy: true,
                        last_check: chrono::Utc::now(),
                        response_time_ms: 0,
                        error_count: AtomicUsize::new(0),
                    }));
                    info!("✅ Read replica {} pool created", index + 1);
                }
                Err(e) => {
                    warn!("⚠️ Failed to create read replica {} pool: {}", index + 1, e);
                    replica_health.push(Arc::new(ReplicaHealth {
                        url: replica_url.clone(),
                        is_healthy: false,
                        last_check: chrono::Utc::now(),
                        response_time_ms: 0,
                        error_count: AtomicUsize::new(0),
                    }));
                }
            }
        }

        let manager = Self {
            master_pool,
            read_replica_pools,
            replica_health,
            config,
            round_robin_counter: AtomicUsize::new(0),
        };

        // Start health check task
        manager.start_health_check_task().await;

        Ok(manager)
    }

    /// Create optimized PostgreSQL pool
    async fn create_optimized_pool(url: &str, config: &DatabaseConfig) -> Result<PgPool, sqlx::Error> {
        PgPool::builder()
            .max_connections(config.max_connections)
            .min_connections(config.min_connections)
            .acquire_timeout(config.acquire_timeout)
            .idle_timeout(config.idle_timeout)
            .max_lifetime(config.max_lifetime)
            .test_before_acquire(config.test_before_acquire)
            .build(url)
            .await
    }

    /// Get appropriate pool based on operation type
    pub fn get_pool(&self, operation: OperationType) -> &PgPool {
        match operation {
            OperationType::Write | OperationType::Transaction => {
                debug!("📝 Using master pool for {:?} operation", operation);
                &self.master_pool
            }
            OperationType::Read => {
                if self.read_replica_pools.is_empty() {
                    debug!("📖 No read replicas available, using master pool");
                    &self.master_pool
                } else {
                    let healthy_replicas: Vec<&PgPool> = self.read_replica_pools
                        .iter()
                        .enumerate()
                        .filter(|(i, _)| self.replica_health[*i].is_healthy)
                        .map(|(_, pool)| pool)
                        .collect();

                    if healthy_replicas.is_empty() {
                        warn!("⚠️ No healthy read replicas, falling back to master");
                        &self.master_pool
                    } else {
                        let selected_pool = if self.config.read_replica_load_balance {
                            // Round-robin load balancing
                            let index = self.round_robin_counter.fetch_add(1, Ordering::Relaxed) % healthy_replicas.len();
                            healthy_replicas[index]
                        } else {
                            // Use first healthy replica
                            healthy_replicas[0]
                        };
                        
                        debug!("📖 Using read replica pool for read operation");
                        selected_pool
                    }
                }
            }
        }
    }

    /// Execute read operation with automatic replica selection
    pub async fn execute_read<F, R>(&self, operation: F) -> Result<R, sqlx::Error>
    where
        F: FnOnce(&PgPool) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<R, sqlx::Error>> + Send>>,
    {
        let pool = self.get_pool(OperationType::Read);
        operation(pool).await
    }

    /// Execute write operation on master
    pub async fn execute_write<F, R>(&self, operation: F) -> Result<R, sqlx::Error>
    where
        F: FnOnce(&PgPool) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<R, sqlx::Error>> + Send>>,
    {
        let pool = self.get_pool(OperationType::Write);
        operation(pool).await
    }

    /// Start background health check task for read replicas
    async fn start_health_check_task(&self) {
        let health_checks = self.replica_health.clone();
        let pools = self.read_replica_pools.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(30));
            
            loop {
                interval.tick().await;
                
                for (index, health) in health_checks.iter().enumerate() {
                    if let Some(pool) = pools.get(index) {
                        let start = std::time::Instant::now();
                        
                        match sqlx::query("SELECT 1").fetch_one(pool).await {
                            Ok(_) => {
                                let response_time = start.elapsed().as_millis() as u64;
                                health.response_time_ms = response_time;
                                health.is_healthy = true;
                                health.error_count.store(0, Ordering::Relaxed);
                                debug!("✅ Read replica {} health check passed ({}ms)", index + 1, response_time);
                            }
                            Err(e) => {
                                let error_count = health.error_count.fetch_add(1, Ordering::Relaxed) + 1;
                                health.is_healthy = false;
                                error!("❌ Read replica {} health check failed (error #{}): {}", index + 1, error_count, e);
                                
                                // Mark as unhealthy after 3 consecutive failures
                                if error_count >= 3 {
                                    warn!("🚨 Read replica {} marked as unhealthy after {} failures", index + 1, error_count);
                                }
                            }
                        }
                        
                        health.last_check = chrono::Utc::now();
                    }
                }
            }
        });
    }

    /// Get database statistics
    pub async fn get_stats(&self) -> Result<DatabaseStats, sqlx::Error> {
        let master_stats = self.get_pool_stats(&self.master_pool, "master").await?;
        let mut replica_stats = Vec::new();

        for (index, pool) in self.read_replica_pools.iter().enumerate() {
            if let Ok(stats) = self.get_pool_stats(pool, &format!("replica_{}", index + 1)).await {
                replica_stats.push(stats);
            }
        }

        Ok(DatabaseStats {
            master: master_stats,
            replicas: replica_stats,
            total_healthy_replicas: self.replica_health.iter().filter(|h| h.is_healthy).count(),
            total_replicas: self.replica_health.len(),
        })
    }

    /// Get pool statistics
    async fn get_pool_stats(&self, pool: &PgPool, name: &str) -> Result<PoolStats, sqlx::Error> {
        let state = pool.state();
        
        // Get database-specific stats
        let row = sqlx::query("SELECT COUNT(*) as connection_count FROM pg_stat_activity WHERE state = 'active'")
            .fetch_one(pool)
            .await?;
        
        let active_connections: i64 = row.get("connection_count");

        Ok(PoolStats {
            name: name.to_string(),
            size: state.connections,
            idle: state.idle_connections,
            active_connections,
            is_healthy: state.connections > 0,
        })
    }

    /// Force health check on all replicas
    pub async fn force_health_check(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("🔍 Forcing health check on all read replicas");
        
        for (index, health) in self.replica_health.iter().enumerate() {
            if let Some(pool) = self.read_replica_pools.get(index) {
                let start = std::time::Instant::now();
                
                match sqlx::query("SELECT 1").fetch_one(pool).await {
                    Ok(_) => {
                        let response_time = start.elapsed().as_millis() as u64;
                        health.response_time_ms = response_time;
                        health.is_healthy = true;
                        health.error_count.store(0, Ordering::Relaxed);
                        info!("✅ Read replica {} is healthy ({}ms)", index + 1, response_time);
                    }
                    Err(e) => {
                        health.is_healthy = false;
                        error!("❌ Read replica {} is unhealthy: {}", index + 1, e);
                    }
                }
                
                health.last_check = chrono::Utc::now();
            }
        }
        
        Ok(())
    }
}

/// Database statistics structure
#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub master: PoolStats,
    pub replicas: Vec<PoolStats>,
    pub total_healthy_replicas: usize,
    pub total_replicas: usize,
}

/// Pool statistics structure
#[derive(Debug, Serialize, Deserialize)]
pub struct PoolStats {
    pub name: String,
    pub size: u32,
    pub idle: u32,
    pub active_connections: i64,
    pub is_healthy: bool,
}

/// Circuit breaker for database operations
pub struct DatabaseCircuitBreaker {
    failure_count: AtomicUsize,
    last_failure: std::sync::Mutex<Option<std::time::Instant>>,
    threshold: usize,
    timeout: Duration,
}

impl DatabaseCircuitBreaker {
    pub fn new(threshold: usize, timeout: Duration) -> Self {
        Self {
            failure_count: AtomicUsize::new(0),
            last_failure: std::sync::Mutex::new(None),
            threshold,
            timeout,
        }
    }

    pub fn can_execute(&self) -> bool {
        let failure_count = self.failure_count.load(Ordering::Relaxed);
        
        if failure_count < self.threshold {
            return true;
        }

        // Check if timeout has passed
        if let Ok(last_failure) = self.last_failure.lock() {
            if let Some(last) = *last_failure {
                if last.elapsed() > self.timeout {
                    // Reset circuit breaker
                    self.failure_count.store(0, Ordering::Relaxed);
                    return true;
                }
            }
        }

        false
    }

    pub fn record_success(&self) {
        self.failure_count.store(0, Ordering::Relaxed);
    }

    pub fn record_failure(&self) {
        self.failure_count.fetch_add(1, Ordering::Relaxed);
        if let Ok(mut last_failure) = self.last_failure.lock() {
            *last_failure = Some(std::time::Instant::now());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_database_config_default() {
        let config = DatabaseConfig::default();
        assert_eq!(config.max_connections, 50);
        assert_eq!(config.read_replica_urls.len(), 2);
    }

    #[test]
    fn test_circuit_breaker() {
        let breaker = DatabaseCircuitBreaker::new(3, Duration::from_secs(5));
        
        assert!(breaker.can_execute());
        
        breaker.record_failure();
        breaker.record_failure();
        breaker.record_failure();
        
        assert!(!breaker.can_execute());
        
        breaker.record_success();
        assert!(breaker.can_execute());
    }
}
