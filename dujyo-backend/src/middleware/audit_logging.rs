//! Audit Logging Middleware
//! 
//! Logs all important actions for security auditing and compliance
//! Tracks: authentication, authorization, data access, modifications

use axum::{
    extract::{Request, State},
    http::{HeaderMap, Method, StatusCode, Uri},
    middleware::Next,
    response::Response,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use tracing::{info, warn, error};
use uuid::Uuid;

/// Audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub id: Uuid,
    pub timestamp: chrono::DateTime<Utc>,
    pub user_id: Option<String>,
    pub ip_address: String,
    pub user_agent: Option<String>,
    pub method: String,
    pub path: String,
    pub status_code: u16,
    pub action_type: String, // "auth", "read", "write", "delete", "admin"
    pub resource: Option<String>,
    pub details: Option<serde_json::Value>,
    pub success: bool,
    pub error_message: Option<String>,
}

/// Audit logging configuration
#[derive(Debug, Clone)]
pub struct AuditLogConfig {
    pub log_auth: bool,
    pub log_reads: bool,
    pub log_writes: bool,
    pub log_deletes: bool,
    pub log_admin: bool,
    pub log_errors: bool,
    pub database_pool: Option<Arc<PgPool>>,
}

impl Default for AuditLogConfig {
    fn default() -> Self {
        Self {
            log_auth: true,
            log_reads: false, // Set to false to reduce noise
            log_writes: true,
            log_deletes: true,
            log_admin: true,
            log_errors: true,
            database_pool: None,
        }
    }
}

/// Extract IP address from headers
fn extract_ip(headers: &HeaderMap) -> String {
    if let Some(forwarded) = headers.get("x-forwarded-for") {
        if let Ok(forwarded_str) = forwarded.to_str() {
            if let Some(ip) = forwarded_str.split(',').next() {
                return ip.trim().to_string();
            }
        }
    }
    
    if let Some(real_ip) = headers.get("x-real-ip") {
        if let Ok(real_ip_str) = real_ip.to_str() {
            return real_ip_str.to_string();
        }
    }
    
    "unknown".to_string()
}

/// Determine action type from path and method
fn get_action_type(method: &Method, path: &str) -> String {
    if path.contains("/auth") || path.contains("/login") || path.contains("/logout") {
        "auth".to_string()
    } else if path.contains("/admin") {
        "admin".to_string()
    } else if method == Method::DELETE {
        "delete".to_string()
    } else if method == Method::POST || method == Method::PUT || method == Method::PATCH {
        "write".to_string()
    } else if method == Method::GET {
        "read".to_string()
    } else {
        "other".to_string()
    }
}

/// Determine if this action should be logged
fn should_log(action_type: &str, config: &AuditLogConfig) -> bool {
    match action_type {
        "auth" => config.log_auth,
        "read" => config.log_reads,
        "write" => config.log_writes,
        "delete" => config.log_deletes,
        "admin" => config.log_admin,
        _ => false,
    }
}

/// Log audit entry to database
async fn log_to_database(entry: &AuditLogEntry, pool: &PgPool) {
    let query = r#"
        INSERT INTO audit_logs (
            id, timestamp, user_id, ip_address, user_agent,
            method, path, status_code, action_type, resource,
            details, success, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    "#;
    
    if let Err(e) = sqlx::query(query)
        .bind(entry.id)
        .bind(entry.timestamp)
        .bind(&entry.user_id)
        .bind(&entry.ip_address)
        .bind(&entry.user_agent)
        .bind(&entry.method)
        .bind(&entry.path)
        .bind(entry.status_code as i32)
        .bind(&entry.action_type)
        .bind(&entry.resource)
        .bind(&entry.details)
        .bind(entry.success)
        .bind(&entry.error_message)
        .execute(pool)
        .await
    {
        error!("Failed to log audit entry to database: {}", e);
    }
}

/// Audit logging middleware
pub async fn audit_logging_middleware(
    State(config): State<Arc<AuditLogConfig>>,
    headers: HeaderMap,
    method: Method,
    uri: Uri,
    request: Request,
    next: Next,
) -> Response {
    let path = uri.path().to_string();
    let action_type = get_action_type(&method, &path);
    
    // Only log if this action type should be logged
    if !should_log(&action_type, &config) {
        return next.run(request).await;
    }
    
    let user_id = headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    
    let ip_address = extract_ip(&headers);
    let user_agent = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    
    // Execute request
    let response = next.run(request).await;
    let status_code = response.status().as_u16();
    let success = status_code < 400;
    
    // Create audit log entry
    let entry = AuditLogEntry {
        id: Uuid::new_v4(),
        timestamp: Utc::now(),
        user_id,
        ip_address,
        user_agent,
        method: method.to_string(),
        path,
        status_code,
        action_type,
        resource: None,
        details: None,
        success,
        error_message: if success { None } else { Some(format!("Status: {}", status_code)) },
    };
    
    // Log to database if pool is available
    if let Some(pool) = &config.database_pool {
        log_to_database(&entry, pool).await;
    }
    
    // Also log to tracing
    if entry.success {
        info!("Audit: {} {} {} - Success", entry.method, entry.path, entry.status_code);
    } else {
        warn!("Audit: {} {} {} - Failed", entry.method, entry.path, entry.status_code);
    }
    
    response
}

/// Create audit log config with database pool
pub fn create_audit_config(pool: Arc<PgPool>) -> AuditLogConfig {
    AuditLogConfig {
        log_auth: true,
        log_reads: false,
        log_writes: true,
        log_deletes: true,
        log_admin: true,
        log_errors: true,
        database_pool: Some(pool),
    }
}

