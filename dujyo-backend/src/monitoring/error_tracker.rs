//! Error Tracking System for Dujyo
//! 
//! This module provides comprehensive error tracking without paid tools:
//! - Capture all errors with stack traces
//! - Context collection (user, request, environment)
//! - Error frequency analysis
//! - Auto-reports and notifications
//! - Error categorization and grouping

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH, Duration};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use uuid::Uuid;
use chrono::{DateTime, Utc};

// ===========================================
// TYPES & STRUCTS
// ===========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorContext {
    pub user_id: Option<String>,
    pub session_id: Option<String>,
    pub request_id: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub endpoint: Option<String>,
    pub method: Option<String>,
    pub headers: HashMap<String, String>,
    pub environment: String,
    pub version: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StackFrame {
    pub file: String,
    pub line: u32,
    pub function: String,
    pub module: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorDetails {
    pub id: String,
    pub error_type: String,
    pub message: String,
    pub stack_trace: Vec<StackFrame>,
    pub context: ErrorContext,
    pub severity: ErrorSeverity,
    pub category: ErrorCategory,
    pub fingerprint: String,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub count: u64,
    pub resolved: bool,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ErrorSeverity {
    Critical,
    High,
    Medium,
    Low,
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ErrorCategory {
    Database,
    Blockchain,
    Authentication,
    Validation,
    Network,
    FileSystem,
    ExternalAPI,
    BusinessLogic,
    Security,
    Performance,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorGroup {
    pub fingerprint: String,
    pub error_type: String,
    pub message: String,
    pub severity: ErrorSeverity,
    pub category: ErrorCategory,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub total_count: u64,
    pub affected_users: u64,
    pub resolved: bool,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorReport {
    pub period: String,
    pub total_errors: u64,
    pub critical_errors: u64,
    pub high_errors: u64,
    pub medium_errors: u64,
    pub low_errors: u64,
    pub top_errors: Vec<ErrorGroup>,
    pub error_trends: Vec<ErrorTrend>,
    pub affected_services: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorTrend {
    pub timestamp: DateTime<Utc>,
    pub count: u64,
    pub severity: ErrorSeverity,
}

// ===========================================
// ERROR TRACKER
// ===========================================

#[derive(Clone)]
pub struct ErrorTracker {
    errors: Arc<RwLock<HashMap<String, ErrorDetails>>>,
    error_groups: Arc<RwLock<HashMap<String, ErrorGroup>>>,
    error_trends: Arc<RwLock<Vec<ErrorTrend>>>,
    config: ErrorTrackerConfig,
}

#[derive(Debug, Clone)]
pub struct ErrorTrackerConfig {
    pub max_errors: usize,
    pub max_trends: usize,
    pub auto_report_interval: Duration,
    pub critical_threshold: u64,
    pub high_threshold: u64,
    pub enable_notifications: bool,
    pub notification_emails: Vec<String>,
    pub log_file_path: String,
}

impl Default for ErrorTrackerConfig {
    fn default() -> Self {
        Self {
            max_errors: 10000,
            max_trends: 1000,
            auto_report_interval: Duration::from_secs(3600), // 1 hour
            critical_threshold: 10,
            high_threshold: 50,
            enable_notifications: true,
            notification_emails: vec![],
            log_file_path: "logs/errors.json".to_string(),
        }
    }
}

impl ErrorTracker {
    pub fn new(config: ErrorTrackerConfig) -> Self {
        let tracker = Self {
            errors: Arc::new(RwLock::new(HashMap::new())),
            error_groups: Arc::new(RwLock::new(HashMap::new())),
            error_trends: Arc::new(RwLock::new(Vec::new())),
            config,
        };

        // Start background tasks
        tokio::spawn(tracker.clone().auto_report_task());
        tokio::spawn(tracker.clone().cleanup_task());

        tracker
    }

    // ===========================================
    // ERROR CAPTURE
    // ===========================================

    pub async fn capture_error(
        &self,
        error: &dyn std::error::Error,
        context: ErrorContext,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let error_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        // Extract stack trace
        let stack_trace = self.extract_stack_trace(error);

        // Determine error category and severity
        let category = self.categorize_error(error);
        let severity = self.determine_severity(error, &category);

        // Generate fingerprint for grouping
        let fingerprint = self.generate_fingerprint(error, &stack_trace);

        let error_details = ErrorDetails {
            id: error_id.clone(),
            error_type: error.to_string(),
            message: error.to_string(),
            stack_trace,
            context,
            severity,
            category,
            fingerprint: fingerprint.clone(),
            first_seen: now,
            last_seen: now,
            count: 1,
            resolved: false,
            tags: self.generate_tags(error),
        };

        // Store error
        {
            let mut errors = self.errors.write().await;
            errors.insert(error_id.clone(), error_details.clone());
        }

        // Update error groups
        self.update_error_group(&fingerprint, &error_details).await;

        // Update trends
        self.update_trends(&error_details).await;

        // Check thresholds and send notifications
        self.check_thresholds(&error_details).await;

        // Log to file
        self.log_error_to_file(&error_details).await;

        Ok(error_id)
    }

    pub async fn capture_error_with_context(
        &self,
        error: &dyn std::error::Error,
        user_id: Option<String>,
        request_id: Option<String>,
        endpoint: Option<String>,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let context = ErrorContext {
            user_id,
            session_id: None,
            request_id,
            ip_address: None,
            user_agent: None,
            endpoint,
            method: None,
            headers: HashMap::new(),
            environment: std::env::var("ENVIRONMENT").unwrap_or_else(|_| "development".to_string()),
            version: env!("CARGO_PKG_VERSION").to_string(),
            timestamp: Utc::now(),
        };

        self.capture_error(error, context).await
    }

    // ===========================================
    // ERROR ANALYSIS
    // ===========================================

    pub async fn get_error_groups(&self) -> Vec<ErrorGroup> {
        let groups = self.error_groups.read().await;
        groups.values().cloned().collect()
    }

    pub async fn get_error_by_id(&self, error_id: &str) -> Option<ErrorDetails> {
        let errors = self.errors.read().await;
        errors.get(error_id).cloned()
    }

    pub async fn get_errors_by_severity(&self, severity: ErrorSeverity) -> Vec<ErrorDetails> {
        let errors = self.errors.read().await;
        errors
            .values()
            .filter(|e| e.severity == severity)
            .cloned()
            .collect()
    }

    pub async fn get_errors_by_category(&self, category: ErrorCategory) -> Vec<ErrorDetails> {
        let errors = self.errors.read().await;
        errors
            .values()
            .filter(|e| e.category == category)
            .cloned()
            .collect()
    }

    pub async fn get_error_trends(&self, hours: u64) -> Vec<ErrorTrend> {
        let trends = self.error_trends.read().await;
        let cutoff = Utc::now() - chrono::Duration::hours(hours as i64);
        
        trends
            .iter()
            .filter(|t| t.timestamp > cutoff)
            .cloned()
            .collect()
    }

    pub async fn generate_error_report(&self, hours: u64) -> ErrorReport {
        let errors = self.errors.read().await;
        let groups = self.error_groups.read().await;
        let trends = self.get_error_trends(hours).await;

        let cutoff = Utc::now() - chrono::Duration::hours(hours as i64);
        
        let recent_errors: Vec<&ErrorDetails> = errors
            .values()
            .filter(|e| e.last_seen > cutoff)
            .collect();

        let total_errors = recent_errors.len() as u64;
        let critical_errors = recent_errors.iter().filter(|e| e.severity == ErrorSeverity::Critical).count() as u64;
        let high_errors = recent_errors.iter().filter(|e| e.severity == ErrorSeverity::High).count() as u64;
        let medium_errors = recent_errors.iter().filter(|e| e.severity == ErrorSeverity::Medium).count() as u64;
        let low_errors = recent_errors.iter().filter(|e| e.severity == ErrorSeverity::Low).count() as u64;

        let mut top_errors: Vec<ErrorGroup> = groups.values().cloned().collect();
        top_errors.sort_by(|a, b| b.total_count.cmp(&a.total_count));
        top_errors.truncate(10);

        let affected_services: Vec<String> = recent_errors
            .iter()
            .filter_map(|e| e.context.endpoint.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        ErrorReport {
            period: format!("Last {} hours", hours),
            total_errors,
            critical_errors,
            high_errors,
            medium_errors,
            low_errors,
            top_errors,
            error_trends: trends,
            affected_services,
        }
    }

    // ===========================================
    // ERROR MANAGEMENT
    // ===========================================

    pub async fn resolve_error(&self, error_id: &str) -> Result<(), String> {
        let mut errors = self.errors.write().await;
        if let Some(error) = errors.get_mut(error_id) {
            error.resolved = true;
            Ok(())
        } else {
            Err("Error not found".to_string())
        }
    }

    pub async fn resolve_error_group(&self, fingerprint: &str) -> Result<(), String> {
        let mut groups = self.error_groups.write().await;
        if let Some(group) = groups.get_mut(fingerprint) {
            group.resolved = true;
            Ok(())
        } else {
            Err("Error group not found".to_string())
        }
    }

    pub async fn add_error_tag(&self, error_id: &str, tag: String) -> Result<(), String> {
        let mut errors = self.errors.write().await;
        if let Some(error) = errors.get_mut(error_id) {
            if !error.tags.contains(&tag) {
                error.tags.push(tag);
            }
            Ok(())
        } else {
            Err("Error not found".to_string())
        }
    }

    // ===========================================
    // PRIVATE METHODS
    // ===========================================

    fn extract_stack_trace(&self, error: &dyn std::error::Error) -> Vec<StackFrame> {
        // In a real implementation, you would use backtrace or similar
        // For now, we'll create a simplified stack trace
        vec![StackFrame {
            file: "unknown".to_string(),
            line: 0,
            function: "unknown".to_string(),
            module: "unknown".to_string(),
        }]
    }

    fn categorize_error(&self, error: &dyn std::error::Error) -> ErrorCategory {
        let error_msg = error.to_string().to_lowercase();
        
        if error_msg.contains("database") || error_msg.contains("sql") || error_msg.contains("postgres") {
            ErrorCategory::Database
        } else if error_msg.contains("blockchain") || error_msg.contains("transaction") || error_msg.contains("block") {
            ErrorCategory::Blockchain
        } else if error_msg.contains("auth") || error_msg.contains("token") || error_msg.contains("jwt") {
            ErrorCategory::Authentication
        } else if error_msg.contains("validation") || error_msg.contains("invalid") || error_msg.contains("format") {
            ErrorCategory::Validation
        } else if error_msg.contains("network") || error_msg.contains("connection") || error_msg.contains("timeout") {
            ErrorCategory::Network
        } else if error_msg.contains("file") || error_msg.contains("io") || error_msg.contains("path") {
            ErrorCategory::FileSystem
        } else if error_msg.contains("api") || error_msg.contains("http") || error_msg.contains("external") {
            ErrorCategory::ExternalAPI
        } else if error_msg.contains("security") || error_msg.contains("unauthorized") || error_msg.contains("forbidden") {
            ErrorCategory::Security
        } else if error_msg.contains("performance") || error_msg.contains("slow") || error_msg.contains("timeout") {
            ErrorCategory::Performance
        } else {
            ErrorCategory::Unknown
        }
    }

    fn determine_severity(&self, error: &dyn std::error::Error, category: &ErrorCategory) -> ErrorSeverity {
        let error_msg = error.to_string().to_lowercase();
        
        // Critical errors
        if error_msg.contains("panic") || error_msg.contains("fatal") || error_msg.contains("critical") {
            return ErrorSeverity::Critical;
        }
        
        // High severity based on category
        match category {
            ErrorCategory::Security => ErrorSeverity::High,
            ErrorCategory::Database => ErrorSeverity::High,
            ErrorCategory::Blockchain => ErrorSeverity::High,
            ErrorCategory::Authentication => ErrorSeverity::High,
            ErrorCategory::Network => ErrorSeverity::Medium,
            ErrorCategory::ExternalAPI => ErrorSeverity::Medium,
            ErrorCategory::Validation => ErrorSeverity::Medium,
            ErrorCategory::Performance => ErrorSeverity::Medium,
            ErrorCategory::FileSystem => ErrorSeverity::Low,
            ErrorCategory::BusinessLogic => ErrorSeverity::Low,
            ErrorCategory::Unknown => ErrorSeverity::Low,
        }
    }

    fn generate_fingerprint(&self, error: &dyn std::error::Error, stack_trace: &[StackFrame]) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        error.to_string().hash(&mut hasher);
        
        if let Some(frame) = stack_trace.first() {
            frame.file.hash(&mut hasher);
            frame.line.hash(&mut hasher);
        }
        
        format!("{:x}", hasher.finish())
    }

    fn generate_tags(&self, error: &dyn std::error::Error) -> Vec<String> {
        let mut tags = Vec::new();
        let error_msg = error.to_string().to_lowercase();
        
        if error_msg.contains("timeout") {
            tags.push("timeout".to_string());
        }
        if error_msg.contains("connection") {
            tags.push("connection".to_string());
        }
        if error_msg.contains("validation") {
            tags.push("validation".to_string());
        }
        if error_msg.contains("auth") {
            tags.push("authentication".to_string());
        }
        
        tags
    }

    async fn update_error_group(&self, fingerprint: &str, error_details: &ErrorDetails) {
        let mut groups = self.error_groups.write().await;
        
        if let Some(group) = groups.get_mut(fingerprint) {
            group.last_seen = error_details.last_seen;
            group.total_count += 1;
            if error_details.context.user_id.is_some() {
                group.affected_users += 1;
            }
        } else {
            let new_group = ErrorGroup {
                fingerprint: fingerprint.to_string(),
                error_type: error_details.error_type.clone(),
                message: error_details.message.clone(),
                severity: error_details.severity.clone(),
                category: error_details.category.clone(),
                first_seen: error_details.first_seen,
                last_seen: error_details.last_seen,
                total_count: 1,
                affected_users: if error_details.context.user_id.is_some() { 1 } else { 0 },
                resolved: false,
                tags: error_details.tags.clone(),
            };
            groups.insert(fingerprint.to_string(), new_group);
        }
    }

    async fn update_trends(&self, error_details: &ErrorDetails) {
        let mut trends = self.error_trends.write().await;
        let now = Utc::now();
        
        // Add new trend point
        trends.push(ErrorTrend {
            timestamp: now,
            count: 1,
            severity: error_details.severity.clone(),
        });
        
        // Keep only recent trends
        let trends_len = trends.len();
        if trends_len > self.config.max_trends {
            trends.drain(0..trends_len - self.config.max_trends);
        }
    }

    async fn check_thresholds(&self, error_details: &ErrorDetails) {
        if !self.config.enable_notifications {
            return;
        }

        let should_notify = match error_details.severity {
            ErrorSeverity::Critical => {
                let critical_errors = self.get_errors_by_severity(ErrorSeverity::Critical).await;
                critical_errors.len() as u64 >= self.config.critical_threshold
            }
            ErrorSeverity::High => {
                let high_errors = self.get_errors_by_severity(ErrorSeverity::High).await;
                high_errors.len() as u64 >= self.config.high_threshold
            }
            _ => false,
        };

        if should_notify {
            self.send_notification(error_details).await;
        }
    }

    async fn send_notification(&self, error_details: &ErrorDetails) {
        // In a real implementation, you would send email notifications
        // For now, we'll just log the notification
        tracing::error!(
            severity = ?error_details.severity,
            message = %error_details.message,
            error_id = %error_details.id,
            "ERROR NOTIFICATION"
        );
        
        // You could integrate with email services here
        // self.send_email_notification(error_details).await;
    }

    async fn log_error_to_file(&self, error_details: &ErrorDetails) {
        // In a real implementation, you would write to a log file
        // For now, we'll just print to console
        println!("📝 ERROR LOGGED: {} - {}", error_details.id, error_details.message);
    }

    // ===========================================
    // BACKGROUND TASKS
    // ===========================================

    async fn auto_report_task(self) {
        let mut interval = tokio::time::interval(self.config.auto_report_interval);
        
        loop {
            interval.tick().await;
            
            // Generate and send daily error report
            let report = self.generate_error_report(24).await;
            self.send_daily_report(&report).await;
        }
    }

    async fn cleanup_task(self) {
        let mut interval = tokio::time::interval(Duration::from_secs(3600)); // 1 hour
        
        loop {
            interval.tick().await;
            
            // Clean up old errors
            let mut errors = self.errors.write().await;
            let cutoff = Utc::now() - chrono::Duration::days(7); // Keep 7 days
            
            errors.retain(|_, error| error.last_seen > cutoff);
            
            // Clean up old trends
            let mut trends = self.error_trends.write().await;
            trends.retain(|trend| trend.timestamp > cutoff);
        }
    }

    async fn send_daily_report(&self, report: &ErrorReport) {
        // In a real implementation, you would send this report via email
        println!("📊 DAILY ERROR REPORT:");
        println!("  Total Errors: {}", report.total_errors);
        println!("  Critical: {}, High: {}, Medium: {}, Low: {}", 
                 report.critical_errors, report.high_errors, 
                 report.medium_errors, report.low_errors);
        println!("  Top Errors: {}", report.top_errors.len());
        println!("  Affected Services: {}", report.affected_services.join(", "));
    }
}

// ===========================================
// MACRO FOR EASY ERROR CAPTURE
// ===========================================

#[macro_export]
macro_rules! capture_error {
    ($tracker:expr, $error:expr) => {
        $tracker.capture_error_with_context($error, None, None, None).await
    };
    ($tracker:expr, $error:expr, $user_id:expr) => {
        $tracker.capture_error_with_context($error, Some($user_id), None, None).await
    };
    ($tracker:expr, $error:expr, $user_id:expr, $request_id:expr) => {
        $tracker.capture_error_with_context($error, Some($user_id), Some($request_id), None).await
    };
    ($tracker:expr, $error:expr, $user_id:expr, $request_id:expr, $endpoint:expr) => {
        $tracker.capture_error_with_context($error, Some($user_id), Some($request_id), Some($endpoint)).await
    };
}

// ===========================================
// MIDDLEWARE FOR AXUM
// ===========================================

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};

pub async fn error_tracking_middleware(
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let request_id = Uuid::new_v4().to_string();
    
    // Add request ID to headers
    let mut request = request;
    request.headers_mut().insert(
        "x-request-id",
        request_id.parse().unwrap(),
    );
    
    let response = next.run(request).await;
    
    // If response is an error, capture it
    if response.status().is_client_error() || response.status().is_server_error() {
        // You would capture the error here
        // This is a simplified example
    }
    
    Ok(response)
}

// ===========================================
// TESTS
// ===========================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::error::Error;

    #[derive(Debug)]
    struct TestError {
        message: String,
    }

    impl std::fmt::Display for TestError {
        fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
            write!(f, "{}", self.message)
        }
    }

    impl Error for TestError {}

    #[tokio::test]
    async fn test_error_capture() {
        let config = ErrorTrackerConfig::default();
        let tracker = ErrorTracker::new(config);
        
        let error = TestError {
            message: "Test error message".to_string(),
        };
        
        let context = ErrorContext {
            user_id: Some("user123".to_string()),
            session_id: None,
            request_id: Some("req123".to_string()),
            ip_address: Some("127.0.0.1".to_string()),
            user_agent: Some("test-agent".to_string()),
            endpoint: Some("/api/test".to_string()),
            method: Some("GET".to_string()),
            headers: HashMap::new(),
            environment: "test".to_string(),
            version: "1.0.0".to_string(),
            timestamp: Utc::now(),
        };
        
        let result = tracker.capture_error(&error, context).await;
        assert!(result.is_ok());
        
        let error_id = result.unwrap();
        let captured_error = tracker.get_error_by_id(&error_id).await;
        assert!(captured_error.is_some());
        
        let error_details = captured_error.unwrap();
        assert_eq!(error_details.message, "Test error message");
        assert_eq!(error_details.context.user_id, Some("user123".to_string()));
    }

    #[tokio::test]
    async fn test_error_grouping() {
        let config = ErrorTrackerConfig::default();
        let tracker = ErrorTracker::new(config);
        
        let error1 = TestError {
            message: "Database connection failed".to_string(),
        };
        
        let error2 = TestError {
            message: "Database connection failed".to_string(),
        };
        
        let context = ErrorContext {
            user_id: Some("user123".to_string()),
            session_id: None,
            request_id: None,
            ip_address: None,
            user_agent: None,
            endpoint: None,
            method: None,
            headers: HashMap::new(),
            environment: "test".to_string(),
            version: "1.0.0".to_string(),
            timestamp: Utc::now(),
        };
        
        tracker.capture_error(&error1, context.clone()).await.unwrap();
        tracker.capture_error(&error2, context).await.unwrap();
        
        let groups = tracker.get_error_groups().await;
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].total_count, 2);
    }

    #[tokio::test]
    async fn test_error_report() {
        let config = ErrorTrackerConfig::default();
        let tracker = ErrorTracker::new(config);
        
        let error = TestError {
            message: "Test error".to_string(),
        };
        
        let context = ErrorContext {
            user_id: Some("user123".to_string()),
            session_id: None,
            request_id: None,
            ip_address: None,
            user_agent: None,
            endpoint: None,
            method: None,
            headers: HashMap::new(),
            environment: "test".to_string(),
            version: "1.0.0".to_string(),
            timestamp: Utc::now(),
        };
        
        tracker.capture_error(&error, context).await.unwrap();
        
        let report = tracker.generate_error_report(1).await;
        assert_eq!(report.total_errors, 1);
        assert_eq!(report.affected_services.len(), 0);
    }
}
