//! Security Headers Middleware
//! 
//! Implements security headers: CSP, HSTS, X-Frame-Options, etc.
//! Provides defense against XSS, clickjacking, and other attacks

use axum::{
    extract::Request,
    http::HeaderValue,
    middleware::Next,
    response::{IntoResponse, Response},
};
use tracing::debug;

/// Security headers configuration
#[derive(Debug, Clone)]
pub struct SecurityHeadersConfig {
    pub enable_csp: bool,
    pub enable_hsts: bool,
    pub enable_frame_options: bool,
    pub enable_content_type: bool,
    pub enable_xss_protection: bool,
    pub csp_policy: String,
    pub hsts_max_age: u64,
}

impl Default for SecurityHeadersConfig {
    fn default() -> Self {
        Self {
            enable_csp: true,
            enable_hsts: true,
            enable_frame_options: true,
            enable_content_type: true,
            enable_xss_protection: true,
            // Content Security Policy - Strict for production
            csp_policy: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com data:",
                "img-src 'self' data: https: blob:",
                "media-src 'self' blob: https:",
                "connect-src 'self' ws: wss: https:",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
            ]
            .join("; ")
            .to_string(),
            // HSTS max age: 1 year (31536000 seconds)
            hsts_max_age: 31536000,
        }
    }
}

/// Security headers middleware
pub async fn security_headers_middleware(
    request: Request,
    next: Next,
) -> Response {
    let mut response = next.run(request).await;
    
    // Get or use default config
    let config = SecurityHeadersConfig::default();
    
    // Content Security Policy
    if config.enable_csp {
        if let Ok(header_value) = HeaderValue::from_str(&config.csp_policy) {
            response.headers_mut().insert("Content-Security-Policy", header_value);
        }
    }
    
    // HTTP Strict Transport Security (HSTS)
    if config.enable_hsts {
        let hsts_value = format!("max-age={}; includeSubDomains; preload", config.hsts_max_age);
        if let Ok(header_value) = HeaderValue::from_str(&hsts_value) {
            response.headers_mut().insert("Strict-Transport-Security", header_value);
        }
    }
    
    // X-Frame-Options (prevent clickjacking)
    if config.enable_frame_options {
        if let Ok(header_value) = HeaderValue::from_str("DENY") {
            response.headers_mut().insert("X-Frame-Options", header_value);
        }
    }
    
    // X-Content-Type-Options (prevent MIME sniffing)
    if config.enable_content_type {
        if let Ok(header_value) = HeaderValue::from_str("nosniff") {
            response.headers_mut().insert("X-Content-Type-Options", header_value);
        }
    }
    
    // X-XSS-Protection (legacy, but still useful)
    if config.enable_xss_protection {
        if let Ok(header_value) = HeaderValue::from_str("1; mode=block") {
            response.headers_mut().insert("X-XSS-Protection", header_value);
        }
    }
    
    // Referrer Policy
    if let Ok(header_value) = HeaderValue::from_str("strict-origin-when-cross-origin") {
        response.headers_mut().insert("Referrer-Policy", header_value);
    }
    
    // Permissions Policy (formerly Feature Policy)
    let permissions_policy = [
        "geolocation=()",
        "microphone=()",
        "camera=()",
        "payment=()",
        "usb=()",
    ]
    .join(", ");
    if let Ok(header_value) = HeaderValue::from_str(&permissions_policy) {
        response.headers_mut().insert("Permissions-Policy", header_value);
    }
    
    // Remove server identification
    response.headers_mut().remove("server");
    response.headers_mut().remove("x-powered-by");
    
    debug!("Security headers applied to response");
    
    response
}

/// Create a strict security configuration for production
pub fn create_strict_security_config() -> SecurityHeadersConfig {
    SecurityHeadersConfig {
        enable_csp: true,
        enable_hsts: true,
        enable_frame_options: true,
        enable_content_type: true,
        enable_xss_protection: true,
        csp_policy: [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self' data:",
            "img-src 'self' data: https:",
            "media-src 'self' blob:",
            "connect-src 'self' wss: https:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests",
        ]
        .join("; ")
        .to_string(),
        hsts_max_age: 31536000, // 1 year
    }
}

