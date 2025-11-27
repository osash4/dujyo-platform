//! Security Module for Dujyo
//!
//! This module provides comprehensive security features:
//! - Rate limiting and anti-abuse
//! - Content verification
//! - Consensus protection
//! - Security monitoring

pub mod rate_limiter_memory; // ✅ ACTIVADO - Versión en memoria
pub mod rate_limiting_redis; // ✅ P2.2: Redis-based rate limiting
pub mod content_verifier; // ✅ ACTIVADO - Queries opcionales
// pub mod consensus_protection; // TODO: Fix database queries
pub mod circuit_breaker;
// pub mod input_validator; // ⚠️ TEMPORALMENTE DESHABILITADO - Requiere dependencias regex y validator
pub mod security_headers;

pub use rate_limiter_memory::{RateLimiter, RateLimitConfig, RateLimitResult, AbuseType, AbuseAction, RateLimitStats};
pub use rate_limiting_redis::{check_rate_limit, get_remaining_requests, reset_rate_limit, RateLimitError};
pub use content_verifier::{ContentVerifier, ContentVerificationConfig, StreamVerificationResult, ViolationType};
// pub use input_validator; // ⚠️ TEMPORALMENTE DESHABILITADO
// pub use consensus_protection::{ConsensusProtection, ConsensusSecurityConfig, ValidatorInfo, GovernanceProposal};
// pub use input_validator::{InputValidator, ValidationConfig, ValidationResult, ValidationError};
// pub use circuit_breaker::{CircuitBreaker, CircuitBreakerConfig, CircuitBreakerManager, CircuitBreakerError};
// pub use security_headers::{SecurityHeadersConfig, security_headers_middleware, create_strict_security_config};

// TODO: Implement SecurityService when all modules are fixed
/*
/// Security service that combines all security features
pub struct SecurityService {
    // pub rate_limiter: RateLimiter, // TODO: Fix Redis version conflicts
    // pub content_verifier: ContentVerifier, // TODO: Fix database queries
    // pub consensus_protection: ConsensusProtection, // TODO: Fix database queries
}

impl SecurityService {
    /// Create new security service
    pub async fn new(
        db_pool: sqlx::PgPool,
        rate_config: RateLimitConfig,
        content_config: ContentVerificationConfig,
        consensus_config: ConsensusSecurityConfig,
    ) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let rate_limiter = RateLimiter::new(rate_config);
        let content_verifier = ContentVerifier::new(db_pool.clone(), content_config).await?;
        let consensus_protection = ConsensusProtection::new(db_pool, consensus_config).await?;

        Ok(Self {
            rate_limiter,
            content_verifier,
            consensus_protection,
        })
    }

    /// Get security statistics
    pub async fn get_security_stats(&self) -> Result<SecurityStats, Box<dyn std::error::Error + Send + Sync>> {
        let rate_stats = self.rate_limiter.get_stats().await?;
        let content_stats = self.content_verifier.get_stats().await?;
        let consensus_stats = self.consensus_protection.get_security_stats().await?;

        Ok(SecurityStats {
            rate_limiting: rate_stats,
            content_verification: content_stats,
            consensus_protection: consensus_stats,
        })
    }
}
*/

/// Combined security statistics
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SecurityStats {
    // pub rate_limiting: rate_limiter::RateLimitStats,
    // pub content_verification: content_verifier::ContentVerificationStats,
    // pub consensus_protection: consensus_protection::ConsensusSecurityStats,
}
