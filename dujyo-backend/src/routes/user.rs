use axum::{
    extract::{State, Extension},
    http::StatusCode,
    response::Json,
};
use axum::extract::Extension as AxumExtension;
use serde::{Deserialize, Serialize};
use crate::server::AppState;
use crate::auth::Claims;
use crate::services::email_service::EmailService;
use tracing::{error, info, warn}; // ✅ FIX: Added warn import

// Request/Response types for become-artist
#[derive(Deserialize)]
pub struct BecomeArtistRequest {
    pub accept_terms: bool,
}

#[derive(Serialize)]
pub struct BecomeArtistResponse {
    pub success: bool,
    pub message: String,
    pub user_type: Option<String>,
}

// Request/Response types for claim tokens
#[derive(Deserialize)]
pub struct ClaimTokensRequest {
    pub wallet_address: String,
}

#[derive(Serialize)]
pub struct ClaimTokensResponse {
    pub success: bool,
    pub message: String,
    pub tokens_claimed: Option<f64>,
}

/// POST /api/v1/user/become-artist
/// Changes user_type from 'listener' to 'artist'
/// Requires: JWT authentication + accept_terms: true
pub async fn become_artist_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<BecomeArtistRequest>,
) -> Result<Json<BecomeArtistResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let user_address = &claims.sub;

    // Check if terms are accepted
    if !payload.accept_terms {
        return Ok(Json(BecomeArtistResponse {
            success: false,
            message: "You must accept the terms to become an artist".to_string(),
            user_type: None,
        }));
    }

    // Check current user_type
    let current_user_type: Option<String> = match sqlx::query_scalar(
        "SELECT user_type FROM users WHERE wallet_address = $1"
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await
    {
        Ok(val) => val,
        Err(e) => {
            error!("Database error checking user_type: {}", e);
            return Ok(Json(BecomeArtistResponse {
                success: false,
                message: format!("Database error: {}", e),
                user_type: None,
            }));
        }
    };

    match current_user_type {
        Some(user_type) if user_type == "artist" => {
            return Ok(Json(BecomeArtistResponse {
                success: true,
                message: "You are already an artist".to_string(),
                user_type: Some("artist".to_string()),
            }));
        }
        Some(user_type) if user_type == "listener" => {
            // Update user_type to 'artist'
            match sqlx::query(
                "UPDATE users SET user_type = 'artist', updated_at = NOW() WHERE wallet_address = $1"
            )
            .bind(user_address)
            .execute(pool)
            .await
            {
                Ok(result) => {
                    if result.rows_affected() > 0 {
                        info!("✅ User {} became an artist", user_address);
                        
                        // ✅ ONBOARDING EXTENSION: Send welcome email to new artist
                        // Get user email and name from database
                        let user_email: Option<String> = sqlx::query_scalar(
                            "SELECT email FROM users WHERE wallet_address = $1"
                        )
                        .bind(user_address)
                        .fetch_optional(pool)
                        .await
                        .ok()
                        .flatten();
                        
                        let user_name: Option<String> = sqlx::query_scalar(
                            "SELECT username FROM users WHERE wallet_address = $1"
                        )
                        .bind(user_address)
                        .fetch_optional(pool)
                        .await
                        .ok()
                        .flatten();
                        
                        // Send welcome email if email is available
                        if let Some(email) = user_email {
                            let artist_name = user_name.unwrap_or_else(|| "Artista".to_string());
                            let email_service = EmailService::new();
                            
                            // Send email asynchronously (don't block response)
                            tokio::spawn(async move {
                                match email_service.send_welcome_artist_email(&email, &artist_name).await {
                                    Ok(_) => info!("✅ Welcome email sent to {}", email),
                                    Err(e) => error!("❌ Failed to send welcome email to {}: {}", email, e),
                                }
                            });
                        } else {
                            warn!("⚠️ User {} became artist but no email found, skipping welcome email", user_address);
                        }
                        
                        Ok(Json(BecomeArtistResponse {
                            success: true,
                            message: "Successfully became an artist! You can now upload content.".to_string(),
                            user_type: Some("artist".to_string()),
                        }))
                    } else {
                        Ok(Json(BecomeArtistResponse {
                            success: false,
                            message: "User not found".to_string(),
                            user_type: None,
                        }))
                    }
                }
                Err(e) => {
                    error!("❌ Error updating user_type: {}", e);
                    // Return JSON error response instead of StatusCode
                    Ok(Json(BecomeArtistResponse {
                        success: false,
                        message: format!("Database error: {}", e),
                        user_type: None,
                    }))
                }
            }
        }
        _ => {
            Ok(Json(BecomeArtistResponse {
                success: false,
                message: "Invalid user type or user not found".to_string(),
                user_type: None,
            }))
        }
    }
}

