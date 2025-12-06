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
pub struct S2EDashboardResponse {
    pub pool_remaining_dyo: f64,
    pub pool_remaining_percent: f64,
    pub daily_emission: f64,
    pub active_users_today: i64,
    pub anomaly_score: f64,
    pub alerts: Vec<String>,
}

/// GET /api/v1/s2e/dashboard
/// Returns S2E dashboard metrics including pool status, daily emission, and alerts
pub async fn get_s2e_dashboard_handler(
    State(state): State<AppState>,
) -> Result<Json<S2EDashboardResponse>, StatusCode> {
    // Get current pool
    let pool = match state.storage.get_current_pool().await {
        Ok(p) => p,
        Err(e) => {
            error!("❌ Failed to get current pool: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Calculate pool remaining percentage
    let pool_remaining_percent = if pool.total_amount > 0.0 {
        (pool.remaining_amount / pool.total_amount) * 100.0
    } else {
        0.0
    };

    // Get daily emission (sum of tokens_earned from stream_logs today)
    let today = chrono::Utc::now().date_naive();
    let daily_emission: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(tokens_earned::float8), 0.0)
        FROM stream_logs
        WHERE DATE(created_at) = $1
        "#
    )
    .bind(today)
    .fetch_one(&state.storage.pool)
    .await
    .unwrap_or(0.0);

    // Get active users today (distinct user_address from stream_logs today)
    let active_users_today: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(DISTINCT user_address)
        FROM stream_logs
        WHERE DATE(created_at) = $1
        "#
    )
    .bind(today)
    .fetch_one(&state.storage.pool)
    .await
    .unwrap_or(0);

    // Calculate anomaly score (simple heuristic)
    // Higher score = more suspicious activity
    let anomaly_score = calculate_anomaly_score(&state, today).await.unwrap_or(0.0);

    // Generate alerts
    let mut alerts = Vec::new();
    
    // Alert if pool < 20%
    if pool_remaining_percent < 20.0 {
        alerts.push(format!("⚠️ Pool below 20%: {:.1}% remaining", pool_remaining_percent));
    }
    
    // Alert if daily emission > 33% of monthly pool (expected ~3.33% per day)
    let expected_daily_emission = pool.total_amount / 30.0; // Expected daily emission
    if daily_emission > expected_daily_emission * 1.5 {
        alerts.push(format!("⚠️ High daily emission: {:.0} DYO (expected: {:.0} DYO)", 
            daily_emission, expected_daily_emission));
    }
    
    // Alert if anomaly score > 50
    if anomaly_score > 50.0 {
        alerts.push(format!("⚠️ High anomaly score: {:.1} (possible farming detected)", anomaly_score));
    }

    let response = S2EDashboardResponse {
        pool_remaining_dyo: pool.remaining_amount,
        pool_remaining_percent,
        daily_emission,
        active_users_today,
        anomaly_score,
        alerts,
    };

    Ok(Json(response))
}

/// Calculate anomaly score based on suspicious patterns
async fn calculate_anomaly_score(state: &AppState, today: chrono::NaiveDate) -> Result<f64, sqlx::Error> {
    let db_pool = &state.storage.pool;
    
    // Check 1: Percentage of users hitting daily limit
    let users_at_limit: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(DISTINCT user_address)
        FROM user_daily_usage
        WHERE date = $1 AND minutes_used >= 90 * 60  -- 90 minutes in seconds
        "#
    )
    .bind(today)
    .fetch_one(db_pool)
    .await
    .unwrap_or(0);

    let total_active_users: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(DISTINCT user_address)
        FROM stream_logs
        WHERE DATE(created_at) = $1
        "#
    )
    .bind(today)
    .fetch_one(db_pool)
    .await
    .unwrap_or(1); // Avoid division by zero

    let limit_hit_percentage = if total_active_users > 0 {
        (users_at_limit as f64 / total_active_users as f64) * 100.0
    } else {
        0.0
    };

    // Check 2: Average streams per user (high = suspicious)
    let avg_streams_per_user: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(COUNT(*)::float8 / NULLIF(COUNT(DISTINCT user_address), 0), 0.0)
        FROM stream_logs
        WHERE DATE(created_at) = $1
        "#
    )
    .bind(today)
    .fetch_one(db_pool)
    .await
    .unwrap_or(0.0);

    // Calculate anomaly score (0-100 scale)
    // Higher score = more suspicious
    let mut score: f64 = 0.0;
    
    // If >80% users hit limit, that's very suspicious
    if limit_hit_percentage > 80.0 {
        score += 50.0;
    } else if limit_hit_percentage > 50.0 {
        score += 25.0;
    }
    
    // If average streams per user > 20, that's suspicious
    if avg_streams_per_user > 20.0 {
        score += 30.0;
    } else if avg_streams_per_user > 10.0 {
        score += 15.0;
    }
    
    Ok(score.min(100.0))
}

pub fn s2e_dashboard_routes() -> Router<AppState> {
    Router::new()
        .route("/dashboard", get(get_s2e_dashboard_handler))
}

