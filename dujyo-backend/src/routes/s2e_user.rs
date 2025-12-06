use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::Serialize;
use sqlx::Row;
use crate::server::AppState;
use tracing::error;

#[derive(Debug, Serialize)]
pub struct S2EUserStatsResponse {
    pub total_dyo: f64,
    pub dyo_today: f64,
    pub dyo_week: f64,
    pub dyo_month: f64,
    pub daily_used: i32,
    pub daily_remaining: i32,
    pub daily_limit: i32,
}

#[derive(Debug, Serialize)]
pub struct TopContentItem {
    pub content_id: String,
    pub track_title: String,
    pub artist_name: String,
    pub minutes_listened: f64,
    pub tokens_earned: f64,
    pub streams_count: i64,
}

#[derive(Debug, Serialize)]
pub struct TopContentResponse {
    pub content: Vec<TopContentItem>,
}

/// GET /api/v1/s2e/user/stats/{address}
/// Get S2E statistics for a user
pub async fn get_user_stats_handler(
    State(state): State<AppState>,
    Path(user_address): Path<String>,
) -> Result<Json<S2EUserStatsResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let today = chrono::Utc::now().date_naive();
    let week_ago = today - chrono::Duration::days(7);
    let month_ago = today - chrono::Duration::days(30);

    // Total DYO (all time)
    let total_dyo: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(tokens_earned::float8), 0.0)
        FROM stream_logs
        WHERE user_address = $1
        "#
    )
    .bind(&user_address)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        error!("Failed to get total DYO: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // DYO today
    let dyo_today: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(tokens_earned::float8), 0.0)
        FROM stream_logs
        WHERE user_address = $1 AND DATE(created_at) = $2
        "#
    )
    .bind(&user_address)
    .bind(today)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);

    // DYO this week
    let dyo_week: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(tokens_earned::float8), 0.0)
        FROM stream_logs
        WHERE user_address = $1 AND DATE(created_at) >= $2
        "#
    )
    .bind(&user_address)
    .bind(week_ago)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);

    // DYO this month
    let dyo_month: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(tokens_earned::float8), 0.0)
        FROM stream_logs
        WHERE user_address = $1 AND DATE(created_at) >= $2
        "#
    )
    .bind(&user_address)
    .bind(month_ago)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);

    // Daily used (minutes)
    let daily_used: i32 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(duration_seconds) / 60, 0)
        FROM stream_logs
        WHERE user_address = $1 AND DATE(created_at) = $2
        "#
    )
    .bind(&user_address)
    .bind(today)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    // Daily limit (from config or default)
    const DAILY_LIMIT: i32 = 90; // Default listener limit
    let daily_remaining = (DAILY_LIMIT - daily_used).max(0);

    Ok(Json(S2EUserStatsResponse {
        total_dyo,
        dyo_today,
        dyo_week,
        dyo_month,
        daily_used,
        daily_remaining,
        daily_limit: DAILY_LIMIT,
    }))
}

/// GET /api/v1/s2e/user/top-content/{address}?limit=5
/// Get top content listened by user
pub async fn get_top_content_handler(
    State(state): State<AppState>,
    Path(user_address): Path<String>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<TopContentResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let limit: i64 = params
        .get("limit")
        .and_then(|s| s.parse().ok())
        .unwrap_or(5);

    let rows = sqlx::query(
        r#"
        SELECT 
            content_id,
            MAX(track_title) as track_title,
            MAX(artist_id) as artist_id,
            SUM(duration_seconds::float8 / 60.0) as minutes_listened,
            SUM(tokens_earned::float8) as tokens_earned,
            COUNT(*) as streams_count
        FROM stream_logs
        WHERE user_address = $1
        GROUP BY content_id
        ORDER BY minutes_listened DESC
        LIMIT $2
        "#
    )
    .bind(&user_address)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        error!("Failed to get top content: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut content = Vec::new();
    for row in rows {
        // Get artist name from content table or use artist_id
        let artist_id: String = row.try_get("artist_id").unwrap_or_default();
        let content_id_str: String = row.try_get("content_id").unwrap_or_default();
        let artist_name = sqlx::query_scalar::<_, Option<String>>(
            r#"
            SELECT artist_name
            FROM content
            WHERE content_id = $1 OR artist_id = $2
            LIMIT 1
            "#
        )
        .bind(&content_id_str)
        .bind(&artist_id)
        .fetch_optional(pool)
        .await
        .unwrap_or(None)
        .flatten()
        .unwrap_or_else(|| artist_id.clone());

        content.push(TopContentItem {
            content_id: row.try_get("content_id").unwrap_or_default(),
            track_title: row.try_get("track_title").unwrap_or_else(|_| "Unknown".to_string()),
            artist_name,
            minutes_listened: row.try_get("minutes_listened").unwrap_or(0.0),
            tokens_earned: row.try_get("tokens_earned").unwrap_or(0.0),
            streams_count: row.try_get("streams_count").unwrap_or(0),
        });
    }

    Ok(Json(TopContentResponse { content }))
}

#[derive(Debug, Serialize)]
pub struct S2EUserLimitsResponse {
    pub daily_limits: DailyLimits,
    pub cooldown_active: bool,
    pub cooldown_ends_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize)]
