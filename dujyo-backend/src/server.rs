use axum::{
    extract::{Path, State, WebSocketUpgrade, Query},
    http::{StatusCode, Request, header::{HeaderValue, AUTHORIZATION, CONTENT_TYPE}, Method},
    response::{Json, Response},
    routing::{get, post},
    Router,
    middleware::Next,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::time;
use chrono::{DateTime, Utc};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use futures_util::{sink::SinkExt, stream::StreamExt};
use axum::extract::ws::{Message, WebSocket};
use tracing;
use sqlx::Postgres;
use sqlx::Transaction as SqlxTransaction;

use crate::blockchain::blockchain::{Blockchain, Transaction, Block};
use crate::blockchain::token::Token;
use crate::blockchain::real_blockchain::TokenBalance;
use crate::blockchain::gas_fees::{GasFeeCalculator, NetworkState, UserTier, TransactionType, handle_gas_fee_with_auto_swap};
use crate::storage::BlockchainStorage;
use crate::auth::{JwtConfig, jwt_middleware, login_handler};
use crate::dex::DEX;
use crate::handlers::wallet_handlers::{self, ConnectWalletRequest, ConnectWalletResponse, WalletSession};
use crate::routes::{user, onboarding, stream_earn, s2e_config, s2e_dashboard, s2e_user, s2e_beta, s2e_admin, analytics, royalties, upload, playlists, search, recommendations, follows, comments, reviews, notifications, user_stats, premium, achievements, trending, dex, nfts, metrics, monitoring, health}; // ✅ Import routes
use bb8_redis::{bb8::Pool, RedisConnectionManager};
use crate::redis::create_redis_pool;
use crate::middleware::rate_limiting::{redis_rate_limiting_middleware, RedisRateLimitState, RateLimitRules};
use crate::security::rate_limiter_memory::RateLimiter;
use crate::middleware::input_validation_middleware;


// Shared state for the server
#[derive(Clone)]
pub struct AppState {
    pub blockchain: Arc<Mutex<Blockchain>>,
    pub token: Arc<Mutex<Token>>,
    pub dex: Arc<Mutex<DEX>>,
    pub websocket_clients: Arc<Mutex<Vec<axum::extract::ws::WebSocket>>>,
    pub storage: Arc<BlockchainStorage>,
    pub jwt_config: JwtConfig,
    pub redis_pool: Option<Arc<Pool<RedisConnectionManager>>>, // ✅ MVP-CRITICAL: Redis pool for rate limiting
}

// Request/Response types
#[derive(Deserialize)]
pub struct TransactionRequest {
    pub from: String,
    pub to: String,
    pub amount: u64,
    pub nft_id: Option<String>,
}

#[derive(Deserialize)]
pub struct MintRequest {
    pub account: String,
    pub amount: f64,
}

#[derive(Serialize)]
pub struct TransactionResponse {
    pub success: bool,
    pub message: String,
    pub transaction_id: Option<String>,
}

#[derive(Serialize)]
pub struct BalanceResponse {
    pub address: String,
    pub balance: u64,
}

#[derive(Serialize)]
pub struct MintResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Serialize)]
pub struct BlockResponse {
    pub blocks: Vec<Block>,
    pub total_blocks: usize,
}

// DEX structures
#[derive(Deserialize, Clone)]
pub struct SwapRequest {
    pub from: String,
    pub to: String,
    pub amount: f64,
    pub min_received: f64,
    pub user: String,
}

#[derive(Deserialize, Clone)]
pub struct LiquidityRequest {
    pub pool_id: String,
    pub amounts: Vec<f64>, // [amount_a, amount_b]
    pub user: String,
}

#[derive(Serialize)]
pub struct SwapResponse {
    pub success: bool,
    pub message: String,
    pub tx_hash: Option<String>,
    pub amount_received: Option<f64>,
    pub price_impact: Option<f64>,
}

#[derive(Serialize)]
pub struct LiquidityResponse {
    pub success: bool,
    pub message: String,
    pub tx_hash: Option<String>,
    pub lp_tokens_minted: Option<f64>,
}

// Staking structures
#[derive(Deserialize)]
pub struct ServerStakeRequest {
    pub account: String,
    pub amount: f64,
    pub lock_period_days: Option<u32>, // User-configurable lock period (default: 30 days)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerUnstakeRequest {
    pub account: String,
    pub amount: f64,
}

#[derive(Serialize)]
pub struct StakeResponse {
    pub success: bool,
    pub message: String,
    pub tx_hash: Option<String>,
    pub new_balance: Option<f64>,
}

#[derive(Serialize)]
pub struct PoolResponse {
    pub success: bool,
    pub pool: Option<serde_json::Value>,
    pub message: String,
}

// Handler functions
async fn get_blocks(State(state): State<AppState>) -> Result<Json<BlockResponse>, StatusCode> {
    let blockchain = state.blockchain.lock().unwrap();
    let blocks = blockchain.chain.clone();
    let total_blocks = blocks.len();
    
    Ok(Json(BlockResponse {
        blocks,
        total_blocks,
    }))
}

