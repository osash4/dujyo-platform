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
use crate::middleware::beta_access;

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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_balance: Option<f64>, // ✅ NEW: Current balance after earning (for real-time UI update)
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
const ARTIST_RATE_PER_MINUTE: f64 = 0.50; // 0.50 DYO per minute for artists (REDUCED from 1.5 for economic sustainability - Opción A3)
const LISTENER_RATE_PER_MINUTE: f64 = 0.10; // 0.10 DYO per minute for listeners (REDUCED from 0.3 for economic sustainability - Opción A3)

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
            new_balance: None,
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
    
    // Get updated balance for artist
    let updated_balance = {
        let pool = &state.storage.pool;
        let result = sqlx::query_as::<_, (i64, i64, i64)>(
            "SELECT dyo_balance, dys_balance, staked_balance FROM token_balances WHERE address = $1"
        )
        .bind(user_address)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();
        
        match result {
            Some((dyo_balance, _, _)) => Some(dyo_balance as f64 / 1_000_000.0),
            None => {
                let legacy = state.storage.get_balance(user_address).await.unwrap_or(0);
                Some((legacy as f64) / 100.0)
            }
        }
    };
    
    Ok(Json(StreamEarnResponse {
        success: true,
        transaction_id,
        tokens_earned,
        total_earned_today,
        message: format!("Artist earned {:.2} DYO for streaming", tokens_earned),
        new_balance: updated_balance,
    }))
}

