//! Security Headers Implementation for Dujyo
//! 
//! This module provides comprehensive security headers:
//! - Content-Security-Policy
//! - X-Frame-Options
//! - X-Content-Type-Options
//! - Strict-Transport-Security
//! - X-XSS-Protection
//! - Referrer-Policy
//! - Permissions-Policy

use axum::{
    extract::Request,
    http::{HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Security headers configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityHeadersConfig {
    pub content_security_policy: ContentSecurityPolicy,
    pub x_frame_options: XFrameOptions,
    pub x_content_type_options: bool,
    pub strict_transport_security: StrictTransportSecurity,
    pub x_xss_protection: XXSSProtection,
    pub referrer_policy: ReferrerPolicy,
    pub permissions_policy: PermissionsPolicy,
    pub custom_headers: HashMap<String, String>,
}

/// Content Security Policy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentSecurityPolicy {
    pub default_src: Vec<String>,
    pub script_src: Vec<String>,
    pub style_src: Vec<String>,
    pub img_src: Vec<String>,
    pub font_src: Vec<String>,
    pub connect_src: Vec<String>,
    pub media_src: Vec<String>,
    pub object_src: Vec<String>,
    pub child_src: Vec<String>,
    pub frame_src: Vec<String>,
    pub worker_src: Vec<String>,
    pub manifest_src: Vec<String>,
    pub form_action: Vec<String>,
    pub frame_ancestors: Vec<String>,
    pub base_uri: Vec<String>,
    pub upgrade_insecure_requests: bool,
    pub block_all_mixed_content: bool,
}

/// X-Frame-Options configuration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum XFrameOptions {
    Deny,
    SameOrigin,
    AllowFrom(String),
}

/// Strict-Transport-Security configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrictTransportSecurity {
    pub max_age: u64,
    pub include_subdomains: bool,
    pub preload: bool,
}

/// X-XSS-Protection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum XXSSProtection {
    Disabled,
    Enabled,
    EnabledWithBlock,
}

/// Referrer-Policy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ReferrerPolicy {
    NoReferrer,
    NoReferrerWhenDowngrade,
    Origin,
    OriginWhenCrossOrigin,
    SameOrigin,
    StrictOrigin,
    StrictOriginWhenCrossOrigin,
    UnsafeUrl,
}

/// Permissions-Policy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionsPolicy {
    pub accelerometer: Vec<String>,
    pub ambient_light_sensor: Vec<String>,
    pub autoplay: Vec<String>,
    pub battery: Vec<String>,
    pub camera: Vec<String>,
    pub cross_origin_isolated: Vec<String>,
    pub display_capture: Vec<String>,
    pub document_domain: Vec<String>,
    pub encrypted_media: Vec<String>,
    pub execution_while_not_rendered: Vec<String>,
    pub execution_while_out_of_viewport: Vec<String>,
    pub fullscreen: Vec<String>,
    pub geolocation: Vec<String>,
    pub gyroscope: Vec<String>,
    pub keyboard_map: Vec<String>,
    pub magnetometer: Vec<String>,
    pub microphone: Vec<String>,
    pub midi: Vec<String>,
    pub navigation_override: Vec<String>,
    pub payment: Vec<String>,
    pub picture_in_picture: Vec<String>,
    pub publickey_credentials_get: Vec<String>,
    pub screen_wake_lock: Vec<String>,
    pub sync_xhr: Vec<String>,
    pub usb: Vec<String>,
    pub web_share: Vec<String>,
    pub xr_spatial_tracking: Vec<String>,
}

impl Default for SecurityHeadersConfig {
    fn default() -> Self {
        Self {
            content_security_policy: ContentSecurityPolicy::default(),
            x_frame_options: XFrameOptions::SameOrigin,
            x_content_type_options: true,
            strict_transport_security: StrictTransportSecurity {
                max_age: 31536000, // 1 year
                include_subdomains: true,
                preload: true,
            },
            x_xss_protection: XXSSProtection::EnabledWithBlock,
            referrer_policy: ReferrerPolicy::StrictOriginWhenCrossOrigin,
            permissions_policy: PermissionsPolicy::default(),
            custom_headers: HashMap::new(),
        }
    }
}

