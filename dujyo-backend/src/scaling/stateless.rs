//! Stateless Handlers for Dujyo
//! 
//! This module provides stateless request handlers that can be
//! easily scaled horizontally without session affinity:
//! - Request context extraction
//! - Database session management
//! - Shared nothing architecture
//! - Request/response serialization
//! - Error handling and logging

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use axum::{
    extract::{Request, State},
    http::StatusCode,
    response::Response,
    middleware::Next,
};
use uuid::Uuid;

// ===========================================
// TYPES & STRUCTS
// ===========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestContext {
    pub request_id: String,
    pub user_id: Option<String>,
    pub session_id: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub instance_id: String,
    pub service_name: String,
    pub headers: HashMap<String, String>,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatelessResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub request_id: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub processing_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandlerMetrics {
    pub handler_name: String,
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub avg_processing_time: f64,
    pub last_request_time: Option<chrono::DateTime<chrono::Utc>>,
}

// ===========================================
// STATELESS HANDLER MANAGER
// ===========================================

pub struct StatelessHandlerManager {
    metrics: Arc<RwLock<HashMap<String, HandlerMetrics>>>,
    instance_id: String,
    service_name: String,
}

impl StatelessHandlerManager {
    pub fn new(service_name: String) -> Self {
        let instance_id = Uuid::new_v4().to_string();
        
        Self {
            metrics: Arc::new(RwLock::new(HashMap::new())),
            instance_id,
            service_name,
        }
    }

    pub async fn create_request_context(
        &self,
        request: &Request,
        user_id: Option<String>,
        session_id: Option<String>,
    ) -> RequestContext {
        let request_id = Uuid::new_v4().to_string();
        let timestamp = chrono::Utc::now();
        
        // Extract headers
        let mut headers = HashMap::new();
        for (key, value) in request.headers() {
            if let Ok(value_str) = value.to_str() {
                headers.insert(key.to_string(), value_str.to_string());
            }
        }

        // Extract IP address
        let ip_address = request
            .headers()
            .get("x-forwarded-for")
            .or_else(|| request.headers().get("x-real-ip"))
            .and_then(|h| h.to_str().ok())
            .map(|s| s.to_string());

        // Extract user agent
        let user_agent = request
            .headers()
            .get("user-agent")
            .and_then(|h| h.to_str().ok())
            .map(|s| s.to_string());

        RequestContext {
            request_id,
            user_id,
            session_id,
            ip_address,
            user_agent,
            timestamp,
            instance_id: self.instance_id.clone(),
            service_name: self.service_name.clone(),
            headers,
            metadata: HashMap::new(),
        }
    }

    pub async fn execute_handler<T, F, Fut>(
        &self,
        handler_name: &str,
        context: RequestContext,
        handler: F,
    ) -> StatelessResponse<T>
    where
        T: Serialize,
        F: FnOnce(RequestContext) -> Fut,
        Fut: std::future::Future<Output = Result<T, String>>,
    {
        let start_time = std::time::Instant::now();
        
        // Update metrics
        self.update_metrics(handler_name, true).await;
        
        match handler(context.clone()).await {
            Ok(data) => {
                let processing_time = start_time.elapsed().as_millis() as u64;
                self.update_metrics(handler_name, true).await;
                
                StatelessResponse {
                    success: true,
                    data: Some(data),
                    error: None,
                    request_id: context.request_id,
                    timestamp: chrono::Utc::now(),
                    processing_time_ms: processing_time,
                }
            }
            Err(error) => {
                let processing_time = start_time.elapsed().as_millis() as u64;
                self.update_metrics(handler_name, false).await;
                
                StatelessResponse {
                    success: false,
                    data: None,
                    error: Some(error),
                    request_id: context.request_id,
                    timestamp: chrono::Utc::now(),
                    processing_time_ms: processing_time,
                }
            }
        }
    }

    async fn update_metrics(&self, handler_name: &str, success: bool) {
        let mut metrics = self.metrics.write().await;
        let handler_metrics = metrics.entry(handler_name.to_string()).or_insert_with(|| HandlerMetrics {
            handler_name: handler_name.to_string(),
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            avg_processing_time: 0.0,
            last_request_time: None,
        });

        handler_metrics.total_requests += 1;
        if success {
            handler_metrics.successful_requests += 1;
        } else {
            handler_metrics.failed_requests += 1;
        }
        handler_metrics.last_request_time = Some(chrono::Utc::now());
    }

    pub async fn get_metrics(&self) -> HashMap<String, HandlerMetrics> {
        let metrics = self.metrics.read().await;
        metrics.clone()
    }

