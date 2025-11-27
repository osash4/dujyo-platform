//! Metrics Collector for Dujyo
//! 
//! This module provides comprehensive metrics collection:
//! - Real-time system metrics (CPU, memory, disk, network)
//! - Application metrics (TPS, users, errors, response times)
//! - Blockchain metrics (block height, pending transactions, gas usage)
//! - Database metrics (connections, query times, cache hit rates)
//! - Custom business metrics

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH, Duration};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

// ===========================================
// TYPES & STRUCTS
// ===========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub timestamp: DateTime<Utc>,
    pub tps: f64,
    pub active_users: u64,
    pub error_rate: f64,
    pub response_time: f64,
    pub memory_usage: f64,
    pub cpu_usage: f64,
    pub disk_usage: f64,
    pub network_in: f64,
    pub network_out: f64,
    pub blockchain_height: u64,
    pub pending_transactions: u64,
    pub cache_hit_rate: f64,
    pub database_connections: u64,
    pub database_query_time: f64,
    pub gas_price: f64,
    pub gas_used: f64,
    pub block_time: f64,
    pub validator_count: u64,
    pub staking_ratio: f64,
    pub total_supply: f64,
    pub circulating_supply: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricTrend {
    pub timestamp: DateTime<Utc>,
    pub value: f64,
    pub metric: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomMetric {
    pub name: String,
    pub value: f64,
    pub tags: HashMap<String, String>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub endpoint: String,
    pub method: String,
    pub response_time: f64,
    pub status_code: u16,
    pub request_size: u64,
    pub response_size: u64,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessMetrics {
    pub total_streams: u64,
    pub total_nfts_minted: u64,
    pub total_volume_traded: f64,
    pub active_artists: u64,
    pub new_users_today: u64,
    pub revenue_today: f64,
    pub timestamp: DateTime<Utc>,
}

// ===========================================
// METRICS COLLECTOR
// ===========================================

#[derive(Clone)]
pub struct MetricsCollector {
    metrics_history: Arc<RwLock<Vec<SystemMetrics>>>,
    custom_metrics: Arc<RwLock<Vec<CustomMetric>>>,
    performance_metrics: Arc<RwLock<Vec<PerformanceMetrics>>>,
    business_metrics: Arc<RwLock<Vec<BusinessMetrics>>>,
    config: MetricsConfig,
}

#[derive(Debug, Clone)]
pub struct MetricsConfig {
    pub max_history_size: usize,
    pub collection_interval: Duration,
    pub enable_system_metrics: bool,
    pub enable_performance_metrics: bool,
    pub enable_business_metrics: bool,
    pub enable_custom_metrics: bool,
}

impl Default for MetricsConfig {
    fn default() -> Self {
        Self {
            max_history_size: 1000,
            collection_interval: Duration::from_secs(30),
            enable_system_metrics: true,
            enable_performance_metrics: true,
            enable_business_metrics: true,
            enable_custom_metrics: true,
        }
    }
}

impl MetricsCollector {
    pub fn new() -> Self {
        let config = MetricsConfig::default();
        let collector = Self {
            metrics_history: Arc::new(RwLock::new(Vec::new())),
            custom_metrics: Arc::new(RwLock::new(Vec::new())),
            performance_metrics: Arc::new(RwLock::new(Vec::new())),
            business_metrics: Arc::new(RwLock::new(Vec::new())),
            config,
        };

        // Start background collection
        tokio::spawn(collector.clone().start_collection_loop());

        collector
    }

    pub fn new_with_config(config: MetricsConfig) -> Self {
        let collector = Self {
            metrics_history: Arc::new(RwLock::new(Vec::new())),
            custom_metrics: Arc::new(RwLock::new(Vec::new())),
            performance_metrics: Arc::new(RwLock::new(Vec::new())),
            business_metrics: Arc::new(RwLock::new(Vec::new())),
            config,
        };

        // Start background collection
        tokio::spawn(collector.clone().start_collection_loop());

        collector
    }

    // ===========================================
    // METRICS COLLECTION
    // ===========================================

    pub async fn collect_system_metrics(&self) -> SystemMetrics {
        let now = Utc::now();
        
        SystemMetrics {
            timestamp: now,
            tps: self.calculate_tps().await,
            active_users: self.get_active_users().await,
            error_rate: self.calculate_error_rate().await,
            response_time: self.calculate_avg_response_time().await,
            memory_usage: self.get_memory_usage().await,
            cpu_usage: self.get_cpu_usage().await,
            disk_usage: self.get_disk_usage().await,
            network_in: self.get_network_in().await,
            network_out: self.get_network_out().await,
            blockchain_height: self.get_blockchain_height().await,
            pending_transactions: self.get_pending_transactions().await,
            cache_hit_rate: self.get_cache_hit_rate().await,
            database_connections: self.get_database_connections().await,
            database_query_time: self.get_avg_query_time().await,
            gas_price: self.get_gas_price().await,
            gas_used: self.get_gas_used().await,
            block_time: self.get_avg_block_time().await,
            validator_count: self.get_validator_count().await,
            staking_ratio: self.get_staking_ratio().await,
            total_supply: self.get_total_supply().await,
            circulating_supply: self.get_circulating_supply().await,
        }
    }

    pub async fn record_custom_metric(&self, name: String, value: f64, tags: HashMap<String, String>) {
        let metric = CustomMetric {
            name,
            value,
            tags,
            timestamp: Utc::now(),
        };

        let mut custom_metrics = self.custom_metrics.write().await;
        custom_metrics.push(metric);

        // Keep only recent metrics
        let metrics_len = custom_metrics.len();
        if metrics_len > self.config.max_history_size {
            custom_metrics.drain(0..metrics_len - self.config.max_history_size);
        }
    }

    pub async fn record_performance_metric(&self, endpoint: String, method: String, response_time: f64, status_code: u16, request_size: u64, response_size: u64) {
        let metric = PerformanceMetrics {
            endpoint,
            method,
            response_time,
            status_code,
            request_size,
            response_size,
            timestamp: Utc::now(),
        };

        let mut performance_metrics = self.performance_metrics.write().await;
        performance_metrics.push(metric);

        // Keep only recent metrics
        let metrics_len = performance_metrics.len();
        if metrics_len > self.config.max_history_size {
            performance_metrics.drain(0..metrics_len - self.config.max_history_size);
        }
    }

    pub async fn record_business_metric(&self, metric: BusinessMetrics) {
        let mut business_metrics = self.business_metrics.write().await;
        business_metrics.push(metric);

        // Keep only recent metrics
        let metrics_len = business_metrics.len();
        if metrics_len > self.config.max_history_size {
            business_metrics.drain(0..metrics_len - self.config.max_history_size);
        }
    }

    // ===========================================
    // METRICS RETRIEVAL
    // ===========================================

    pub async fn get_current_metrics(&self) -> SystemMetrics {
        let history = self.metrics_history.read().await;
        history.last().cloned().unwrap_or_else(|| SystemMetrics {
            timestamp: Utc::now(),
            tps: 0.0,
            active_users: 0,
            error_rate: 0.0,
            response_time: 0.0,
            memory_usage: 0.0,
            cpu_usage: 0.0,
            disk_usage: 0.0,
            network_in: 0.0,
            network_out: 0.0,
            blockchain_height: 0,
            pending_transactions: 0,
            cache_hit_rate: 0.0,
            database_connections: 0,
            database_query_time: 0.0,
            gas_price: 0.0,
            gas_used: 0.0,
            block_time: 0.0,
            validator_count: 0,
            staking_ratio: 0.0,
            total_supply: 0.0,
            circulating_supply: 0.0,
        })
    }

    pub async fn get_metrics_trends(&self, hours: u64) -> Vec<MetricTrend> {
        let history = self.metrics_history.read().await;
        let cutoff = Utc::now() - chrono::Duration::hours(hours as i64);
        
        let mut trends = Vec::new();
        
        for metrics in history.iter().filter(|m| m.timestamp > cutoff) {
            trends.push(MetricTrend {
                timestamp: metrics.timestamp,
                value: metrics.tps,
                metric: "tps".to_string(),
            });
            trends.push(MetricTrend {
                timestamp: metrics.timestamp,
                value: metrics.active_users as f64,
                metric: "active_users".to_string(),
            });
            trends.push(MetricTrend {
                timestamp: metrics.timestamp,
                value: metrics.error_rate,
                metric: "error_rate".to_string(),
            });
            trends.push(MetricTrend {
                timestamp: metrics.timestamp,
                value: metrics.response_time,
                metric: "response_time".to_string(),
            });
            trends.push(MetricTrend {
                timestamp: metrics.timestamp,
                value: metrics.memory_usage,
                metric: "memory_usage".to_string(),
            });
            trends.push(MetricTrend {
                timestamp: metrics.timestamp,
                value: metrics.cpu_usage,
                metric: "cpu_usage".to_string(),
            });
        }
        
        trends
    }

    pub async fn get_custom_metrics(&self, name: Option<String>, tags: Option<HashMap<String, String>>) -> Vec<CustomMetric> {
        let custom_metrics = self.custom_metrics.read().await;
        
        custom_metrics.iter().filter(|m| {
            let name_match = name.as_ref().map_or(true, |n| m.name == *n);
            let tags_match = tags.as_ref().map_or(true, |t| {
                t.iter().all(|(k, v)| m.tags.get(k) == Some(v))
            });
            name_match && tags_match
        }).cloned().collect()
    }

    pub async fn get_performance_metrics(&self, endpoint: Option<String>, method: Option<String>) -> Vec<PerformanceMetrics> {
        let performance_metrics = self.performance_metrics.read().await;
        
        performance_metrics.iter().filter(|m| {
            let endpoint_match = endpoint.as_ref().map_or(true, |e| m.endpoint == *e);
            let method_match = method.as_ref().map_or(true, |method_str| m.method == *method_str);
            endpoint_match && method_match
        }).cloned().collect()
    }

    pub async fn get_business_metrics(&self) -> Vec<BusinessMetrics> {
        let business_metrics = self.business_metrics.read().await;
        business_metrics.clone()
    }

    // ===========================================
    // METRICS CALCULATION
    // ===========================================

    async fn calculate_tps(&self) -> f64 {
        // In a real implementation, you would track transaction counts
        // For now, return a simulated value
        let performance_metrics = self.performance_metrics.read().await;
        let recent_metrics: Vec<&PerformanceMetrics> = performance_metrics
            .iter()
            .filter(|m| m.timestamp > Utc::now() - chrono::Duration::seconds(60))
            .collect();
        
        if recent_metrics.is_empty() {
            return 0.0;
        }
        
        recent_metrics.len() as f64 / 60.0
    }

    async fn get_active_users(&self) -> u64 {
        // In a real implementation, you would track active user sessions
        // For now, return a simulated value
        150
    }

    async fn calculate_error_rate(&self) -> f64 {
        let performance_metrics = self.performance_metrics.read().await;
        let recent_metrics: Vec<&PerformanceMetrics> = performance_metrics
            .iter()
            .filter(|m| m.timestamp > Utc::now() - chrono::Duration::seconds(300))
            .collect();
        
        if recent_metrics.is_empty() {
            return 0.0;
        }
        
        let error_count = recent_metrics.iter().filter(|m| m.status_code >= 400).count();
        (error_count as f64 / recent_metrics.len() as f64) * 100.0
    }

    async fn calculate_avg_response_time(&self) -> f64 {
        let performance_metrics = self.performance_metrics.read().await;
        let recent_metrics: Vec<&PerformanceMetrics> = performance_metrics
            .iter()
            .filter(|m| m.timestamp > Utc::now() - chrono::Duration::seconds(300))
            .collect();
        
        if recent_metrics.is_empty() {
            return 0.0;
        }
        
        let total_time: f64 = recent_metrics.iter().map(|m| m.response_time).sum();
        total_time / recent_metrics.len() as f64
    }

    async fn get_memory_usage(&self) -> f64 {
        // In a real implementation, you would use system APIs to get memory usage
        // For now, return a simulated value
        45.2
    }

    async fn get_cpu_usage(&self) -> f64 {
        // In a real implementation, you would use system APIs to get CPU usage
        // For now, return a simulated value
        23.8
    }

    async fn get_disk_usage(&self) -> f64 {
        // In a real implementation, you would use system APIs to get disk usage
        // For now, return a simulated value
        67.5
    }

    async fn get_network_in(&self) -> f64 {
        // In a real implementation, you would track network I/O
        // For now, return a simulated value
        1024.5
    }

    async fn get_network_out(&self) -> f64 {
        // In a real implementation, you would track network I/O
        // For now, return a simulated value
        2048.3
    }

    async fn get_blockchain_height(&self) -> u64 {
        // In a real implementation, you would query the blockchain
        // For now, return a simulated value
        12345
    }

    async fn get_pending_transactions(&self) -> u64 {
        // In a real implementation, you would query the mempool
        // For now, return a simulated value
        25
    }

    async fn get_cache_hit_rate(&self) -> f64 {
        // In a real implementation, you would track cache statistics
        // For now, return a simulated value
        85.7
    }

    async fn get_database_connections(&self) -> u64 {
        // In a real implementation, you would query the database
        // For now, return a simulated value
        12
    }

    async fn get_avg_query_time(&self) -> f64 {
        // In a real implementation, you would track query performance
        // For now, return a simulated value
        15.3
    }

    async fn get_gas_price(&self) -> f64 {
        // In a real implementation, you would query the blockchain
        // For now, return a simulated value
        0.000001
    }

    async fn get_gas_used(&self) -> f64 {
        // In a real implementation, you would track gas usage
        // For now, return a simulated value
        21000.0
    }

    async fn get_avg_block_time(&self) -> f64 {
        // In a real implementation, you would calculate from recent blocks
        // For now, return a simulated value
        3.2
    }

    async fn get_validator_count(&self) -> u64 {
        // In a real implementation, you would query the blockchain
        // For now, return a simulated value
        21
    }

    async fn get_staking_ratio(&self) -> f64 {
        // In a real implementation, you would calculate from staking data
        // For now, return a simulated value
        45.8
    }

    async fn get_total_supply(&self) -> f64 {
        // In a real implementation, you would query the blockchain
        // For now, return a simulated value
        1000000000.0
    }

    async fn get_circulating_supply(&self) -> f64 {
        // In a real implementation, you would calculate from token data
        // For now, return a simulated value
        750000000.0
    }

    // ===========================================
    // BACKGROUND TASKS
    // ===========================================

    async fn start_collection_loop(self) {
        let mut interval = tokio::time::interval(self.config.collection_interval);
        
        loop {
            interval.tick().await;
            
            if self.config.enable_system_metrics {
                let metrics = self.collect_system_metrics().await;
                self.store_metrics(metrics).await;
            }
        }
    }

    async fn store_metrics(&self, metrics: SystemMetrics) {
        let mut history = self.metrics_history.write().await;
        history.push(metrics);

        // Keep only recent metrics
        if history.len() > self.config.max_history_size {
            let history_len = history.len();
            history.drain(0..history_len - self.config.max_history_size);
        }
    }
}

// ===========================================
// METRICS MIDDLEWARE
// ===========================================

use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
    http::StatusCode,
};

pub async fn metrics_middleware(
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let start_time = std::time::Instant::now();
    let method = request.method().to_string();
    let uri = request.uri().to_string();
    
    let response = next.run(request).await;
    
    let duration = start_time.elapsed();
    let status_code = response.status().as_u16();
    
    // Record performance metric
    // This would need access to the MetricsCollector instance
    // In a real implementation, you would use a shared state or dependency injection
    
    Ok(response)
}

// ===========================================
// TESTS
// ===========================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_metrics_collection() {
        let collector = MetricsCollector::new();
        
        // Wait a bit for background collection to start
        tokio::time::sleep(Duration::from_millis(100)).await;
        
        let metrics = collector.get_current_metrics().await;
        assert!(metrics.timestamp > Utc::now() - chrono::Duration::seconds(1));
    }

    #[tokio::test]
    async fn test_custom_metrics() {
        let collector = MetricsCollector::new();
        
        let mut tags = HashMap::new();
        tags.insert("service".to_string(), "test".to_string());
        
        collector.record_custom_metric("test_metric".to_string(), 42.0, tags).await;
        
        let metrics = collector.get_custom_metrics(Some("test_metric".to_string()), None).await;
        assert_eq!(metrics.len(), 1);
        assert_eq!(metrics[0].value, 42.0);
    }

    #[tokio::test]
    async fn test_performance_metrics() {
        let collector = MetricsCollector::new();
        
        collector.record_performance_metric(
            "/api/test".to_string(),
            "GET".to_string(),
            150.0,
            200,
            1024,
            2048,
        ).await;
        
        let metrics = collector.get_performance_metrics(Some("/api/test".to_string()), None).await;
        assert_eq!(metrics.len(), 1);
        assert_eq!(metrics[0].response_time, 150.0);
        assert_eq!(metrics[0].status_code, 200);
    }

    #[tokio::test]
    async fn test_metrics_trends() {
        let collector = MetricsCollector::new();
        
        // Wait for some metrics to be collected
        tokio::time::sleep(Duration::from_millis(100)).await;
        
        let trends = collector.get_metrics_trends(1).await;
        assert!(!trends.is_empty());
    }
}
