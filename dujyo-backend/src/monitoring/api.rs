//! Monitoring API Endpoints for Dujyo
//! 
//! This module provides REST API endpoints for monitoring:
//! - Real-time metrics collection
//! - Error tracking and analysis
//! - Health checks for all services
//! - Log aggregation and filtering
//! - Performance monitoring

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::monitoring::error_tracker::{ErrorTracker, ErrorTrackerConfig, ErrorSeverity, ErrorCategory};
use crate::monitoring::metrics_collector::{MetricsCollector, SystemMetrics};

// ===========================================
// TYPES & STRUCTS
// ===========================================

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthCheckResponse {
    pub status: String,
    pub timestamp: String,
    pub services: Vec<ServiceHealth>,
    pub uptime: u64,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHealth {
    pub name: String,
    pub status: String,
    pub response_time: u64,
    pub last_check: String,
    pub details: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MetricsResponse {
    pub timestamp: String,
    pub metrics: SystemMetrics,
    pub trends: Vec<MetricTrend>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MetricTrend {
    pub timestamp: String,
    pub value: f64,
    pub metric: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub errors: Vec<ErrorDetails>,
    pub total: u64,
    pub page: u64,
    pub per_page: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorDetails {
    pub id: String,
    pub error_type: String,
    pub message: String,
    pub severity: String,
    pub category: String,
    pub timestamp: String,
    pub count: u64,
    pub resolved: bool,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LogResponse {
    pub logs: Vec<LogEntry>,
    pub total: u64,
    pub page: u64,
    pub per_page: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: String,
    pub level: String,
    pub service: String,
    pub message: String,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AlertResponse {
    pub alerts: Vec<Alert>,
    pub total: u64,
    pub unacknowledged: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: String,
    pub r#type: String,
    pub title: String,
    pub message: String,
    pub severity: String,
    pub timestamp: String,
    pub acknowledged: bool,
    pub resolved: bool,
    pub service: String,
}

#[derive(Debug, Deserialize)]
pub struct LogQuery {
    pub level: Option<String>,
    pub service: Option<String>,
    pub limit: Option<u64>,
    pub offset: Option<u64>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ErrorQuery {
    pub severity: Option<String>,
    pub category: Option<String>,
    pub resolved: Option<bool>,
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

// ===========================================
// MONITORING STATE
// ===========================================

pub struct MonitoringState {
    pub error_tracker: Arc<ErrorTracker>,
    pub metrics_collector: Arc<MetricsCollector>,
    pub health_checks: Arc<RwLock<HashMap<String, ServiceHealth>>>,
    pub logs: Arc<RwLock<Vec<LogEntry>>>,
    pub alerts: Arc<RwLock<Vec<Alert>>>,
}

impl MonitoringState {
    pub fn new() -> Self {
        let error_tracker_config = ErrorTrackerConfig::default();
        let error_tracker = Arc::new(ErrorTracker::new(error_tracker_config));
        let metrics_collector = Arc::new(MetricsCollector::new());
        
        Self {
            error_tracker,
            metrics_collector,
            health_checks: Arc::new(RwLock::new(HashMap::new())),
            logs: Arc::new(RwLock::new(Vec::new())),
            alerts: Arc::new(RwLock::new(Vec::new())),
        }
    }
}

// ===========================================
// API ROUTES
// ===========================================

pub fn monitoring_routes() -> Router<Arc<MonitoringState>> {
    Router::new()
        // Health checks
        .route("/health", get(health_check))
        .route("/health/:service", get(service_health_check))
        
        // Metrics
        .route("/metrics", get(get_metrics))
        .route("/metrics/trends", get(get_metrics_trends))
        
        // Errors
        .route("/errors", get(get_errors))
        .route("/errors/:id", get(get_error))
        .route("/errors/:id/resolve", post(resolve_error))
        .route("/errors/:id/acknowledge", post(acknowledge_error))
        .route("/errors/groups", get(get_error_groups))
        
        // Logs
        .route("/logs", get(get_logs))
        .route("/logs/:id", get(get_log))
        
        // Alerts
        .route("/alerts", get(get_alerts))
        .route("/alerts/:id/acknowledge", post(acknowledge_alert))
        .route("/alerts/:id/resolve", post(resolve_alert))
        
        // Reports
        .route("/reports/errors", get(get_error_report))
        .route("/reports/performance", get(get_performance_report))
        
        // System info
        .route("/system/info", get(get_system_info))
        .route("/system/stats", get(get_system_stats))
}

// ===========================================
// HEALTH CHECK ENDPOINTS
// ===========================================

async fn health_check(
    State(state): State<Arc<MonitoringState>>,
) -> Result<Json<HealthCheckResponse>, StatusCode> {
    let health_checks = state.health_checks.read().await;
    let services: Vec<ServiceHealth> = health_checks.values().cloned().collect();
    
    let overall_status = if services.iter().any(|s| s.status == "critical") {
        "critical"
    } else if services.iter().any(|s| s.status == "warning") {
        "warning"
    } else {
        "healthy"
    };
    
    let response = HealthCheckResponse {
        status: overall_status.to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        services,
        uptime: get_system_uptime(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    };
    
    Ok(Json(response))
}

async fn service_health_check(
    State(state): State<Arc<MonitoringState>>,
    Path(service_name): Path<String>,
) -> Result<Json<ServiceHealth>, StatusCode> {
    let health_checks = state.health_checks.read().await;
    
    if let Some(service) = health_checks.get(&service_name) {
        Ok(Json(service.clone()))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

// ===========================================
// METRICS ENDPOINTS
// ===========================================

async fn get_metrics(
    State(state): State<Arc<MonitoringState>>,
) -> Result<Json<MetricsResponse>, StatusCode> {
    let metrics = state.metrics_collector.get_current_metrics().await;
    let trends = state.metrics_collector.get_metrics_trends(24).await;
    
    let response = MetricsResponse {
        timestamp: chrono::Utc::now().to_rfc3339(),
        metrics,
        trends: trends.into_iter().map(|t| MetricTrend {
            timestamp: t.timestamp.to_rfc3339(),
            value: t.value,
            metric: t.metric,
        }).collect(),
    };
    
    Ok(Json(response))
}

async fn get_metrics_trends(
    State(state): State<Arc<MonitoringState>>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<MetricTrend>>, StatusCode> {
    let hours = params.get("hours")
        .and_then(|h| h.parse::<u64>().ok())
        .unwrap_or(24);
    
    let trends = state.metrics_collector.get_metrics_trends(hours).await;
    
    let response: Vec<MetricTrend> = trends.into_iter().map(|t| MetricTrend {
        timestamp: t.timestamp.to_rfc3339(),
        value: t.value,
        metric: t.metric,
    }).collect();
    
    Ok(Json(response))
}

// ===========================================
// ERROR ENDPOINTS
// ===========================================

async fn get_errors(
    State(state): State<Arc<MonitoringState>>,
    Query(query): Query<ErrorQuery>,
) -> Result<Json<ErrorResponse>, StatusCode> {
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);
    
    let mut errors = if let Some(severity) = &query.severity {
        let severity_enum = match severity.as_str() {
            "critical" => ErrorSeverity::Critical,
            "high" => ErrorSeverity::High,
            "medium" => ErrorSeverity::Medium,
            "low" => ErrorSeverity::Low,
            "info" => ErrorSeverity::Info,
            _ => return Err(StatusCode::BAD_REQUEST),
        };
        state.error_tracker.get_errors_by_severity(severity_enum).await
    } else if let Some(category) = &query.category {
        let category_enum = match category.as_str() {
            "database" => ErrorCategory::Database,
            "blockchain" => ErrorCategory::Blockchain,
            "authentication" => ErrorCategory::Authentication,
            "validation" => ErrorCategory::Validation,
            "network" => ErrorCategory::Network,
            "filesystem" => ErrorCategory::FileSystem,
            "external_api" => ErrorCategory::ExternalAPI,
            "business_logic" => ErrorCategory::BusinessLogic,
            "security" => ErrorCategory::Security,
            "performance" => ErrorCategory::Performance,
            "unknown" => ErrorCategory::Unknown,
            _ => return Err(StatusCode::BAD_REQUEST),
        };
        state.error_tracker.get_errors_by_category(category_enum).await
    } else {
        // Get all errors (this would need to be implemented in ErrorTracker)
        vec![]
    };
    
    // Filter by resolved status
    if let Some(resolved) = query.resolved {
        errors.retain(|e| e.resolved == resolved);
    }
    
    let total = errors.len() as u64;
    let paginated_errors: Vec<ErrorDetails> = errors
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .map(|e| ErrorDetails {
            id: e.id,
            error_type: e.error_type,
            message: e.message,
            severity: format!("{:?}", e.severity).to_lowercase(),
            category: format!("{:?}", e.category).to_lowercase(),
            timestamp: e.last_seen.to_rfc3339(),
            count: e.count,
            resolved: e.resolved,
            tags: e.tags,
        })
        .collect();
    
    let response = ErrorResponse {
        errors: paginated_errors,
        total,
        page: (offset / limit) + 1,
        per_page: limit,
    };
    
    Ok(Json(response))
}

async fn get_error(
    State(state): State<Arc<MonitoringState>>,
    Path(error_id): Path<String>,
) -> Result<Json<ErrorDetails>, StatusCode> {
    if let Some(error) = state.error_tracker.get_error_by_id(&error_id).await {
        let response = ErrorDetails {
            id: error.id,
            error_type: error.error_type,
            message: error.message,
            severity: format!("{:?}", error.severity).to_lowercase(),
            category: format!("{:?}", error.category).to_lowercase(),
            timestamp: error.last_seen.to_rfc3339(),
            count: error.count,
            resolved: error.resolved,
            tags: error.tags,
        };
        Ok(Json(response))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn resolve_error(
    State(state): State<Arc<MonitoringState>>,
    Path(error_id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    match state.error_tracker.resolve_error(&error_id).await {
        Ok(_) => Ok(Json(serde_json::json!({"status": "resolved"}))),
        Err(_) => Err(StatusCode::NOT_FOUND),
    }
}

async fn acknowledge_error(
    State(state): State<Arc<MonitoringState>>,
    Path(error_id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // This would need to be implemented in ErrorTracker
    Ok(Json(serde_json::json!({"status": "acknowledged"})))
}

async fn get_error_groups(
    State(state): State<Arc<MonitoringState>>,
) -> Result<Json<Vec<serde_json::Value>>, StatusCode> {
    let groups = state.error_tracker.get_error_groups().await;
    
    let response: Vec<serde_json::Value> = groups.into_iter().map(|g| {
        serde_json::json!({
            "fingerprint": g.fingerprint,
            "error_type": g.error_type,
            "message": g.message,
            "severity": format!("{:?}", g.severity).to_lowercase(),
            "category": format!("{:?}", g.category).to_lowercase(),
            "first_seen": g.first_seen.to_rfc3339(),
            "last_seen": g.last_seen.to_rfc3339(),
            "total_count": g.total_count,
            "affected_users": g.affected_users,
            "resolved": g.resolved,
            "tags": g.tags,
        })
    }).collect();
    
    Ok(Json(response))
}

// ===========================================
// LOG ENDPOINTS
// ===========================================

async fn get_logs(
    State(state): State<Arc<MonitoringState>>,
    Query(query): Query<LogQuery>,
) -> Result<Json<LogResponse>, StatusCode> {
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);
    
    let logs = state.logs.read().await;
    let mut filtered_logs: Vec<&LogEntry> = logs.iter().collect();
    
    // Filter by level
    if let Some(level) = &query.level {
        filtered_logs.retain(|log| log.level == *level);
    }
    
    // Filter by service
    if let Some(service) = &query.service {
        filtered_logs.retain(|log| log.service == *service);
    }
    
    // Filter by time range
    if let Some(start_time) = &query.start_time {
        if let Ok(start) = chrono::DateTime::parse_from_rfc3339(start_time) {
            filtered_logs.retain(|log| {
                if let Ok(log_time) = chrono::DateTime::parse_from_rfc3339(&log.timestamp) {
                    log_time >= start
                } else {
                    false
                }
            });
        }
    }
    
    if let Some(end_time) = &query.end_time {
        if let Ok(end) = chrono::DateTime::parse_from_rfc3339(end_time) {
            filtered_logs.retain(|log| {
                if let Ok(log_time) = chrono::DateTime::parse_from_rfc3339(&log.timestamp) {
                    log_time <= end
                } else {
                    false
                }
            });
        }
    }
    
    let total = filtered_logs.len() as u64;
    let paginated_logs: Vec<LogEntry> = filtered_logs
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .cloned()
        .collect();
    
    let response = LogResponse {
        logs: paginated_logs,
        total,
        page: (offset / limit) + 1,
        per_page: limit,
    };
    
    Ok(Json(response))
}

async fn get_log(
    State(state): State<Arc<MonitoringState>>,
    Path(log_id): Path<String>,
) -> Result<Json<LogEntry>, StatusCode> {
    let logs = state.logs.read().await;
    
    if let Some(log) = logs.iter().find(|l| l.id == log_id) {
        Ok(Json(log.clone()))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

// ===========================================
// ALERT ENDPOINTS
// ===========================================

async fn get_alerts(
    State(state): State<Arc<MonitoringState>>,
) -> Result<Json<AlertResponse>, StatusCode> {
    let alerts = state.alerts.read().await;
    let unacknowledged = alerts.iter().filter(|a| !a.acknowledged).count() as u64;
    
    let response = AlertResponse {
        alerts: alerts.clone(),
        total: alerts.len() as u64,
        unacknowledged,
    };
    
    Ok(Json(response))
}

async fn acknowledge_alert(
    State(state): State<Arc<MonitoringState>>,
    Path(alert_id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let mut alerts = state.alerts.write().await;
    
    if let Some(alert) = alerts.iter_mut().find(|a| a.id == alert_id) {
        alert.acknowledged = true;
        Ok(Json(serde_json::json!({"status": "acknowledged"})))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn resolve_alert(
    State(state): State<Arc<MonitoringState>>,
    Path(alert_id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let mut alerts = state.alerts.write().await;
    
    if let Some(alert) = alerts.iter_mut().find(|a| a.id == alert_id) {
        alert.resolved = true;
        Ok(Json(serde_json::json!({"status": "resolved"})))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

// ===========================================
// REPORT ENDPOINTS
// ===========================================

async fn get_error_report(
    State(state): State<Arc<MonitoringState>>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let hours = params.get("hours")
        .and_then(|h| h.parse::<u64>().ok())
        .unwrap_or(24);
    
    let report = state.error_tracker.generate_error_report(hours).await;
    
    let response = serde_json::json!({
        "period": report.period,
        "total_errors": report.total_errors,
        "critical_errors": report.critical_errors,
        "high_errors": report.high_errors,
        "medium_errors": report.medium_errors,
        "low_errors": report.low_errors,
        "top_errors": report.top_errors,
        "error_trends": report.error_trends,
        "affected_services": report.affected_services,
    });
    
    Ok(Json(response))
}

async fn get_performance_report(
    State(state): State<Arc<MonitoringState>>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let hours = params.get("hours")
        .and_then(|h| h.parse::<u64>().ok())
        .unwrap_or(24);
    
    let trends = state.metrics_collector.get_metrics_trends(hours).await;
    let current_metrics = state.metrics_collector.get_current_metrics().await;
    
    let response = serde_json::json!({
        "period": format!("Last {} hours", hours),
        "current_metrics": current_metrics,
        "trends": trends,
        "performance_summary": {
            "avg_tps": trends.iter().filter(|t| t.metric == "tps").map(|t| t.value).sum::<f64>() / trends.len() as f64,
            "avg_response_time": trends.iter().filter(|t| t.metric == "response_time").map(|t| t.value).sum::<f64>() / trends.len() as f64,
            "avg_active_users": trends.iter().filter(|t| t.metric == "active_users").map(|t| t.value).sum::<f64>() / trends.len() as f64,
        }
    });
    
    Ok(Json(response))
}

// ===========================================
// SYSTEM INFO ENDPOINTS
// ===========================================

async fn get_system_info(
    State(_state): State<Arc<MonitoringState>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let response = serde_json::json!({
        "version": env!("CARGO_PKG_VERSION"),
        "build_time": "unknown",
        "git_commit": "unknown",
        "rust_version": "unknown",
        "target_arch": "unknown",
        "uptime": get_system_uptime(),
        "environment": std::env::var("ENVIRONMENT").unwrap_or_else(|_| "development".to_string()),
    });
    
    Ok(Json(response))
}

async fn get_system_stats(
    State(state): State<Arc<MonitoringState>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let metrics = state.metrics_collector.get_current_metrics().await;
    let error_groups = state.error_tracker.get_error_groups().await;
    let alerts = state.alerts.read().await;
    
    let response = serde_json::json!({
        "metrics": metrics,
        "error_groups_count": error_groups.len(),
        "alerts_count": alerts.len(),
        "unacknowledged_alerts": alerts.iter().filter(|a| !a.acknowledged).count(),
        "system_health": {
            "status": if metrics.error_rate > 5.0 { "warning" } else { "healthy" },
            "uptime": get_system_uptime(),
            "last_restart": "unknown", // This would need to be tracked
        }
    });
    
    Ok(Json(response))
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

fn get_system_uptime() -> u64 {
    // In a real implementation, you would track system uptime
    // For now, return a placeholder
    3600 // 1 hour in seconds
}

// ===========================================
// TESTS
// ===========================================

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
        Router,
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_health_check() {
        let state = Arc::new(MonitoringState::new());
        let app = Router::new().route("/health", get(health_check)).with_state(state);
        
        let request = Request::builder()
            .uri("/health")
            .body(Body::empty())
            .unwrap();
        
        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_get_metrics() {
        let state = Arc::new(MonitoringState::new());
        let app = Router::new().route("/metrics", get(get_metrics)).with_state(state);
        
        let request = Request::builder()
            .uri("/metrics")
            .body(Body::empty())
            .unwrap();
        
        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_get_errors() {
        let state = Arc::new(MonitoringState::new());
        let app = Router::new().route("/errors", get(get_errors)).with_state(state);
        
        let request = Request::builder()
            .uri("/errors")
            .body(Body::empty())
            .unwrap();
        
        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }
}