impl Default for ContentSecurityPolicy {
    fn default() -> Self {
        Self {
            default_src: vec!["'self'".to_string()],
            script_src: vec![
                "'self'".to_string(),
                "'unsafe-inline'".to_string(),
                "'unsafe-eval'".to_string(),
                "https://cdn.jsdelivr.net".to_string(),
                "https://unpkg.com".to_string(),
            ],
            style_src: vec![
                "'self'".to_string(),
                "'unsafe-inline'".to_string(),
                "https://fonts.googleapis.com".to_string(),
                "https://cdn.jsdelivr.net".to_string(),
            ],
            img_src: vec![
                "'self'".to_string(),
                "data:".to_string(),
                "https:".to_string(),
                "blob:".to_string(),
            ],
            font_src: vec![
                "'self'".to_string(),
                "https://fonts.gstatic.com".to_string(),
                "data:".to_string(),
            ],
            connect_src: vec![
                "'self'".to_string(),
                "wss:".to_string(),
                "https:".to_string(),
            ],
            media_src: vec![
                "'self'".to_string(),
                "data:".to_string(),
                "blob:".to_string(),
            ],
            object_src: vec!["'none'".to_string()],
            child_src: vec!["'self'".to_string()],
            frame_src: vec!["'self'".to_string()],
            worker_src: vec!["'self'".to_string()],
            manifest_src: vec!["'self'".to_string()],
            form_action: vec!["'self'".to_string()],
            frame_ancestors: vec!["'self'".to_string()],
            base_uri: vec!["'self'".to_string()],
            upgrade_insecure_requests: true,
            block_all_mixed_content: true,
        }
    }
}

impl Default for PermissionsPolicy {
    fn default() -> Self {
        Self {
            accelerometer: vec!["()".to_string()],
            ambient_light_sensor: vec!["()".to_string()],
            autoplay: vec!["'self'".to_string()],
            battery: vec!["()".to_string()],
            camera: vec!["()".to_string()],
            cross_origin_isolated: vec!["()".to_string()],
            display_capture: vec!["()".to_string()],
            document_domain: vec!["()".to_string()],
            encrypted_media: vec!["'self'".to_string()],
            execution_while_not_rendered: vec!["()".to_string()],
            execution_while_out_of_viewport: vec!["()".to_string()],
            fullscreen: vec!["'self'".to_string()],
            geolocation: vec!["()".to_string()],
            gyroscope: vec!["()".to_string()],
            keyboard_map: vec!["()".to_string()],
            magnetometer: vec!["()".to_string()],
            microphone: vec!["()".to_string()],
            midi: vec!["()".to_string()],
            navigation_override: vec!["()".to_string()],
            payment: vec!["()".to_string()],
            picture_in_picture: vec!["'self'".to_string()],
            publickey_credentials_get: vec!["'self'".to_string()],
            screen_wake_lock: vec!["()".to_string()],
            sync_xhr: vec!["()".to_string()],
            usb: vec!["()".to_string()],
            web_share: vec!["()".to_string()],
            xr_spatial_tracking: vec!["()".to_string()],
        }
    }
}

