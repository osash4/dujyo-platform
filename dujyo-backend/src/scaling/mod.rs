//! Scaling Module for Dujyo
//! 
//! This module provides comprehensive scaling capabilities:
//! - Horizontal scaling management
//! - Stateless request handlers
//! - Load balancing strategies
//! - Database sharding
//! - Auto-scaling policies
//! - Performance monitoring

pub mod horizontal;
pub mod stateless;

pub use horizontal::{
    HorizontalScalingManager, ScalingConfig, InstanceInfo, InstanceStatus,
    SessionData, ShardConfig, ScalingEvent, ScalingEventType,
    InstanceMetrics, ScalingStats, LoadBalancer, LoadBalancingStrategy,
};
pub use stateless::{
    StatelessHandlerManager, RequestContext, StatelessResponse, HandlerMetrics,
    SessionManager, SessionData as StatelessSessionData, SessionStats,
    RequestValidator, ErrorHandler, ErrorLog,
};

// ===========================================
// SCALING MANAGER
// ===========================================

use std::sync::Arc;
use tokio::sync::RwLock;

pub struct ScalingManager {
    pub horizontal_scaling: Arc<HorizontalScalingManager>,
    pub stateless_handlers: Arc<StatelessHandlerManager>,
    pub session_manager: Arc<SessionManager>,
    pub load_balancer: Arc<LoadBalancer>,
    pub error_handler: Arc<ErrorHandler>,
    pub request_validator: Arc<RequestValidator>,
}

impl ScalingManager {
    pub fn new(service_name: String) -> Self {
        let horizontal_config = ScalingConfig::default();
        let horizontal_scaling = Arc::new(HorizontalScalingManager::new(horizontal_config));
        
        let stateless_handlers = Arc::new(StatelessHandlerManager::new(service_name.clone()));
        
        let session_manager = Arc::new(SessionManager::new(chrono::Duration::hours(24)));
        
        let load_balancer = Arc::new(LoadBalancer::new(LoadBalancingStrategy::LeastConnections));
        
        let error_handler = Arc::new(ErrorHandler::new(10000));
        
        let request_validator = Arc::new(RequestValidator::new());
        
        Self {
            horizontal_scaling,
            stateless_handlers,
            session_manager,
            load_balancer,
            error_handler,
            request_validator,
        }
    }

    pub fn new_with_config(
        service_name: String,
        horizontal_config: ScalingConfig,
        load_balancing_strategy: LoadBalancingStrategy,
    ) -> Self {
        let horizontal_scaling = Arc::new(HorizontalScalingManager::new(horizontal_config));
        
        let stateless_handlers = Arc::new(StatelessHandlerManager::new(service_name.clone()));
        
        let session_manager = Arc::new(SessionManager::new(chrono::Duration::hours(24)));
        
        let load_balancer = Arc::new(LoadBalancer::new(load_balancing_strategy));
        
        let error_handler = Arc::new(ErrorHandler::new(10000));
        
        let request_validator = Arc::new(RequestValidator::new());
        
        Self {
            horizontal_scaling,
            stateless_handlers,
            session_manager,
            load_balancer,
            error_handler,
            request_validator,
        }
    }

    // ===========================================
    // INSTANCE MANAGEMENT
    // ===========================================

    pub async fn register_instance(&self, instance: InstanceInfo) -> Result<(), String> {
        // Register with horizontal scaling manager
        self.horizontal_scaling.register_instance(instance.clone()).await?;
        
        // Add to load balancer
        self.load_balancer.add_instance(instance).await;
        
        Ok(())
    }

    pub async fn unregister_instance(&self, instance_id: &str) -> Result<(), String> {
        // Unregister from horizontal scaling manager
        self.horizontal_scaling.unregister_instance(instance_id).await?;
        
        // Remove from load balancer
        self.load_balancer.remove_instance(instance_id).await;
        
        Ok(())
    }

    pub async fn get_least_loaded_instance(&self, service_name: &str) -> Option<InstanceInfo> {
        self.horizontal_scaling.get_least_loaded_instance(service_name).await
    }

    // ===========================================
    // SESSION MANAGEMENT
    // ===========================================

    pub async fn create_session(&self, user_id: String, data: std::collections::HashMap<String, serde_json::Value>) -> String {
        self.session_manager.create_session(user_id, data).await
    }

    pub async fn get_session(&self, session_id: &str) -> Option<StatelessSessionData> {
        self.session_manager.get_session(session_id).await
    }