async fn submit_transaction(
    State(state): State<AppState>,
    Json(request): Json<TransactionRequest>,
) -> Result<Json<TransactionResponse>, StatusCode> {
    // ✅ MVP-CRITICAL: Calculate gas fee with price fixing in USD
    let gas_calculator = GasFeeCalculator::new();
    
    // Get network state (DYO price from DEX pool)
    let dyo_price_usd = {
        let dex = state.dex.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        // Get DYO/DYS pool to calculate price
        if let Some(pool) = dex.pools.get("DYO_DYS") {
            // Price = reserve_b (DYS) / reserve_a (DYO)
            // DYS is pegged to $1 USD, so if 1M DYO : 1M DYS, then 1 DYO = $1 USD
            if pool.reserve_a > 0.0 {
                pool.reserve_b / pool.reserve_a
            } else {
                0.001 // Default fallback: $0.001 per DYO
            }
        } else {
            0.001 // Default fallback: $0.001 per DYO
        }
    };
    
    let network_state = NetworkState {
        congestion_level: 0.0, // TODO: Calculate from pending transactions
        dyo_price_usd,
        daily_volume: 0.0, // TODO: Get from database
    };
    
    // Calculate gas fee for Transfer transaction
    let gas_fee_dyo = gas_calculator.calculate_gas_fee(
        &TransactionType::Transfer,
        Some(request.amount as f64 / 100.0), // Convert cents to DYO
        &UserTier::Regular, // TODO: Get from user profile
        &network_state,
        false,
    ).map_err(|e| {
        tracing::error!(error = %e, "Failed to calculate gas fee");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Get user balances
    let (user_dyo_balance, user_dys_balance) = {
        let blockchain = state.blockchain.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        let token = state.token.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        let dyo_balance = (blockchain.get_balance(&request.from) as f64) / 100.0; // Convert cents to DYO
        let dys_balance = token.balance_of(&request.from); // DYS balance
        (dyo_balance, dys_balance)
    };
    
    // ✅ MVP-CRITICAL: Handle auto-swap if needed
    // TODO: Implementar auto-swap async cuando DEX soporte async
    // Por ahora, verificamos balance y continuamos
    let swap_result = crate::blockchain::gas_fees::AutoSwapResult {
        success: true,
        dyo_received: 0.0,
        dys_used: 0.0,
        swap_executed: false,
        message: "Auto-swap pending implementation".to_string(),
    };
    
    // Verificar si hay suficiente balance
    if user_dyo_balance < gas_fee_dyo {
        return Ok(Json(TransactionResponse {
            success: false,
            message: format!("Insufficient DYO balance for gas fee. Required: {} DYO, Available: {} DYO. Auto-swap coming soon.", gas_fee_dyo, user_dyo_balance),
            transaction_id: None,
        }));
    }
    
    if swap_result.swap_executed {
        tracing::info!(
            user = %request.from,
            dyo_received = swap_result.dyo_received,
            dys_used = swap_result.dys_used,
            "Auto-swapped DYS for DYO to pay gas fee"
        );
    }
    
    // Verify final balance after swap
    let final_dyo_balance = if swap_result.swap_executed {
        user_dyo_balance + swap_result.dyo_received
    } else {
        user_dyo_balance
    };
    
    if final_dyo_balance < gas_fee_dyo {
        return Ok(Json(TransactionResponse {
            success: false,
            message: format!("Insufficient DYO balance for gas fee. Required: {} DYO, Available: {} DYO", gas_fee_dyo, final_dyo_balance),
            transaction_id: None,
        }));
    }
    
    // Deduct gas fee from balance
    {
        let mut blockchain = state.blockchain.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        let gas_fee_cents = (gas_fee_dyo * 100.0) as u64;
        let current_balance = blockchain.get_balance(&request.from);
        if current_balance < gas_fee_cents {
            return Ok(Json(TransactionResponse {
                success: false,
                message: format!("Insufficient balance for gas fee"),
                transaction_id: None,
            }));
        }
        // Create gas fee transaction
        let gas_fee_tx = Transaction {
            from: request.from.clone(),
            to: "GAS_FEE_ADDRESS".to_string(),
            amount: gas_fee_cents,
            nft_id: None,
        };
        blockchain.add_transaction(gas_fee_tx).map_err(|e| {
            tracing::error!(error = %e, "Failed to add gas fee transaction");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    }
    
    let transaction = Transaction {
        from: request.from.clone(),
        to: request.to.clone(),
        amount: request.amount,
        nft_id: request.nft_id,
    };
    
    let pool = &state.storage.pool;
    
    // ✅ ATOMIC TRANSACTION - All or nothing
    let mut tx = pool.begin().await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to begin transaction");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    // Add transaction to blockchain (within transaction context)
    let add_result = {
        let mut blockchain = state.blockchain.lock()
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        blockchain.add_transaction(transaction.clone())
    };
    
    match add_result {
        Ok(_) => {
            // Save transaction to database in same transaction
            match state.storage.save_transaction_atomic(&transaction, &mut tx).await {
                Ok(tx_hash) => {
                    // Create audit log
                    let audit_id = uuid::Uuid::new_v4();
                    let audit_details = serde_json::json!({
                        "from": transaction.from,
                        "to": transaction.to,
                        "amount": transaction.amount
                    });
                    sqlx::query(
                        "INSERT INTO audit_logs (id, timestamp, action_type, resource, details, success, status_code)
                         VALUES ($1, NOW(), $2, $3, $4, true, 200)"
                    )
                    .bind(audit_id)
                    .bind("transaction_submitted")
                    .bind(&tx_hash)
                    .bind(audit_details)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| {
                        tracing::error!(error = %e, "Failed to create audit log");
                        StatusCode::INTERNAL_SERVER_ERROR
                    })?;
                    
                    // Commit transaction
                    tx.commit().await
                        .map_err(|e| {
                            tracing::error!(error = %e, "Failed to commit transaction");
                            StatusCode::INTERNAL_SERVER_ERROR
                        })?;
                    
                    let message = if swap_result.swap_executed {
                        format!("Transaction added successfully. Gas fee: {} DYO (auto-swapped {} DYS)", gas_fee_dyo, swap_result.dys_used)
                    } else {
                        format!("Transaction added successfully. Gas fee: {} DYO", gas_fee_dyo)
                    };
                    
                    // ✅ MVP-CRITICAL: Registrar métrica de transacción exitosa
                    metrics::increment_transaction_success();
                    
                    Ok(Json(TransactionResponse {
                        success: true,
                        message,
                        transaction_id: Some(tx_hash),
                    }))
                }
                Err(e) => {
                    tx.rollback().await.ok(); // Ignore rollback errors
                    tracing::error!(error = %e, "Failed to save transaction to database");
                    // ✅ MVP-CRITICAL: Registrar métrica de transacción fallida
                    metrics::increment_transaction_failed();
                    Ok(Json(TransactionResponse {
                        success: false,
                        message: format!("Database error: {}", e),
                        transaction_id: None,
                    }))
                }
            }
        }
        Err(e) => {
            tx.rollback().await.ok();
            tracing::error!(error = %e, "Failed to add transaction to blockchain");
            // ✅ MVP-CRITICAL: Registrar métrica de transacción fallida
            metrics::increment_transaction_failed();
            Ok(Json(TransactionResponse {
                success: false,
                message: e,
                transaction_id: None,
            }))
        }
    }
}

async fn mint_tokens(
    State(state): State<AppState>,
    Json(request): Json<MintRequest>,
) -> Result<Json<MintResponse>, StatusCode> {
    let mut token = state.token.lock().unwrap();
    
    match token.mint(&request.account, request.amount) {
        Ok(_) => {
            Ok(Json(MintResponse {
                success: true,
                message: format!("Successfully minted {} tokens to {}", request.amount, request.account),
            }))
        }
        Err(e) => {
            Ok(Json(MintResponse {
                success: false,
                message: e,
            }))
        }
    }
}

async fn get_balance(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<BalanceResponse>, StatusCode> {
    // ✅ FIX: Use token_balances table (source of truth) instead of legacy blockchain balance
    let pool = &state.storage.pool;
    let result = sqlx::query_as::<_, (Option<i64>, Option<i64>, Option<i64>)>(
        "SELECT dyo_balance, dys_balance, staked_balance FROM token_balances WHERE address = $1"
    )
    .bind(&address)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get token balance from database: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let balance_centavos = match result {
        Some((Some(dyo_micro), _, _)) => {
            // Convert from micro-DYO to centavos (for backward compatibility)
            let dyo = dyo_micro as f64 / 1_000_000.0;
            (dyo * 100.0) as u64
        },
        None => {
            // Fallback to legacy balance if no token_balances record exists
    let blockchain = state.blockchain.lock().unwrap();
            blockchain.get_balance(&address)
        },
        _ => 0,
    };
    
    Ok(Json(BalanceResponse {
        address,
        balance: balance_centavos,
    }))
}

// ✅ NEW: Earnings endpoints for frontend WalletDashboard
#[derive(Serialize)]
struct UserEarningsResponse {
    totalEarnings: f64,
    weeklyEarnings: f64,
    monthlyEarnings: f64,
    todayEarnings: f64,
    sessionEarnings: f64,
    musicEarnings: f64,
    videoEarnings: f64,
    gamingEarnings: f64,
    musicStreams: i64,
    videoViews: i64,
    gamingPlays: i64,
    streamCount: i64,
    earningRate: f64,
    nextPayoutDate: Option<String>,
    nextPayoutAmount: f64,
    streak: i32,
    progress: f64,
}

async fn get_user_earnings_handler(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<UserEarningsResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let today = chrono::Utc::now().date_naive();
    let week_ago = today - chrono::Duration::days(7);
    let month_ago = today - chrono::Duration::days(30);
    
    // Total earnings (all time) - as listener
    let total_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE user_address = $1"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get total earnings: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Today earnings
    let today_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE user_address = $1 AND DATE(created_at) = $2"
    )
    .bind(&address)
    .bind(today)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    // Weekly earnings
    let weekly_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE user_address = $1 AND DATE(created_at) >= $2"
    )
    .bind(&address)
    .bind(week_ago)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    // Monthly earnings
    let monthly_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE user_address = $1 AND DATE(created_at) >= $2"
    )
    .bind(&address)
    .bind(month_ago)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    // ✅ S2E UNIFIED: All content types use same rate, but we can group by stream_type for display
    let music_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE user_address = $1 AND (stream_type = 'audio' OR stream_type = 'music')"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    let video_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE user_address = $1 AND stream_type = 'video'"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    let gaming_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE user_address = $1 AND (stream_type = 'gaming' OR stream_type = 'game')"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    // Stream counts
    let music_streams: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM stream_logs WHERE user_address = $1 AND (stream_type = 'audio' OR stream_type = 'music')"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .unwrap_or(0);
    
    let video_views: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM stream_logs WHERE user_address = $1 AND stream_type = 'video'"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .unwrap_or(0);
    
    let gaming_plays: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM stream_logs WHERE user_address = $1 AND (stream_type = 'gaming' OR stream_type = 'game')"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .unwrap_or(0);
    
    let total_streams = music_streams + video_views + gaming_plays;
    
    // Session earnings (last hour)
    let one_hour_ago = chrono::Utc::now() - chrono::Duration::hours(1);
    let session_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE user_address = $1 AND created_at >= $2"
    )
    .bind(&address)
    .bind(one_hour_ago)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    // Calculate next payout date (first day of next month)
    let now = chrono::Utc::now().date_naive();
    // Simple approach: add 1 month (approximately 30 days) and set to day 1
    let next_payout = now + chrono::Duration::days(30);
    let next_payout_date = Some(next_payout.format("%Y-%m-%d").to_string());
    
    // Calculate progress (minutes used today / 120)
    let minutes_used_today: i64 = sqlx::query_scalar(
        "SELECT COALESCE(minutes_used, 0) FROM user_daily_usage WHERE user_address = $1 AND date = $2"
    )
    .bind(&address)
    .bind(today)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
    .unwrap_or(0);
    let progress = ((minutes_used_today as f64 / 60.0) / 120.0 * 100.0).min(100.0); // Convert seconds to minutes, then to percentage
    
    Ok(Json(UserEarningsResponse {
        totalEarnings: total_earnings,
        weeklyEarnings: weekly_earnings,
        monthlyEarnings: monthly_earnings,
        todayEarnings: today_earnings,
        sessionEarnings: session_earnings,
        musicEarnings: music_earnings,
        videoEarnings: video_earnings,
        gamingEarnings: gaming_earnings,
        musicStreams: music_streams,
        videoViews: video_views,
        gamingPlays: gaming_plays,
        streamCount: total_streams,
        earningRate: 0.10, // ✅ FIXED rate: 0.10 DYO/min (unified for all content types)
        nextPayoutDate: next_payout_date,
        nextPayoutAmount: monthly_earnings,
        streak: 0, // TODO: Calculate streak from consecutive days
        progress,
    }))
}

async fn get_artist_earnings_handler(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<UserEarningsResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let today = chrono::Utc::now().date_naive();
    let week_ago = today - chrono::Duration::days(7);
    let month_ago = today - chrono::Duration::days(30);
    
    // ✅ Artists earn when FANS listen to their content (from artist_id in stream_logs)
    // Total earnings (all time) - as artist
    let total_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE artist_id = $1 AND user_address != $1"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get artist total earnings: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Today earnings
    let today_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE artist_id = $1 AND user_address != $1 AND DATE(created_at) = $2"
    )
    .bind(&address)
    .bind(today)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    // Weekly earnings
    let weekly_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE artist_id = $1 AND user_address != $1 AND DATE(created_at) >= $2"
    )
    .bind(&address)
    .bind(week_ago)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    // Monthly earnings
    let monthly_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE artist_id = $1 AND user_address != $1 AND DATE(created_at) >= $2"
    )
    .bind(&address)
    .bind(month_ago)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    // Platform breakdown
    let music_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE artist_id = $1 AND user_address != $1 AND (stream_type = 'audio' OR stream_type = 'music')"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    let video_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE artist_id = $1 AND user_address != $1 AND stream_type = 'video'"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    let gaming_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE artist_id = $1 AND user_address != $1 AND (stream_type = 'gaming' OR stream_type = 'game')"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    // Stream counts
    let music_streams: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM stream_logs WHERE artist_id = $1 AND user_address != $1 AND (stream_type = 'audio' OR stream_type = 'music')"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .unwrap_or(0);
    
    let video_views: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM stream_logs WHERE artist_id = $1 AND user_address != $1 AND stream_type = 'video'"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .unwrap_or(0);
    
    let gaming_plays: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM stream_logs WHERE artist_id = $1 AND user_address != $1 AND (stream_type = 'gaming' OR stream_type = 'game')"
    )
    .bind(&address)
    .fetch_one(pool)
    .await
    .unwrap_or(0);
    
    let total_streams = music_streams + video_views + gaming_plays;
    
    // Session earnings (last hour)
    let one_hour_ago = chrono::Utc::now() - chrono::Duration::hours(1);
    let session_earnings: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(tokens_earned::float8), 0.0) FROM stream_logs WHERE artist_id = $1 AND user_address != $1 AND created_at >= $2"
    )
    .bind(&address)
    .bind(one_hour_ago)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    // Calculate next payout date (first day of next month)
    let now = chrono::Utc::now().date_naive();
    // Simple approach: add 1 month (approximately 30 days)
    let next_payout = now + chrono::Duration::days(30);
    let next_payout_date = Some(next_payout.format("%Y-%m-%d").to_string());
    
    Ok(Json(UserEarningsResponse {
        totalEarnings: total_earnings,
        weeklyEarnings: weekly_earnings,
        monthlyEarnings: monthly_earnings,
        todayEarnings: today_earnings,
        sessionEarnings: session_earnings,
        musicEarnings: music_earnings,
        videoEarnings: video_earnings,
        gamingEarnings: gaming_earnings,
        musicStreams: music_streams,
        videoViews: video_views,
        gamingPlays: gaming_plays,
        streamCount: total_streams,
        earningRate: 0.50, // ✅ FIXED rate: 0.50 DYO/min for artists (when fans listen)
        nextPayoutDate: next_payout_date,
        nextPayoutAmount: monthly_earnings,
        streak: 0,
        progress: 0.0, // Not applicable for artists
    }))
}

