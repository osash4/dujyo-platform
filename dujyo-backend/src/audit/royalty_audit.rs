//! Audit Logging for Royalty Operations
//! 
//! Provides comprehensive audit logging for all royalty-related financial operations
//! to meet compliance and security audit requirements.

use sqlx::PgPool;
use chrono::Utc;
use uuid::Uuid;
use tracing::{info, warn, error};
use serde_json::json;
use crate::pallets::royalty::Distribution;

/// Log royalty distribution to audit trail
pub async fn log_royalty_distribution(
    content_id: &str,
    amount: f64,
    distributions: &[Distribution],
    pool: &PgPool,
) -> Result<(), sqlx::Error> {
    let entry_id = Uuid::new_v4();
    let timestamp = Utc::now();
    
    // Create audit log entry
    let details = json!({
        "amount": amount,
        "distributions": distributions,
        "distribution_count": distributions.len(),
        "content_id": content_id,
    });
    
    // Insert into audit_logs table
    let query_result = sqlx::query!(
        r#"
        INSERT INTO audit_logs (
            id, timestamp, action_type, resource, details, success, status_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        entry_id,
        timestamp,
        "royalty_distribution",
        content_id,
        details,
        true,
        200i32
    )
    .execute(pool)
    .await;
    
    match query_result {
        Ok(_) => {
            info!(
                audit_id = %entry_id,
                content_id = %content_id,
                amount = amount,
                distributions_count = distributions.len(),
                "Royalty distribution audit log created"
            );
            Ok(())
        }
        Err(e) => {
            error!(
                error = %e,
                content_id = %content_id,
                "Failed to create royalty distribution audit log"
            );
            Err(e)
        }
    }
}

/// Log royalty contract creation
pub async fn log_royalty_contract_creation(
    content_id: &str,
    beneficiary_count: usize,
    pool: &PgPool,
) -> Result<(), sqlx::Error> {
    let entry_id = Uuid::new_v4();
    let timestamp = Utc::now();
    
    let details = json!({
        "content_id": content_id,
        "beneficiary_count": beneficiary_count,
    });
    
    sqlx::query!(
        r#"
        INSERT INTO audit_logs (
            id, timestamp, action_type, resource, details, success, status_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        entry_id,
        timestamp,
        "royalty_contract_created",
        content_id,
        details,
        true,
        200i32
    )
    .execute(pool)
    .await?;
    
    info!(
        audit_id = %entry_id,
        content_id = %content_id,
        beneficiary_count = beneficiary_count,
        "Royalty contract creation audit log created"
    );
    
    Ok(())
}

/// Log royalty distribution failure
pub async fn log_royalty_distribution_failure(
    content_id: &str,
    error_message: &str,
    pool: &PgPool,
) -> Result<(), sqlx::Error> {
    let entry_id = Uuid::new_v4();
    let timestamp = Utc::now();
    
    let details = json!({
        "content_id": content_id,
        "error": error_message,
    });
    
    sqlx::query!(
        r#"
        INSERT INTO audit_logs (
            id, timestamp, action_type, resource, details, success, status_code, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
        entry_id,
        timestamp,
        "royalty_distribution",
        content_id,
        details,
        false,
        500i32,
        error_message
    )
    .execute(pool)
    .await?;
    
    warn!(
        audit_id = %entry_id,
        content_id = %content_id,
        error = %error_message,
        "Royalty distribution failure audit log created"
    );
    
    Ok(())
}

