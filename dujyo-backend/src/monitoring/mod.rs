//! Monitoring Module for Dujyo
//! 
//! This module provides comprehensive monitoring capabilities:
//! - Error tracking and analysis
//! - Real-time metrics collection
//! - Performance monitoring
//! - Health checks
//! - Custom dashboards
//! - Alerting system

pub mod error_tracker;
pub mod metrics_collector;
pub mod api;
pub mod prometheus;
pub mod alerts;

pub use error_tracker::{ErrorTracker, ErrorTrackerConfig, ErrorContext, ErrorSeverity, ErrorCategory};
pub use metrics_collector::{MetricsCollector, MetricsConfig, SystemMetrics, CustomMetric, PerformanceMetrics, BusinessMetrics};
pub use api::{monitoring_routes, MonitoringState};
pub use alerts::{AlertChecker, AlertConfig, Alert, AlertType, AlertSeverity, AlertManager};

// Alert types are defined in alerts.rs

// ===========================================
// MONITORING MANAGER
// ===========================================

use std::sync::Arc;
use tokio::sync::RwLock;

pub struct MonitoringManager {
    pub error_tracker: Arc<ErrorTracker>,
    pub metrics_collector: Arc<MetricsCollector>,
    pub state: Arc<MonitoringState>,
}

impl MonitoringManager {
    pub fn new() -> Self {
        let error_tracker_config = ErrorTrackerConfig::default();
        let error_tracker = Arc::new(ErrorTracker::new(error_tracker_config));
        
        let metrics_config = MetricsConfig::default();
        let metrics_collector = Arc::new(MetricsCollector::new_with_config(metrics_config));
        
        let state = Arc::new(MonitoringState::new());
        
        Self {
            error_tracker,
            metrics_collector,
            state,
        }
    }

    pub fn new_with_configs(
        error_config: ErrorTrackerConfig,
        metrics_config: MetricsConfig,
    ) -> Self {
        let error_tracker = Arc::new(ErrorTracker::new(error_config));
        let metrics_collector = Arc::new(MetricsCollector::new_with_config(metrics_config));
        let state = Arc::new(MonitoringState::new());
        
        Self {
            error_tracker,
            metrics_collector,
            state,
        }
    }

    pub async fn capture_error(
        &self,
        error: &dyn std::error::Error,
        context: ErrorContext,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        self.error_tracker.capture_error(error, context).await
    }

    pub async fn record_custom_metric(
        &self,
        name: String,
        value: f64,
        tags: std::collections::HashMap<String, String>,
    ) {
        self.metrics_collector.record_custom_metric(name, value, tags).await;
    }

    pub async fn record_performance_metric(
        &self,
        endpoint: String,
        method: String,
        response_time: f64,
        status_code: u16,
        request_size: u64,
        response_size: u64,
    ) {
        self.metrics_collector.record_performance_metric(
            endpoint, method, response_time, status_code, request_size, response_size,
        ).await;
    }

    pub async fn get_current_metrics(&self) -> SystemMetrics {
        self.metrics_collector.get_current_metrics().await
    }

    pub async fn get_error_groups(&self) -> Vec<error_tracker::ErrorGroup> {
        self.error_tracker.get_error_groups().await
    }

    pub async fn generate_error_report(&self, hours: u64) -> error_tracker::ErrorReport {
        self.error_tracker.generate_error_report(hours).await
    }
}

impl Default for MonitoringManager {
    fn default() -> Self {
        Self::new()
    }
}

// ===========================================
// HEALTH CHECK SYSTEM
// ===========================================

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheck {
    pub name: String,
    pub status: HealthStatus,
    pub response_time: u64,
    pub last_check: chrono::DateTime<chrono::Utc>,
    pub details: std::collections::HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum HealthStatus {
    Healthy,
    Warning,
    Critical,
    Unknown,
}

pub struct HealthChecker {
    checks: Arc<RwLock<Vec<HealthCheck>>>,
}

impl HealthChecker {
    pub fn new() -> Self {
        Self {
            checks: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn add_check(&self, check: HealthCheck) {
        let mut checks = self.checks.write().await;
        checks.push(check);
    }

    pub async fn run_all_checks(&self) -> Vec<HealthCheck> {
        let mut checks = self.checks.write().await;
        
        for check in checks.iter_mut() {
            let start_time = std::time::Instant::now();
            
            // Run the actual health check
            let status = self.run_health_check(&check.name).await;
            let response_time = start_time.elapsed().as_millis() as u64;
            
            check.status = status;
            check.response_time = response_time;
            check.last_check = chrono::Utc::now();
        }
        
        checks.clone()
    }

    async fn run_health_check(&self, name: &str) -> HealthStatus {
        match name {
            "database" => self.check_database().await,
            "blockchain" => self.check_blockchain().await,
            "redis" => self.check_redis().await,
            "external_apis" => self.check_external_apis().await,
            _ => HealthStatus::Unknown,
        }
    }

    async fn check_database(&self) -> HealthStatus {
        // In a real implementation, you would ping the database
        // For now, return a simulated status
        HealthStatus::Healthy
    }

    async fn check_blockchain(&self) -> HealthStatus {
        // In a real implementation, you would check blockchain connectivity
        // For now, return a simulated status
        HealthStatus::Healthy
    }

    async fn check_redis(&self) -> HealthStatus {
        // In a real implementation, you would ping Redis
        // For now, return a simulated status
        HealthStatus::Healthy
    }

    async fn check_external_apis(&self) -> HealthStatus {
        // In a real implementation, you would check external API endpoints
        // For now, return a simulated status
        HealthStatus::Healthy
    }
}

// Alert types are now defined in alerts.rs module

// ===========================================
// TESTS
// ===========================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_monitoring_manager() {
        let manager = MonitoringManager::new();
        
        let metrics = manager.get_current_metrics().await;
        assert!(metrics.timestamp > chrono::Utc::now() - chrono::Duration::seconds(1));
    }

    #[tokio::test]
    async fn test_health_checker() {
        let checker = HealthChecker::new();
        
        let check = HealthCheck {
            name: "test".to_string(),
            status: HealthStatus::Unknown,
            response_time: 0,
            last_check: chrono::Utc::now(),
            details: std::collections::HashMap::new(),
        };
        
        checker.add_check(check).await;
        let results = checker.run_all_checks().await;
        assert_eq!(results.len(), 1);
    }

    #[tokio::test]
    async fn test_alert_manager() {
        use crate::monitoring::alerts::{AlertManager, AlertType, AlertSeverity};
        
        let manager = AlertManager::new();
        
        let alert_id = manager.create_alert(
            AlertType::Error,
            "Test Alert".to_string(),
            "This is a test alert".to_string(),
            AlertSeverity::High,
            "test-service".to_string(),
            std::collections::HashMap::new(),
        ).await;
        
        assert!(!alert_id.is_empty());
    }
}