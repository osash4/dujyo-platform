use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::Serialize;
use crate::server::AppState;
use tracing::error;

#[derive(Debug, Serialize)]
pub struct S2EConfigResponse {
    pub listener_rate: f64,
    pub artist_rate: f64,
    pub daily_limit_listener: i32,
    pub daily_limit_artist: i32,
    pub pool_total: f64,
    pub pool_remaining: f64,
    pub pool_month: String,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// GET /api/v1/s2e/config
/// Returns current S2E configuration including rates, limits, and pool status
pub async fn get_s2e_config_handler(
    State(state): State<AppState>,
) -> Result<Json<S2EConfigResponse>, StatusCode> {
    // Get current pool
    let pool = match state.storage.get_current_pool().await {
        Ok(p) => p,
        Err(e) => {
            error!("❌ Failed to get current pool: {}", e);
            // Return default pool values if query fails
            return Ok(Json(S2EConfigResponse {
                listener_rate: 0.10,  // Opción A3
                artist_rate: 0.50,    // Opción A3
                daily_limit_listener: 90,
                daily_limit_artist: 120,
                pool_total: 2000000.0,  // Pool 2M
                pool_remaining: 2000000.0,
                pool_month: chrono::Utc::now().format("%Y-%m").to_string(),
                updated_at: chrono::Utc::now(),
            }));
        }
    };

    // ⚠️ CRITICAL: These rates are hardcoded for now but should match stream_earn.rs constants
    // TODO: Move to database or environment variables for dynamic configuration
    let config = S2EConfigResponse {
        listener_rate: 0.10,  // Must match LISTENER_RATE_PER_MINUTE in stream_earn.rs (Opción A3)
        artist_rate: 0.50,      // Must match ARTIST_RATE_PER_MINUTE in stream_earn.rs (Opción A3)
        daily_limit_listener: 90,  // Conservative limit for listeners
        daily_limit_artist: 120,   // Must match DAILY_LIMIT_MINUTES in stream_earn.rs
        pool_total: pool.total_amount,
        pool_remaining: pool.remaining_amount,
        pool_month: pool.month_year,
        updated_at: chrono::Utc::now(),
    };

    Ok(Json(config))
}

pub fn s2e_config_routes() -> Router<AppState> {
    Router::new()
        .route("/config", get(get_s2e_config_handler))
}

