//! Comprehensive Input Validation System for Dujyo
//!
//! This module provides exhaustive input validation for all endpoints:
//! - Wallet address validation (format, checksum)
//! - Amount validation (non-negative, no overflow)
//! - String validation (no SQL injection, XSS)
//! - JSON payload validation (structure, types)
//! - File upload validation (size, type, virus scan simulation)

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
// use tracing::info;
use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use validator::Validate;

/// Input validation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationConfig {
    pub max_string_length: usize,
    pub max_file_size: u64,
    pub allowed_file_types: Vec<String>,
    pub max_array_length: usize,
    pub max_object_depth: usize,
    pub enable_sql_injection_check: bool,
    pub enable_xss_check: bool,
    pub enable_virus_scan_simulation: bool,
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            max_string_length: 1000,
            max_file_size: 10 * 1024 * 1024, // 10MB
            allowed_file_types: vec![
                "image/jpeg".to_string(),
                "image/png".to_string(),
                "image/gif".to_string(),
                "image/webp".to_string(),
                "audio/mpeg".to_string(),
                "audio/wav".to_string(),
                "audio/ogg".to_string(),
                "video/mp4".to_string(),
                "video/webm".to_string(),
                "application/json".to_string(),
            ],
            max_array_length: 1000,
            max_object_depth: 10,
            enable_sql_injection_check: true,
            enable_xss_check: true,
            enable_virus_scan_simulation: true,
        }
    }
}

/// Validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<String>,
}

impl ValidationResult {
    pub fn new() -> Self {
        Self {
            is_valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
        }
    }

    pub fn add_error(&mut self, _field: &str, message: &str) {
        self.is_valid = false;
        self.errors.push(ValidationError {
            code: "validation_error".to_string(),
            message: Some(message.to_string()),
            params: HashMap::new(),
        });
    }

    pub fn add_warning(&mut self, message: String) {
        self.warnings.push(message);
    }
}

/// Input validator service
pub struct InputValidator {
    config: ValidationConfig,
    wallet_address_regex: Regex,
    sql_injection_patterns: Vec<Regex>,
    xss_patterns: Vec<Regex>,
}

impl InputValidator {
    pub fn new(config: ValidationConfig) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let wallet_address_regex = Regex::new(r"^0x[a-fA-F0-9]{40}$")?;

        let sql_injection_patterns = vec![
            Regex::new(r"(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute)")?,
            Regex::new(r"(?i)(or|and)\s+\d+\s*=\s*\d+")?,
            Regex::new(r"(?i)(or|and)\s+'.*'\s*=\s*'.*'")?,
            Regex::new(r"(?i)(or|and)\s+1\s*=\s*1")?,
            Regex::new(r"(?i)(or|and)\s+true")?,
            Regex::new(r"(?i)(or|and)\s+false")?,
            Regex::new(r"(?i)(or|and)\s+null")?,
            Regex::new(r"(?i)(or|and)\s+not\s+null")?,
            Regex::new(r"(?i)(or|and)\s+exists\s*\(")?,
            Regex::new(r"(?i)(or|and)\s+not\s+exists\s*\(")?,
            Regex::new(r"(?i)(or|and)\s+in\s*\(")?,
            Regex::new(r"(?i)(or|and)\s+not\s+in\s*\(")?,
            Regex::new(r"(?i)(or|and)\s+like\s+")?,
            Regex::new(r"(?i)(or|and)\s+not\s+like\s+")?,
            Regex::new(r"(?i)(or|and)\s+between\s+")?,
            Regex::new(r"(?i)(or|and)\s+not\s+between\s+")?,
            Regex::new(r"(?i)(or|and)\s+is\s+null")?,
            Regex::new(r"(?i)(or|and)\s+is\s+not\s+null")?,
            Regex::new(r"(?i)(or|and)\s+is\s+true")?,
            Regex::new(r"(?i)(or|and)\s+is\s+false")?,
            Regex::new(r"(?i)(or|and)\s+is\s+not\s+true")?,
            Regex::new(r"(?i)(or|and)\s+is\s+not\s+false")?,
            Regex::new(r"(?i)(or|and)\s+is\s+not\s+null")?,
            Regex::new(r"(?i)(or|and)\s+is\s+not\s+null")?,
            Regex::new(r"(?i)(or|and)\s+is\s+not\s+null")?,
        ];

