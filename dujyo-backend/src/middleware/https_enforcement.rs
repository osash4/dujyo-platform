//! HTTPS Enforcement Middleware
//! 
//! Forces HTTPS in production environment by redirecting HTTP requests to HTTPS
//! and validating X-Forwarded-Proto header when behind a proxy

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Redirect, Response},
};
use tracing::{debug, warn};

/// HTTPS enforcement middleware
/// 
/// In production, redirects HTTP requests to HTTPS and validates
/// X-Forwarded-Proto header when behind a reverse proxy
pub async fn https_enforcement_middleware(
    request: Request,
    next: Next,
) -> Response {
    let is_production = std::env::var("NODE_ENV")
        .unwrap_or_else(|_| "development".to_string())
        .eq_ignore_ascii_case("production");
    
    // Skip HTTPS enforcement in development
    if !is_production {
        return next.run(request).await;
    }
    
    let uri = request.uri();
    let scheme = uri.scheme_str().unwrap_or("http");
    let headers = request.headers();
    
    // Check X-Forwarded-Proto header (set by reverse proxy)
    let forwarded_proto = headers
        .get("x-forwarded-proto")
        .and_then(|v| v.to_str().ok());
    
    // Determine if request is secure
    let is_secure = scheme == "https" 
        || forwarded_proto == Some("https")
        || forwarded_proto == Some("https,http");  // Some proxies send both
    
    if !is_secure {
        // Get host from request
        let host = headers
            .get("host")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("localhost");
        
        // Build HTTPS URL
        let https_uri = format!("https://{}{}", host, uri.path_and_query()
            .map(|pq| pq.as_str())
            .unwrap_or(""));
        
        warn!(
            scheme = scheme,
            forwarded_proto = ?forwarded_proto,
            original_uri = %uri,
            "Redirecting HTTP request to HTTPS"
        );
        
        // Return 301 Permanent Redirect to HTTPS
        return Redirect::permanent(&https_uri).into_response();
    }
    
    debug!("HTTPS request validated");
    next.run(request).await
}

/// Validate HTTPS in production (strict mode)
/// 
/// Returns error if request is not HTTPS (no redirect)
pub async fn https_validation_middleware(
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let is_production = std::env::var("NODE_ENV")
        .unwrap_or_else(|_| "development".to_string())
        .eq_ignore_ascii_case("production");
    
    // Skip validation in development
    if !is_production {
        return Ok(next.run(request).await);
    }
    
    let uri = request.uri();
    let scheme = uri.scheme_str().unwrap_or("http");
    let headers = request.headers();
    
    // Check X-Forwarded-Proto header
    let forwarded_proto = headers
        .get("x-forwarded-proto")
        .and_then(|v| v.to_str().ok());
    
    // Determine if request is secure
    let is_secure = scheme == "https" 
        || forwarded_proto == Some("https")
        || forwarded_proto == Some("https,http");
    
    if !is_secure {
        warn!(
            scheme = scheme,
            forwarded_proto = ?forwarded_proto,
            uri = %uri,
            "HTTPS validation failed - rejecting request"
        );
        return Err(StatusCode::FORBIDDEN);
    }
    
    Ok(next.run(request).await)
}