/// Security headers middleware
pub async fn security_headers_middleware(
    config: SecurityHeadersConfig,
    request: Request,
    next: Next,
) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();

    // Add Content-Security-Policy
    let csp = build_content_security_policy(&config.content_security_policy);
    if let Ok(header_value) = HeaderValue::from_str(&csp) {
        headers.insert("Content-Security-Policy", header_value);
    }

    // Add X-Frame-Options
    let x_frame_options = match config.x_frame_options {
        XFrameOptions::Deny => "DENY".to_string(),
        XFrameOptions::SameOrigin => "SAMEORIGIN".to_string(),
        XFrameOptions::AllowFrom(origin) => format!("ALLOW-FROM {}", origin),
    };
    if let Ok(header_value) = HeaderValue::from_str(&x_frame_options) {
        headers.insert("X-Frame-Options", header_value);
    }

    // Add X-Content-Type-Options
    if config.x_content_type_options {
        if let Ok(header_value) = HeaderValue::from_str("nosniff") {
            headers.insert("X-Content-Type-Options", header_value);
        }
    }

    // Add Strict-Transport-Security
    let hsts = build_strict_transport_security(&config.strict_transport_security);
    if let Ok(header_value) = HeaderValue::from_str(&hsts) {
        headers.insert("Strict-Transport-Security", header_value);
    }

    // Add X-XSS-Protection
    let x_xss_protection = match config.x_xss_protection {
        XXSSProtection::Disabled => "0".to_string(),
        XXSSProtection::Enabled => "1".to_string(),
        XXSSProtection::EnabledWithBlock => "1; mode=block".to_string(),
    };
    if let Ok(header_value) = HeaderValue::from_str(&x_xss_protection) {
        headers.insert("X-XSS-Protection", header_value);
    }

    // Add Referrer-Policy
    let referrer_policy = match config.referrer_policy {
        ReferrerPolicy::NoReferrer => "no-referrer".to_string(),
        ReferrerPolicy::NoReferrerWhenDowngrade => "no-referrer-when-downgrade".to_string(),
        ReferrerPolicy::Origin => "origin".to_string(),
        ReferrerPolicy::OriginWhenCrossOrigin => "origin-when-cross-origin".to_string(),
        ReferrerPolicy::SameOrigin => "same-origin".to_string(),
        ReferrerPolicy::StrictOrigin => "strict-origin".to_string(),
        ReferrerPolicy::StrictOriginWhenCrossOrigin => "strict-origin-when-cross-origin".to_string(),
        ReferrerPolicy::UnsafeUrl => "unsafe-url".to_string(),
    };
    if let Ok(header_value) = HeaderValue::from_str(&referrer_policy) {
        headers.insert("Referrer-Policy", header_value);
    }

    // Add Permissions-Policy
    let permissions_policy = build_permissions_policy(&config.permissions_policy);
    if let Ok(header_value) = HeaderValue::from_str(&permissions_policy) {
        headers.insert("Permissions-Policy", header_value);
    }

    // Add custom headers
    for (name, value) in &config.custom_headers {
        if let (Ok(header_name), Ok(header_value)) = (
            HeaderName::from_bytes(name.as_bytes()),
            HeaderValue::from_str(value),
        ) {
            headers.insert(header_name, header_value);
        }
    }

    response
}

/// Build Content-Security-Policy header value
fn build_content_security_policy(csp: &ContentSecurityPolicy) -> String {
    let mut directives = Vec::new();

    // Default source
    if !csp.default_src.is_empty() {
        directives.push(format!("default-src {}", csp.default_src.join(" ")));
    }

    // Script source
    if !csp.script_src.is_empty() {
        directives.push(format!("script-src {}", csp.script_src.join(" ")));
    }

    // Style source
    if !csp.style_src.is_empty() {
        directives.push(format!("style-src {}", csp.style_src.join(" ")));
    }

    // Image source
    if !csp.img_src.is_empty() {
        directives.push(format!("img-src {}", csp.img_src.join(" ")));
    }

    // Font source
    if !csp.font_src.is_empty() {
        directives.push(format!("font-src {}", csp.font_src.join(" ")));
    }

    // Connect source
    if !csp.connect_src.is_empty() {
        directives.push(format!("connect-src {}", csp.connect_src.join(" ")));
    }

    // Media source
    if !csp.media_src.is_empty() {
        directives.push(format!("media-src {}", csp.media_src.join(" ")));
    }

    // Object source
    if !csp.object_src.is_empty() {
        directives.push(format!("object-src {}", csp.object_src.join(" ")));
    }

    // Child source
    if !csp.child_src.is_empty() {
        directives.push(format!("child-src {}", csp.child_src.join(" ")));
    }

    // Frame source
    if !csp.frame_src.is_empty() {
        directives.push(format!("frame-src {}", csp.frame_src.join(" ")));
    }

    // Worker source
    if !csp.worker_src.is_empty() {
        directives.push(format!("worker-src {}", csp.worker_src.join(" ")));
    }

    // Manifest source
    if !csp.manifest_src.is_empty() {
        directives.push(format!("manifest-src {}", csp.manifest_src.join(" ")));
    }

    // Form action
    if !csp.form_action.is_empty() {
        directives.push(format!("form-action {}", csp.form_action.join(" ")));
    }

    // Frame ancestors
    if !csp.frame_ancestors.is_empty() {
        directives.push(format!("frame-ancestors {}", csp.frame_ancestors.join(" ")));
    }

    // Base URI
    if !csp.base_uri.is_empty() {
        directives.push(format!("base-uri {}", csp.base_uri.join(" ")));
    }

    // Upgrade insecure requests
    if csp.upgrade_insecure_requests {
        directives.push("upgrade-insecure-requests".to_string());
    }

    // Block all mixed content
    if csp.block_all_mixed_content {
        directives.push("block-all-mixed-content".to_string());
    }

    directives.join("; ")
}

