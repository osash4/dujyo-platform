//! Blockchain Performance Optimization for Dujyo
//! 
//! This module provides blockchain optimizations:
//! - Reduced block time to 3 seconds
//! - Batch transaction processing
//! - Parallel transaction processing
//! - Mempool optimization
//! - State pruning automation

use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{RwLock, Mutex};
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error, debug};
use std::collections::{HashMap, VecDeque, BTreeMap};
use std::thread;

use crate::blockchain::blockchain::{Blockchain, Transaction, Block};
use crate::blockchain::consensus::cpv::CPVConsensus;

/// Blockchain optimization configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockchainOptimizationConfig {
    pub block_time: Duration,           // Target block time (3 seconds)
    pub batch_size: usize,              // Number of transactions per batch
    pub max_mempool_size: usize,        // Maximum mempool size
    pub parallel_processing: bool,      // Enable parallel processing
    pub state_pruning_enabled: bool,    // Enable automatic state pruning
    pub pruning_interval: Duration,     // How often to prune state
    pub max_state_history: usize,       // Maximum state history to keep
    pub transaction_pool_size: usize,   // Size of transaction processing pool
    pub cache_enabled: bool,            // Enable transaction cache
    pub cache_size: usize,              // Cache size limit
}

impl Default for BlockchainOptimizationConfig {
    fn default() -> Self {
        Self {
            block_time: Duration::from_secs(3),
            batch_size: 100,
            max_mempool_size: 10000,
            parallel_processing: true,
            state_pruning_enabled: true,
            pruning_interval: Duration::from_secs(300), // 5 minutes
            max_state_history: 1000,
            transaction_pool_size: 4,
            cache_enabled: true,
            cache_size: 1000,
        }
    }
}

/// Optimized mempool with priority queuing
#[derive(Debug, Clone)]
pub struct OptimizedMempool {
    pub high_priority: VecDeque<Transaction>,
    pub normal_priority: VecDeque<Transaction>,
    pub low_priority: VecDeque<Transaction>,
    pub max_size: usize,
    pub total_size: usize,
}

impl OptimizedMempool {
    pub fn new(max_size: usize) -> Self {
        Self {
            high_priority: VecDeque::new(),
            normal_priority: VecDeque::new(),
            low_priority: VecDeque::new(),
            max_size,
            total_size: 0,
        }
    }

    /// Add transaction to mempool with priority
    pub fn add_transaction(&mut self, transaction: Transaction, priority: TransactionPriority) {
        if self.total_size >= self.max_size {
            // Remove lowest priority transaction
            self.remove_lowest_priority();
        }

        match priority {
            TransactionPriority::High => {
                self.high_priority.push_back(transaction);
            }
            TransactionPriority::Normal => {
                self.normal_priority.push_back(transaction);
            }
            TransactionPriority::Low => {
                self.low_priority.push_back(transaction);
            }
        }

        self.total_size += 1;
    }

    /// Get next batch of transactions for processing
    pub fn get_next_batch(&mut self, batch_size: usize) -> Vec<Transaction> {
        let mut batch = Vec::new();
        let mut remaining = batch_size;

        // First, get high priority transactions
        while remaining > 0 && !self.high_priority.is_empty() {
            if let Some(tx) = self.high_priority.pop_front() {
                batch.push(tx);
                remaining -= 1;
                self.total_size -= 1;
            }
        }

        // Then, get normal priority transactions
        while remaining > 0 && !self.normal_priority.is_empty() {
            if let Some(tx) = self.normal_priority.pop_front() {
                batch.push(tx);
                remaining -= 1;
                self.total_size -= 1;
            }
        }

        // Finally, get low priority transactions
        while remaining > 0 && !self.low_priority.is_empty() {
            if let Some(tx) = self.low_priority.pop_front() {
                batch.push(tx);
                remaining -= 1;
                self.total_size -= 1;
            }
        }

        batch
    }