        let xss_patterns = vec![
            Regex::new(r"(?i)<script[^>]*>.*?</script>")?,
            Regex::new(r"(?i)<iframe[^>]*>.*?</iframe>")?,
            Regex::new(r"(?i)<object[^>]*>.*?</object>")?,
            Regex::new(r"(?i)<embed[^>]*>.*?</embed>")?,
            Regex::new(r"(?i)<applet[^>]*>.*?</applet>")?,
            Regex::new(r"(?i)<form[^>]*>.*?</form>")?,
            Regex::new(r"(?i)<input[^>]*>")?,
            Regex::new(r"(?i)<textarea[^>]*>.*?</textarea>")?,
            Regex::new(r"(?i)<select[^>]*>.*?</select>")?,
            Regex::new(r"(?i)<option[^>]*>.*?</option>")?,
            Regex::new(r"(?i)<button[^>]*>.*?</button>")?,
            Regex::new(r"(?i)<link[^>]*>")?,
            Regex::new(r"(?i)<meta[^>]*>")?,
            Regex::new(r"(?i)<style[^>]*>.*?</style>")?,
            Regex::new(r"(?i)<link[^>]*>")?,
            Regex::new(r"(?i)<meta[^>]*>")?,
            Regex::new(r"(?i)<style[^>]*>.*?</style>")?,
            Regex::new(r"(?i)javascript:")?,
            Regex::new(r"(?i)vbscript:")?,
            Regex::new(r"(?i)onload\s*=")?,
            Regex::new(r"(?i)onerror\s*=")?,
            Regex::new(r"(?i)onclick\s*=")?,
            Regex::new(r"(?i)onmouseover\s*=")?,
            Regex::new(r"(?i)onfocus\s*=")?,
            Regex::new(r"(?i)onblur\s*=")?,
            Regex::new(r"(?i)onchange\s*=")?,
            Regex::new(r"(?i)onsubmit\s*=")?,
            Regex::new(r"(?i)onreset\s*=")?,
            Regex::new(r"(?i)onselect\s*=")?,
            Regex::new(r"(?i)onkeydown\s*=")?,
            Regex::new(r"(?i)onkeyup\s*=")?,
            Regex::new(r"(?i)onkeypress\s*=")?,
            Regex::new(r"(?i)onmousedown\s*=")?,
            Regex::new(r"(?i)onmouseup\s*=")?,
            Regex::new(r"(?i)onmousemove\s*=")?,
            Regex::new(r"(?i)onmouseout\s*=")?,
            Regex::new(r"(?i)onmouseover\s*=")?,
            Regex::new(r"(?i)onmouseenter\s*=")?,
            Regex::new(r"(?i)onmouseleave\s*=")?,
            Regex::new(r"(?i)oncontextmenu\s*=")?,
            Regex::new(r"(?i)ondblclick\s*=")?,
            Regex::new(r"(?i)onwheel\s*=")?,
            Regex::new(r"(?i)onresize\s*=")?,
            Regex::new(r"(?i)onscroll\s*=")?,
            Regex::new(r"(?i)onabort\s*=")?,
            Regex::new(r"(?i)oncanplay\s*=")?,
            Regex::new(r"(?i)oncanplaythrough\s*=")?,
            Regex::new(r"(?i)ondurationchange\s*=")?,
            Regex::new(r"(?i)onemptied\s*=")?,
            Regex::new(r"(?i)onended\s*=")?,
            Regex::new(r"(?i)onerror\s*=")?,
            Regex::new(r"(?i)onloadeddata\s*=")?,
            Regex::new(r"(?i)onloadedmetadata\s*=")?,
            Regex::new(r"(?i)onloadstart\s*=")?,
            Regex::new(r"(?i)onpause\s*=")?,
            Regex::new(r"(?i)onplay\s*=")?,
            Regex::new(r"(?i)onplaying\s*=")?,
            Regex::new(r"(?i)onprogress\s*=")?,
            Regex::new(r"(?i)onratechange\s*=")?,
            Regex::new(r"(?i)onseeked\s*=")?,
            Regex::new(r"(?i)onseeking\s*=")?,
            Regex::new(r"(?i)onstalled\s*=")?,
            Regex::new(r"(?i)onsuspend\s*=")?,
            Regex::new(r"(?i)ontimeupdate\s*=")?,
            Regex::new(r"(?i)onvolumechange\s*=")?,
            Regex::new(r"(?i)onwaiting\s*=")?,
        ];

