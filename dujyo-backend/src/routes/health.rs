use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde_json::json;
use sqlx::PgPool;
use std::time::SystemTime;
use crate::server::AppState;

/// Basic health check endpoint
pub async fn health_check_handler() -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(json!({
        "status": "ok",
        "timestamp": SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    })))
}

/// Detailed health check endpoint
pub async fn detailed_health_check_handler(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let pool = &state.storage.pool;
    
    // Check database connection
    let db_status = match sqlx::query("SELECT 1").execute(pool).await {
        Ok(_) => "connected",
        Err(e) => {
            eprintln!("Database health check failed: {}", e);
            "disconnected"
        }
    };
    
    // Get S2E pool info
    let s2e_pool_info = match sqlx::query_scalar::<_, f64>(
        "SELECT COALESCE(remaining_amount, 0) FROM s2e_monthly_pools WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM') ORDER BY created_at DESC LIMIT 1"
    )
    .fetch_optional(pool)
    .await
    {
        Ok(Some(amount)) => format!("{:.2} DYO remaining", amount),
        Ok(None) => "No pool initialized".to_string(),
        Err(_) => "Unknown".to_string(),
    };
    
    // Get active users count
    let active_users = match sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours'"
    )
    .fetch_one(pool)
    .await
    {
        Ok(count) => count,
        Err(_) => 0,
    };
    
    // Get total listings
    let total_listings = match sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM content_listings WHERE status = 'active'"
    )
    .fetch_one(pool)
    .await
    {
        Ok(count) => count,
        Err(_) => 0,
    };
    
    // Get total tips
    let total_tips = match sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM tips"
    )
    .fetch_one(pool)
    .await
    {
        Ok(count) => count,
        Err(_) => 0,
    };
    
    // Calculate uptime (simplified - would need to track start time)
    let uptime = "0h 0m"; // TODO: Track actual uptime
    
    Ok(Json(json!({
        "status": "ok",
        "database": db_status,
        "s2e_pool": s2e_pool_info,
        "active_users": active_users,
        "total_listings": total_listings,
        "total_tips": total_tips,
        "uptime": uptime,
        "timestamp": SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    })))
}

pub fn health_routes() -> Router<AppState> {
    Router::new()
        .route("/health", get(health_check_handler))
        .route("/api/v1/health/detailed", get(detailed_health_check_handler))
}