    pub async fn get_handler_metrics(&self, handler_name: &str) -> Option<HandlerMetrics> {
        let metrics = self.metrics.read().await;
        metrics.get(handler_name).cloned()
    }
}

// ===========================================
// MIDDLEWARE
// ===========================================

pub async fn stateless_middleware(
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let start_time = std::time::Instant::now();
    
    // Add request ID to headers
    let request_id = Uuid::new_v4().to_string();
    let mut request = request;
    request.headers_mut().insert(
        "x-request-id",
        request_id.parse().unwrap(),
    );
    
    let response = next.run(request).await;
    
    // Add processing time header
    let processing_time = start_time.elapsed().as_millis();
    // Note: In a real implementation, you'd need to modify the response headers
    // This is a simplified example
    
    Ok(response)
}

// ===========================================
// SESSION MANAGEMENT
// ===========================================

pub struct SessionManager {
    sessions: Arc<RwLock<HashMap<String, SessionData>>>,
    session_timeout: chrono::Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionData {
    pub session_id: String,
    pub user_id: String,
    pub data: HashMap<String, serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_accessed: chrono::DateTime<chrono::Utc>,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

impl SessionManager {
    pub fn new(session_timeout: chrono::Duration) -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            session_timeout,
        }
    }

    pub async fn create_session(&self, user_id: String, initial_data: HashMap<String, serde_json::Value>) -> String {
        let session_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now();
        
        let session = SessionData {
            session_id: session_id.clone(),
            user_id,
            data: initial_data,
            created_at: now,
            last_accessed: now,
            expires_at: now + self.session_timeout,
        };

        {
            let mut sessions = self.sessions.write().await;
            sessions.insert(session_id.clone(), session);
        }

        session_id
    }

    pub async fn get_session(&self, session_id: &str) -> Option<SessionData> {
        let mut sessions = self.sessions.write().await;
        if let Some(session) = sessions.get_mut(session_id) {
            // Check if session is expired
            if session.expires_at < chrono::Utc::now() {
                sessions.remove(session_id);
                return None;
            }
            
            // Update last accessed time
            session.last_accessed = chrono::Utc::now();
            Some(session.clone())
        } else {
            None
        }
    }