    /// Remove lowest priority transaction
    fn remove_lowest_priority(&mut self) {
        if !self.low_priority.is_empty() {
            self.low_priority.pop_front();
            self.total_size -= 1;
        } else if !self.normal_priority.is_empty() {
            self.normal_priority.pop_front();
            self.total_size -= 1;
        } else if !self.high_priority.is_empty() {
            self.high_priority.pop_front();
            self.total_size -= 1;
        }
    }

    /// Get mempool statistics
    pub fn get_stats(&self) -> MempoolStats {
        MempoolStats {
            total_transactions: self.total_size,
            high_priority_count: self.high_priority.len(),
            normal_priority_count: self.normal_priority.len(),
            low_priority_count: self.low_priority.len(),
            utilization_percent: (self.total_size as f64 / self.max_size as f64) * 100.0,
        }
    }
}

/// Transaction priority levels
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TransactionPriority {
    High,    // Critical transactions (governance, emergency)
    Normal,  // Standard transactions
    Low,     // Low priority transactions
}

/// Mempool statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MempoolStats {
    pub total_transactions: usize,
    pub high_priority_count: usize,
    pub normal_priority_count: usize,
    pub low_priority_count: usize,
    pub utilization_percent: f64,
}

/// Transaction cache for performance
#[derive(Debug, Clone)]
pub struct TransactionCache {
    pub cache: HashMap<String, CachedTransaction>,
    pub max_size: usize,
    pub hit_count: u64,
    pub miss_count: u64,
}

#[derive(Debug, Clone)]
pub struct CachedTransaction {
    pub transaction: Transaction,
    pub timestamp: Instant,
    pub ttl: Duration,
}

impl TransactionCache {
    pub fn new(max_size: usize) -> Self {
        Self {
            cache: HashMap::new(),
            max_size,
            hit_count: 0,
            miss_count: 0,
        }
    }

    /// Get transaction from cache
    pub fn get(&mut self, tx_hash: &str) -> Option<Transaction> {
        if let Some(cached) = self.cache.get(tx_hash) {
            if cached.timestamp.elapsed() < cached.ttl {
                self.hit_count += 1;
                return Some(cached.transaction.clone());
            } else {
                // Expired, remove from cache
                self.cache.remove(tx_hash);
            }
        }
        self.miss_count += 1;
        None
    }

    /// Add transaction to cache
    pub fn set(&mut self, tx_hash: String, transaction: Transaction, ttl: Duration) {
        if self.cache.len() >= self.max_size {
            // Remove oldest entry
            if let Some(oldest_key) = self.cache.keys().next().cloned() {
                self.cache.remove(&oldest_key);
            }
        }

        self.cache.insert(tx_hash, CachedTransaction {
            transaction,
            timestamp: Instant::now(),
            ttl,
        });
    }

    /// Get cache statistics
    pub fn get_stats(&self) -> CacheStats {
        let total_requests = self.hit_count + self.miss_count;
        let hit_rate = if total_requests > 0 {
            (self.hit_count as f64 / total_requests as f64) * 100.0
        } else {
            0.0
        };

        CacheStats {
            cache_size: self.cache.len(),
            max_size: self.max_size,
            hit_count: self.hit_count,
            miss_count: self.miss_count,
            hit_rate,
        }
    }
}

/// Cache statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    pub cache_size: usize,
    pub max_size: usize,
    pub hit_count: u64,
    pub miss_count: u64,
    pub hit_rate: f64,
}

/// Optimized blockchain with performance enhancements
pub struct OptimizedBlockchain {
    pub blockchain: Arc<Mutex<Blockchain>>,
    pub mempool: Arc<Mutex<OptimizedMempool>>,
    pub transaction_cache: Arc<Mutex<TransactionCache>>,
    pub config: BlockchainOptimizationConfig,
    pub consensus: Arc<Mutex<CPVConsensus>>,
    pub state_pruner: Arc<Mutex<StatePruner>>,
    pub performance_metrics: Arc<Mutex<PerformanceMetrics>>,
}