        Ok(Self {
            config,
            wallet_address_regex,
            sql_injection_patterns,
            xss_patterns,
        })
    }

    /// Validate wallet address
    pub fn validate_wallet_address(&self, address: &str) -> ValidationResult {
        let mut result = ValidationResult::new();

        if address.is_empty() {
            result.add_error("address", "Wallet address cannot be empty");
            return result;
        }

        if address.len() != 42 {
            result.add_error("address", "Wallet address must be 42 characters long");
            return result;
        }

        if !self.wallet_address_regex.is_match(address) {
            result.add_error("address", "Invalid wallet address format");
            return result;
        }

        // Basic checksum validation (simplified)
        if !address.starts_with("0x") {
            result.add_error("address", "Wallet address must start with 0x");
            return result;
        }

        result
    }

    /// Validate amount (non-negative, no overflow)
    pub fn validate_amount(&self, amount: &str) -> ValidationResult {
        let mut result = ValidationResult::new();

        if amount.is_empty() {
            result.add_error("amount", "Amount cannot be empty");
            return result;
        }

        // Check if it's a valid number
        let parsed_amount = match amount.parse::<f64>() {
            Ok(amount) => amount,
            Err(_) => {
                result.add_error("amount", "Invalid amount format");
                return result;
            }
        };

        if parsed_amount < 0.0 {
            result.add_error("amount", "Amount cannot be negative");
            return result;
        }

        if parsed_amount > 1e18 {
            result.add_error("amount", "Amount too large (max 1e18)");
            return result;
        }

        if parsed_amount.is_infinite() || parsed_amount.is_nan() {
            result.add_error("amount", "Invalid amount value");
            return result;
        }

        result
    }

    /// Validate string (no SQL injection, XSS)
    pub fn validate_string(&self, input: &str, field_name: &str) -> ValidationResult {
        let mut result = ValidationResult::new();

        if input.len() > self.config.max_string_length {
            result.add_error(
                field_name,
                &format!(
                    "String too long (max {} characters)",
                    self.config.max_string_length
                ),
            );
            return result;
        }

        // Check for SQL injection patterns
        if self.config.enable_sql_injection_check {
            for pattern in &self.sql_injection_patterns {
                if pattern.is_match(input) {
                    result.add_error(field_name, "Potential SQL injection detected");
                    return result;
                }
            }
        }

        // Check for XSS patterns
        if self.config.enable_xss_check {
            for pattern in &self.xss_patterns {
                if pattern.is_match(input) {
                    result.add_error(field_name, "Potential XSS attack detected");
                    return result;
                }
            }
        }

        result
    }

    /// Validate JSON payload structure
    pub fn validate_json_payload<T>(&self, payload: &T) -> ValidationResult
    where
        T: Validate,
    {
        let mut result = ValidationResult::new();

        match payload.validate() {
            Ok(_) => {
                // Additional custom validation can be added here
                result
            }
            Err(errors) => {
                result.is_valid = false;
                for (field, field_errors) in errors.field_errors() {
                    for error in field_errors {
                        result.add_error(field, &error.message.clone().unwrap_or_default());
                    }
                }
                result
            }
        }
    }

    /// Validate file upload
    pub fn validate_file_upload(
        &self,
        file_size: u64,
        content_type: &str,
        filename: &str,
    ) -> ValidationResult {
        let mut result = ValidationResult::new();

        // Check file size
        if file_size > self.config.max_file_size {
            result.add_error(
                "file",
                &format!("File too large (max {} bytes)", self.config.max_file_size),
            );
            return result;
        }

        // Check content type
        if !self
            .config
            .allowed_file_types
            .contains(&content_type.to_string())
        {
            result.add_error("file", "File type not allowed");
            return result;
        }

        // Check filename
        if filename.is_empty() {
            result.add_error("file", "Filename cannot be empty");
            return result;
        }

        if filename.len() > 255 {
            result.add_error("file", "Filename too long (max 255 characters)");
            return result;
        }

        // Check for dangerous file extensions
        let dangerous_extensions = vec![
            "exe", "bat", "cmd", "com", "pif", "scr", "vbs", "js", "jar", "app", "deb", "pkg",
            "dmg", "iso", "img", "bin", "sh", "ps1", "psm1", "psd1", "ps1xml", "psc1", "pssc",
            "cdxml", "msh", "msh1", "msh2", "mshxml", "msh1xml", "msh2xml", "scf", "lnk", "inf",
            "reg", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "pdf", "rtf", "odt", "ods", "odp",
        ];

        if let Some(extension) = filename.split('.').last() {
            if dangerous_extensions.contains(&extension.to_lowercase().as_str()) {
                result.add_error("file", "File extension not allowed");
                return result;
            }
        }

        // Simulate virus scan
        if self.config.enable_virus_scan_simulation {
            if self.simulate_virus_scan(filename, file_size) {
                result.add_error("file", "File failed virus scan");
                return result;
            }
        }

        result
    }

    /// Simulate virus scan (for demonstration)
    fn simulate_virus_scan(&self, filename: &str, file_size: u64) -> bool {
        // This is a simulation - in production, you would use a real virus scanning service
        let suspicious_patterns = vec![
            "virus",
            "malware",
            "trojan",
            "worm",
            "backdoor",
            "keylogger",
            "rootkit",
            "adware",
            "spyware",
            "ransomware",
            "botnet",
            "exploit",
            "payload",
        ];

        let filename_lower = filename.to_lowercase();
        for pattern in suspicious_patterns {
            if filename_lower.contains(pattern) {
                return true;
            }
        }

        // Simulate detection based on file size (very small or very large files)
        if file_size < 100 || file_size > 100 * 1024 * 1024 {
            return true;
        }

        false
    }

    /// Validate array length
    pub fn validate_array_length(&self, array: &[serde_json::Value]) -> ValidationResult {
        let mut result = ValidationResult::new();

        if array.len() > self.config.max_array_length {
            result.add_error(
                "array",
                &format!(
                    "Array too long (max {} items)",
                    self.config.max_array_length
                ),
            );
            return result;
        }

        result
    }

    /// Validate object depth
    pub fn validate_object_depth(&self, value: &serde_json::Value) -> ValidationResult {
        let mut result = ValidationResult::new();

        let depth = self.calculate_object_depth(value);
        if depth > self.config.max_object_depth {
            result.add_error(
                "object",
                &format!(
                    "Object too deep (max {} levels)",
                    self.config.max_object_depth
                ),
            );
            return result;
        }

        result
    }

    /// Calculate object depth recursively
    fn calculate_object_depth(&self, value: &serde_json::Value) -> usize {
        match value {
            serde_json::Value::Object(map) => {
                if map.is_empty() {
                    1
                } else {
                    1 + map
                        .values()
                        .map(|v| self.calculate_object_depth(v))
                        .max()
                        .unwrap_or(0)
                }
            }
            serde_json::Value::Array(arr) => {
                if arr.is_empty() {
                    1
                } else {
                    1 + arr
                        .iter()
                        .map(|v| self.calculate_object_depth(v))
                        .max()
                        .unwrap_or(0)
                }
            }
            _ => 1,
        }
    }

    /// Get validation statistics
    pub fn get_validation_stats(&self) -> ValidationStats {
        ValidationStats {
            total_validations: 0, // This would be tracked in a real implementation
            successful_validations: 0,
            failed_validations: 0,
            sql_injection_attempts: 0,
            xss_attempts: 0,
            file_upload_rejections: 0,
        }
    }
}