async fn get_earnings_history_handler(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let pool = &state.storage.pool;
    
    // Get last 30 days of earnings
    let thirty_days_ago = chrono::Utc::now().date_naive() - chrono::Duration::days(30);
    
    // Use query_as with a simple struct or query_scalar for each field
    let rows: Vec<(String, String, String, String, i32, f64, String, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        r#"
        SELECT 
            log_id,
            track_id,
            track_title,
            artist_id,
            duration_seconds,
            tokens_earned::float8 as tokens_earned,
            stream_type,
            created_at
        FROM stream_logs
        WHERE user_address = $1 AND DATE(created_at) >= $2
        ORDER BY created_at DESC
        LIMIT 100
        "#
    )
    .bind(&address)
    .bind(thirty_days_ago)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get earnings history: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let records: Vec<serde_json::Value> = rows.into_iter().map(|(log_id, track_id, track_title, artist_id, duration_seconds, tokens_earned, stream_type, created_at)| {
        serde_json::json!({
            "log_id": log_id,
            "track_id": track_id,
            "track_title": track_title,
            "artist_id": artist_id,
            "duration_seconds": duration_seconds,
            "tokens_earned": tokens_earned,
            "stream_type": stream_type,
            "created_at": created_at.to_rfc3339(),
        })
    }).collect();
    
    Ok(Json(serde_json::json!({
        "success": true,
        "history": records
    })))
}

async fn get_earnings_predictions_handler(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let pool = &state.storage.pool;
    
    // Get last 7 days average
    let seven_days_ago = chrono::Utc::now().date_naive() - chrono::Duration::days(7);
    
    let avg_daily: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(AVG(daily_total), 0.0)
        FROM (
            SELECT DATE(created_at) as date, SUM(tokens_earned::float8) as daily_total
            FROM stream_logs
            WHERE user_address = $1 AND DATE(created_at) >= $2
            GROUP BY DATE(created_at)
        ) daily_earnings
        "#
    )
    .bind(&address)
    .bind(seven_days_ago)
    .fetch_one(pool)
    .await
    .unwrap_or(0.0);
    
    Ok(Json(serde_json::json!({
        "weeklyPrediction": avg_daily * 7.0,
        "monthlyPrediction": avg_daily * 30.0,
        "weeklyConfidence": 75.0,
        "monthlyConfidence": 80.0
    })))
}

// Detailed balance with token breakdown
#[derive(Serialize)]
struct BalanceDetailResponse {
    address: String,
    dyo: f64,
    dys: f64,
    staked: f64,
    total: f64,
    available_dyo: f64,
}

async fn get_balance_detail(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<BalanceDetailResponse>, StatusCode> {
    // ✅ FIX: Get balance from token_balances table (source of truth)
    let pool = &state.storage.pool;
    let token_balance = {
        let result = sqlx::query_as::<_, (i64, i64, i64)>(
            "SELECT dyo_balance, dys_balance, staked_balance FROM token_balances WHERE address = $1"
        )
        .bind(&address)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get token balance from database: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        
        match result {
            Some((dyo_balance, dys_balance, staked_balance)) => {
                // Convert from micro-DYO (1_000_000 = 1 DYO) to DYO
                TokenBalance {
                    dyo: dyo_balance as f64 / 1_000_000.0,
                    dys: dys_balance as f64 / 1_000_000.0,
                    staked: staked_balance as f64 / 1_000_000.0,
                    total: (dyo_balance + dys_balance + staked_balance) as f64 / 1_000_000.0,
                }
            },
            None => {
                // If no record in token_balances, check legacy balances table
                let legacy_balance = state.storage.get_balance(&address).await.unwrap_or(0);
                let legacy_dyo = (legacy_balance as f64) / 100.0; // Convert centavos to DYO
                
                TokenBalance {
                    dyo: legacy_dyo,
        dys: 0.0,
        staked: 0.0,
                    total: legacy_dyo,
                }
            },
        }
    };
    
    Ok(Json(BalanceDetailResponse {
        address,
        dyo: token_balance.dyo,
        dys: token_balance.dys,
        staked: token_balance.staked,
        total: token_balance.total,
        available_dyo: token_balance.dyo, // Available DYO = total DYO (not staked)
    }))
}

// Get tokens by owner
#[derive(Serialize)]
struct TokensResponse {
    tokens: Vec<serde_json::Value>,
}

async fn get_tokens_by_owner(
    State(_state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<TokensResponse>, StatusCode> {
    // TODO: Implement real token fetching from database
    // For now, return empty array
    Ok(Json(TokensResponse {
        tokens: vec![],
    }))
}

// Get transaction history
#[derive(Serialize)]
struct TransactionsResponse {
    transactions: Vec<serde_json::Value>,
}

async fn get_transaction_history(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<TransactionsResponse>, StatusCode> {
    let pool = &state.storage.pool;
    
    // Get transactions from database with created_at
    let transactions_result: Result<Vec<(String, String, String, i64, String, Option<i64>, chrono::DateTime<chrono::Utc>)>, sqlx::Error> = sqlx::query_as(
        "SELECT tx_hash, from_address, to_address, amount, status, block_height, created_at FROM transactions WHERE from_address = $1 OR to_address = $1 ORDER BY created_at DESC LIMIT 50"
    )
    .bind(&address)
    .fetch_all(pool)
    .await;
    
    let transactions = match transactions_result {
        Ok(rows) => rows.into_iter()
            .map(|(tx_hash, from_address, to_address, amount, status, block_height, created_at)| {
                serde_json::json!({
                    "hash": tx_hash,
                    "from": from_address,
                    "to": to_address,
                    "amount": amount,
                    "status": status,
                    "block_height": block_height,
                    "timestamp": created_at.timestamp_millis(),
                    "created_at": created_at.to_rfc3339(),
                })
            })
            .collect(),
        Err(_) => vec![],
    };
    
    Ok(Json(TransactionsResponse {
        transactions,
    }))
}

// Block production task
async fn block_production_task(state: AppState) {
    let mut interval = time::interval(Duration::from_secs(10)); // Produce block every 10 seconds
    
    loop {
        interval.tick().await;
        
        // Get blockchain data and release lock before async operations
        let (transactions, previous_hash, current_height, should_create_block) = {
            let mut blockchain = state.blockchain.lock().unwrap();
            let current_height = blockchain.chain.len() as i64;
            let latest_block = blockchain.get_latest_block().clone(); // Clone to avoid borrow issues
            
            if !blockchain.pending_transactions.is_empty() {
                // Always create block if there are pending transactions
                let transactions = blockchain.pending_transactions.clone();
                blockchain.pending_transactions.clear();
                let previous_hash = latest_block.hash.clone();
                (Some(transactions), previous_hash, current_height, true)
            } else {
                // Only create empty block if it's been more than 30 seconds since last block
                let last_block_timestamp = latest_block.timestamp;
                let current_timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
                
                if current_timestamp - last_block_timestamp < 30 {
                    // Skip creating empty block
                    (None, String::new(), current_height, false)
                } else {
                    let previous_hash = latest_block.hash.clone();
                    (None, previous_hash, current_height, true)
                }
            }
        };
        
        // Only create and save block if needed
        if !should_create_block {
            continue; // Skip this iteration
        }
        
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        
        // Create new block with unique hash (include timestamp in hash calculation)
        let mut new_block = Block {
            timestamp,
            transactions: transactions.clone().unwrap_or_default(),
            previous_hash,
            hash: String::new(),
            validator: Some("system".to_string()),
        };
        
        // Calculate hash - this will be unique because timestamp is included
        new_block.hash = new_block.calculate_hash();
        
        // Save block to database (will silently ignore duplicates)
        if let Err(e) = state.storage.save_block(&new_block, current_height).await {
            // Only log if it's not a duplicate key error
            if !e.to_string().contains("duplicate key") {
                eprintln!("Error saving block to database: {}", e);
            }
        }
        
        // Update balances in database if there are transactions
        if let Some(ref transactions) = transactions {
            for transaction in transactions {
                let (from_balance, to_balance) = {
                    let blockchain = state.blockchain.lock().unwrap();
                    (blockchain.get_balance(&transaction.from), blockchain.get_balance(&transaction.to))
                };
                
                if let Err(e) = state.storage.update_balance(&transaction.from, from_balance).await {
                    println!("Error updating balance for {}: {}", transaction.from, e);
                }
                if let Err(e) = state.storage.update_balance(&transaction.to, to_balance).await {
                    println!("Error updating balance for {}: {}", transaction.to, e);
                }
            }
        }
        
        // Add block to blockchain
        {
            let mut blockchain = state.blockchain.lock().unwrap();
            blockchain.chain.push(new_block);
        }
        
        if let Some(ref transactions) = transactions {
            println!("New block created with {} transactions", transactions.len());
        } else {
            println!("Empty block created");
        }
    }
}

// Health check endpoint
async fn health_check() -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(serde_json::json!({
        "status": "healthy",
        "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
        "service": "dujyo-blockchain"
    })))
}

// WebSocket handler
async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> axum::response::Response {
    ws.on_upgrade(|socket| websocket_connection(socket, state))
}

async fn websocket_connection(socket: WebSocket, _state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    
    println!("New WebSocket connection established");
    
    // Handle incoming messages
    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                println!("Received WebSocket message: {}", text);
                
                // Echo back the message
                if let Err(e) = sender.send(Message::Text(format!("Echo: {}", text))).await {
                    println!("Error sending WebSocket message: {}", e);
                    break;
                }
            }
            Ok(Message::Close(_)) => {
                println!("WebSocket connection closed");
                break;
            }
            _ => {}
        }
    }
}