    pub async fn update_session(&self, session_id: &str, data: HashMap<String, serde_json::Value>) -> Result<(), String> {
        let mut sessions = self.sessions.write().await;
        if let Some(session) = sessions.get_mut(session_id) {
            if session.expires_at < chrono::Utc::now() {
                sessions.remove(session_id);
                return Err("Session expired".to_string());
            }
            
            session.data = data;
            session.last_accessed = chrono::Utc::now();
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub async fn destroy_session(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.write().await;
        if sessions.remove(session_id).is_some() {
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub async fn cleanup_expired_sessions(&self) -> u64 {
        let now = chrono::Utc::now();
        let mut expired_sessions = Vec::new();
        
        {
            let sessions = self.sessions.read().await;
            for (session_id, session) in sessions.iter() {
                if session.expires_at < now {
                    expired_sessions.push(session_id.clone());
                }
            }
        }

        let count = expired_sessions.len() as u64;
        
        {
            let mut sessions = self.sessions.write().await;
            for session_id in expired_sessions {
                sessions.remove(&session_id);
            }
        }

        count
    }

    pub async fn get_session_stats(&self) -> SessionStats {
        let sessions = self.sessions.read().await;
        let now = chrono::Utc::now();
        
        let total_sessions = sessions.len();
        let active_sessions = sessions.values().filter(|s| s.expires_at > now).count();
        let expired_sessions = total_sessions - active_sessions;

        SessionStats {
            total_sessions,
            active_sessions,
            expired_sessions,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStats {
    pub total_sessions: usize,
    pub active_sessions: usize,
    pub expired_sessions: usize,
}

// ===========================================
// REQUEST VALIDATION
// ===========================================

pub struct RequestValidator {
    max_request_size: usize,
    allowed_methods: Vec<String>,
    required_headers: Vec<String>,
}

impl RequestValidator {
    pub fn new() -> Self {
        Self {
            max_request_size: 10 * 1024 * 1024, // 10MB
            allowed_methods: vec!["GET".to_string(), "POST".to_string(), "PUT".to_string(), "DELETE".to_string()],
            required_headers: vec!["content-type".to_string()],
        }
    }

    pub fn validate_request(&self, request: &Request) -> Result<(), String> {
        // Validate method
        if !self.allowed_methods.contains(&request.method().to_string()) {
            return Err(format!("Method {} not allowed", request.method()));
        }

        // Validate headers
        for required_header in &self.required_headers {
            if !request.headers().contains_key(required_header) {
                return Err(format!("Required header {} missing", required_header));
            }
        }

        // Validate request size (simplified)
        if let Some(content_length) = request.headers().get("content-length") {
            if let Ok(length_str) = content_length.to_str() {
                if let Ok(length) = length_str.parse::<usize>() {
                    if length > self.max_request_size {
                        return Err("Request too large".to_string());
                    }
                }
            }
        }

        Ok(())
    }
}

// ===========================================
// ERROR HANDLING
// ===========================================

pub struct ErrorHandler {
    error_logs: Arc<RwLock<Vec<ErrorLog>>>,
    max_log_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorLog {
    pub id: String,
    pub error_type: String,
    pub message: String,
    pub stack_trace: Option<String>,
    pub request_id: Option<String>,
    pub user_id: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub context: HashMap<String, serde_json::Value>,
}

impl ErrorHandler {
    pub fn new(max_log_size: usize) -> Self {
        Self {
            error_logs: Arc::new(RwLock::new(Vec::new())),
            max_log_size,
        }
    }

    pub async fn log_error(
        &self,
        error_type: String,
        message: String,
        request_id: Option<String>,
        user_id: Option<String>,
        context: HashMap<String, serde_json::Value>,
    ) -> String {
        let error_id = Uuid::new_v4().to_string();
        
        let error_log = ErrorLog {
            id: error_id.clone(),
            error_type,
            message,
            stack_trace: None, // In a real implementation, you'd capture the stack trace
            request_id,
            user_id,
            timestamp: chrono::Utc::now(),
            context,
        };

        {
            let mut logs = self.error_logs.write().await;
            logs.push(error_log);
            
            // Keep only recent logs
            if logs.len() > self.max_log_size {
                let len = logs.len();
                if len > self.max_log_size {
                    logs.drain(0..len - self.max_log_size);
                }
            }
        }

        error_id
    }

    pub async fn get_errors(&self, limit: Option<usize>) -> Vec<ErrorLog> {
        let logs = self.error_logs.read().await;
        let limit = limit.unwrap_or(100);
        logs.iter().rev().take(limit).cloned().collect()
    }

    pub async fn get_error_by_id(&self, error_id: &str) -> Option<ErrorLog> {
        let logs = self.error_logs.read().await;
        logs.iter().find(|log| log.id == error_id).cloned()
    }
}

// ===========================================
// TESTS
// ===========================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_stateless_handler_manager() {
        let manager = StatelessHandlerManager::new("test_service".to_string());
        
        // Test request context creation
        let request = Request::builder()
            .uri("/test")
            .method("GET")
            .body(())
            .unwrap();
        
        let context = manager.create_request_context(&request, Some("user_123".to_string()), None).await;
        assert_eq!(context.user_id, Some("user_123".to_string()));
        assert_eq!(context.service_name, "test_service");
    }

    #[tokio::test]
    async fn test_session_manager() {
        let session_manager = SessionManager::new(chrono::Duration::hours(1));
        
        // Test session creation
        let mut data = HashMap::new();
        data.insert("key".to_string(), serde_json::json!("value"));
        
        let session_id = session_manager.create_session("user_123".to_string(), data).await;
        assert!(!session_id.is_empty());
        
        // Test session retrieval
        let session = session_manager.get_session(&session_id).await;
        assert!(session.is_some());
        assert_eq!(session.unwrap().user_id, "user_123");
    }

    #[tokio::test]
    async fn test_request_validator() {
        let validator = RequestValidator::new();
        
        let request = Request::builder()
            .uri("/test")
            .method("GET")
            .header("content-type", "application/json")
            .body(())
            .unwrap();
        
        assert!(validator.validate_request(&request).is_ok());
    }

    #[tokio::test]
    async fn test_error_handler() {
        let error_handler = ErrorHandler::new(1000);
        
        let mut context = HashMap::new();
        context.insert("key".to_string(), serde_json::json!("value"));
        
        let error_id = error_handler.log_error(
            "test_error".to_string(),
            "Test error message".to_string(),
            Some("req_123".to_string()),
            Some("user_123".to_string()),
            context,
        ).await;
        
        assert!(!error_id.is_empty());
        
        let error = error_handler.get_error_by_id(&error_id).await;
        assert!(error.is_some());
        assert_eq!(error.unwrap().error_type, "test_error");
    }
}