/// State pruner for automatic cleanup
#[derive(Debug, Clone)]
pub struct StatePruner {
    pub enabled: bool,
    pub interval: Duration,
    pub max_history: usize,
    pub last_prune: Instant,
}

impl StatePruner {
    pub fn new(enabled: bool, interval: Duration, max_history: usize) -> Self {
        Self {
            enabled,
            interval,
            max_history,
            last_prune: Instant::now(),
        }
    }

    /// Check if pruning is needed
    pub fn should_prune(&self) -> bool {
        self.enabled && self.last_prune.elapsed() >= self.interval
    }

    /// Prune old state data
    pub async fn prune_state(&mut self, blockchain: &mut Blockchain) -> PruningResult {
        let start_time = Instant::now();
        let mut pruned_blocks = 0;
        let mut pruned_transactions = 0;

        if blockchain.chain.len() > self.max_history {
            let blocks_to_remove = blockchain.chain.len() - self.max_history;
            
            // Remove old blocks
            for _ in 0..blocks_to_remove {
                if let Some(block) = blockchain.chain.pop_front() {
                    pruned_blocks += 1;
                    pruned_transactions += block.transactions.len();
                }
            }
        }

        self.last_prune = Instant::now();
        let duration = start_time.elapsed();

        PruningResult {
            pruned_blocks,
            pruned_transactions,
            duration,
            success: true,
        }
    }
}

/// Pruning result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PruningResult {
    pub pruned_blocks: usize,
    pub pruned_transactions: usize,
    pub duration: Duration,
    pub success: bool,
}

/// Performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub blocks_per_second: f64,
    pub transactions_per_second: f64,
    pub average_block_time: Duration,
    pub average_transaction_time: Duration,
    pub cache_hit_rate: f64,
    pub mempool_utilization: f64,
    pub total_blocks: u64,
    pub total_transactions: u64,
    pub uptime: Duration,
}

impl OptimizedBlockchain {
    pub fn new(config: BlockchainOptimizationConfig) -> Self {
        let blockchain = Arc::new(Mutex::new(Blockchain::new()));
        let mempool = Arc::new(Mutex::new(OptimizedMempool::new(config.max_mempool_size)));
        let transaction_cache = Arc::new(Mutex::new(TransactionCache::new(config.cache_size)));
        let consensus = Arc::new(Mutex::new(CPVConsensus::new()));
        let state_pruner = Arc::new(Mutex::new(StatePruner::new(
            config.state_pruning_enabled,
            config.pruning_interval,
            config.max_state_history,
        )));
        let performance_metrics = Arc::new(Mutex::new(PerformanceMetrics {
            blocks_per_second: 0.0,
            transactions_per_second: 0.0,
            average_block_time: Duration::from_secs(0),
            average_transaction_time: Duration::from_secs(0),
            cache_hit_rate: 0.0,
            mempool_utilization: 0.0,
            total_blocks: 0,
            total_transactions: 0,
            uptime: Duration::from_secs(0),
        }));

        Self {
            blockchain,
            mempool,
            transaction_cache,
            config,
            consensus,
            state_pruner,
            performance_metrics,
        }
    }