async fn get_pool(
    State(state): State<AppState>,
    Path(pool_id): Path<String>,
) -> Result<Json<PoolResponse>, StatusCode> {
    let dex = state.dex.lock().unwrap();
    
    match dex.get_pool(&pool_id) {
        Some(pool) => {
            Ok(Json(PoolResponse {
                success: true,
                pool: Some(serde_json::to_value(pool).unwrap_or(serde_json::Value::Null)),
                message: "Pool retrieved successfully".to_string(),
            }))
        }
        None => {
            Ok(Json(PoolResponse {
                success: false,
                pool: None,
                message: "Pool not found".to_string(),
            }))
        }
    }
}

// Staking handlers
async fn simple_stake_handler(
    State(state): State<AppState>,
    Json(request): Json<ServerStakeRequest>,
) -> Result<Json<StakeResponse>, StatusCode> {
    // ✅ FIX: Get balance from database (source of truth) - check both token_balances and legacy balances
    let token_balance = {
        let pool = &state.storage.pool;
        let result = sqlx::query_as::<_, (i64, i64, i64)>(
            "SELECT dyo_balance, dys_balance, staked_balance FROM token_balances WHERE address = $1"
        )
        .bind(&request.account)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get token balance from database: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        
        match result {
            Some((dyo_balance, dys_balance, staked_balance)) => {
                // Convert from micro-DYO (1_000_000 = 1 DYO) to DYO
                let dyo = dyo_balance as f64 / 1_000_000.0;
                let dys = dys_balance as f64 / 1_000_000.0;
                let staked = staked_balance as f64 / 1_000_000.0;
                
                // If token_balances has 0 but legacy balance exists, use legacy balance
                if dyo == 0.0 {
                    let legacy_balance = state.storage.get_balance(&request.account).await.unwrap_or(0);
                    let legacy_dyo = (legacy_balance as f64) / 100.0; // Convert centavos to DYO
                    if legacy_dyo > 0.0 {
                        tracing::info!("Using legacy balance for {}: {} DYO", request.account, legacy_dyo);
                        TokenBalance {
                            dyo: legacy_dyo,
                            dys,
                            staked,
                            total: legacy_dyo + dys + staked,
                        }
                    } else {
                        TokenBalance { dyo, dys, staked, total: dyo + dys + staked }
                    }
                } else {
                    TokenBalance { dyo, dys, staked, total: dyo + dys + staked }
                }
            },
            None => {
                // No record in token_balances, check legacy balances
                let legacy_balance = state.storage.get_balance(&request.account).await.unwrap_or(0);
                let legacy_dyo = (legacy_balance as f64) / 100.0; // Convert centavos to DYO
                tracing::info!("No token_balances record, using legacy balance for {}: {} DYO", request.account, legacy_dyo);
                TokenBalance {
                    dyo: legacy_dyo,
                    dys: 0.0,
                    staked: 0.0,
                    total: legacy_dyo,
                }
            },
        }
    };
    
    // Check if user has sufficient balance
    if token_balance.dyo < request.amount {
        return Ok(Json(StakeResponse {
            success: false,
            message: format!("Insufficient balance for staking. Available: {:.2} DYO, Required: {:.2} DYO", 
                            token_balance.dyo, request.amount),
            tx_hash: None,
            new_balance: None,
        }));
    }
    
    if request.amount < 1.0 {
        return Ok(Json(StakeResponse {
            success: false,
            message: "Minimum stake is 1 DYO".to_string(),
            tx_hash: None,
            new_balance: None,
        }));
    }
    
    // ✅ FIX: Update balance directly in database (not in-memory HashMap)
    let lock_period_days = request.lock_period_days.unwrap_or(30); // Default 30 days
    let new_dyo_balance = token_balance.dyo - request.amount;
    let new_staked_balance = token_balance.staked + request.amount;
    
    // ✅ FIX: Create staking position with lock period
    let pool = &state.storage.pool;
    let unlock_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() + (lock_period_days as u64 * 24 * 3600);
    
    // Store staking position
    let position_id = format!("STAKE_{}_{}", request.account, SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs());
    let _ = sqlx::query(
        "INSERT INTO staking_positions (position_id, user_address, amount, lock_period_days, unlock_timestamp, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (position_id) DO NOTHING"
    )
    .bind(&position_id)
    .bind(&request.account)
    .bind((request.amount * 1_000_000.0).round() as i64)
    .bind(lock_period_days as i32)
    .bind(unlock_timestamp as i64)
    .execute(pool)
    .await;
    
    // ✅ FIX: Persist updated balance to database using direct SQL
    let dyo_i64 = (new_dyo_balance * 1_000_000.0).round() as i64;
    let dys_i64 = (token_balance.dys * 1_000_000.0).round() as i64;
    let staked_i64 = (new_staked_balance * 1_000_000.0).round() as i64;
    
    if let Err(e) = sqlx::query(
        "INSERT INTO token_balances (address, dyo_balance, dys_balance, staked_balance, updated_at) 
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (address) DO UPDATE SET
         dyo_balance = $2, dys_balance = $3, staked_balance = $4, updated_at = NOW()"
    )
    .bind(&request.account)
    .bind(dyo_i64)
    .bind(dys_i64)
    .bind(staked_i64)
    .execute(pool)
    .await {
        tracing::error!("Failed to persist staked balance to database: {}", e);
        return Ok(Json(StakeResponse {
            success: false,
            message: format!("Failed to update balance in database: {}", e),
            tx_hash: None,
            new_balance: None,
        }));
    }
    
    let tx_hash = format!("STAKE_{}_{}", request.account, SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs());
    
    tracing::info!("🏦 Staked {} DYO for user {} (new balance: {:.2} DYO, staked: {:.2} DYO)", 
                   request.amount, request.account, new_dyo_balance, new_staked_balance);
    
    Ok(Json(StakeResponse {
        success: true,
        message: format!("Successfully staked {} DYO tokens", request.amount),
        tx_hash: Some(tx_hash),
        new_balance: Some(new_dyo_balance),
    }))
}

async fn simple_unstake_handler(
    State(state): State<AppState>,
    Json(request): Json<ServerUnstakeRequest>,
) -> Result<Json<StakeResponse>, StatusCode> {
    // ✅ FIX: Get balance from database and check staking positions
    let pool = &state.storage.pool;
    let current_timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    
    // Get current token balance
    let token_balance = {
        let result = sqlx::query_as::<_, (i64, i64, i64)>(
            "SELECT dyo_balance, dys_balance, staked_balance FROM token_balances WHERE address = $1"
        )
        .bind(&request.account)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get token balance from database: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        
        match result {
            Some((dyo_balance, dys_balance, staked_balance)) => {
                TokenBalance {
                    dyo: dyo_balance as f64 / 1_000_000.0,
                    dys: dys_balance as f64 / 1_000_000.0,
                    staked: staked_balance as f64 / 1_000_000.0,
                    total: (dyo_balance + dys_balance + staked_balance) as f64 / 1_000_000.0,
                }
            },
            None => TokenBalance {
                dyo: 0.0,
                dys: 0.0,
                staked: 0.0,
                total: 0.0,
            },
        }
    };
    
    // Check if user has enough staked
    if token_balance.staked < request.amount {
        return Ok(Json(StakeResponse {
            success: false,
            message: format!("Insufficient staked balance. Available: {:.2} DYO, Required: {:.2} DYO", 
                            token_balance.staked, request.amount),
            tx_hash: None,
            new_balance: None,
        }));
    }
    
    // Check if lock period has passed (get oldest staking position)
    let unlockable_amount: Option<(String, i64)> = sqlx::query_as(
        "SELECT position_id, amount FROM staking_positions 
         WHERE user_address = $1 AND unlock_timestamp <= $2 
         ORDER BY unlock_timestamp ASC LIMIT 1"
    )
    .bind(&request.account)
    .bind(current_timestamp as i64)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to check staking positions: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    if unlockable_amount.is_none() {
        // Check when the earliest position unlocks
        let earliest_unlock: Option<i64> = sqlx::query_scalar(
            "SELECT MIN(unlock_timestamp) FROM staking_positions WHERE user_address = $1"
        )
        .bind(&request.account)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();
        
        if let Some(unlock_time) = earliest_unlock {
            let days_remaining = ((unlock_time as u64 - current_timestamp) / (24 * 3600)) as f64;
            return Ok(Json(StakeResponse {
                success: false,
                message: format!("Staking lock period not expired. Unlocks in {:.1} days", days_remaining),
                tx_hash: None,
                new_balance: None,
            }));
        }
    }
    
    // Update balance: unstake tokens
    let new_dyo_balance = token_balance.dyo + request.amount;
    let new_staked_balance = token_balance.staked - request.amount;
    
    let dyo_i64 = (new_dyo_balance * 1_000_000.0).round() as i64;
    let dys_i64 = (token_balance.dys * 1_000_000.0).round() as i64;
    let staked_i64 = (new_staked_balance * 1_000_000.0).round() as i64;
    
    if let Err(e) = sqlx::query(
        "INSERT INTO token_balances (address, dyo_balance, dys_balance, staked_balance, updated_at) 
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (address) DO UPDATE SET
         dyo_balance = $2, dys_balance = $3, staked_balance = $4, updated_at = NOW()"
    )
    .bind(&request.account)
    .bind(dyo_i64)
    .bind(dys_i64)
    .bind(staked_i64)
    .execute(pool)
    .await {
        tracing::error!("Failed to update balance: {}", e);
        return Ok(Json(StakeResponse {
            success: false,
            message: format!("Failed to update balance: {}", e),
            tx_hash: None,
            new_balance: None,
        }));
    }
    
    // Remove or update staking position if fully unstaked
    if let Some((position_id, position_amount)) = unlockable_amount {
        let request_amount_micro = (request.amount * 1_000_000.0).round() as i64;
        if position_amount <= request_amount_micro {
            // Fully unstake this position
            let _ = sqlx::query("DELETE FROM staking_positions WHERE position_id = $1")
                .bind(&position_id)
                .execute(pool)
                .await;
        } else {
            // Partially unstake
            let _ = sqlx::query("UPDATE staking_positions SET amount = amount - $1 WHERE position_id = $2")
                .bind(request_amount_micro)
                .bind(&position_id)
                .execute(pool)
                .await;
        }
    }
    
    let tx_hash = format!("UNSTAKE_{}_{}", request.account, current_timestamp);
    
    tracing::info!("🏦 Unstaked {} DYO for user {} (new balance: {:.2} DYO)", 
                   request.amount, request.account, new_dyo_balance);
    
    Ok(Json(StakeResponse {
        success: true,
        message: format!("Successfully unstaked {} DYO tokens", request.amount),
        tx_hash: Some(tx_hash),
        new_balance: Some(new_dyo_balance),
    }))
}