    pub async fn update_session(&self, session_id: &str, data: std::collections::HashMap<String, serde_json::Value>) -> Result<(), String> {
        self.session_manager.update_session(session_id, data).await
    }

    pub async fn destroy_session(&self, session_id: &str) -> Result<(), String> {
        self.session_manager.destroy_session(session_id).await
    }

    // ===========================================
    // REQUEST HANDLING
    // ===========================================

    pub async fn create_request_context(
        &self,
        request: &axum::extract::Request,
        user_id: Option<String>,
        session_id: Option<String>,
    ) -> RequestContext {
        self.stateless_handlers.create_request_context(request, user_id, session_id).await
    }

    pub async fn execute_handler<T, F, Fut>(
        &self,
        handler_name: &str,
        context: RequestContext,
        handler: F,
    ) -> StatelessResponse<T>
    where
        T: serde::Serialize,
        F: FnOnce(RequestContext) -> Fut,
        Fut: std::future::Future<Output = Result<T, String>>,
    {
        self.stateless_handlers.execute_handler(handler_name, context, handler).await
    }

    // ===========================================
    // ERROR HANDLING
    // ===========================================

    pub async fn log_error(
        &self,
        error_type: String,
        message: String,
        request_id: Option<String>,
        user_id: Option<String>,
        context: std::collections::HashMap<String, serde_json::Value>,
    ) -> String {
        self.error_handler.log_error(error_type, message, request_id, user_id, context).await
    }

    pub async fn get_errors(&self, limit: Option<usize>) -> Vec<ErrorLog> {
        self.error_handler.get_errors(limit).await
    }

    // ===========================================
    // METRICS AND STATS
    // ===========================================

    pub async fn get_scaling_stats(&self) -> ScalingStats {
        self.horizontal_scaling.get_scaling_stats().await
    }

    pub async fn get_handler_metrics(&self) -> std::collections::HashMap<String, HandlerMetrics> {
        self.stateless_handlers.get_metrics().await
    }

    pub async fn get_session_stats(&self) -> SessionStats {
        self.session_manager.get_session_stats().await
    }

    // ===========================================
    // DATABASE SHARDING
    // ===========================================

    pub async fn add_shard(&self, shard_config: ShardConfig) -> Result<(), String> {
        self.horizontal_scaling.add_shard(shard_config).await
    }

    pub async fn get_shard_for_user(&self, user_id: &str) -> Option<ShardConfig> {
        self.horizontal_scaling.get_shard_for_user(user_id).await
    }

    pub async fn get_read_replica_for_shard(&self, shard_id: &str) -> Option<String> {
        self.horizontal_scaling.get_read_replica_for_shard(shard_id).await
    }

    // ===========================================
    // CLEANUP TASKS
    // ===========================================

    pub async fn cleanup_expired_sessions(&self) -> u64 {
        self.session_manager.cleanup_expired_sessions().await
    }

    pub async fn cleanup_expired_sessions_horizontal(&self) -> u64 {
        self.horizontal_scaling.cleanup_expired_sessions().await
    }
}

impl Default for ScalingManager {
    fn default() -> Self {
        Self::new("default_service".to_string())
    }
}

// ===========================================
// SCALING CONFIGURATION
// ===========================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ScalingConfiguration {
    pub horizontal_scaling: ScalingConfig,
    pub load_balancing_strategy: LoadBalancingStrategy,
    pub session_timeout_hours: i64,
    pub max_error_logs: usize,
    pub enable_auto_scaling: bool,
    pub enable_health_checks: bool,
    pub enable_metrics_collection: bool,
}

impl Default for ScalingConfiguration {
    fn default() -> Self {
        Self {
            horizontal_scaling: ScalingConfig::default(),
            load_balancing_strategy: LoadBalancingStrategy::LeastConnections,
            session_timeout_hours: 24,
            max_error_logs: 10000,
            enable_auto_scaling: true,
            enable_health_checks: true,
            enable_metrics_collection: true,
        }
    }
}

// ===========================================
// SCALING EVENTS
// ===========================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ScalingEventNotification {
    pub event: ScalingEvent,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub severity: EventSeverity,
    pub action_required: bool,
    pub description: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum EventSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

