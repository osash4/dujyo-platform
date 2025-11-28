use axum::{
    extract::{State, Extension, Multipart},
    http::StatusCode,
    response::Json,
    routing::{get, put, post},
};
use serde::{Deserialize, Serialize};
use tokio::fs;
use std::path::Path;
use uuid::Uuid;
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

use axum::{
    extract::{State, Extension, Multipart},
    http::StatusCode,
    response::Json,
    routing::{get, put, post},
};
use tokio::fs;
use std::path::Path;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct UpdateProfileRequest {
    pub display_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Serialize)]
pub struct ProfileResponse {
    pub success: bool,
    pub display_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub email: String,
    pub username: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdatePrivacyRequest {
    pub public_profile: Option<bool>,
    pub show_listening_activity: Option<bool>,
    pub data_collection: Option<bool>,
}

#[derive(Serialize)]
pub struct PrivacyResponse {
    pub success: bool,
    pub public_profile: bool,
    pub show_listening_activity: bool,
    pub data_collection: bool,
}

/// GET /api/v1/user/profile
/// Get user profile
pub async fn get_profile_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<ProfileResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let user_address = &claims.sub;

    let row = sqlx::query(
        r#"
        SELECT email, username, 
               COALESCE(display_name, username) as display_name,
               bio, avatar_url
        FROM users
        WHERE wallet_address = $1
        "#
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        eprintln!("Error fetching profile: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(ProfileResponse {
        success: true,
        display_name: row.get::<Option<String>, _>("display_name"),
        bio: row.get::<Option<String>, _>("bio"),
        avatar_url: row.get::<Option<String>, _>("avatar_url"),
        email: row.get::<String, _>("email"),
        username: row.get::<Option<String>, _>("username"),
    }))
}

/// PUT /api/v1/user/profile
/// Update user profile
pub async fn update_profile_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<UpdateProfileRequest>,
) -> Result<Json<ProfileResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let user_address = &claims.sub;

    // Build update query dynamically
    let mut updates = Vec::new();
    if let Some(ref display_name) = request.display_name {
        updates.push(format!("display_name = '{}'", display_name.replace("'", "''")));
    }
    if let Some(ref bio) = request.bio {
        updates.push(format!("bio = '{}'", bio.replace("'", "''")));
    }
    if let Some(ref avatar_url) = request.avatar_url {
        updates.push(format!("avatar_url = '{}'", avatar_url.replace("'", "''")));
    }
    updates.push("updated_at = NOW()".to_string());

    if updates.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let query = format!(
        "UPDATE users SET {} WHERE wallet_address = $1",
        updates.join(", ")
    );

    sqlx::query(&query)
        .bind(user_address)
        .execute(pool)
        .await
        .map_err(|e| {
            eprintln!("Error updating profile: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // Fetch updated profile
    get_profile_handler(State(state), Extension(claims)).await
}

/// POST /api/v1/user/avatar
/// Upload user avatar
pub async fn upload_avatar_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_address = &claims.sub;
    let mut file_data: Option<Vec<u8>> = None;
    let mut file_name = String::new();

    // Parse multipart form data
    while let Some(field) = multipart.next_field().await.map_err(|_| StatusCode::BAD_REQUEST)? {
        let field_name = field.name().unwrap_or("").to_string();
        
        if field_name == "avatar" {
            let filename = field.file_name().map(|f| f.to_string());
            let field_data = field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?;
            
            if let Some(fname) = filename {
                file_name = fname;
                file_data = Some(field_data.to_vec());
            }
        }
    }

    if file_data.is_none() {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Validate file type
    let file_ext = Path::new(&file_name)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");
    
    if !["jpg", "jpeg", "png", "gif", "webp"].contains(&file_ext.to_lowercase().as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Validate file size (max 5MB)
    if let Some(ref data) = file_data {
        if data.len() > 5 * 1024 * 1024 {
            return Err(StatusCode::PAYLOAD_TOO_LARGE);
        }
    }

    // Save file
    let uploads_dir = "uploads/avatars";
    if !Path::new(uploads_dir).exists() {
        fs::create_dir_all(uploads_dir)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    let avatar_id = Uuid::new_v4().to_string();
    let safe_file_name = file_name
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
        .collect::<String>();
    let file_path = format!("{}/{}_{}.{}", uploads_dir, avatar_id, safe_file_name, file_ext);
    
    if let Some(ref data) = file_data {
        fs::write(&file_path, data)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    let avatar_url = format!("/uploads/avatars/{}_{}.{}", avatar_id, safe_file_name, file_ext);

    // Update user avatar_url in database
    sqlx::query("UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE wallet_address = $2")
        .bind(&avatar_url)
        .bind(user_address)
        .execute(&state.storage.pool)
        .await
        .map_err(|e| {
            eprintln!("Error updating avatar_url: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(serde_json::json!({
        "success": true,
        "avatar_url": avatar_url
    })))
}

/// GET /api/v1/user/privacy
/// Get privacy settings
pub async fn get_privacy_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<PrivacyResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let user_address = &claims.sub;

    // Try to get privacy settings, default to true if not set
    let row = sqlx::query(
        r#"
        SELECT 
            COALESCE(public_profile, true) as public_profile,
            COALESCE(show_listening_activity, false) as show_listening_activity,
            COALESCE(data_collection, true) as data_collection
        FROM users
        WHERE wallet_address = $1
        "#
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        eprintln!("Error fetching privacy settings: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(PrivacyResponse {
        success: true,
        public_profile: row.get::<bool, _>("public_profile"),
        show_listening_activity: row.get::<bool, _>("show_listening_activity"),
        data_collection: row.get::<bool, _>("data_collection"),
    }))
}

/// PUT /api/v1/user/privacy
/// Update privacy settings
pub async fn update_privacy_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<UpdatePrivacyRequest>,
) -> Result<Json<PrivacyResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let user_address = &claims.sub;

    // Build update query dynamically
    let mut updates = Vec::new();
    if let Some(public_profile) = request.public_profile {
        updates.push(format!("public_profile = {}", public_profile));
    }
    if let Some(show_listening_activity) = request.show_listening_activity {
        updates.push(format!("show_listening_activity = {}", show_listening_activity));
    }
    if let Some(data_collection) = request.data_collection {
        updates.push(format!("data_collection = {}", data_collection));
    }
    updates.push("updated_at = NOW()".to_string());

    if updates.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let query = format!(
        "UPDATE users SET {} WHERE wallet_address = $1",
        updates.join(", ")
    );

    sqlx::query(&query)
        .bind(user_address)
        .execute(pool)
        .await
        .map_err(|e| {
            eprintln!("Error updating privacy settings: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // Fetch updated privacy settings
    get_privacy_handler(State(state), Extension(claims)).await
}

pub fn user_routes() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/become-artist", post(become_artist_handler))
        .route("/type", get(get_user_type_handler))
        .route("/wallet", get(get_wallet_by_email_handler))
        .route("/profile", get(get_profile_handler))
        .route("/profile", put(update_profile_handler))
        .route("/avatar", post(upload_avatar_handler))
        .route("/privacy", get(get_privacy_handler))
        .route("/privacy", put(update_privacy_handler))
        // TODO: Fix claim_tokens_handler - problema con trait Handler
        // .route("/claim-tokens", post(claim_tokens_handler))
}