/// Build Strict-Transport-Security header value
fn build_strict_transport_security(hsts: &StrictTransportSecurity) -> String {
    let mut directive = format!("max-age={}", hsts.max_age);

    if hsts.include_subdomains {
        directive.push_str("; includeSubDomains");
    }

    if hsts.preload {
        directive.push_str("; preload");
    }

    directive
}

/// Build Permissions-Policy header value
fn build_permissions_policy(policy: &PermissionsPolicy) -> String {
    let mut directives = Vec::new();

    // Accelerometer
    if !policy.accelerometer.is_empty() {
        directives.push(format!("accelerometer=({})", policy.accelerometer.join(" ")));
    }

    // Ambient light sensor
    if !policy.ambient_light_sensor.is_empty() {
        directives.push(format!("ambient-light-sensor=({})", policy.ambient_light_sensor.join(" ")));
    }

    // Autoplay
    if !policy.autoplay.is_empty() {
        directives.push(format!("autoplay=({})", policy.autoplay.join(" ")));
    }

    // Battery
    if !policy.battery.is_empty() {
        directives.push(format!("battery=({})", policy.battery.join(" ")));
    }

    // Camera
    if !policy.camera.is_empty() {
        directives.push(format!("camera=({})", policy.camera.join(" ")));
    }

    // Cross-origin isolated
    if !policy.cross_origin_isolated.is_empty() {
        directives.push(format!("cross-origin-isolated=({})", policy.cross_origin_isolated.join(" ")));
    }

    // Display capture
    if !policy.display_capture.is_empty() {
        directives.push(format!("display-capture=({})", policy.display_capture.join(" ")));
    }

    // Document domain
    if !policy.document_domain.is_empty() {
        directives.push(format!("document-domain=({})", policy.document_domain.join(" ")));
    }

    // Encrypted media
    if !policy.encrypted_media.is_empty() {
        directives.push(format!("encrypted-media=({})", policy.encrypted_media.join(" ")));
    }

    // Execution while not rendered
    if !policy.execution_while_not_rendered.is_empty() {
        directives.push(format!("execution-while-not-rendered=({})", policy.execution_while_not_rendered.join(" ")));
    }

    // Execution while out of viewport
    if !policy.execution_while_out_of_viewport.is_empty() {
        directives.push(format!("execution-while-out-of-viewport=({})", policy.execution_while_out_of_viewport.join(" ")));
    }

    // Fullscreen
    if !policy.fullscreen.is_empty() {
        directives.push(format!("fullscreen=({})", policy.fullscreen.join(" ")));
    }

    // Geolocation
    if !policy.geolocation.is_empty() {
        directives.push(format!("geolocation=({})", policy.geolocation.join(" ")));
    }

    // Gyroscope
    if !policy.gyroscope.is_empty() {
        directives.push(format!("gyroscope=({})", policy.gyroscope.join(" ")));
    }

    // Keyboard map
    if !policy.keyboard_map.is_empty() {
        directives.push(format!("keyboard-map=({})", policy.keyboard_map.join(" ")));
    }

    // Magnetometer
    if !policy.magnetometer.is_empty() {
        directives.push(format!("magnetometer=({})", policy.magnetometer.join(" ")));
    }

    // Microphone
    if !policy.microphone.is_empty() {
        directives.push(format!("microphone=({})", policy.microphone.join(" ")));
    }

    // MIDI
    if !policy.midi.is_empty() {
        directives.push(format!("midi=({})", policy.midi.join(" ")));
    }

    // Navigation override
    if !policy.navigation_override.is_empty() {
        directives.push(format!("navigation-override=({})", policy.navigation_override.join(" ")));
    }

    // Payment
    if !policy.payment.is_empty() {
        directives.push(format!("payment=({})", policy.payment.join(" ")));
    }

    // Picture-in-picture
    if !policy.picture_in_picture.is_empty() {
        directives.push(format!("picture-in-picture=({})", policy.picture_in_picture.join(" ")));
    }

    // Public key credentials get
    if !policy.publickey_credentials_get.is_empty() {
        directives.push(format!("publickey-credentials-get=({})", policy.publickey_credentials_get.join(" ")));
    }

    // Screen wake lock
    if !policy.screen_wake_lock.is_empty() {
        directives.push(format!("screen-wake-lock=({})", policy.screen_wake_lock.join(" ")));
    }

    // Sync XHR
    if !policy.sync_xhr.is_empty() {
        directives.push(format!("sync-xhr=({})", policy.sync_xhr.join(" ")));
    }

    // USB
    if !policy.usb.is_empty() {
        directives.push(format!("usb=({})", policy.usb.join(" ")));
    }

    // Web share
    if !policy.web_share.is_empty() {
        directives.push(format!("web-share=({})", policy.web_share.join(" ")));
    }

    // XR spatial tracking
    if !policy.xr_spatial_tracking.is_empty() {
        directives.push(format!("xr-spatial-tracking=({})", policy.xr_spatial_tracking.join(" ")));
    }

    directives.join(", ")
}