// DEX handlers
async fn execute_swap(
    State(state): State<AppState>,
    Json(request): Json<SwapRequest>,
) -> Result<Json<SwapResponse>, StatusCode> {
    // ✅ FIX: Get balance from database (source of truth) instead of in-memory HashMap
    let token_balance = {
        let pool = &state.storage.pool;
        let result = sqlx::query_as::<_, (i64, i64, i64)>(
            "SELECT dyo_balance, dys_balance, staked_balance FROM token_balances WHERE address = $1"
        )
        .bind(&request.user)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get token balance from database: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        
        match result {
            Some((dyo_balance, dys_balance, staked_balance)) => {
                // Convert from micro-DYO (1_000_000 = 1 DYO) to DYO
                TokenBalance {
                    dyo: dyo_balance as f64 / 1_000_000.0,
                    dys: dys_balance as f64 / 1_000_000.0,
                    staked: staked_balance as f64 / 1_000_000.0,
                    total: (dyo_balance + dys_balance + staked_balance) as f64 / 1_000_000.0,
                }
            },
            None => TokenBalance {
                dyo: 0.0,
                dys: 0.0,
                staked: 0.0,
                total: 0.0,
            },
        }
    };
    
    // Determine which token balance to check based on 'from' token
    let available_balance = if request.from == "DYO" || request.from == "XWV" {
        token_balance.dyo
    } else if request.from == "DYS" || request.from == "USXWV" {
        token_balance.dys
    } else {
        return Ok(Json(SwapResponse {
            success: false,
            message: format!("Invalid token type: {}", request.from),
            tx_hash: None,
            amount_received: None,
            price_impact: None,
        }));
    };
    
    // Check if user has sufficient balance
    if available_balance < request.amount {
        return Ok(Json(SwapResponse {
            success: false,
            message: format!("Insufficient balance. Available: {:.2} {}, Required: {:.2} {}", 
                            available_balance, request.from, request.amount, request.from),
            tx_hash: None,
            amount_received: None,
            price_impact: None,
        }));
    }
    
    // Convert to DEX types
    let dex_request = crate::dex::SwapRequest {
        from: request.from.clone(),
        to: request.to.clone(),
        amount: request.amount,
        min_received: request.min_received,
        user: request.user.clone(),
    };
    
    // Execute swap in DEX (release lock immediately)
    let swap_result = {
        let mut dex = state.dex.lock().unwrap();
        dex.execute_swap(dex_request)
    };
    
    match swap_result {
        Ok(swap_response) => {
            // ✅ FIX: Update balance directly in database (not in-memory HashMap)
            let amount_received = swap_response.amount_received.unwrap_or(0.0);
            
            // Calculate new balances
            let mut new_balance = token_balance.clone();
            if request.from == "DYO" || request.from == "XWV" {
                new_balance.dyo -= request.amount;
            } else if request.from == "DYS" || request.from == "USXWV" {
                new_balance.dys -= request.amount;
            }
            
            if request.to == "DYO" || request.to == "XWV" {
                new_balance.dyo += amount_received;
            } else if request.to == "DYS" || request.to == "USXWV" {
                new_balance.dys += amount_received;
            }
            
            new_balance.total = new_balance.dyo + new_balance.dys + new_balance.staked;

            // Persist DEX transaction to PostgreSQL
            if let Some(tx_hash) = &swap_response.tx_hash {
                let pool_id = format!("{}_{}", request.from, request.to);
                if let Err(e) = state.storage.save_dex_transaction(
                    tx_hash,
                    &request.user,
                    "DEX_CONTRACT",
                    request.amount as i64,
                    amount_received as i64,
                    &pool_id,
                    "swap"
                ).await {
                    tracing::warn!("⚠️  Failed to save DEX transaction to DB: {}", e);
                } else {
                    tracing::info!("✅ DEX transaction saved to DB: {}", tx_hash);
                }

                // ✅ FIX: Update balances in PostgreSQL using direct SQL
                let pool = &state.storage.pool;
                let dyo_i64 = (new_balance.dyo * 1_000_000.0).round() as i64;
                let dys_i64 = (new_balance.dys * 1_000_000.0).round() as i64;
                let staked_i64 = (new_balance.staked * 1_000_000.0).round() as i64;
                
                if let Err(e) = sqlx::query(
                    "INSERT INTO token_balances (address, dyo_balance, dys_balance, staked_balance, updated_at) 
                     VALUES ($1, $2, $3, $4, NOW())
                     ON CONFLICT (address) DO UPDATE SET
                     dyo_balance = $2, dys_balance = $3, staked_balance = $4, updated_at = NOW()"
                )
                .bind(&request.user)
                .bind(dyo_i64)
                .bind(dys_i64)
                .bind(staked_i64)
                .execute(pool)
                .await {
                    tracing::error!("⚠️  Failed to update balance in DB: {}", e);
                    return Ok(Json(SwapResponse {
                        success: false,
                        message: format!("Swap executed but failed to update balance: {}", e),
                        tx_hash: swap_response.tx_hash.clone(),
                        amount_received: Some(amount_received),
                        price_impact: swap_response.price_impact,
                    }));
                }
            }
            
            // Convert DEX response to server response
            let server_response = SwapResponse {
                success: swap_response.success,
                message: swap_response.message,
                tx_hash: swap_response.tx_hash,
                amount_received: swap_response.amount_received,
                price_impact: swap_response.price_impact,
            };
            Ok(Json(server_response))
        }
        Err(e) => {
            Ok(Json(SwapResponse {
                success: false,
                message: e,
                tx_hash: None,
                amount_received: None,
                price_impact: None,
            }))
        }
    }
}