    /// Start optimized block production
    pub async fn start_block_production(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("🚀 Starting optimized block production with {}s block time", self.config.block_time.as_secs());

        let blockchain = self.blockchain.clone();
        let mempool = self.mempool.clone();
        let consensus = self.consensus.clone();
        let state_pruner = self.state_pruner.clone();
        let performance_metrics = self.performance_metrics.clone();
        let config = self.config.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(config.block_time);
            let mut block_count = 0;
            let start_time = Instant::now();

            loop {
                interval.tick().await;
                let block_start_time = Instant::now();

                // Get transactions from mempool
                let mut mempool_guard = mempool.lock().await;
                let transactions = mempool_guard.get_next_batch(config.batch_size);
                drop(mempool_guard);

                if !transactions.is_empty() {
                    // Create new block
                    let mut blockchain_guard = blockchain.lock().await;
                    let mut consensus_guard = consensus.lock().await;
                    
                    let validator = consensus_guard.select_validator(&blockchain_guard.chain);
                    let new_block = blockchain_guard.create_block(validator);
                    
                    // Process transactions in parallel if enabled
                    if config.parallel_processing {
                        self.process_transactions_parallel(&transactions).await;
                    } else {
                        self.process_transactions_sequential(&transactions).await;
                    }

                    block_count += 1;
                    drop(blockchain_guard);
                    drop(consensus_guard);

                    // Update performance metrics
                    let block_time = block_start_time.elapsed();
                    self.update_performance_metrics(block_count, transactions.len(), block_time).await;

                    info!("✅ Block {} created with {} transactions in {:?}", 
                          block_count, transactions.len(), block_time);
                }

                // Check if state pruning is needed
                let mut pruner_guard = state_pruner.lock().await;
                if pruner_guard.should_prune() {
                    let mut blockchain_guard = blockchain.lock().await;
                    let pruning_result = pruner_guard.prune_state(&mut blockchain_guard).await;
                    info!("🧹 State pruning completed: {} blocks, {} transactions in {:?}", 
                          pruning_result.pruned_blocks, pruning_result.pruned_transactions, pruning_result.duration);
                }
            }
        });

        Ok(())
    }

    /// Process transactions in parallel
    async fn process_transactions_parallel(&self, transactions: &[Transaction]) {
        let chunk_size = transactions.len() / self.config.transaction_pool_size;
        let chunks: Vec<&[Transaction]> = transactions.chunks(chunk_size).collect();

        let handles: Vec<_> = chunks.into_iter().map(|chunk| {
            let chunk = chunk.to_vec();
            tokio::spawn(async move {
                for transaction in chunk {
                    // Process transaction
                    self.process_single_transaction(transaction).await;
                }
            })
        }).collect();

        // Wait for all chunks to complete
        for handle in handles {
            if let Err(e) = handle.await {
                error!("Transaction processing error: {}", e);
            }
        }
    }

    /// Process transactions sequentially
    async fn process_transactions_sequential(&self, transactions: &[Transaction]) {
        for transaction in transactions {
            self.process_single_transaction(transaction).await;
        }
    }

    /// Process a single transaction
    async fn process_single_transaction(&self, transaction: &Transaction) {
        // Check cache first
        if self.config.cache_enabled {
            let mut cache_guard = self.transaction_cache.lock().await;
            if let Some(cached_tx) = cache_guard.get(&transaction.hash) {
                // Use cached transaction
                return;
            }
        }

        // Process transaction (simplified)
        // In a real implementation, this would validate and execute the transaction
        
        // Add to cache
        if self.config.cache_enabled {
            let mut cache_guard = self.transaction_cache.lock().await;
            cache_guard.set(
                transaction.hash.clone(),
                transaction.clone(),
                Duration::from_secs(300), // 5 minutes TTL
            );
        }
    }

    /// Update performance metrics
    async fn update_performance_metrics(&self, block_count: u64, tx_count: usize, block_time: Duration) {
        let mut metrics_guard = self.performance_metrics.lock().await;
        let mut mempool_guard = self.mempool.lock().await;
        let mut cache_guard = self.transaction_cache.lock().await;

        // Calculate metrics
        let uptime = Instant::now().duration_since(Instant::now()); // This would be actual uptime
        metrics_guard.blocks_per_second = block_count as f64 / uptime.as_secs_f64();
        metrics_guard.transactions_per_second = (block_count * tx_count as u64) as f64 / uptime.as_secs_f64();
        metrics_guard.average_block_time = block_time;
        metrics_guard.total_blocks = block_count;
        metrics_guard.total_transactions += tx_count as u64;
        metrics_guard.uptime = uptime;

        // Update cache hit rate
        let cache_stats = cache_guard.get_stats();
        metrics_guard.cache_hit_rate = cache_stats.hit_rate;

        // Update mempool utilization
        let mempool_stats = mempool_guard.get_stats();
        metrics_guard.mempool_utilization = mempool_stats.utilization_percent;
    }

    /// Add transaction to mempool
    pub async fn add_transaction(&self, transaction: Transaction, priority: TransactionPriority) {
        let mut mempool_guard = self.mempool.lock().await;
        mempool_guard.add_transaction(transaction, priority);
    }

    /// Get blockchain statistics
    pub async fn get_stats(&self) -> BlockchainStats {
        let blockchain_guard = self.blockchain.lock().await;
        let mempool_guard = self.mempool.lock().await;
        let cache_guard = self.transaction_cache.lock().await;
        let metrics_guard = self.performance_metrics.lock().await;

        BlockchainStats {
            total_blocks: blockchain_guard.chain.len(),
            total_transactions: metrics_guard.total_transactions,
            mempool_stats: mempool_guard.get_stats(),
            cache_stats: cache_guard.get_stats(),
            performance_metrics: metrics_guard.clone(),
        }
    }
}

