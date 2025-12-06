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
use chrono::Utc;

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub database: DatabaseHealth,
    pub redis: RedisHealth,
    pub s2e: S2EHealth,
}

#[derive(Debug, Serialize)]
pub struct DatabaseHealth {
    pub connected: bool,
    pub response_time_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct RedisHealth {
    pub connected: bool,
    pub response_time_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct S2EHealth {
    pub pool_remaining: f64,
    pub pool_percent: f64,
    pub daily_emission: f64,
    pub active_users_today: i64,
}

/// GET /api/v1/monitoring/health
/// Comprehensive health check endpoint
pub async fn get_health_handler(
    State(state): State<AppState>,
) -> Result<Json<HealthResponse>, StatusCode> {
    // Check database
    let db_start = std::time::Instant::now();
    let db_connected = sqlx::query("SELECT 1")
        .execute(&state.storage.pool)
        .await
        .is_ok();
    let db_response_time = db_start.elapsed().as_millis() as u64;

    // Check Redis (if available)
    let redis_connected = if let Some(redis_pool) = &state.redis_pool {
        let redis_start = std::time::Instant::now();
        let result = redis_pool.get().await.is_ok();
        let redis_response_time = redis_start.elapsed().as_millis() as u64;
        (result, Some(redis_response_time))
    } else {
        (false, None)
    };

    // Get S2E health
    let s2e_health = get_s2e_health(&state).await.unwrap_or_else(|e| {
        error!("Failed to get S2E health: {}", e);
        S2EHealth {
            pool_remaining: 0.0,
            pool_percent: 0.0,
            daily_emission: 0.0,
            active_users_today: 0,
        }
    });

    let overall_status = if db_connected {
        "healthy"
    } else {
        "unhealthy"
    };

    Ok(Json(HealthResponse {
        status: overall_status.to_string(),
        timestamp: Utc::now(),
        database: DatabaseHealth {
            connected: db_connected,
            response_time_ms: Some(db_response_time),
        },
        redis: RedisHealth {
            connected: redis_connected.0,
            response_time_ms: redis_connected.1,
        },
        s2e: s2e_health,
    }))
}

async fn get_s2e_health(state: &AppState) -> Result<S2EHealth, sqlx::Error> {
    let pool = &state.storage.pool;
    let today = Utc::now().date_naive();

    // Get pool status
    let pool_data = state.storage.get_current_pool().await.unwrap_or_else(|_| {
        crate::storage::S2EPool {
            month_year: today.format("%Y-%m").to_string(),
            total_amount: 2000000.0,
            remaining_amount: 2000000.0,
            artist_pool: 1200000.0,
            listener_pool: 800000.0,
            artist_spent: 0.0,
            listener_spent: 0.0,
        }
    });

    let pool_percent = (pool_data.remaining_amount / pool_data.total_amount) * 100.0;

    // Get daily emission
    let daily_emission: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(tokens_earned)::float8, 0.0)
        FROM stream_logs
        WHERE DATE(created_at) = $1
        "#
    )
    .bind(today)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);

    // Get active users today
    let active_users_today: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(DISTINCT user_address)::int8
        FROM stream_logs
        WHERE DATE(created_at) = $1
        "#
    )
    .bind(today)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    Ok(S2EHealth {
        pool_remaining: pool_data.remaining_amount,
        pool_percent,
        daily_emission,
        active_users_today,
    })
}

pub fn monitoring_routes() -> Router<AppState> {
    Router::new()
        .route("/health", get(get_health_handler))
}

