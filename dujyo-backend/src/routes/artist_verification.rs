use axum::{
    extract::{State, Extension},
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use lazy_static::lazy_static;
use sqlx;

use crate::server::AppState;
use crate::auth::Claims;

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Serialize)]
pub struct VerificationResponse {
    success: bool,
    message: String,
    verified: bool,
}

#[derive(Deserialize)]
pub struct VerificationRequest {
    // For MVP: Simple request, manual approval by founder
    // TODO: Add portfolio links, music samples, etc.
}

// ✅ MOVED TO DATABASE - No longer using in-memory storage
// Legacy in-memory storage kept for backward compatibility during transition
lazy_static! {
    static ref ARTIST_VERIFICATION_REQUESTS: Mutex<HashMap<String, bool>> = Mutex::new(HashMap::new());
    static ref VERIFIED_ARTISTS: Mutex<HashMap<String, bool>> = Mutex::new(HashMap::new());
}

// Founder/admin addresses (for MVP manual verification)
const FOUNDER_ADDRESSES: &[&str] = &[
    // TODO: Add real founder addresses
    "founder1",
    "admin",
];

// ============================================================================
// HANDLERS
// ============================================================================

/// Request artist verification
/// POST /api/v1/artist/request-verification
pub async fn request_verification(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(_request): Json<VerificationRequest>,
) -> Result<Json<VerificationResponse>, StatusCode> {
    let user_address = &claims.sub;
    let pool = &state.storage.pool;
    
    // ✅ CHECK IF ALREADY VERIFIED IN DATABASE
    let is_verified: Option<bool> = sqlx::query_scalar(
        "SELECT verified FROM artist_verifications WHERE artist_id = $1"
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);
    
    if let Some(true) = is_verified {
        return Ok(Json(VerificationResponse {
            success: true,
            message: "You are already verified as an artist.".to_string(),
            verified: true,
        }));
    }
    
    // ✅ CHECK IF ALREADY REQUESTED IN DATABASE
    let has_request: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM artist_verifications WHERE artist_id = $1)"
    )
    .bind(user_address)
    .fetch_one(pool)
    .await
    .unwrap_or(false);
    
    if has_request && is_verified == Some(false) {
        return Ok(Json(VerificationResponse {
            success: false,
            message: "Verification request already submitted. Please wait for approval.".to_string(),
            verified: false,
        }));
    }
    
    // ✅ FOR MVP: AUTO-APPROVE ALL REQUESTS (remove in production!)
    // Insert or update verification record
    match sqlx::query(
        r#"
        INSERT INTO artist_verifications (artist_id, artist_name, verified, requested_at, approved_at, approved_by, created_at, updated_at)
        VALUES ($1, $2, TRUE, NOW(), NOW(), 'system', NOW(), NOW())
        ON CONFLICT (artist_id) DO UPDATE SET
            verified = TRUE,
            approved_at = NOW(),
            approved_by = 'system',
            updated_at = NOW()
        "#
    )
    .bind(user_address)
    .bind(user_address) // Use address as name for now
    .execute(pool)
    .await
    {
        Ok(_) => {
            // Also update in-memory cache for backward compatibility
            {
                if let Ok(mut verified) = VERIFIED_ARTISTS.lock() {
                    verified.insert(user_address.clone(), true);
                } else {
                    tracing::error!("CRITICAL: Failed to acquire artist verification lock");
                }
            }
            println!("✅ Artist verification auto-approved for MVP: {} (saved to DB)", user_address);
        }
        Err(e) => {
            println!("⚠️  Error saving artist verification to database: {}", e);
            // Fallback to in-memory for backward compatibility
            if let Ok(mut verified) = VERIFIED_ARTISTS.lock() {
                verified.insert(user_address.clone(), true);
            } else {
                tracing::error!("CRITICAL: Failed to acquire artist verification lock for fallback");
            }
        }
    }
    
    Ok(Json(VerificationResponse {
        success: true,
        message: "Artist verification request submitted and approved (MVP auto-approval). You can now upload content.".to_string(),
        verified: true,
    }))
}

/// Approve artist verification (admin only)
/// POST /api/v1/artist/approve-verification
pub async fn approve_verification(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<serde_json::Value>,
) -> Result<Json<VerificationResponse>, StatusCode> {
    let admin_address = &claims.sub;
    
    // Check if admin
    if !FOUNDER_ADDRESSES.contains(&admin_address.as_str()) {
        return Err(StatusCode::FORBIDDEN);
    }
    
    let artist_address = request.get("artist_address")
        .and_then(|v| v.as_str())
        .ok_or(StatusCode::BAD_REQUEST)?;
    
    let artist_name = request.get("artist_name")
        .and_then(|v| v.as_str())
        .unwrap_or(artist_address);
    
    let pool = &state.storage.pool;
    
    // ✅ SAVE TO DATABASE
    match sqlx::query(
        r#"
        INSERT INTO artist_verifications (artist_id, artist_name, verified, requested_at, approved_at, approved_by, created_at, updated_at)
        VALUES ($1, $2, TRUE, NOW(), NOW(), $3, NOW(), NOW())
        ON CONFLICT (artist_id) DO UPDATE SET
            verified = TRUE,
            approved_at = NOW(),
            approved_by = $3,
            updated_at = NOW()
        "#
    )
    .bind(artist_address)
    .bind(artist_name)
    .bind(admin_address)
    .execute(pool)
    .await
    {
        Ok(_) => {
            // Also update in-memory cache for backward compatibility
            {
                if let Ok(mut verified) = VERIFIED_ARTISTS.lock() {
                    verified.insert(artist_address.to_string(), true);
                } else {
                    tracing::error!("CRITICAL: Failed to acquire artist verification lock");
                }
            }
            println!("✅ Artist verification approved by {}: {} (saved to DB)", admin_address, artist_address);
        }
        Err(e) => {
            println!("⚠️  Error saving artist verification to database: {}", e);
            // Fallback to in-memory for backward compatibility
            let mut verified = VERIFIED_ARTISTS.lock().map_err(|e| {
                tracing::error!(error = %e, "CRITICAL: Failed to acquire artist verification lock");
                StatusCode::INTERNAL_SERVER_ERROR // ✅ FIX: Convert PoisonError to StatusCode
            })?;
            verified.insert(artist_address.to_string(), true);
        }
    }
    
    Ok(Json(VerificationResponse {
        success: true,
        message: format!("Artist {} has been verified.", artist_address),
        verified: true,
    }))
}

/// Check verification status
/// GET /api/v1/artist/verification-status
pub async fn check_verification_status(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<VerificationResponse>, StatusCode> {
    let user_address = &claims.sub;
    let pool = &state.storage.pool;
    
    // ✅ CHECK IN DATABASE
    let is_verified: bool = sqlx::query_scalar(
        "SELECT COALESCE(verified, FALSE) FROM artist_verifications WHERE artist_id = $1"
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await
    .unwrap_or(None)
    .unwrap_or(false);
    
    Ok(Json(VerificationResponse {
        success: true,
        message: if is_verified {
            "You are verified as an artist.".to_string()
        } else {
            "You are not yet verified as an artist.".to_string()
        },
        verified: is_verified,
    }))
}

// ============================================================================
// ROUTES
// ============================================================================

pub fn artist_verification_routes() -> Router<AppState> {
    Router::new()
        .route("/request-verification", post(request_verification))
        .route("/approve-verification", post(approve_verification))
        .route("/verification-status", axum::routing::get(check_verification_status))
}