/// Create a strict security headers configuration for production
pub fn create_strict_security_config() -> SecurityHeadersConfig {
    SecurityHeadersConfig {
        content_security_policy: ContentSecurityPolicy {
            default_src: vec!["'self'".to_string()],
            script_src: vec!["'self'".to_string()],
            style_src: vec!["'self'".to_string()],
            img_src: vec!["'self'".to_string(), "data:".to_string()],
            font_src: vec!["'self'".to_string()],
            connect_src: vec!["'self'".to_string()],
            media_src: vec!["'self'".to_string()],
            object_src: vec!["'none'".to_string()],
            child_src: vec!["'none'".to_string()],
            frame_src: vec!["'none'".to_string()],
            worker_src: vec!["'self'".to_string()],
            manifest_src: vec!["'self'".to_string()],
            form_action: vec!["'self'".to_string()],
            frame_ancestors: vec!["'none'".to_string()],
            base_uri: vec!["'self'".to_string()],
            upgrade_insecure_requests: true,
            block_all_mixed_content: true,
        },
        x_frame_options: XFrameOptions::Deny,
        x_content_type_options: true,
        strict_transport_security: StrictTransportSecurity {
            max_age: 31536000, // 1 year
            include_subdomains: true,
            preload: true,
        },
        x_xss_protection: XXSSProtection::EnabledWithBlock,
        referrer_policy: ReferrerPolicy::StrictOriginWhenCrossOrigin,
        permissions_policy: PermissionsPolicy::default(),
        custom_headers: {
            let mut headers = HashMap::new();
            headers.insert("X-Download-Options".to_string(), "noopen".to_string());
            headers.insert("X-Permitted-Cross-Domain-Policies".to_string(), "none".to_string());
            headers.insert("X-DNS-Prefetch-Control".to_string(), "off".to_string());
            headers.insert("Expect-CT".to_string(), "max-age=86400, enforce".to_string());
            headers
        },
    }
}

/// Create a relaxed security headers configuration for development
pub fn create_relaxed_security_config() -> SecurityHeadersConfig {
    SecurityHeadersConfig::default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_security_policy_building() {
        let csp = ContentSecurityPolicy::default();
        let csp_string = build_content_security_policy(&csp);
        
        assert!(csp_string.contains("default-src 'self'"));
        assert!(csp_string.contains("script-src 'self' 'unsafe-inline' 'unsafe-eval'"));
        assert!(csp_string.contains("upgrade-insecure-requests"));
    }

    #[test]
    fn test_strict_transport_security_building() {
        let hsts = StrictTransportSecurity {
            max_age: 31536000,
            include_subdomains: true,
            preload: true,
        };
        let hsts_string = build_strict_transport_security(&hsts);
        
        assert!(hsts_string.contains("max-age=31536000"));
        assert!(hsts_string.contains("includeSubDomains"));
        assert!(hsts_string.contains("preload"));
    }

    #[test]
    fn test_permissions_policy_building() {
        let policy = PermissionsPolicy::default();
        let policy_string = build_permissions_policy(&policy);
        
        assert!(policy_string.contains("accelerometer=()"));
        assert!(policy_string.contains("camera=()"));
        assert!(policy_string.contains("microphone=()"));
    }

    #[test]
    fn test_strict_security_config() {
        let config = create_strict_security_config();
        
        assert_eq!(config.x_frame_options, XFrameOptions::Deny);
        assert!(config.content_security_policy.object_src.contains(&"'none'".to_string()));
        assert!(config.custom_headers.contains_key("X-Download-Options"));
    }
}