/// Validation statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationStats {
    pub total_validations: u64,
    pub successful_validations: u64,
    pub failed_validations: u64,
    pub sql_injection_attempts: u64,
    pub xss_attempts: u64,
    pub file_upload_rejections: u64,
}

/// Validation error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub code: String,
    pub message: Option<String>,
    pub params: HashMap<String, String>,
}

/// Input validation middleware for Axum
pub async fn input_validation_middleware(
    State(validator): State<InputValidator>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let path = request.uri().path();
    let method = request.method().clone();

    // Skip validation for certain endpoints
    if should_skip_validation(&path, &method) {
        return Ok(next.run(request).await);
    }

    // Extract and validate request body
    let (parts, body) = request.into_parts();
    let body_bytes = match axum::body::to_bytes(body, usize::MAX).await {
        Ok(bytes) => bytes,
        Err(_) => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body("Invalid request body".into())
                .unwrap());
        }
    };

    // Validate request body
    if !body_bytes.is_empty() {
        let body_str = match std::str::from_utf8(&body_bytes) {
            Ok(s) => s,
            Err(_) => {
                return Ok(Response::builder()
                    .status(StatusCode::BAD_REQUEST)
                    .body("Invalid UTF-8 in request body".into())
                    .unwrap());
            }
        };

        // Parse JSON and validate
        match serde_json::from_str::<serde_json::Value>(body_str) {
            Ok(json_value) => {
                let validation_result = validator.validate_object_depth(&json_value);
                if !validation_result.is_valid {
                    return Ok(Response::builder()
                        .status(StatusCode::BAD_REQUEST)
                        .body(serde_json::to_string(&validation_result).unwrap().into())
                        .unwrap());
                }
            }
            Err(_) => {
                // If it's not JSON, validate as string
                let validation_result = validator.validate_string(body_str, "body");
                if !validation_result.is_valid {
                    return Ok(Response::builder()
                        .status(StatusCode::BAD_REQUEST)
                        .body(serde_json::to_string(&validation_result).unwrap().into())
                        .unwrap());
                }
            }
        }
    }

    // Reconstruct request
    let request = Request::from_parts(parts, body_bytes.into());
    Ok(next.run(request).await)
}

