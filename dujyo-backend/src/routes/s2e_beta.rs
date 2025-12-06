use axum::{
    extract::{State, Extension},
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize};
use crate::server::AppState;
use crate::auth::Claims;
use tracing::{info, error};

#[derive(Debug, Deserialize)]
pub struct BetaAccessRequest {
    pub access_code: String,
    pub email: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BetaAccessResponse {
    pub success: bool,
    pub message: String,
    pub granted: bool,
}

/// POST /api/v1/s2e/request-beta-access
/// Request beta access for S2E
pub async fn request_beta_access_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<BetaAccessRequest>,
) -> Result<Json<BetaAccessResponse>, StatusCode> {
    let user_address = &claims.sub;
    let pool = &state.storage.pool;

    // Load config
    let config = crate::middleware::beta_access::S2EConfig::load()
        .unwrap_or_else(|_| crate::middleware::beta_access::S2EConfig::default());

    // Check if beta is closed
    if !config.is_closed_beta {
        return Ok(Json(BetaAccessResponse {
            success: true,
            message: "Beta is open to all users".to_string(),
            granted: true,
        }));
    }

    // Verify access code
    if !config.beta_access_codes.contains(&request.access_code) {
        return Ok(Json(BetaAccessResponse {
            success: false,
            message: "Invalid access code".to_string(),
            granted: false,
        }));
    }

    // Check current user count
    let current_users: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM beta_users WHERE is_active = true"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| {
        error!("Failed to check beta user count: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if current_users >= config.max_users as i64 {
        return Ok(Json(BetaAccessResponse {
            success: false,
            message: format!("Beta is full ({} users). Please wait for the next phase.", config.max_users),
            granted: false,
        }));
    }

    // Grant access
    sqlx::query(
        r#"
        INSERT INTO beta_users (user_address, access_code, is_active, granted_at)
        VALUES ($1, $2, true, NOW())
        ON CONFLICT (user_address) 
        DO UPDATE SET 
            is_active = true,
            access_code = $2,
            granted_at = NOW()
        "#
    )
    .bind(user_address)
    .bind(&request.access_code)
    .execute(pool)
    .await
    .map_err(|e| {
        error!("Failed to grant beta access: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    info!("✅ Beta access granted to: {} with code: {}", user_address, request.access_code);

    Ok(Json(BetaAccessResponse {
        success: true,
        message: "Beta access granted! You can now use Stream-to-Earn features.".to_string(),
        granted: true,
    }))
}

pub fn s2e_beta_routes() -> Router<AppState> {
    Router::new()
        .route("/request-beta-access", post(request_beta_access_handler))
}

