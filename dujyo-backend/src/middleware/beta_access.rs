use axum::{
    extract::Request,
    http::HeaderMap,
    middleware::Next,
    response::Response,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tracing::info;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct S2EConfig {
    pub max_users: i32,
    pub is_closed_beta: bool,
    pub beta_access_codes: Vec<String>,
    pub pool_size: f64,
    pub listener_rate: f64,
    pub artist_rate: f64,
    pub beta_user_emails: Vec<String>,
}

impl S2EConfig {
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_path = std::env::var("S2E_CONFIG_PATH")
            .unwrap_or_else(|_| "config/s2e_config.json".to_string());
        
        let config_str = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read S2E config from {}: {}", config_path, e))?;
        
        let config: S2EConfig = serde_json::from_str(&config_str)
            .map_err(|e| format!("Failed to parse S2E config: {}", e))?;
        
        info!("✅ S2E Config loaded: closed_beta={}, max_users={}", config.is_closed_beta, config.max_users);
        Ok(config)
    }

    pub fn default() -> Self {
        Self {
            max_users: 50,
            is_closed_beta: true,
            beta_access_codes: vec!["DUJYO-S2E-BETA-2024".to_string(), "DUJYO-S2E-INVITE".to_string()],
            pool_size: 2000000.0,
            listener_rate: 0.10,
            artist_rate: 0.50,
            beta_user_emails: vec![],
        }
    }
}

#[derive(Debug, Serialize)]
struct BetaAccessError {
    error: String,
    message: String,
    request_access_url: String,
}

/// Middleware to check beta access for S2E endpoints
/// Note: This is a simplified version. Full implementation requires AppState access.
/// For now, beta access is checked directly in stream_earn_listener_handler
pub async fn beta_access_middleware(
    _headers: HeaderMap,
    request: Request,
    next: Next,
) -> Response {
    // Beta access is now checked directly in stream_earn_listener_handler
    // This middleware is kept for future use
    next.run(request).await
}

/// Check if user has beta access (public function)
pub async fn check_beta_access(pool: &PgPool, user_address: &str, config: &S2EConfig) -> bool {
    // Check if user is in beta_users table
    let is_beta_user: Option<bool> = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM beta_users 
            WHERE user_address = $1 AND is_active = true
        )
        "#
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    if is_beta_user == Some(true) {
        return true;
    }

    // Check if user email is in beta_user_emails list
    let user_email: Option<String> = sqlx::query_scalar(
        "SELECT email FROM users WHERE wallet_address = $1"
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    if let Some(email) = user_email {
        if config.beta_user_emails.contains(&email) {
            return true;
        }
    }

    // Check current user count
    let current_users: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM beta_users WHERE is_active = true"
    )
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    // If under max_users limit, allow (first come first served)
    if current_users < config.max_users as i64 {
        return true;
    }

    false
}

/// Grant beta access to a user (public function)
pub async fn grant_beta_access(pool: &PgPool, user_address: &str, access_code: &str) -> Result<(), sqlx::Error> {
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
    .bind(access_code)
    .execute(pool)
    .await?;

    info!("✅ Beta access granted to: {}", user_address);
    Ok(())
}

