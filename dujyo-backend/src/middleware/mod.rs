//! Middleware Module
//! 
//! Contains all middleware for the Dujyo backend:
//! - Rate limiting
//! - Security headers
//! - Input validation
//! - Audit logging

pub mod rate_limiter;
pub mod rate_limiting;
pub mod beta_access; // ✅ MVP-CRITICAL: Redis-based rate limiting
pub mod security_headers;
pub mod input_validation; // ✅ MVP-CRITICAL: Input validation enabled (regex dependency in Cargo.toml)
pub mod audit_logging;
pub mod request_id;
pub mod https_enforcement;

pub use rate_limiter::{rate_limit_middleware, RateLimitRules, RateLimitState};
pub use rate_limiting::{redis_rate_limiting_middleware, RedisRateLimitState, RateLimitRules as RedisRateLimitRules};
pub use security_headers::{security_headers_middleware, SecurityHeadersConfig, create_strict_security_config};
pub use input_validation::{input_validation_middleware, validate_input, sanitize_input, validate_json_body}; // ✅ MVP-CRITICAL: Input validation enabled
pub use audit_logging::{audit_logging_middleware, AuditLogConfig, create_audit_config, AuditLogEntry};
pub use request_id::{request_id_middleware, get_request_id};
pub use https_enforcement::{https_enforcement_middleware, https_validation_middleware};