async fn add_liquidity(
    State(state): State<AppState>,
    Json(request): Json<LiquidityRequest>,
) -> Result<Json<LiquidityResponse>, StatusCode> {
    // Check if user has sufficient balances for both tokens
    if request.amounts.len() != 2 {
        return Ok(Json(LiquidityResponse {
            success: false,
            message: "Must provide exactly 2 amounts".to_string(),
            tx_hash: None,
            lp_tokens_minted: None,
        }));
    }
    
    let amount_a = request.amounts[0];
    let amount_b = request.amounts[1];
    
    // Check balances (release lock immediately)
    let (has_balance_a, has_balance_b) = {
        let token = state.token.lock().unwrap();
        (token.has_balance(&request.user, amount_a), token.has_balance(&request.user, amount_b))
    };
    
    // For simplicity, we'll assume the pool uses DUJYO and USDC
    // In a real implementation, you'd get the token types from the pool
    if !has_balance_a {
        return Ok(Json(LiquidityResponse {
            success: false,
            message: "Insufficient balance for token A".to_string(),
            tx_hash: None,
            lp_tokens_minted: None,
        }));
    }
    
    if !has_balance_b {
        return Ok(Json(LiquidityResponse {
            success: false,
            message: "Insufficient balance for token B".to_string(),
            tx_hash: None,
            lp_tokens_minted: None,
        }));
    }
    
    // Convert to DEX types
    // Get pool info first to extract token_a and token_b
    let pool_info = match {
        let dex = state.dex.lock().unwrap();
        dex.pools.get(&request.pool_id).cloned()
    } {
        Some(pool) => pool,
        None => {
            return Ok(Json(LiquidityResponse {
                success: false,
                message: "Pool not found".to_string(),
                tx_hash: None,
                lp_tokens_minted: None,
            }));
        }
    };
    
    let dex_request = crate::dex::LiquidityRequest {
        token_a: pool_info.token_a.clone(),
        token_b: pool_info.token_b.clone(),
        amount_a: request.amounts.get(0).copied().unwrap_or(0.0),
        amount_b: request.amounts.get(1).copied().unwrap_or(0.0),
        user: request.user.clone(),
    };
    
    // Execute liquidity addition in DEX (release lock immediately)
    let liquidity_result = {
        let mut dex = state.dex.lock().unwrap();
        dex.add_liquidity(dex_request)
    };
    
    match liquidity_result {
        Ok(liquidity_response) => {
            // Deduct tokens from user (release lock immediately)
            let transfer_a_result = {
                let mut token = state.token.lock().unwrap();
                token.transfer(&request.user, "DEX_CONTRACT", amount_a, "")
            };
            
            if let Err(e) = transfer_a_result {
                return Ok(Json(LiquidityResponse {
                    success: false,
                    message: format!("Failed to deduct token A: {}", e),
                    tx_hash: None,
                    lp_tokens_minted: None,
                }));
            }
            
            let transfer_b_result = {
                let mut token = state.token.lock().unwrap();
                token.transfer(&request.user, "DEX_CONTRACT", amount_b, "")
            };
            
            if let Err(e) = transfer_b_result {
                return Ok(Json(LiquidityResponse {
                    success: false,
                    message: format!("Failed to deduct token B: {}", e),
                    tx_hash: None,
                    lp_tokens_minted: None,
                }));
            }

            // Persist liquidity transaction to PostgreSQL
            if let Some(tx_hash) = &liquidity_response.tx_hash {
                if let Err(e) = state.storage.save_dex_transaction(
                    tx_hash,
                    &request.user,
                    "DEX_CONTRACT",
                    (amount_a + amount_b) as i64,
                    0, // No output amount for liquidity
                    &request.pool_id,
                    "liquidity_add"
                ).await {
                    println!("⚠️  Failed to save liquidity transaction to DB: {}", e);
                } else {
                    println!("✅ Liquidity transaction saved to DB: {}", tx_hash);
                }

                // Save liquidity position
                if let Some(lp_tokens) = liquidity_response.lp_tokens_minted {
                    let position_id = format!("{}_{}", request.user, request.pool_id);
                    if let Err(e) = state.storage.save_liquidity_position(
                        &position_id,
                        &request.user,
                        &request.pool_id,
                        lp_tokens as i64
                    ).await {
                        println!("Failed to save liquidity position to DB: {}", e);
                    } else {
                        println!("Liquidity position saved to DB: {}", position_id);
                    }
                }

                // Update balances in PostgreSQL
                let current_balance = {
                    let token = state.token.lock().unwrap();
                    token.balance_of(&request.user) as u64
                };
                
                if let Err(e) = state.storage.update_balance(&request.user, current_balance).await {
                    println!("⚠️  Failed to update balance in DB: {}", e);
                }
            }
            
            // Convert DEX response to server response
            let server_response = LiquidityResponse {
                success: liquidity_response.success,
                message: liquidity_response.message,
                tx_hash: liquidity_response.tx_hash,
                lp_tokens_minted: liquidity_response.lp_tokens_minted,
            };
            Ok(Json(server_response))
        }
        Err(e) => {
            Ok(Json(LiquidityResponse {
                success: false,
                message: e,
                tx_hash: None,
                lp_tokens_minted: None,
            }))
        }
    }
}

// Wallet handlers
async fn connect_wallet(
    Json(request): Json<ConnectWalletRequest>,
) -> Result<Json<ConnectWalletResponse>, StatusCode> {
    match wallet_handlers::connect_wallet(request).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            println!("Error connecting wallet: {}", e);
            Err(StatusCode::BAD_REQUEST)
        }
    }
}

