use axum::{
    extract::{State, Extension},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;
use chrono::Utc;
use crate::server::AppState;
use crate::auth::Claims;
use tracing::{info, error};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamEarnRequest {
    pub track_id: String,
    pub track_title: String,
    pub artist: Option<String>,
    pub duration_seconds: i32, // Duration of the stream in seconds
    pub content_id: Option<String>,
    pub genre: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamEarnResponse {
    pub success: bool,
    pub transaction_id: String,
    pub tokens_earned: f64,
    pub total_earned_today: f64,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamHistoryResponse {
    pub success: bool,
    pub records: Vec<StreamRecord>,
    pub total_earned_today: f64,
    pub daily_limit_minutes: i32,
    pub minutes_used_today: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamRecord {
    pub log_id: String,
    pub track_id: String,
    pub track_title: String,
    pub artist_id: String,
    pub duration_seconds: i32,
    pub tokens_earned: f64,
    pub stream_type: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DAILY_LIMIT_MINUTES: i32 = 120; // 120 minutes daily limit
const ARTIST_RATE_PER_MINUTE: f64 = 10.0; // 10 DYO per minute for artists
const LISTENER_RATE_PER_MINUTE: f64 = 2.0; // 2 DYO per minute for listeners

// ============================================================================
// HANDLERS
// ============================================================================

/// POST /api/v1/stream-earn/artist
/// Artist earns tokens when their content is streamed
pub async fn stream_earn_artist_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<StreamEarnRequest>,
) -> Result<Json<StreamEarnResponse>, StatusCode> {
    let user_address = &claims.sub;
    let pool = &state.storage.pool;
    
    // Calculate duration in minutes
    let duration_minutes = request.duration_seconds as f64 / 60.0;

    // Check daily limit
    if !check_daily_limit(pool, user_address, duration_minutes).await {
        return Ok(Json(StreamEarnResponse {
            success: false,
            transaction_id: String::new(),
            tokens_earned: 0.0,
            total_earned_today: 0.0,
            message: format!("Daily streaming limit reached ({} minutes)", DAILY_LIMIT_MINUTES),
        }));
    }

    // Calculate tokens earned (artist rate)
    let tokens_earned = duration_minutes * ARTIST_RATE_PER_MINUTE;
    
    // Generate transaction ID
    let transaction_id = Uuid::new_v4().to_string();

    // Get artist_id (should be the user_address for artists)
    let artist_id = user_address.clone();
    
    // Store stream log in database
    if let Err(e) = store_stream_log(
        pool,
        &transaction_id,
        &request.content_id.unwrap_or_else(|| request.track_id.clone()),
        &artist_id,
        user_address,
        "artist",
        request.duration_seconds,
        tokens_earned,
        &request.track_id,
        &request.track_title,
        request.genre.as_deref(),
    ).await {
        error!("❌ Failed to store stream log: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    
    // Update daily usage
    if let Err(e) = update_daily_usage(pool, user_address, duration_minutes, tokens_earned, "artist").await {
        error!("❌ Failed to update daily usage: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    
    // Update token balance in blockchain storage
    if let Err(e) = update_token_balance(&state, user_address, tokens_earned).await {
        error!("❌ Failed to update token balance: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    
    // Get total earned today
    let total_earned_today = get_total_earned_today(pool, user_address).await
        .map_err(|e| {
            error!(error = %e, user_address = user_address, "Failed to get total earned today");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    info!(
        "🎵 Artist stream earn: {} earned {:.2} DYO for track '{}' ({} seconds)",
        user_address, tokens_earned, request.track_title, request.duration_seconds
    );
    
    Ok(Json(StreamEarnResponse {
        success: true,
        transaction_id,
        tokens_earned,
        total_earned_today,
        message: format!("Artist earned {:.2} DYO for streaming", tokens_earned),
    }))
}

/// POST /api/v1/stream-earn/listener
/// Listener earns tokens when they stream content
pub async fn stream_earn_listener_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<StreamEarnRequest>,
) -> Result<Json<StreamEarnResponse>, StatusCode> {
    let user_address = &claims.sub;
    let pool = &state.storage.pool;
    
    // Calculate duration in minutes
    let duration_minutes = request.duration_seconds as f64 / 60.0;

    // Check daily limit
    if !check_daily_limit(pool, user_address, duration_minutes).await {
        return Ok(Json(StreamEarnResponse {
            success: false,
            transaction_id: String::new(),
            tokens_earned: 0.0,
            total_earned_today: 0.0,
            message: format!("Daily streaming limit reached ({} minutes)", DAILY_LIMIT_MINUTES),
        }));
    }

    // Calculate tokens earned (listener rate)
    let tokens_earned = duration_minutes * LISTENER_RATE_PER_MINUTE;
    
    // Generate transaction ID
    let transaction_id = Uuid::new_v4().to_string();

    // Get artist_id from request or use a default
    let artist_id = request.artist.as_ref().unwrap_or(user_address).clone();
    
    // Store stream log in database
    if let Err(e) = store_stream_log(
        pool,
        &transaction_id,
        &request.content_id.unwrap_or_else(|| request.track_id.clone()),
        &artist_id,
        user_address,
        "listener",
        request.duration_seconds,
        tokens_earned,
        &request.track_id,
        &request.track_title,
        request.genre.as_deref(),
    ).await {
        error!("❌ Failed to store stream log: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    
    // Update daily usage
    if let Err(e) = update_daily_usage(pool, user_address, duration_minutes, tokens_earned, "listener").await {
        error!("❌ Failed to update daily usage: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    
    // Update token balance in blockchain storage
    if let Err(e) = update_token_balance(&state, user_address, tokens_earned).await {
        error!("❌ Failed to update token balance: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    
    // Get total earned today
    let total_earned_today = get_total_earned_today(pool, user_address).await
        .map_err(|e| {
            error!(error = %e, user_address = user_address, "Failed to get total earned today");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    info!(
        "🎧 Listener stream earn: {} earned {:.2} DYO for track '{}' ({} seconds)",
        user_address, tokens_earned, request.track_title, request.duration_seconds
    );
    
    Ok(Json(StreamEarnResponse {
        success: true,
        transaction_id,
        tokens_earned,
        total_earned_today,
        message: format!("Listener earned {:.2} DYO for streaming", tokens_earned),
    }))
}

/// GET /api/v1/stream-earn/history
/// Get stream earn history for the authenticated user
pub async fn get_stream_earn_history_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<StreamHistoryResponse>, StatusCode> {
    let user_address = &claims.sub;
    let pool = &state.storage.pool;
    
    // Get stream records from database
    let records = get_user_stream_records(pool, user_address).await
        .map_err(|e| {
            error!("❌ Failed to get stream records: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    // Get total earned today
    let total_earned_today = get_total_earned_today(pool, user_address).await
        .map_err(|e| {
            error!(error = %e, user_address = user_address, "Failed to get total earned today");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    // Get minutes used today
    let minutes_used_today = get_minutes_used_today(pool, user_address).await
        .map_err(|e| {
            error!(error = %e, user_address = user_address, "Failed to get minutes used today");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    Ok(Json(StreamHistoryResponse {
        success: true,
        records,
        total_earned_today,
        daily_limit_minutes: DAILY_LIMIT_MINUTES,
        minutes_used_today,
    }))
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async fn check_daily_limit(pool: &PgPool, user_address: &str, duration_minutes: f64) -> bool {
    let today = Utc::now().date_naive();
    
    // Get current usage for today
    let result: Result<Option<i64>, sqlx::Error> = sqlx::query_scalar(
        "SELECT minutes_used FROM user_daily_usage WHERE user_address = $1 AND date = $2"
    )
    .bind(user_address)
    .bind(today)
    .fetch_optional(pool)
    .await;
    
    let current_minutes = match result {
        Ok(Some(minutes)) => minutes as f64,
        Ok(None) => 0.0,
        Err(e) => {
            error!("❌ Error checking daily limit: {}", e);
            return false;
        }
    };
    
    let new_total = current_minutes + duration_minutes;
    new_total <= (DAILY_LIMIT_MINUTES as f64)
}

async fn store_stream_log(
    pool: &PgPool,
    log_id: &str,
    content_id: &str,
    artist_id: &str,
    user_address: &str,
    stream_type: &str,
    duration_seconds: i32,
    tokens_earned: f64,
    track_id: &str,
    track_title: &str,
    genre: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO stream_logs (
            log_id, content_id, artist_id, user_address, stream_type,
            duration_seconds, tokens_earned, track_id, track_title, track_genre, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (log_id) DO NOTHING
        "#
    )
    .bind(log_id)
    .bind(content_id)
    .bind(artist_id)
    .bind(user_address)
    .bind(stream_type)
    .bind(duration_seconds)
    .bind(tokens_earned)
    .bind(track_id)
    .bind(track_title)
    .bind(genre)
    .execute(pool)
    .await?;
    
    Ok(())
}

async fn update_daily_usage(
    pool: &PgPool,
    user_address: &str,
    duration_minutes: f64,
    tokens_earned: f64,
    user_type: &str,
) -> Result<(), sqlx::Error> {
    let today = Utc::now().date_naive();
    
    sqlx::query(
        r#"
        INSERT INTO user_daily_usage (user_address, date, minutes_used, tokens_earned, user_type, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_address, date) 
        DO UPDATE SET 
            minutes_used = user_daily_usage.minutes_used + $3,
            tokens_earned = user_daily_usage.tokens_earned + $4,
            updated_at = NOW()
        "#
    )
    .bind(user_address)
    .bind(today)
    .bind((duration_minutes * 60.0) as i64) // Convert to seconds for storage
    .bind(tokens_earned)
    .bind(user_type)
    .execute(pool)
    .await?;
    
    Ok(())
}

async fn update_token_balance(state: &AppState, user_address: &str, tokens_earned: f64) -> Result<(), String> {
    // Get current balance (in cents/u64 format)
    let current_balance = state.storage.get_balance(user_address).await
        .map_err(|e| format!("Failed to get balance: {}", e))?;
    
    // Convert tokens_earned to cents (assuming 1 DYO = 100 cents for storage)
    let tokens_earned_cents = (tokens_earned * 100.0) as u64;
    
    // Add earned tokens to balance
    let new_balance = current_balance + tokens_earned_cents;
    
    // Update balance in database
    state.storage.update_balance(user_address, new_balance).await
        .map_err(|e| format!("Failed to update balance: {}", e))?;
    
    Ok(())
}

async fn get_total_earned_today(pool: &PgPool, user_address: &str) -> Result<f64, sqlx::Error> {
    let today = Utc::now().date_naive();
    
    // Use query_scalar with f64 directly (PostgreSQL DECIMAL converts to f64)
    let result: Option<f64> = sqlx::query_scalar(
        "SELECT tokens_earned::float8 FROM user_daily_usage WHERE user_address = $1 AND date = $2"
    )
    .bind(user_address)
    .bind(today)
    .fetch_optional(pool)
    .await?;
    
    Ok(result.unwrap_or(0.0))
}

async fn get_minutes_used_today(pool: &PgPool, user_address: &str) -> Result<i32, sqlx::Error> {
    let today = Utc::now().date_naive();
    
    let result: Option<i64> = sqlx::query_scalar(
        "SELECT minutes_used FROM user_daily_usage WHERE user_address = $1 AND date = $2"
    )
    .bind(user_address)
    .bind(today)
    .fetch_optional(pool)
    .await?;
    
    Ok((result.unwrap_or(0) / 60) as i32) // Convert seconds to minutes
}

async fn get_user_stream_records(pool: &PgPool, user_address: &str) -> Result<Vec<StreamRecord>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT 
            log_id, track_id, track_title, artist_id, duration_seconds,
            tokens_earned::float8, stream_type, created_at
        FROM stream_logs
        WHERE user_address = $1
        ORDER BY created_at DESC
        LIMIT 100
        "#
    )
    .bind(user_address)
    .fetch_all(pool)
    .await?;
    
    let mut records = Vec::new();
    for row in rows {
        let log_id: String = row.get::<String, _>(0);
        let track_id: String = row.get::<String, _>(1);
        let track_title: String = row.get::<String, _>(2);
        let artist_id: String = row.get::<String, _>(3);
        let duration_seconds: i32 = row.get::<i32, _>(4);
        let tokens_earned: f64 = row.get::<f64, _>(5);
        let stream_type: String = row.get::<String, _>(6);
        let created_at: chrono::DateTime<chrono::Utc> = row.get::<chrono::DateTime<chrono::Utc>, _>(7);
        
        records.push(StreamRecord {
            log_id,
            track_id,
            track_title,
            artist_id,
            duration_seconds,
            tokens_earned,
            stream_type,
            created_at,
        });
    }
    
    Ok(records)
}

// ============================================================================
// ROUTES
// ============================================================================

pub fn stream_earn_routes() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/artist", axum::routing::post(stream_earn_artist_handler))
        .route("/listener", axum::routing::post(stream_earn_listener_handler))
        .route("/history", axum::routing::get(get_stream_earn_history_handler))
}
