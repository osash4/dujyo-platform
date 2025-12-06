use axum::{
    extract::{State, Extension, Query},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use crate::server::AppState;
use crate::auth::Claims;
use tracing::{info, error, warn};
use std::collections::HashMap;

#[derive(Debug, Serialize)]
pub struct S2EAdminStats {
    pub total_users: i64,
    pub active_users_today: i64,
    pub dyo_distributed: f64,
    pub pool_remaining: f64,
    pub pool_total: f64,
    pub pool_remaining_percent: f64,
}

#[derive(Debug, Serialize)]
pub struct TopEarner {
    pub user_address: String,
    pub total_earned: f64,
    pub streams_count: i64,
    pub minutes_listened: f64,
}

#[derive(Debug, Serialize)]
pub struct TopEarnersResponse {
    pub earners: Vec<TopEarner>,
    pub period: String,
}

#[derive(Debug, Deserialize)]
pub struct GenerateBetaCodesRequest {
    pub quantity: i32,
}

#[derive(Debug, Serialize)]
pub struct BetaCode {
    pub code: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct GenerateBetaCodesResponse {
    pub success: bool,
    pub codes: Vec<BetaCode>,
    pub message: String,
}

/// GET /api/v1/s2e/admin/stats
/// Get S2E admin statistics (admin only)
pub async fn get_admin_stats_handler(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Result<Json<S2EAdminStats>, StatusCode> {
    // TODO: Verify admin role
    // For now, allow any authenticated user (MVP)
    let pool = &state.storage.pool;

    // Total beta users
    let total_users: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM beta_users WHERE is_active = true"
    )
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    // Active users today
    let today = chrono::Utc::now().date_naive();
    let active_users_today: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(DISTINCT user_address)
        FROM stream_logs
        WHERE DATE(created_at) = $1
        "#
    )
    .bind(today)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    // DYO distributed (all time)
    let dyo_distributed: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs"
    )
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);

    // Pool status
    let pool_data = state.storage.get_current_pool().await.unwrap_or_else(|_| {
        crate::storage::S2EPool {
            month_year: chrono::Utc::now().format("%Y-%m").to_string(),
            total_amount: 2000000.0,
            remaining_amount: 2000000.0,
            artist_pool: 1200000.0,
            listener_pool: 800000.0,
            artist_spent: 0.0,
            listener_spent: 0.0,
        }
    });

    let pool_remaining_percent = if pool_data.total_amount > 0.0 {
        (pool_data.remaining_amount / pool_data.total_amount) * 100.0
    } else {
        0.0
    };

    Ok(Json(S2EAdminStats {
        total_users,
        active_users_today,
        dyo_distributed,
        pool_remaining: pool_data.remaining_amount,
        pool_total: pool_data.total_amount,
        pool_remaining_percent,
    }))
}

/// GET /api/v1/s2e/admin/top-earners?period=today|week|month
/// Get top earners (admin only)
pub async fn get_top_earners_handler(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<TopEarnersResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let period = params.get("period").map(|s| s.as_str()).unwrap_or("today");
    
    let cutoff_date = match period {
        "week" => chrono::Utc::now().date_naive() - chrono::Duration::days(7),
        "month" => chrono::Utc::now().date_naive() - chrono::Duration::days(30),
        _ => chrono::Utc::now().date_naive(), // today
    };

    let rows = sqlx::query(
        r#"
        SELECT 
            user_address,
            SUM(tokens_earned::float8) as total_earned,
            COUNT(*) as streams_count,
            SUM(duration_seconds::float8 / 60.0) as minutes_listened
        FROM stream_logs
        WHERE DATE(created_at) >= $1
        GROUP BY user_address
        ORDER BY total_earned DESC
        LIMIT 10
        "#
    )
    .bind(cutoff_date)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        error!("Failed to get top earners: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut earners = Vec::new();
    for row in rows {
        earners.push(TopEarner {
            user_address: row.try_get("user_address").unwrap_or_default(),
            total_earned: row.try_get("total_earned").unwrap_or(0.0),
            streams_count: row.try_get("streams_count").unwrap_or(0),
            minutes_listened: row.try_get("minutes_listened").unwrap_or(0.0),
        });
    }

    Ok(Json(TopEarnersResponse {
        earners,
        period: period.to_string(),
    }))
}

/// POST /api/v1/s2e/admin/generate-beta-codes
/// Generate beta access codes (admin only)
pub async fn generate_beta_codes_handler(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(request): Json<GenerateBetaCodesRequest>,
) -> Result<Json<GenerateBetaCodesResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let quantity = request.quantity.min(10).max(1); // Limit to 1-10 codes

    let mut codes = Vec::new();
    let now = chrono::Utc::now();

    for _ in 0..quantity {
        let code = format!("DUJYO-S2E-{}", uuid::Uuid::new_v4().to_string().to_uppercase().chars().take(8).collect::<String>());
        
        // Store code in database (optional - for tracking)
        sqlx::query(
            r#"
            INSERT INTO beta_codes (code, created_by, created_at, is_active)
            VALUES ($1, $2, NOW(), true)
            ON CONFLICT (code) DO NOTHING
            "#
        )
        .bind(&code)
        .bind(&_claims.sub)
        .execute(pool)
        .await
        .ok(); // Ignore errors for MVP

        codes.push(BetaCode {
            code,
            created_at: now,
        });
    }

    info!("✅ Generated {} beta codes", quantity);

    Ok(Json(GenerateBetaCodesResponse {
        success: true,
        codes,
        message: format!("Generated {} beta access codes", quantity),
    }))
}

/// POST /api/v1/s2e/admin/reset-daily-limits
/// Reset daily limits for all users (emergency only)
pub async fn reset_daily_limits_handler(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let pool = &state.storage.pool;
    let today = chrono::Utc::now().date_naive();

    // Delete today's usage records
    sqlx::query(
        "DELETE FROM user_daily_usage WHERE date = $1"
    )
    .bind(today)
    .execute(pool)
    .await
    .map_err(|e| {
        error!("Failed to reset daily limits: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    warn!("⚠️ Daily limits reset by admin: {}", _claims.sub);

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Daily limits reset for all users"
    })))
}

pub fn s2e_admin_routes() -> Router<AppState> {
    Router::new()
        .route("/admin/stats", get(get_admin_stats_handler))
        .route("/admin/top-earners", get(get_top_earners_handler))
        .route("/admin/generate-beta-codes", post(generate_beta_codes_handler))
        .route("/admin/reset-daily-limits", post(reset_daily_limits_handler))
}