/// POST /api/v1/stream-earn/listener
/// Listener earns tokens when they stream content
/// ⚠️ CRITICAL: Artists cannot earn DYO from listening to their own content
pub async fn stream_earn_listener_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<StreamEarnRequest>,
) -> Result<Json<StreamEarnResponse>, StatusCode> {
    let user_address = &claims.sub;
    let pool = &state.storage.pool;
    
    info!("📥 [StreamEarn] Listener request from {}: track_id={}, duration={}s", 
          user_address, request.track_id, request.duration_seconds);
    
    // 🆕 Check beta access
    let config = beta_access::S2EConfig::load()
        .unwrap_or_else(|_| beta_access::S2EConfig::default());
    
    if config.is_closed_beta {
        let has_access = beta_access::check_beta_access(pool, user_address, &config).await;
        if !has_access {
            return Ok(Json(StreamEarnResponse {
                success: false,
                transaction_id: String::new(),
                tokens_earned: 0.0,
                total_earned_today: 0.0,
                message: "Beta access required. Please request access at /api/v1/s2e/request-beta-access".to_string(),
                new_balance: None,
            }));
        }
    }
    
    // ⚠️ CRITICAL VERIFICATION: Prevent artists from earning by listening to their own content
    // Resolve artist_id from content_id first
    let mut artist_id = request.artist.clone().unwrap_or_default();
    if let Some(ref cid) = request.content_id {
        match sqlx::query_scalar::<_, String>(
            "SELECT artist_id FROM content WHERE content_id = $1"
        )
        .bind(cid)
        .fetch_optional(pool)
        .await {
            Ok(Some(db_artist_id)) => {
                artist_id = db_artist_id;
            },
            Ok(None) => {
                // Content not found, but we'll check anyway
            },
            Err(e) => {
                error!("❌ Failed to lookup artist_id for content {}: {}", cid, e);
            }
        }
    }
    
    // ⚠️ BLOCK AUTO-LISTENING: If user is the artist of the content, reject
    if !artist_id.is_empty() && user_address == &artist_id {
        return Ok(Json(StreamEarnResponse {
            success: false,
            transaction_id: String::new(),
            tokens_earned: 0.0,
            total_earned_today: 0.0,
            new_balance: None,
            message: "Artists cannot earn DYO from listening to their own content. Focus on growing your fanbase!".to_string(),
        }));
    }
    
    // Calculate duration in minutes
    let duration_minutes = request.duration_seconds as f64 / 60.0;

    // ============================================================================
    // ⚠️ ANTI-FARM VALIDATIONS (3 reglas críticas)
    // ============================================================================
    
    // RULE 1: Cooldown entre sesiones (30 minutos mínimo)
    match check_session_cooldown(pool, user_address).await {
        Ok(true) => {}, // Cooldown cumplido
        Ok(false) => {
            return Ok(Json(StreamEarnResponse {
                success: false,
                transaction_id: String::new(),
                tokens_earned: 0.0,
                total_earned_today: 0.0,
                message: "Please wait 5 minutes between streaming sessions to prevent farming.".to_string(),
                new_balance: None,
            }));
        },
        Err(e) => {
            error!("❌ Error checking session cooldown: {}", e);
            // Return a more informative error response instead of 500
            return Ok(Json(StreamEarnResponse {
                success: false,
                transaction_id: String::new(),
                tokens_earned: 0.0,
                total_earned_today: 0.0,
                message: format!("System error checking session cooldown. Please try again later."),
                new_balance: None,
            }));
        }
    }
    
    // RULE 2: Límite sesión continua (60 minutos máximo)
    match check_continuous_session_limit(pool, user_address, duration_minutes).await {
        Ok(true) => {}, // Sesión dentro del límite
        Ok(false) => {
            return Ok(Json(StreamEarnResponse {
                success: false,
                transaction_id: String::new(),
                tokens_earned: 0.0,
                total_earned_today: 0.0,
                message: "Continuous session limit reached (60 minutes). Please take a break before continuing.".to_string(),
                new_balance: None,
            }));
        },
        Err(e) => {
            error!("❌ Error checking continuous session limit: {}", e);
            // Return a more informative error response instead of 500
            return Ok(Json(StreamEarnResponse {
                success: false,
                transaction_id: String::new(),
                tokens_earned: 0.0,
                total_earned_today: 0.0,
                message: format!("System error checking session limit. Please try again later."),
                new_balance: None,
            }));
        }
    }
    
    // RULE 3: Límite contenido único (10 min por contenido por día)
    let content_id_for_check = request.content_id.clone().unwrap_or_else(|| request.track_id.clone());
    match check_content_daily_limit(pool, user_address, &content_id_for_check, duration_minutes).await {
        Ok(true) => {}, // Dentro del límite
        Ok(false) => {
            return Ok(Json(StreamEarnResponse {
                success: false,
                transaction_id: String::new(),
                tokens_earned: 0.0,
                total_earned_today: 0.0,
                message: format!("Daily limit reached for this content (10 minutes per content per day). Try exploring other tracks!").to_string(),
                new_balance: None,
            }));
        },
        Err(e) => {
            error!("❌ Error checking content daily limit: {}", e);
            // Return a more informative error response instead of 500
            return Ok(Json(StreamEarnResponse {
                success: false,
                transaction_id: String::new(),
                tokens_earned: 0.0,
                total_earned_today: 0.0,
                message: format!("System error checking content limit. Please try again later."),
                new_balance: None,
            }));
        }
    }

    // 🆕 Get current pool to calculate dynamic rate
    let current_pool = match state.storage.get_current_pool().await {
        Ok(pool) => {
            info!("📊 [StreamEarn] Pool retrieved: remaining={:.2} DYO", pool.remaining_amount);
            pool
        },
        Err(e) => {
            error!("❌ [StreamEarn] Failed to get current pool: {}", e);
            // Return a more informative error response instead of 500
            return Ok(Json(StreamEarnResponse {
                success: false,
                transaction_id: String::new(),
                tokens_earned: 0.0,
                total_earned_today: 0.0,
                message: format!("System error retrieving pool data. Please try again later. Error: {}", e),
                new_balance: None,
            }));
        }
    };
    
    // ✅ VALIDATION: Check for NaN or Infinity in pool values
    if current_pool.remaining_amount.is_nan() || current_pool.remaining_amount.is_infinite() {
        error!("❌ [StreamEarn] Invalid pool remaining_amount: {}", current_pool.remaining_amount);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    
    // ✅ FIX: Use FIXED rates, NOT dynamic pool calculation
    // The pool monthly (2M DYO) is for distribution among ALL users
    // Each individual user earns at FIXED rates: 0.10 DYO/min (listener), 0.50 DYO/min (artist)
    let rate_per_minute = LISTENER_RATE_PER_MINUTE; // 0.10 DYO per minute (FIXED)
    
    // 🆕 DEBUG: Log pool and rate information
    info!(
        "📊 S2E Pool: remaining={:.2} DYO, listener_rate={:.2} DYO/min (FIXED), minutes={:.2}",
        current_pool.remaining_amount, rate_per_minute, duration_minutes
    );
    
    // ✅ Calculate tokens using FIXED rate (0.10 DYO per minute)
    let tokens_listener = duration_minutes * LISTENER_RATE_PER_MINUTE;
    
    // ✅ Artist earns at FIXED rate (0.50 DYO per minute) when fans listen
    // Artist earns 5x more than listener (0.50 / 0.10 = 5x)
    let tokens_artist = duration_minutes * ARTIST_RATE_PER_MINUTE;
    let tokens_needed = tokens_listener + tokens_artist;

    // ⚠️ CRITICAL: Check monthly pool has sufficient funds BEFORE processing
    if !state.storage.check_pool_has_funds(tokens_needed).await
        .map_err(|e| {
            error!("❌ Failed to check pool funds: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })? {
        return Ok(Json(StreamEarnResponse {
            success: false,
            transaction_id: String::new(),
            tokens_earned: 0.0,
            total_earned_today: 0.0,
            new_balance: None,
            message: "Monthly S2E pool exhausted. Try again next month!".to_string(),
        }));
    }
    
    // 🆕 DEBUG: Log calculated earnings
    info!(
        "💰 Calculated earnings: listener={:.6} DYO, artist={:.6} DYO, total_needed={:.6} DYO",
        tokens_listener, tokens_artist, tokens_needed
    );

    // Check daily limit
    if !check_daily_limit(pool, user_address, duration_minutes).await {
        return Ok(Json(StreamEarnResponse {
            success: false,
            transaction_id: String::new(),
            tokens_earned: 0.0,
            total_earned_today: 0.0,
            new_balance: None,
            message: format!("Daily streaming limit reached ({} minutes)", DAILY_LIMIT_MINUTES),
        }));
    }

    // Use calculated tokens
    let tokens_earned = tokens_listener;
    
    // Generate transaction ID
    let transaction_id = Uuid::new_v4().to_string();

    // Artist ID already resolved above for auto-listening check
    // If still empty, try to resolve again (fallback logic)
    if artist_id.is_empty() {
        if let Some(ref cid) = request.content_id {
            match sqlx::query_scalar::<_, String>(
                "SELECT artist_id FROM content WHERE content_id = $1"
            )
            .bind(cid)
            .fetch_optional(pool)
            .await {
                Ok(Some(db_artist_id)) => {
                    artist_id = db_artist_id;
                },
                Ok(None) | Err(_) => {
                    // Content not found or error - cannot proceed without artist_id
                    return Ok(Json(StreamEarnResponse {
                        success: false,
                        transaction_id: String::new(),
                        tokens_earned: 0.0,
                        total_earned_today: 0.0,
                        message: "Content not found. Cannot process stream earnings.".to_string(),
                        new_balance: None,
                    }));
                }
            }
        } else {
            // No content_id provided - cannot determine artist
            return Ok(Json(StreamEarnResponse {
                success: false,
                transaction_id: String::new(),
                tokens_earned: 0.0,
                total_earned_today: 0.0,
                message: "Content ID required for stream earnings.".to_string(),
                new_balance: None,
            }));
        }
    }
    
    // Resolve content_id once to avoid moving Option
    let content_id_for_log: String = request.content_id.clone().unwrap_or_else(|| request.track_id.clone());
    
    // Store stream log in database (listener record)
    if let Err(e) = store_stream_log(
        pool,
        &transaction_id,
        &content_id_for_log,
        &artist_id,
        user_address,
        "listener",
        request.duration_seconds,
        tokens_earned,
        &request.track_id,
        &request.track_title,
        request.genre.as_deref(),
    ).await {
        error!("❌ [StreamEarn] Failed to store stream log: {} (transaction_id: {}, user: {}, artist: {})", 
               e, transaction_id, user_address, artist_id);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    info!("✅ [StreamEarn] Stream log stored successfully: transaction_id={}", transaction_id);
    
    // Also store an ARTIST log so the artist can see earnings per track in their history
    // This mirrors the artist reward portion for visibility/analytics.
    let artist_log_id = Uuid::new_v4().to_string();
    if let Err(e) = store_stream_log(
        pool,
        &artist_log_id,
        &content_id_for_log,
        &artist_id,
        &artist_id, // user_address = artist_id so it appears in artist history
        "artist",
        request.duration_seconds,
        tokens_artist, // record artist earned tokens here
        &request.track_id,
        &request.track_title,
        request.genre.as_deref(),
    ).await {
        error!("⚠️ Failed to store artist mirror log: {}", e);
        // Do not fail the whole request
    }
    
    // Update daily usage
    if let Err(e) = update_daily_usage(pool, user_address, duration_minutes, tokens_earned, "listener").await {
        error!("❌ [StreamEarn] Failed to update daily usage: {} (user: {}, minutes: {:.2}, tokens: {:.6})", 
               e, user_address, duration_minutes, tokens_earned);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    info!("✅ [StreamEarn] Daily usage updated: user={}, minutes={:.2}", user_address, duration_minutes);
    
    // ⚠️ ANTI-FARM: Update content daily limit tracking
    if let Err(e) = update_content_daily_limit(
        pool,
        user_address,
        &content_id_for_log,
        request.duration_seconds,
        tokens_earned,
    ).await {
        error!("⚠️ Failed to update content daily limit: {}", e);
        // Do not fail the whole request, but log the error
    }
    
    // Update token balance in blockchain storage
    if let Err(e) = update_token_balance(&state, user_address, tokens_earned).await {
        error!("❌ [StreamEarn] Failed to update listener token balance: {} (user: {}, tokens: {:.6})", 
               e, user_address, tokens_earned);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    info!("✅ [StreamEarn] Listener balance updated: user={}, tokens={:.6}", user_address, tokens_earned);
    
    // Also reward the content artist
    if let Err(e) = update_token_balance(&state, &artist_id, tokens_artist).await {
        error!("❌ [StreamEarn] Failed to update artist token balance (artist_id: {}, tokens: {:.6}): {}", 
               artist_id, tokens_artist, e);
        // Do not fail the whole request; listener award already applied
    } else {
        info!("✅ [StreamEarn] Artist balance updated: artist={}, tokens={:.6}", artist_id, tokens_artist);
    }
    
    // ⚠️ CRITICAL: Decrement monthly pool AFTER successful balance updates
    if let Err(e) = state.storage.decrement_pool(tokens_artist, tokens_earned).await {
        error!("❌ Failed to decrement monthly pool: {}", e);
        // Log error but don't fail - balances already updated
        // In production, consider rollback or alert mechanism
    }
    
    // Get total earned today
    let total_earned_today = get_total_earned_today(pool, user_address).await
        .map_err(|e| {
            error!(error = %e, user_address = user_address, "Failed to get total earned today");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    info!(
        "🎧 Listener earned {:.6} DYO! (user: {}, artist: {}, track: '{}', {} seconds, rate: {:.2} DYO/min FIXED)",
        tokens_earned, user_address, artist_id, request.track_title, request.duration_seconds, LISTENER_RATE_PER_MINUTE
    );
    
    // ✅ Get updated balance after earning to return in response
    let updated_balance = {
        let pool = &state.storage.pool;
        let result = sqlx::query_as::<_, (i64, i64, i64)>(
            "SELECT dyo_balance, dys_balance, staked_balance FROM token_balances WHERE address = $1"
        )
        .bind(user_address)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();
        
        match result {
            Some((dyo_balance, dys_balance, staked_balance)) => {
                (dyo_balance as f64 / 1_000_000.0, dys_balance as f64 / 1_000_000.0, staked_balance as f64 / 1_000_000.0)
            },
            None => {
                // Fallback to legacy balance
                let legacy = state.storage.get_balance(user_address).await.unwrap_or(0);
                ((legacy as f64) / 100.0, 0.0, 0.0)
            }
        }
    };
    
    let response = StreamEarnResponse {
        success: true,
        transaction_id,
        tokens_earned,
        total_earned_today,
        message: format!("Listener earned {:.2} DYO; artist rewarded {:.2} DYO", tokens_earned, tokens_artist),
        new_balance: Some(updated_balance.0), // ✅ Return new balance for immediate UI update
    };
    
    info!("💰 [StreamEarn] Final balance for {}: {:.2} DYO (earned {:.6} DYO this tick)", 
          user_address, updated_balance.0, tokens_earned);
    Ok(Json(response))
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

// ============================================================================
// ANTI-FARM VALIDATIONS
// ============================================================================

/// ⚠️ ANTI-FARM RULE 1: Cooldown entre sesiones (5 minutos mínimo - reducido para mejor UX)
/// Verifica que haya pasado al menos 5 minutos desde el último stream
async fn check_session_cooldown(pool: &PgPool, user_address: &str) -> Result<bool, sqlx::Error> {
    const COOLDOWN_MINUTES: i64 = 5; // ✅ Cooldown entre sesiones diferentes (no dentro de la misma sesión)
    const CONTINUOUS_SESSION_THRESHOLD_SECONDS: i64 = 30; // ✅ Si el último tick fue hace menos de 30 segundos, es la misma sesión
    
    // Obtener el último stream del usuario
    let last_stream: Option<chrono::DateTime<chrono::Utc>> = sqlx::query_scalar(
        r#"
        SELECT created_at 
        FROM stream_logs 
        WHERE user_address = $1 
        ORDER BY created_at DESC 
        LIMIT 1
        "#
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await?;
    
    match last_stream {
        Some(last_time) => {
            let now = Utc::now();
            let time_since_last_seconds = (now - last_time).num_seconds();
            let time_since_last_minutes = (now - last_time).num_minutes();
            
            // ✅ Si el último tick fue hace menos de 30 segundos, es parte de la misma sesión continua
            // Permitir ticks dentro de la misma sesión (cada 10 segundos)
            if time_since_last_seconds < CONTINUOUS_SESSION_THRESHOLD_SECONDS {
                Ok(true) // ✅ Misma sesión continua, permitir tick
            } else if time_since_last_minutes < COOLDOWN_MINUTES {
                // ✅ Último tick fue hace más de 30 segundos pero menos de 5 minutos
                // Esto significa que el usuario detuvo y reanudó la reproducción
                // Aplicar cooldown para prevenir farming
                Ok(false) // Cooldown no cumplido
            } else {
                Ok(true) // Cooldown cumplido (más de 5 minutos desde último stream)
            }
        },
        None => Ok(true), // Primera sesión del día, no hay cooldown
    }
}

/// ⚠️ ANTI-FARM RULE 2: Límite sesión continua (60 minutos máximo)
/// Verifica que la sesión actual no exceda 60 minutos continuos
async fn check_continuous_session_limit(
    pool: &PgPool, 
    user_address: &str, 
    current_duration_minutes: f64
) -> Result<bool, sqlx::Error> {
    const MAX_CONTINUOUS_SESSION_MINUTES: f64 = 60.0;
    
    // Obtener la última sesión del usuario
    let last_stream: Option<(chrono::DateTime<chrono::Utc>, i32)> = sqlx::query(
        r#"
        SELECT created_at, duration_seconds 
        FROM stream_logs 
        WHERE user_address = $1 
        ORDER BY created_at DESC 
        LIMIT 1
        "#
    )
    .bind(user_address)
    .map(|row: sqlx::postgres::PgRow| {
        let created_at: chrono::DateTime<chrono::Utc> = row.get(0);
        let duration_seconds: i32 = row.get(1);
        (created_at, duration_seconds)
    })
    .fetch_optional(pool)
    .await?;
    
    match last_stream {
        Some((last_time, last_duration_seconds)) => {
            let now = Utc::now();
            let time_since_last = (now - last_time).num_minutes();
            
            // Si el último stream fue hace menos de 5 minutos, consideramos que es la misma sesión
            if time_since_last < 5 {
                let last_duration_minutes = last_duration_seconds as f64 / 60.0;
                let total_session_minutes = last_duration_minutes + current_duration_minutes;
                
                if total_session_minutes > MAX_CONTINUOUS_SESSION_MINUTES {
                    Ok(false) // Sesión continua excede límite
                } else {
                    Ok(true) // Sesión continua dentro del límite
                }
            } else {
                Ok(true) // Nueva sesión (más de 5 min desde la última)
            }
        },
        None => Ok(true), // Primera sesión, no hay límite de sesión continua
    }
}

/// ⚠️ ANTI-FARM RULE 3: Límite contenido único (10 min por contenido por día)
/// Verifica que el usuario no haya excedido 10 minutos de un contenido específico hoy
async fn check_content_daily_limit(
    pool: &PgPool,
    user_address: &str,
    content_id: &str,
    duration_minutes: f64,
) -> Result<bool, sqlx::Error> {
    const MAX_MINUTES_PER_CONTENT_PER_DAY: f64 = 10.0;
    let today = Utc::now().date_naive();
    
    // Obtener minutos ya usados para este contenido hoy
    let current_minutes: Option<f64> = sqlx::query_scalar(
        r#"
        SELECT (total_duration_seconds::float8 / 60.0) 
        FROM content_stream_limits 
        WHERE user_address = $1 AND content_id = $2 AND date = $3
        "#
    )
    .bind(user_address)
    .bind(content_id)
    .bind(today)
    .fetch_optional(pool)
    .await?;
    
    let current_minutes = current_minutes.unwrap_or(0.0);
    let new_total = current_minutes + duration_minutes;
    
    if new_total > MAX_MINUTES_PER_CONTENT_PER_DAY {
        Ok(false) // Límite excedido
    } else {
        Ok(true) // Dentro del límite
    }
}

/// Actualiza el límite de contenido diario
async fn update_content_daily_limit(
    pool: &PgPool,
    user_address: &str,
    content_id: &str,
    duration_seconds: i32,
    tokens_earned: f64,
) -> Result<(), sqlx::Error> {
    let today = Utc::now().date_naive();
    
    sqlx::query(
        r#"
        INSERT INTO content_stream_limits (user_address, content_id, date, streams_count, total_duration_seconds, tokens_earned, updated_at)
        VALUES ($1, $2, $3, 1, $4, $5, NOW())
        ON CONFLICT (user_address, content_id, date)
        DO UPDATE SET
            streams_count = content_stream_limits.streams_count + 1,
            total_duration_seconds = content_stream_limits.total_duration_seconds + $4,
            tokens_earned = content_stream_limits.tokens_earned + $5,
            updated_at = NOW()
        "#
    )
    .bind(user_address)
    .bind(content_id)
    .bind(today)
    .bind(duration_seconds)
    .bind(tokens_earned)
    .execute(pool)
    .await?;
    
    Ok(())
}

async fn check_daily_limit(pool: &PgPool, user_address: &str, duration_minutes: f64) -> bool {
    // ⚠️ CRITICAL: Daily limits are ALWAYS enforced (removed debug bypass for economic security)
    let today = Utc::now().date_naive();
    
    // Get current usage for today
    let result: Result<Option<i64>, sqlx::Error> = sqlx::query_scalar(
        "SELECT minutes_used FROM user_daily_usage WHERE user_address = $1 AND date = $2"
    )
    .bind(user_address)
    .bind(today)
    .fetch_optional(pool)
    .await;
    
    // NOTE: 'minutes_used' column stores SECONDS (historical decision); convert to minutes here.
    let current_minutes = match result {
        Ok(Some(seconds_stored)) => (seconds_stored as f64) / 60.0,
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
    // ✅ FIX: Update token_balances table (not legacy balances table)
    let pool = &state.storage.pool;
    
    // Get current token balance from token_balances table
    let current_balance = sqlx::query_as::<_, (Option<i64>, Option<i64>, Option<i64>)>(
        "SELECT dyo_balance, dys_balance, staked_balance FROM token_balances WHERE address = $1"
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to get token balance: {}", e))?;
    
    // Convert tokens_earned to micro-DYO (1 DYO = 1,000,000 micro-DYO)
    let tokens_earned_micro = (tokens_earned * 1_000_000.0).round() as i64;
    
    // Calculate new balance
    let (new_dyo, new_dys, new_staked) = match current_balance {
        Some((Some(dyo), Some(dys), Some(staked))) => {
            (dyo + tokens_earned_micro, dys, staked)
        },
        Some((Some(dyo), None, None)) => {
            (dyo + tokens_earned_micro, 0, 0)
        },
        Some((None, Some(dys), Some(staked))) => {
            (tokens_earned_micro, dys, staked)
        },
        None => {
            // First time earning - create new record
            (tokens_earned_micro, 0, 0)
        },
        _ => {
            // Handle partial data
            (tokens_earned_micro, 0, 0)
        }
    };
    
    // Update token_balances table
    sqlx::query(
        "INSERT INTO token_balances (address, dyo_balance, dys_balance, staked_balance, updated_at) 
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (address) DO UPDATE SET
         dyo_balance = COALESCE(token_balances.dyo_balance, 0) + $2,
         dys_balance = COALESCE(token_balances.dys_balance, 0),
         staked_balance = COALESCE(token_balances.staked_balance, 0),
         updated_at = NOW()"
    )
    .bind(user_address)
    .bind(tokens_earned_micro)
    .bind(0i64) // DYS unchanged
    .bind(0i64) // Staked unchanged
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update token balance: {}", e))?;
    
    // Also update legacy balances table for backward compatibility
    let _ = state.storage.update_balance(user_address, (tokens_earned * 100.0) as u64).await;
    
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

// 🆕 TEST HANDLER to debug extraction issues
async fn test_listener_handler(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<StreamEarnRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    info!("✅ [TEST] Handler reached! user={}, track_id={}", claims.sub, request.track_id);
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Test handler works",
        "user": claims.sub,
        "track_id": request.track_id
    })))
}

pub fn stream_earn_routes() -> axum::Router<AppState> {
    axum::Router::new()
        // ⚠️ TEMPORARY: Enable /artist endpoint to test if it works (simpler handler)
        .route("/artist", axum::routing::post(stream_earn_artist_handler))
        .route("/listener", axum::routing::post(stream_earn_listener_handler))
        .route("/history", axum::routing::get(get_stream_earn_history_handler))
        // ✅ NOTE: JWT middleware is applied at the server.rs level via protected_routes
        // The middleware should work with .nest() routes, but if it doesn't, we may need to apply it here
}