/// GET /api/v1/user/type
/// Returns the user_type for the authenticated user
pub async fn get_user_type_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let pool = &state.storage.pool;
    let user_address = &claims.sub;

    let user_type: Option<String> = sqlx::query_scalar(
        "SELECT user_type FROM users WHERE wallet_address = $1"
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({
        "user_type": user_type.unwrap_or_else(|| "listener".to_string()),
        "wallet_address": user_address
    })))
}

/// GET /api/v1/user/wallet
/// Returns wallet address for a given email (for login)
pub async fn get_wallet_by_email_handler(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let pool = &state.storage.pool;
    let email = params.get("email").ok_or(StatusCode::BAD_REQUEST)?;

    let result: Option<(String, String)> = sqlx::query_as(
        "SELECT wallet_address, email FROM users WHERE email = $1"
    )
    .bind(email)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match result {
        Some((addr, email)) => {
            Ok(Json(serde_json::json!({
                "success": true,
                "wallet_address": addr,
                "email": email
            })))
        }
        None => {
            Ok(Json(serde_json::json!({
                "success": false,
                "message": "User not found",
                "wallet_address": null
            })))
        }
    }
}

/// POST /api/v1/user/claim-tokens
/// Claims 100 free tokens for new users during onboarding
// TODO: Fix trait Handler issue - temporalmente comentado
/*
pub async fn claim_tokens_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<ClaimTokensRequest>,
) -> Result<Json<ClaimTokensResponse>, StatusCode> {
    let user_address = &claims.sub;
    let pool = &state.storage.pool;

    // Verify the wallet address matches the authenticated user
    if payload.wallet_address != *user_address {
        return Ok(Json(ClaimTokensResponse {
            success: false,
            message: "Wallet address mismatch".to_string(),
            tokens_claimed: None,
        }));
    }

    // Check if user has already claimed tokens
    let already_claimed: Option<bool> = sqlx::query_scalar(
        "SELECT free_tokens_claimed FROM users WHERE wallet_address = $1"
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    if already_claimed == Some(true) {
        return Ok(Json(ClaimTokensResponse {
            success: false,
            message: "Tokens already claimed".to_string(),
            tokens_claimed: Some(0.0),
        }));
    }

    // Mint 100 tokens to the user
    let mut token = state.token.lock().unwrap();
    match token.mint(user_address, 100.0) {
        Ok(_) => {
            // Mark tokens as claimed in database
            // First check if column exists
            let has_column: bool = sqlx::query_scalar(
                "SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'free_tokens_claimed'
                )"
            )
            .fetch_one(pool)
            .await
            .unwrap_or(false);

            if has_column {
                sqlx::query(
                    "UPDATE users SET free_tokens_claimed = true WHERE wallet_address = $1"
                )
                .bind(user_address)
                .execute(pool)
                .await
                .ok();
            }

            info!("✅ User {} claimed 100 free tokens", user_address);
            Ok(Json(ClaimTokensResponse {
                success: true,
                message: "Successfully claimed 100 DYO tokens!".to_string(),
                tokens_claimed: Some(100.0),
            }))
        }
        Err(e) => {
            error!("❌ Error minting tokens: {}", e);
            Ok(Json(ClaimTokensResponse {
                success: false,
                message: format!("Failed to claim tokens: {}", e),
                tokens_claimed: None,
            }))
        }
    }
}
*/

pub fn user_routes() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/become-artist", axum::routing::post(become_artist_handler))
        .route("/type", axum::routing::get(get_user_type_handler))
        .route("/wallet", axum::routing::get(get_wallet_by_email_handler))
        // TODO: Fix claim_tokens_handler - problema con trait Handler
        // .route("/claim-tokens", axum::routing::post(claim_tokens_handler))
}
