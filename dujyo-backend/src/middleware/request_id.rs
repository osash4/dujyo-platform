//! Request ID Middleware
//! 
//! Generates unique request IDs for tracing requests end-to-end

use axum::{
    extract::Request,
    http::HeaderValue,
    middleware::Next,
    response::Response,
};
use std::sync::atomic::{AtomicU64, Ordering};
use uuid::Uuid;

static REQUEST_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Generate a unique request ID
fn generate_request_id() -> String {
    let counter = REQUEST_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("req-{}-{}", Uuid::new_v4().to_string()[..8].to_string(), counter)
}

/// Middleware to add request ID to all requests
pub async fn request_id_middleware(
    mut request: Request,
    next: Next,
) -> Response {
    // Generate or extract request ID
    let request_id = request
        .headers()
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| generate_request_id());
    
    // Add request ID to request extensions for use in handlers
    request.extensions_mut().insert(request_id.clone());
    
    // Add request ID to tracing span
    let span = tracing::span!(
        tracing::Level::INFO,
        "request",
        request_id = %request_id
    );
    let _guard = span.enter();
    
    // Process request
    let mut response = next.run(request).await;
    
    // Add request ID to response headers
    response.headers_mut().insert(
        "x-request-id",
        HeaderValue::from_str(&request_id).unwrap_or_else(|_| HeaderValue::from_static("unknown")),
    );
    
    response
}

/// Get request ID from request extensions
pub fn get_request_id(request: &Request) -> Option<String> {
    request.extensions().get::<String>().cloned()
}