async fn get_wallet_session(
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<WalletSession>, StatusCode> {
    let session_id = params.get("session_id")
        .ok_or(StatusCode::BAD_REQUEST)?;
    
    match wallet_handlers::get_wallet_session(session_id.clone()).await {
        Ok(session) => Ok(Json(session)),
        Err(e) => {
            println!("Error getting wallet session: {}", e);
            Err(StatusCode::NOT_FOUND)
        }
    }
}

async fn disconnect_wallet(
    Json(request): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let session_id = request.get("session_id")
        .and_then(|v| v.as_str())
        .ok_or(StatusCode::BAD_REQUEST)?;
    
    match wallet_handlers::disconnect_wallet(session_id.to_string()).await {
        Ok(message) => Ok(Json(serde_json::json!({
            "success": true,
            "message": message
        }))),
        Err(e) => {
            println!("Error disconnecting wallet: {}", e);
            Err(StatusCode::BAD_REQUEST)
        }
    }
}

// Metrics handler (requires AppState)
async fn get_metrics_handler(
    State(state): State<AppState>,
) -> Result<Json<metrics::MetricsResponse>, StatusCode> {
    use std::sync::atomic::Ordering;
    use metrics::{TRANSACTION_SUCCESS, TRANSACTION_FAILED, RATE_LIMIT_HITS, REDIS_QUERIES, REDIS_QUERY_TIME_MS};
    
    let successful = TRANSACTION_SUCCESS.load(Ordering::Relaxed);
    let failed = TRANSACTION_FAILED.load(Ordering::Relaxed);
    let total = successful + failed;
    let success_rate = if total > 0 {
        (successful as f64 / total as f64) * 100.0
    } else {
        0.0
    };
    
    let rate_limit_hits = RATE_LIMIT_HITS.load(Ordering::Relaxed);
    
    // Check Redis availability if pool exists
    let (redis_queries, avg_response_time_ms, redis_available) = if let Some(redis_pool) = &state.redis_pool {
        let queries = REDIS_QUERIES.load(Ordering::Relaxed);
        let total_time = REDIS_QUERY_TIME_MS.load(Ordering::Relaxed);
        let avg_time = if queries > 0 {
            total_time as f64 / queries as f64
        } else {
            0.0
        };
        
        // Test connection
        let available = {
            let start = std::time::Instant::now();
            match redis_pool.get().await {
                Ok(mut conn) => {
                    let result: Result<String, _> = bb8_redis::redis::cmd("PING")
                        .query_async(&mut *conn)
                        .await;
                    let elapsed = start.elapsed().as_millis() as u64;
                    REDIS_QUERIES.fetch_add(1, Ordering::Relaxed);
                    REDIS_QUERY_TIME_MS.fetch_add(elapsed, Ordering::Relaxed);
                    result.is_ok()
                }
                Err(_) => false,
            }
        };
        
        (queries, avg_time, available)
    } else {
        let queries = REDIS_QUERIES.load(Ordering::Relaxed);
        let total_time = REDIS_QUERY_TIME_MS.load(Ordering::Relaxed);
        let avg_time = if queries > 0 {
            total_time as f64 / queries as f64
        } else {
            0.0
        };
        (queries, avg_time, false)
    };
    
    Ok(Json(metrics::MetricsResponse {
        transactions: metrics::TransactionMetrics {
            successful,
            failed,
            total,
            success_rate,
        },
        rate_limiting: metrics::RateLimitMetrics {
            hits: rate_limit_hits,
        },
        redis: metrics::RedisMetrics {
            queries: redis_queries,
            avg_response_time_ms,
            available: redis_available,
        },
    }))
}

// Create the router
pub fn create_router(state: AppState) -> Router {
    let jwt_config = state.jwt_config.clone();
    
    // ✅ CRITICAL FIX: Simple handler to serve static files from uploads directory
    // This handler is called BEFORE any middleware, so it should always work
    async fn serve_uploads_handler_simple(
        axum::extract::Path(file_path): axum::extract::Path<String>,
    ) -> Result<axum::response::Response<axum::body::Body>, StatusCode> {
        use axum::body::Body;
        use axum::http::{header, Response};
        use std::path::Path as StdPath;
        use tokio::fs;

        // ✅ CRITICAL FIX: Remove query parameters from file_path if present
        // The path extractor might include query params, we need to strip them
        let clean_path = file_path.split('?').next().unwrap_or(&file_path).to_string();
        
        eprintln!("🔍🔍🔍 [serve_uploads] HANDLER CALLED - Requested path: {}", clean_path);
        eprintln!("🔍 [serve_uploads] Full URI would be: /uploads/{}", clean_path);

        // Security: Prevent path traversal
        if clean_path.contains("..") {
            eprintln!("❌ [serve_uploads] Path traversal detected: {}", clean_path);
            return Err(StatusCode::BAD_REQUEST);
        }

        // Build full path - try multiple variations
        let paths_to_try = vec![
            format!("uploads/{}", clean_path),
            format!("./uploads/{}", clean_path),
            format!("dujyo-backend/uploads/{}", clean_path),
        ];
        
        eprintln!("🔍 [serve_uploads] Trying paths: {:?}", paths_to_try);

        // Find the first path that exists
        let mut actual_path = None;
        for path in &paths_to_try {
            if StdPath::new(path).exists() {
                actual_path = Some(path.clone());
                eprintln!("✅ [serve_uploads] Found file at: {}", path);
                break;
            }
        }

        let full_path = match actual_path {
            Some(path) => path,
            None => {
                eprintln!("❌ [serve_uploads] File not found. Tried: {:?}", paths_to_try);
                eprintln!("❌ [serve_uploads] Current working directory: {:?}", std::env::current_dir());
                return Err(StatusCode::NOT_FOUND);
            }
        };

        // Read file
        let file_content = fs::read(&full_path).await.map_err(|e| {
            eprintln!("❌ [serve_uploads] Error reading file {}: {}", full_path, e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        // Determine content type (use clean_path without query params)
        // Use lowercase comparison to handle case-insensitive extensions
        let clean_path_lower = clean_path.to_lowercase();
        let content_type = if clean_path_lower.ends_with(".jpg") || clean_path_lower.ends_with(".jpeg") {
            "image/jpeg"
        } else if clean_path_lower.ends_with(".png") {
            "image/png"
        } else if clean_path_lower.ends_with(".gif") {
            "image/gif"
        } else if clean_path_lower.ends_with(".webp") {
            "image/webp"
        } else if clean_path_lower.ends_with(".svg") {
            "image/svg+xml" // ✅ FIX: Correct content-type for SVG files
        } else if clean_path_lower.ends_with(".mp3") {
            "audio/mpeg" // ✅ FIX: Correct content-type for MP3 files
        } else if clean_path_lower.ends_with(".wav") {
            "audio/wav" // ✅ FIX: Correct content-type for WAV files
        } else if clean_path_lower.ends_with(".m4a") {
            "audio/mp4" // ✅ FIX: Correct content-type for M4A files
        } else {
            "application/octet-stream"
        };
        
        eprintln!("🔍 [serve_uploads] Content-Type determined: {} for path: {}", content_type, clean_path);

        eprintln!("✅✅✅ [serve_uploads] SUCCESS - Serving file: {} ({} bytes, type: {})", full_path, file_content.len(), content_type);

        Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, content_type)
            .header(header::CACHE_CONTROL, "public, max-age=31536000")
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .header(header::ACCESS_CONTROL_ALLOW_METHODS, "GET, OPTIONS, HEAD")
            .header(header::ACCESS_CONTROL_ALLOW_HEADERS, "*")
            .header(header::ACCESS_CONTROL_EXPOSE_HEADERS, "*")
            .header(header::CONTENT_LENGTH, file_content.len().to_string())
            .body(Body::from(file_content))
            .map_err(|e| {
                eprintln!("❌ [serve_uploads] Error building response: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })
    }

    // Handler to serve static files from uploads directory (old version, kept for reference)
    async fn serve_uploads_handler_old(
        Path(file_path): Path<String>,
    ) -> Result<axum::response::Response<axum::body::Body>, StatusCode> {
        use axum::body::Body;
        use axum::http::{header, Response};
        use std::path::Path as StdPath;
        use tokio::fs;

        eprintln!("🔍 [serve_uploads] Requested file path: {}", file_path);

        // Security: Prevent path traversal
        if file_path.contains("..") {
            eprintln!("❌ [serve_uploads] Path traversal detected: {}", file_path);
            return Err(StatusCode::BAD_REQUEST);
        }

        // The path comes after /uploads/, so we need to prepend "uploads/"
        // Try both relative and absolute paths
        let full_path = format!("uploads/{}", file_path);
        let alt_path = format!("./uploads/{}", file_path);
        
        eprintln!("🔍 [serve_uploads] Trying paths: {} and {}", full_path, alt_path);
        
        // Security: Only allow files from uploads directory (double check)
        if file_path.contains("/..") || file_path.starts_with("../") {
            eprintln!("❌ [serve_uploads] Invalid path format: {}", file_path);
            return Err(StatusCode::BAD_REQUEST);
        }

        // Check if file exists (try both paths)
        let actual_path = if StdPath::new(&full_path).exists() {
            full_path
        } else if StdPath::new(&alt_path).exists() {
            alt_path
        } else {
            eprintln!("File not found. Tried: {} and {}", full_path, alt_path);
            eprintln!("Current working directory: {:?}", std::env::current_dir());
            return Err(StatusCode::NOT_FOUND);
        };

        // Read file
        let file_content = fs::read(&actual_path)
            .await
            .map_err(|e| {
                eprintln!("❌ Error reading file {}: {}", actual_path, e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

        // Determine content type from extension
        let content_type = if file_path.ends_with(".jpg") || file_path.ends_with(".jpeg") {
            "image/jpeg"
        } else if file_path.ends_with(".png") {
            "image/png"
        } else if file_path.ends_with(".gif") {
            "image/gif"
        } else if file_path.ends_with(".webp") {
            "image/webp"
        } else if file_path.ends_with(".mp4") {
            "video/mp4"
        } else if file_path.ends_with(".mp3") {
            "audio/mpeg"
        } else {
            "application/octet-stream"
        };

        let response = Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, content_type)
            .header(header::CACHE_CONTROL, "public, max-age=31536000")
            .body(Body::from(file_content))
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok(response)
    }

    // ✅✅✅ CRITICAL FIX: Static files route MUST be in public_routes BEFORE rate limiting
    // This ensures it's processed BEFORE any rate limiting middleware
    let public_routes = Router::new()
        // ✅ STATIC FILES FIRST - no rate limiting will be applied to this route
        .route("/uploads/*path", get(serve_uploads_handler_simple))
        // Other public routes
        .merge(health::health_routes()) // ✅ Health check routes (public) - MOVED HERE
        .route("/blocks", get(get_blocks))
        .route("/balance/:address", get(get_balance))
        .route("/balance-detail/:address", get(get_balance_detail))
        .route("/tokens/:address", get(get_tokens_by_owner))
        .route("/transactions/:address", get(get_transaction_history))
        .route("/pool/:id", get(get_pool))
        .route("/ws", get(websocket_handler))
        .route("/login", post(login_handler))
        .route("/register", post(crate::auth::register_handler))
        .route("/api/v1/auth/refresh", post(crate::auth::refresh_token_handler)) // ✅ Refresh token endpoint
        .route("/api/v1/auth/google", post(crate::routes::oauth::google_oauth_handler))
        .route("/api/v1/auth/apple", post(crate::routes::oauth::apple_oauth_handler))
        .route("/api/wallet/connect", post(connect_wallet))
        .route("/api/wallet/session", get(get_wallet_session))
        .route("/api/wallet/disconnect", post(disconnect_wallet))
        .route("/api/v1/metrics", get(get_metrics_handler)) // ✅ MVP-CRITICAL: Métricas endpoint directo
        .route("/api/videos", get(upload::list_videos_handler)) // ✅ Public videos endpoint (no auth required)
        .route("/api/v1/content/public", get(upload::list_public_content_handler)) // ✅ Public content endpoint (no auth required)
        .route("/api/v1/content/:content_id", get(upload::get_content_detail_handler)) // ✅ Public endpoint to get content details (for tip functionality)
        .nest("/api/v1/search", search::search_routes_public()) // ✅ Public search routes (no auth required)
        .nest("/api/v1/s2e", s2e_config::s2e_config_routes()) // ✅ S2E Configuration endpoint (PUBLIC - no auth required)
        .nest("/api/v1/s2e", s2e_dashboard::s2e_dashboard_routes()) // ✅ S2E Dashboard endpoint (PUBLIC - no auth required)
        .nest("/api/v1/s2e", s2e_user::s2e_user_routes()) // ✅ S2E User stats endpoint (PUBLIC - no auth required)
        .nest("/api/v1/monitoring", monitoring::monitoring_routes()); // ✅ Monitoring and health check (PUBLIC)
    
    // Protected routes (require JWT authentication)
    // IMPORTANT: Apply middleware AFTER nesting routes so Axum can find them first
    let protected_routes = Router::new()
        .route("/transaction", post(submit_transaction))
        .route("/mint", post(mint_tokens))
        .route("/swap", post(execute_swap))
        .route("/stake", post(simple_stake_handler))
        .route("/unstake", post(simple_unstake_handler))
        .route("/liquidity/add", post(add_liquidity))
        // Stream-earn is handled by stream_earn_routes
        .nest("/api/v1/user", user::user_routes()) // ✅ User routes (become-artist, get type)
        .nest("/api/v1/onboarding", onboarding::onboarding_routes()) // ✅ ONBOARDING EXTENSION: Onboarding routes
        .nest("/api/v1/stream-earn", stream_earn::stream_earn_routes()) // ✅ STREAM-EARN: Core functionality
        // ✅ NEW: Earnings endpoints for frontend WalletDashboard (use real data from stream_logs)
        // ✅ NEW: Earnings endpoints for frontend WalletDashboard (use real data from stream_logs)
        .route("/api/earnings/user/:address", get(get_user_earnings_handler))
        .route("/api/earnings/artist/:address", get(get_artist_earnings_handler))
        .route("/api/earnings/history/:address", get(get_earnings_history_handler))
        .route("/api/earnings/predictions/:address", get(get_earnings_predictions_handler))
        .nest("/api/v1/s2e", s2e_beta::s2e_beta_routes()) // ✅ S2E Beta access routes
        .nest("/api/v1/s2e", s2e_admin::s2e_admin_routes()) // ✅ S2E Admin panel routes
        // Note: /api/v1/s2e/config is in public_routes (no auth required)
        .nest("/api/v1/analytics", analytics::analytics_routes()) // ✅ Analytics routes
        .nest("/api/v1/royalties", royalties::royalties_routes()) // ✅ Royalties routes
        // Note: /api/v1/content/public and /api/v1/search are in public_routes
        .nest("/api/v1/content", upload::content_routes()) // ✅ Content routes (from upload module) - protected routes like /artist/{id}
        .nest("/api/v1/upload", upload::upload_routes()) // ✅ Upload routes
        .nest("/api/tips", upload::tips_routes()) // ✅ Tips routes (/api/tips/artist/:artistId/stats)
        .nest("/api/v1/playlists", playlists::playlist_routes()) // ✅ Playlists routes
        // Note: /api/v1/search is in public_routes for public access
        .nest("/api/v1/recommendations", recommendations::recommendations_routes()) // ✅ Recommendations routes
        .nest("/api/v1/users", follows::follow_routes()) // ✅ Follow/Unfollow routes
        .nest("/api/v1/content", comments::comment_routes()) // ✅ Comments routes
        .nest("/api/v1/content", reviews::review_routes()) // ✅ Reviews routes
        .nest("/api/v1/notifications", notifications::notification_routes()) // ✅ Notifications routes
        .nest("/api/v1/users", user_stats::user_stats_routes()) // ✅ User stats routes
        .nest("/api/v1/premium", premium::premium_routes()) // ✅ Premium routes
        .nest("/api/v1/achievements", achievements::achievement_routes()) // ✅ Achievements routes
        .nest("/api/v1/trending", trending::trending_routes()) // ✅ Trending routes
        .nest("/api/v1/dex", dex::dex_routes()) // ✅ DEX routes
        .nest("/api/v1/nfts", nfts::nft_routes()) // ✅ NFT routes
        .nest("/api/v1/stripe", crate::routes::stripe::stripe_routes()) // ✅ Stripe (test) routes
        .nest("/api/v1/payments", crate::routes::payout::payout_routes()); // ✅ Simple payout route (MVP)
    
    // ✅ MVP-CRITICAL: Setup Redis rate limiting middleware
    use crate::security::rate_limiter_memory::RateLimitConfig;
    let rate_limit_state = RedisRateLimitState {
        redis_pool: state.redis_pool.clone(),
        memory_limiter: Arc::new(RateLimiter::new(RateLimitConfig::default())),
        rules: Arc::new(RateLimitRules::default()),
    };
    
    // ✅ MVP-CRITICAL: Aplicar rate limiting a rutas públicas y protegidas
    // El rate limiting middleware SKIPEA /uploads/ paths (ver rate_limiting.rs línea 139)
    let public_routes_with_rate_limit = public_routes
        .layer(axum::middleware::from_fn_with_state(
            rate_limit_state.clone(),
            redis_rate_limiting_middleware,
        ));
    
    // ✅ FIX: Use .layer() instead of .route_layer() to apply to nested routes
    // .route_layer() only applies to routes defined directly, not nested routes
    // .layer() applies to all routes including nested ones via .nest()
    // ✅ MVP-CRITICAL: Apply rate limiting to protected routes as well
    let protected_routes_with_rate_limit = protected_routes
        .layer(axum::middleware::from_fn_with_state(
            jwt_config,
            jwt_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            rate_limit_state.clone(),
            redis_rate_limiting_middleware,
        ));
    
    // ✅✅✅ DEBUG MIDDLEWARE: Log ALL requests and responses to find 403 culprit
    async fn global_debug_middleware(
        request: Request<axum::body::Body>,
        next: Next,
    ) -> Response {
        let path = request.uri().path().to_string();
        let method = request.method().to_string();
        let full_uri = request.uri().to_string();
        
        // Log Content-Type header for multipart requests (clone before moving request)
        let content_type = request.headers().get(axum::http::header::CONTENT_TYPE)
            .and_then(|h| h.to_str().ok())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "none".to_string());
        
        eprintln!("🔍🔍🔍 [GLOBAL_DEBUG] INCOMING: {} {} (uri: {})", method, path, full_uri);
        eprintln!("🔍 [GLOBAL_DEBUG] Content-Type: {}", content_type);
        
        // Check if this is an /uploads/ path
        if path.starts_with("/uploads/") {
            eprintln!("🔍🔍🔍 [GLOBAL_DEBUG] UPLOADS PATH DETECTED - should NOT be blocked!");
        }
        
        // Check if this is an upload request
        if path.contains("/upload") && method == "POST" {
            eprintln!("🔍🔍🔍 [GLOBAL_DEBUG] UPLOAD REQUEST DETECTED!");
            eprintln!("🔍 [GLOBAL_DEBUG] Content-Type for upload: {}", content_type);
            if !content_type.starts_with("multipart/form-data") {
                eprintln!("⚠️⚠️⚠️ [GLOBAL_DEBUG] WARNING: Upload request without multipart/form-data Content-Type!");
            }
        }
        
        let response = next.run(request).await;
        let status = response.status();
        
        eprintln!("🔍🔍🔍 [GLOBAL_DEBUG] RESPONSE: {} {} -> Status: {} ({})", method, path, status, status.as_u16());
        
        // If it's 400 or 403, log ALL details
        if status == StatusCode::BAD_REQUEST || status == StatusCode::FORBIDDEN {
            eprintln!("🚨🚨🚨 [GLOBAL_DEBUG] {} DETECTED for {} {}", status, method, path);
            eprintln!("🚨 [GLOBAL_DEBUG] Full URI: {}", full_uri);
            eprintln!("🚨 [GLOBAL_DEBUG] Content-Type was: {}", content_type);
        }
        
        response
    }
    
    // Combine public and protected routes
    // The /uploads/*path route in public_routes will be processed FIRST
    // and the rate limiting middleware will skip it (see rate_limiting.rs)
    public_routes_with_rate_limit
        .merge(protected_routes_with_rate_limit)
        // ✅ MVP-CRITICAL: Input validation middleware enabled (regex dependency already in Cargo.toml)
        .layer(axum::middleware::from_fn(input_validation_middleware))
        // ✅✅✅ DEBUG: Apply global debug middleware FIRST to see ALL requests
        .layer(axum::middleware::from_fn(global_debug_middleware))
        // ✅ MVP-CRITICAL: CORS configuration with dynamic origin from environment
        .layer({
            let mut cors = CorsLayer::new();
            
            // Parse CORS_ORIGIN environment variable (supports comma-separated values)
            if let Ok(cors_origin_env) = std::env::var("CORS_ORIGIN") {
                for origin in cors_origin_env.split(',') {
                    let origin = origin.trim();
                    if !origin.is_empty() {
                        if let Ok(header_value) = origin.parse::<HeaderValue>() {
                            cors = cors.allow_origin(header_value);
                            println!("✅ CORS: Added origin from env: {}", origin);
                        } else {
                            eprintln!("⚠️  CORS: Failed to parse origin: {}", origin);
                        }
                    }
                }
            } else {
                // Fallback: add default origins
                if let Ok(header_value) = "https://dujyo.vercel.app".parse::<HeaderValue>() {
                    cors = cors.allow_origin(header_value);
                }
            }
            
            // Always allow these production origins
            if let Ok(header_value) = "https://www.dujyo.com".parse::<HeaderValue>() {
                cors = cors.allow_origin(header_value);
            }
            if let Ok(header_value) = "https://dujyo.com".parse::<HeaderValue>() {
                cors = cors.allow_origin(header_value);
            }
            
            // Allow localhost for development (only if not in production)
            if std::env::var("ENVIRONMENT").unwrap_or_default() != "production" {
                if let Ok(header_value) = "http://localhost:5173".parse::<HeaderValue>() {
                    cors = cors.allow_origin(header_value);
                }
            }
            
            cors.allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
                .allow_headers([AUTHORIZATION, CONTENT_TYPE])
                .allow_credentials(true)
        })
        .with_state(state)
}

// Start the server
pub async fn start_server() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment variables
    dotenv::dotenv().ok();
    
    // Get database URL from environment
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://yare@127.0.0.1:5432/dujyo_blockchain".to_string());
    
    println!("🗄️  Connecting to database: {}", database_url);
    
    // Initialize database storage
    eprintln!("🔧 Creating database connection...");
    let storage: Arc<BlockchainStorage> = Arc::new(BlockchainStorage::new(&database_url).await?);
    eprintln!("🔧 Database connection established, initializing tables...");
    storage.init_tables().await?;
    println!("✅ Database tables initialized");
    
    // Load blockchain from database or create new one
    let blockchain = match storage.load_blockchain().await {
        Ok(loaded_blockchain) => {
            println!("📚 Loaded blockchain from database with {} blocks", loaded_blockchain.chain.len());
            Arc::new(Mutex::new(loaded_blockchain))
        }
        Err(e) => {
            println!(" Could not load blockchain from database: {}", e);
            println!("Creating new blockchain");
            Arc::new(Mutex::new(Blockchain::new()))
        }
    };
    
    let token = Arc::new(Mutex::new(Token::new()));
    let dex = Arc::new(Mutex::new(DEX::new()));
    let websocket_clients = Arc::new(Mutex::new(Vec::new()));
    
    // ✅ FIX: Set JWT_SECRET if not present (for development)
    if std::env::var("JWT_SECRET").is_err() {
        unsafe { std::env::set_var("JWT_SECRET", "dujyo_jwt_secret_key_2024_minimum_32_chars_for_dev") };
        println!("⚠️  JWT_SECRET not set, using default (DEVELOPMENT ONLY)");
    }
    
    let jwt_config = JwtConfig::new()
        .unwrap_or_else(|e| {
            eprintln!("CRITICAL: Failed to initialize JWT config: {}", e);
            eprintln!("Please set JWT_SECRET environment variable (minimum 32 characters)");
            std::process::exit(1);
        });
    
    // ✅ MVP-CRITICAL: Initialize Redis connection pool
    let redis_pool = match create_redis_pool(None).await {
        Ok(pool) => {
            println!("✅ Redis connection pool created successfully");
            Some(Arc::new(pool))
        }
        Err(e) => {
            println!("⚠️  Redis not available: {}. Using in-memory rate limiting.", e);
            None
        }
    };
    
    let state = AppState {
        blockchain: blockchain.clone(),
        token: token.clone(),
        dex: dex.clone(),
        websocket_clients: websocket_clients.clone(),
        storage: storage.clone(),
        jwt_config: jwt_config.clone(),
        redis_pool, // ✅ MVP-CRITICAL: Redis pool for rate limiting
    };
    
    // Start block production task
    let state_for_task = state.clone();
    tokio::spawn(async move {
        block_production_task(state_for_task).await;
    });
    
    // Create router
    let app = create_router(state);
    
    // Start server
    let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("PORT").unwrap_or_else(|_| "8083".to_string()).parse().unwrap_or(8083);
    let bind_addr = format!("{}:{}", host, port);
    let listener = tokio::net::TcpListener::bind(format!("{}:{}", host, port)).await?;
    println!("🚀 Dujyo Blockchain Server starting on http://{}:{}", host, port);
    println!("Available endpoints:");
    println!("   GET  /health - Health check");
    println!("   GET  /blocks - Get blockchain");
    println!("   POST /transaction - Submit transaction");
    println!("   POST /mint - Mint tokens");
    println!("   GET  /balance/{{address}} - Get balance");
    println!("   GET  /pool/{{id}} - Get pool information");
    println!("   POST /swap - Execute token swap (JWT protected)");
    println!("   POST /liquidity/add - Add liquidity (JWT protected)");
    println!("   WS   /ws - WebSocket for real-time updates");
    println!("Block production: every 10 seconds");
    
    axum::serve(listener, app).await?;
    
    Ok(())
}