pub struct DailyLimits {
    pub session_minutes: LimitInfo,
    pub content_minutes: LimitInfo,
}

#[derive(Debug, Serialize)]
pub struct LimitInfo {
    pub used: i32,
    pub limit: i32,
    pub remaining: i32,
}

/// GET /api/v1/s2e/user/limits/:address
/// Get current S2E limits and cooldown status for a user
pub async fn get_user_limits_handler(
    State(state): State<AppState>,
    Path(user_address): Path<String>,
) -> Result<Json<S2EUserLimitsResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let today = chrono::Utc::now().date_naive();

    // Get daily session minutes used
    let session_minutes_used: i32 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(duration_seconds) / 60, 0)
        FROM stream_logs
        WHERE user_address = $1 AND DATE(created_at) = $2
        "#
    )
    .bind(&user_address)
    .bind(today)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    // Get user type to determine limit
    let user_type: Option<String> = sqlx::query_scalar(
        r#"SELECT user_type FROM users WHERE wallet_address = $1"#
    )
    .bind(&user_address)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    const DAILY_LIMIT_LISTENER: i32 = 90;
    const DAILY_LIMIT_ARTIST: i32 = 120;
    let session_limit = if user_type.as_deref() == Some("artist") {
        DAILY_LIMIT_ARTIST
    } else {
        DAILY_LIMIT_LISTENER
    };

    // Get content minutes used (max per content per day)
    let content_minutes_used: i32 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(MAX(minutes_used), 0)
        FROM content_stream_limits
        WHERE user_address = $1 AND date = $2
        "#
    )
    .bind(&user_address)
    .bind(today)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    const CONTENT_LIMIT: i32 = 10; // 10 minutes per content per day

    // Check cooldown status
    let last_stream: Option<chrono::DateTime<chrono::Utc>> = sqlx::query_scalar(
        r#"
        SELECT created_at 
        FROM stream_logs 
        WHERE user_address = $1 
        ORDER BY created_at DESC 
        LIMIT 1
        "#
    )
    .bind(&user_address)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    let (cooldown_active, cooldown_ends_at) = if let Some(last_stream_time) = last_stream {
        let cooldown_duration = chrono::Duration::minutes(30);
        let cooldown_end = last_stream_time + cooldown_duration;
        let now = chrono::Utc::now();
        
        if now < cooldown_end {
            (true, Some(cooldown_end))
        } else {
            (false, None)
        }
    } else {
        (false, None)
    };

    Ok(Json(S2EUserLimitsResponse {
        daily_limits: DailyLimits {
            session_minutes: LimitInfo {
                used: session_minutes_used,
                limit: session_limit,
                remaining: (session_limit - session_minutes_used).max(0),
            },
            content_minutes: LimitInfo {
                used: content_minutes_used,
                limit: CONTENT_LIMIT,
                remaining: (CONTENT_LIMIT - content_minutes_used).max(0),
            },
        },
        cooldown_active,
        cooldown_ends_at,
    }))
}

pub fn s2e_user_routes() -> Router<AppState> {
    Router::new()
        .route("/user/stats/:address", get(get_user_stats_handler))
        .route("/user/top-content/:address", get(get_top_content_handler))
        .route("/user/limits/:address", get(get_user_limits_handler))
}