impl ScalingEventNotification {
    pub fn new(event: ScalingEvent, severity: EventSeverity, description: String) -> Self {
        let action_required = matches!(severity, EventSeverity::Error | EventSeverity::Critical);
        
        Self {
            event,
            timestamp: chrono::Utc::now(),
            severity,
            action_required,
            description,
        }
    }
}

// ===========================================
// SCALING HEALTH CHECK
// ===========================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ScalingHealthCheck {
    pub overall_status: HealthStatus,
    pub horizontal_scaling_status: HealthStatus,
    pub stateless_handlers_status: HealthStatus,
    pub session_manager_status: HealthStatus,
    pub load_balancer_status: HealthStatus,
    pub error_handler_status: HealthStatus,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub details: std::collections::HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum HealthStatus {
    Healthy,
    Warning,
    Critical,
    Unknown,
}

impl ScalingManager {
    pub async fn health_check(&self) -> ScalingHealthCheck {
        let timestamp = chrono::Utc::now();
        let mut details = std::collections::HashMap::new();
        
        // Check horizontal scaling
        let horizontal_scaling_status = if self.horizontal_scaling.config.enable_horizontal_scaling {
            HealthStatus::Healthy
        } else {
            HealthStatus::Warning
        };
        
        // Check stateless handlers
        let handler_metrics = self.stateless_handlers.get_metrics().await;
        let stateless_handlers_status = if handler_metrics.is_empty() {
            HealthStatus::Warning
        } else {
            HealthStatus::Healthy
        };
        
        // Check session manager
        let session_stats = self.session_manager.get_session_stats().await;
        let session_manager_status = if session_stats.total_sessions > 100000 {
            HealthStatus::Warning
        } else {
            HealthStatus::Healthy
        };
        
        // Check load balancer
        let load_balancer_status = HealthStatus::Healthy; // Simplified check
        
        // Check error handler
        let recent_errors = self.error_handler.get_errors(Some(100)).await;
        let error_handler_status = if recent_errors.len() > 1000 {
            HealthStatus::Warning
        } else {
            HealthStatus::Healthy
        };
        
        // Determine overall status
        let overall_status = if [horizontal_scaling_status.clone(), stateless_handlers_status.clone(), 
                                session_manager_status.clone(), load_balancer_status.clone(), 
                                error_handler_status.clone()].iter().any(|s| *s == HealthStatus::Critical) {
            HealthStatus::Critical
        } else if [horizontal_scaling_status.clone(), stateless_handlers_status.clone(), 
                  session_manager_status.clone(), load_balancer_status.clone(), 
                  error_handler_status.clone()].iter().any(|s| *s == HealthStatus::Warning) {
            HealthStatus::Warning
        } else {
            HealthStatus::Healthy
        };
        
        // Add details
        details.insert("handler_count".to_string(), serde_json::json!(handler_metrics.len()));
        details.insert("total_sessions".to_string(), serde_json::json!(session_stats.total_sessions));
        details.insert("recent_errors".to_string(), serde_json::json!(recent_errors.len()));
        
        ScalingHealthCheck {
            overall_status,
            horizontal_scaling_status,
            stateless_handlers_status,
            session_manager_status,
            load_balancer_status,
            error_handler_status,
            timestamp,
            details,
        }
    }
}

// ===========================================
// TESTS
// ===========================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_scaling_manager() {
        let manager = ScalingManager::new("test_service".to_string());
        
        // Test session creation
        let mut data = std::collections::HashMap::new();
        data.insert("key".to_string(), serde_json::json!("value"));
        
        let session_id = manager.create_session("user_123".to_string(), data).await;
        assert!(!session_id.is_empty());
        
        // Test session retrieval
        let session = manager.get_session(&session_id).await;
        assert!(session.is_some());
        assert_eq!(session.unwrap().user_id, "user_123");
    }

    #[tokio::test]
    async fn test_scaling_health_check() {
        let manager = ScalingManager::new("test_service".to_string());
        
        let health_check = manager.health_check().await;
        assert_eq!(health_check.overall_status, HealthStatus::Healthy);
        assert_eq!(health_check.horizontal_scaling_status, HealthStatus::Healthy);
        assert_eq!(health_check.stateless_handlers_status, HealthStatus::Warning);
    }

    #[tokio::test]
    async fn test_scaling_configuration() {
        let config = ScalingConfiguration::default();
        assert!(config.enable_auto_scaling);
        assert!(config.enable_health_checks);
        assert_eq!(config.session_timeout_hours, 24);
    }
}