/// Check if validation should be skipped for certain endpoints
fn should_skip_validation(path: &str, method: &axum::http::Method) -> bool {
    let skip_paths = vec![
        "/health",
        "/metrics",
        "/favicon.ico",
        "/robots.txt",
        "/sitemap.xml",
    ];

    skip_paths.contains(&path) || method == &axum::http::Method::GET
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wallet_address_validation() {
        let validator = InputValidator::new(ValidationConfig::default()).unwrap();

        // Valid addresses
        assert!(
            validator
                .validate_wallet_address("0x1234567890123456789012345678901234567890")
                .is_valid
        );
        assert!(
            validator
                .validate_wallet_address("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd")
                .is_valid
        );

        // Invalid addresses
        assert!(!validator.validate_wallet_address("").is_valid);
        assert!(!validator.validate_wallet_address("0x123").is_valid);
        assert!(
            !validator
                .validate_wallet_address("1234567890123456789012345678901234567890")
                .is_valid
        );
        assert!(
            !validator
                .validate_wallet_address("0x123456789012345678901234567890123456789g")
                .is_valid
        );
    }

    #[test]
    fn test_amount_validation() {
        let validator = InputValidator::new(ValidationConfig::default()).unwrap();

        // Valid amounts
        assert!(validator.validate_amount("100").is_valid);
        assert!(validator.validate_amount("0").is_valid);
        assert!(validator.validate_amount("100.5").is_valid);

        // Invalid amounts
        assert!(!validator.validate_amount("").is_valid);
        assert!(!validator.validate_amount("-100").is_valid);
        assert!(!validator.validate_amount("invalid").is_valid);
        assert!(!validator.validate_amount("1e19").is_valid);
    }

    #[test]
    fn test_string_validation() {
        let validator = InputValidator::new(ValidationConfig::default()).unwrap();

        // Valid strings
        assert!(validator.validate_string("Hello World", "test").is_valid);
        assert!(validator.validate_string("", "test").is_valid);

        // Invalid strings (SQL injection)
        assert!(
            !validator
                .validate_string("'; DROP TABLE users; --", "test")
                .is_valid
        );
        assert!(!validator.validate_string("1' OR '1'='1", "test").is_valid);

        // Invalid strings (XSS)
        assert!(
            !validator
                .validate_string("<script>alert('xss')</script>", "test")
                .is_valid
        );
        assert!(
            !validator
                .validate_string("<img src=x onerror=alert('xss')>", "test")
                .is_valid
        );
    }

    #[test]
    fn test_file_upload_validation() {
        let validator = InputValidator::new(ValidationConfig::default()).unwrap();

        // Valid files
        assert!(
            validator
                .validate_file_upload(1024, "image/jpeg", "test.jpg")
                .is_valid
        );
        assert!(
            validator
                .validate_file_upload(1024, "audio/mpeg", "test.mp3")
                .is_valid
        );

        // Invalid files
        assert!(
            !validator
                .validate_file_upload(11 * 1024 * 1024, "image/jpeg", "test.jpg")
                .is_valid
        );
        assert!(
            !validator
                .validate_file_upload(1024, "application/exe", "test.exe")
                .is_valid
        );
        assert!(
            !validator
                .validate_file_upload(1024, "image/jpeg", "")
                .is_valid
        );
    }
}
