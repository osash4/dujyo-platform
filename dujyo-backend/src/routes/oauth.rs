use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use crate::server::AppState;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct GoogleOAuthRequest {
    pub access_token: String,
}

#[derive(Deserialize)]
pub struct AppleOAuthRequest {
    pub id_token: String,
    pub code: Option<String>,
}

#[derive(Serialize)]
pub struct OAuthResponse {
    pub success: bool,
    pub token: String,
    pub message: String,
    pub user: Option<OAuthUser>,
}

#[derive(Serialize)]
pub struct OAuthUser {
    pub uid: String,
    pub email: String,
    pub display_name: Option<String>,
    pub role: String,
}

// Google OAuth handler
pub async fn google_oauth_handler(
    State(state): State<AppState>,
    Json(payload): Json<GoogleOAuthRequest>,
) -> Result<Json<OAuthResponse>, StatusCode> {
    let pool = &state.storage.pool;
    
    // Verify Google token and get user info
    let user_info = verify_google_token(&payload.access_token).await
        .map_err(|e| {
            eprintln!("❌ Google token verification failed: {}", e);
            StatusCode::UNAUTHORIZED
        })?;
    
    // Check if user exists
    let existing_user: Option<String> = sqlx::query_scalar(
        "SELECT wallet_address FROM users WHERE email = $1"
    )
    .bind(&user_info.email)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let wallet_address = if let Some(addr) = existing_user {
        // User exists, generate new token
        addr
    } else {
        // Create new user
        let new_wallet = format!("DU{}", Uuid::new_v4().to_string().replace("-", "").chars().take(40).collect::<String>());
        
        // Check if user_type column exists
        let has_user_type: bool = sqlx::query_scalar(
            "SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'user_type'
            )"
        )
        .fetch_one(pool)
        .await
        .unwrap_or(false);
        
        let user_id = Uuid::new_v4().to_string();
        let username = user_info.name.clone().unwrap_or_else(|| user_info.email.split('@').next().unwrap_or("user").to_string());
        
        if has_user_type {
            sqlx::query(
                r#"
                INSERT INTO users (user_id, wallet_address, email, password_hash, username, user_type, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, 'listener', NOW(), NOW())
                "#
            )
            .bind(&user_id)
            .bind(&new_wallet)
            .bind(&user_info.email)
            .bind("oauth_google") // Placeholder password hash for OAuth users
            .bind(&username)
            .execute(pool)
            .await
            .map_err(|e| {
                eprintln!("❌ Database error creating Google user: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
        } else {
            sqlx::query(
                r#"
                INSERT INTO users (user_id, wallet_address, email, password_hash, username, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                "#
            )
            .bind(&user_id)
            .bind(&new_wallet)
            .bind(&user_info.email)
            .bind("oauth_google")
            .bind(&username)
            .execute(pool)
            .await
            .map_err(|e| {
                eprintln!("❌ Database error creating Google user: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
        }
        
        new_wallet
    };
    
    // Generate JWT token
    let token = state.jwt_config
        .generate_token(&wallet_address)
        .map_err(|e| {
            eprintln!("❌ Failed to generate JWT token: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    eprintln!("✅ Google OAuth successful for user: {} (wallet: {})", user_info.email, wallet_address);
    
    Ok(Json(OAuthResponse {
        success: true,
        token,
        message: "Google authentication successful".to_string(),
        user: Some(OAuthUser {
            uid: wallet_address.clone(),
            email: user_info.email,
            display_name: user_info.name.clone(),
            role: "listener".to_string(),
        }),
    }))
}

// Apple OAuth handler
pub async fn apple_oauth_handler(
    State(state): State<AppState>,
    Json(payload): Json<AppleOAuthRequest>,
) -> Result<Json<OAuthResponse>, StatusCode> {
    let pool = &state.storage.pool;
    
    // Verify Apple token and get user info
    let user_info = verify_apple_token(&payload.id_token).await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;
    
    // Check if user exists
    let existing_user: Option<String> = sqlx::query_scalar(
        "SELECT wallet_address FROM users WHERE email = $1"
    )
    .bind(&user_info.email)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let wallet_address = if let Some(addr) = existing_user {
        addr
    } else {
        // Create new user
        let user_id = Uuid::new_v4().to_string();
        let new_wallet = format!("DU{}", Uuid::new_v4().to_string().replace("-", "").chars().take(40).collect::<String>());
        let username = user_info.name.clone().unwrap_or_else(|| user_info.email.split('@').next().unwrap_or("user").to_string());
        
        // Try to insert with user_type, fallback to without it if column doesn't exist
        let insert_result = sqlx::query(
            r#"
            INSERT INTO users (user_id, wallet_address, email, password_hash, username, user_type, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 'listener', NOW(), NOW())
            "#
        )
        .bind(&user_id)
        .bind(&new_wallet)
        .bind(&user_info.email)
        .bind("oauth_apple")
        .bind(&username)
        .execute(pool)
        .await;
        
        // If error is about user_type, try without it
        match insert_result {
            Ok(_) => {},
            Err(e) => {
                let error_msg = e.to_string();
                if error_msg.contains("user_type") || error_msg.contains("column") || error_msg.contains("does not exist") {
                    // Column doesn't exist, insert without it
                    sqlx::query(
                        r#"
                        INSERT INTO users (user_id, wallet_address, email, password_hash, username, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                        "#
                    )
                    .bind(&user_id)
                    .bind(&new_wallet)
                    .bind(&user_info.email)
                    .bind("oauth_apple")
                    .bind(&username)
                    .execute(pool)
                    .await
                    .map_err(|e| {
                        eprintln!("Database error creating Apple user: {}", e);
                        StatusCode::INTERNAL_SERVER_ERROR
                    })?;
                } else {
                    return Err(StatusCode::INTERNAL_SERVER_ERROR);
                }
            }
        }
        
        // Initialize token balance for new user (with 0 balance)
        let init_balance_result = sqlx::query(
            r#"
            INSERT INTO token_balances (address, dyo_balance, dys_balance, staked_balance, updated_at)
            VALUES ($1, 0, 0, 0, NOW())
            ON CONFLICT (address) DO NOTHING
            "#
        )
        .bind(&new_wallet)
        .execute(pool)
        .await;
        
        match init_balance_result {
            Ok(_) => {
                eprintln!("✅ Initialized token balance for Google OAuth wallet: {}", new_wallet);
            }
            Err(e) => {
                eprintln!("⚠️ Warning: Failed to initialize token balance for {}: {}", new_wallet, e);
                // Continue OAuth even if balance initialization fails
            }
        }
        
        new_wallet
    };
    
    // Initialize token balance for existing users if they don't have one
    let init_existing_balance_result = sqlx::query(
        r#"
        INSERT INTO token_balances (address, dyo_balance, dys_balance, staked_balance, updated_at)
        VALUES ($1, 0, 0, 0, NOW())
        ON CONFLICT (address) DO NOTHING
        "#
    )
    .bind(&wallet_address)
    .execute(pool)
    .await;
    
    match init_existing_balance_result {
        Ok(_) => {
            eprintln!("✅ Ensured token balance exists for wallet: {}", wallet_address);
        }
        Err(e) => {
            eprintln!("⚠️ Warning: Failed to ensure token balance for {}: {}", wallet_address, e);
            // Continue OAuth even if balance initialization fails
        }
    }
    
    // Generate JWT token
    let token = state.jwt_config
        .generate_token(&wallet_address)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(OAuthResponse {
        success: true,
        token,
        message: "Apple authentication successful".to_string(),
        user: Some(OAuthUser {
            uid: wallet_address.clone(),
            email: user_info.email,
            display_name: user_info.name.clone(),
            role: "listener".to_string(),
        }),
    }))
}

// Helper to verify Google token
async fn verify_google_token(access_token: &str) -> Result<GoogleUserInfo, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|_| "Failed to verify Google token")?;
    
    if !response.status().is_success() {
        return Err("Invalid Google token".to_string());
    }
    
    let user_info: serde_json::Value = response.json().await
        .map_err(|_| "Failed to parse Google response")?;
    
    Ok(GoogleUserInfo {
        email: user_info["email"].as_str().unwrap_or("").to_string(),
        name: user_info["name"].as_str().map(|s| s.to_string()),
    })
}

// Helper to verify Apple token
async fn verify_apple_token(id_token: &str) -> Result<AppleUserInfo, String> {
    // Apple token verification requires JWT decoding
    // For MVP, we'll decode the JWT and extract email
    // In production, verify the signature with Apple's public keys
    
    let parts: Vec<&str> = id_token.split('.').collect();
    if parts.len() != 3 {
        return Err("Invalid Apple token format".to_string());
    }
    
    // Decode payload (base64url)
    let payload = parts[1];
    // Add padding if needed for base64url
    let mut padded = payload.to_string();
    while padded.len() % 4 != 0 {
        padded.push('=');
    }
    // Replace URL-safe characters
    let standard = padded.replace('-', "+").replace('_', "/");
    // Use base64 engine for decoding
    use base64::engine::general_purpose;
    use base64::Engine;
    let decoded = general_purpose::STANDARD
        .decode(standard)
        .map_err(|_| "Failed to decode Apple token")?;
    
    let claims: serde_json::Value = serde_json::from_slice(&decoded)
        .map_err(|_| "Failed to parse Apple token")?;
    
    Ok(AppleUserInfo {
        email: claims["email"].as_str().unwrap_or("").to_string(),
        name: claims["name"].as_object()
            .and_then(|n| n.get("fullName"))
            .and_then(|n| n.as_str())
            .map(|s| s.to_string()),
    })
}

#[derive(Debug)]
struct GoogleUserInfo {
    email: String,
    name: Option<String>,
}

#[derive(Debug)]
struct AppleUserInfo {
    email: String,
    name: Option<String>,
}

