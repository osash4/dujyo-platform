//! Input Validation and Sanitization Middleware
//! 
//! Validates and sanitizes user input to prevent injection attacks,
//! XSS, and other security vulnerabilities

use axum::{
    extract::{Request, Path, Query},
    http::{HeaderMap, StatusCode, Uri},
    middleware::Next,
    response::{IntoResponse, Response, Json},
};
use serde_json::json;
use std::collections::HashMap;
use regex::Regex;
use tracing::{warn, debug};

lazy_static::lazy_static! {
    // SQL injection patterns - more specific to avoid false positives
    static ref SQL_INJECTION_PATTERNS: Vec<Regex> = vec![
        Regex::new(r#"(?i)(union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|drop\s+table|exec\s*\(|xp_cmdshell)"#).unwrap(),
        // Only check for SQL comments and dangerous sequences, not single characters
        Regex::new(r#"(?i)(--\s|/\*|\*/|;\s*(drop|delete|truncate|exec))"#).unwrap(),
    ];
    
    // XSS patterns
    static ref XSS_PATTERNS: Vec<Regex> = vec![
        Regex::new(r#"(?i)(<script|javascript:|onerror=|onclick=|onload=|eval\(|alert\(|document\.cookie)"#).unwrap(),
        Regex::new(r#"(?i)(<iframe|<object|<embed|<link)"#).unwrap(),
    ];
    
    // Path traversal patterns
    static ref PATH_TRAVERSAL_PATTERNS: Vec<Regex> = vec![
        Regex::new(r#"(\.\./|\.\.\\|/\.\./|\\\.\.\\)"#).unwrap(),
    ];
    
    // Command injection patterns
    static ref COMMAND_INJECTION_PATTERNS: Vec<Regex> = vec![
        Regex::new(r#"(?i)(\||;|\$\(|`|&&|\|\|)"#).unwrap(),
    ];
}

/// Validate input string against common attack patterns
pub fn validate_input(input: &str, field_name: &str) -> Result<(), String> {
    // Check for SQL injection
    for pattern in SQL_INJECTION_PATTERNS.iter() {
        if pattern.is_match(input) {
            warn!("SQL injection attempt detected in field: {}", field_name);
            return Err(format!("Invalid input detected in field: {}", field_name));
        }
    }
    
    // Check for XSS
    for pattern in XSS_PATTERNS.iter() {
        if pattern.is_match(input) {
            warn!("XSS attempt detected in field: {}", field_name);
            return Err(format!("Invalid input detected in field: {}", field_name));
        }
    }
    
    // Check for path traversal
    for pattern in PATH_TRAVERSAL_PATTERNS.iter() {
        if pattern.is_match(input) {
            warn!("Path traversal attempt detected in field: {}", field_name);
            return Err(format!("Invalid input detected in field: {}", field_name));
        }
    }
    
    // Check for command injection
    for pattern in COMMAND_INJECTION_PATTERNS.iter() {
        if pattern.is_match(input) {
            warn!("Command injection attempt detected in field: {}", field_name);
            return Err(format!("Invalid input detected in field: {}", field_name));
        }
    }
    
    Ok(())
}

/// Sanitize input string by removing dangerous characters
pub fn sanitize_input(input: &str) -> String {
    input
        .chars()
        .filter(|c| {
            // Allow alphanumeric, spaces, and safe punctuation
            c.is_alphanumeric()
                || c.is_whitespace()
                || matches!(c, '-' | '_' | '@' | '.' | ',' | '!' | '?' | '(' | ')' | '[' | ']')
        })
        .collect()
}

/// Validate query parameters
pub fn validate_query_params(params: &HashMap<String, String>) -> Result<(), String> {
    for (key, value) in params {
        validate_input(key, key)?;
        validate_input(value, key)?;
    }
    Ok(())
}

/// Validate path parameters
pub fn validate_path_params(params: &HashMap<String, String>) -> Result<(), String> {
    for (key, value) in params {
        validate_input(key, key)?;
        validate_input(value, key)?;
    }
    Ok(())
}

/// Input validation middleware
pub async fn input_validation_middleware(
    request: Request,
    next: Next,
) -> Response {
    let uri = request.uri();
    
    // Skip validation for WebSocket upgrade requests
    if request.headers().get("upgrade").and_then(|v| v.to_str().ok()) == Some("websocket") {
        debug!("Skipping validation for WebSocket upgrade: {}", uri.path());
        return next.run(request).await;
    }
    
    // Validate path
    if let Err(e) = validate_input(uri.path(), "path") {
        warn!("Invalid path detected: {}", uri.path());
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": "Invalid request",
                "message": e,
            })),
        )
            .into_response();
    }
    
    // Validate query parameters
    if let Some(query) = uri.query() {
        if let Err(e) = validate_input(query, "query") {
            warn!("Invalid query parameters detected: {}", query);
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": "Invalid request",
                    "message": e,
                })),
            )
                .into_response();
        }
    }
    
    // Validate headers (skip user-agent as it's a standard browser header)
    // Only validate custom headers that could be dangerous
    for (header_name, header_value) in request.headers() {
        if let Ok(header_value_str) = header_value.to_str() {
            let header_str = header_name.as_str();
            // Skip standard browser headers (user-agent, referer, origin)
            // Only validate custom headers that could be dangerous
            if header_str == "x-forwarded-for" || header_str.starts_with("x-") {
                // Only check for obvious SQL injection patterns in custom headers
                if header_value_str.contains("union select") 
                    || header_value_str.contains("drop table")
                    || header_value_str.contains("delete from") {
                    warn!("Suspicious header detected: {} = {}", header_name.as_str(), header_value_str);
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({
                            "error": "Invalid request",
                            "message": "Suspicious header detected",
                        })),
                    )
                        .into_response();
                }
            }
        }
    }
    
    debug!("Input validation passed for: {}", uri.path());
    
    next.run(request).await
}

/// Validate JSON body (to be used in handlers)
pub fn validate_json_body(body: &str) -> Result<(), String> {
    // Check for dangerous patterns in JSON
    validate_input(body, "body")?;
    
    // Additional JSON-specific validation
    if body.len() > 1_000_000 {
        // 1MB limit
        return Err("Request body exceeds size limit".to_string());
    }
    
    Ok(())
}