/// Blockchain statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockchainStats {
    pub total_blocks: usize,
    pub total_transactions: u64,
    pub mempool_stats: MempoolStats,
    pub cache_stats: CacheStats,
    pub performance_metrics: PerformanceMetrics,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[tokio::test]
    async fn test_optimized_mempool() {
        let mut mempool = OptimizedMempool::new(100);
        
        // Add transactions with different priorities
        let tx1 = Transaction {
            hash: "tx1".to_string(),
            from: "address1".to_string(),
            to: "address2".to_string(),
            amount: 100.0,
            timestamp: chrono::Utc::now(),
        };
        
        let tx2 = Transaction {
            hash: "tx2".to_string(),
            from: "address2".to_string(),
            to: "address3".to_string(),
            amount: 200.0,
            timestamp: chrono::Utc::now(),
        };

        mempool.add_transaction(tx1, TransactionPriority::High);
        mempool.add_transaction(tx2, TransactionPriority::Normal);

        assert_eq!(mempool.total_size, 2);
        assert_eq!(mempool.high_priority.len(), 1);
        assert_eq!(mempool.normal_priority.len(), 1);

        // Get batch
        let batch = mempool.get_next_batch(1);
        assert_eq!(batch.len(), 1);
        assert_eq!(batch[0].hash, "tx1"); // High priority first
    }

    #[tokio::test]
    async fn test_transaction_cache() {
        let mut cache = TransactionCache::new(10);
        
        let tx = Transaction {
            hash: "tx1".to_string(),
            from: "address1".to_string(),
            to: "address2".to_string(),
            amount: 100.0,
            timestamp: chrono::Utc::now(),
        };

        // Add to cache
        cache.set("tx1".to_string(), tx.clone(), Duration::from_secs(60));
        
        // Get from cache
        let cached_tx = cache.get("tx1");
        assert!(cached_tx.is_some());
        assert_eq!(cached_tx.unwrap().hash, "tx1");
        
        // Check stats
        let stats = cache.get_stats();
        assert_eq!(stats.hit_count, 1);
        assert_eq!(stats.miss_count, 0);
    }

    #[tokio::test]
    async fn test_state_pruner() {
        let mut pruner = StatePruner::new(true, Duration::from_secs(1), 5);
        
        // Should not prune initially
        assert!(!pruner.should_prune());
        
        // Wait and check again
        tokio::time::sleep(Duration::from_millis(1100)).await;
        assert!(pruner.should_prune());
    }
}
