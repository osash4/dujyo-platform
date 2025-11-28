use axum::{
    extract::{Path, State, WebSocketUpgrade, Query},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::time;
use chrono::{DateTime, Utc};
use tower_http::cors::CorsLayer;
use futures_util::{sink::SinkExt, stream::StreamExt};
use axum::extract::ws::{Message, WebSocket};
use tracing;
use sqlx::Postgres;
use sqlx::Transaction as SqlxTransaction;

use crate::blockchain::blockchain::{Blockchain, Transaction, Block};
use crate::blockchain::token::Token;
use crate::blockchain::gas_fees::{GasFeeCalculator, NetworkState, UserTier, TransactionType, handle_gas_fee_with_auto_swap};
use crate::storage::BlockchainStorage;
use crate::auth::{JwtConfig, jwt_middleware, login_handler};
use crate::dex::DEX;
use crate::handlers::wallet_handlers::{self, ConnectWalletRequest, ConnectWalletResponse, WalletSession};
use crate::routes::{user, onboarding, stream_earn, analytics, royalties, upload, playlists, search, recommendations, follows, comments, reviews, notifications, user_stats, premium, achievements, trending, dex, nfts, metrics}; // ✅ Import routes
use bb8_redis::{bb8::Pool, RedisConnectionManager};
use crate::redis::create_redis_pool;
use crate::middleware::rate_limiting::{redis_rate_limiting_middleware, RedisRateLimitState, RateLimitRules};
use crate::security::rate_limiter_memory::RateLimiter;
// TODO: Fix middleware dependencies (regex, etc.) before enabling
// use crate::middleware::input_validation::input_validation_middleware;


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
    let blockchain = state.blockchain.lock().unwrap();
    let balance = blockchain.get_balance(&address);
    
    Ok(Json(BalanceResponse {
        address,
        balance,
    }))
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
    // Get legacy balance for available_dyo
    let legacy_balance = state.storage.get_balance(&address).await
        .unwrap_or(0);
    let available_dyo = (legacy_balance as f64) / 100.0; // Convert centavos to DYO
    
    // Get token balances from token system
    let mut token = state.token.lock().unwrap();
    let dyo = token.balance_of(&address);
    
    // For now, return simplified response
    // TODO: Get dys and staked from database when available
    Ok(Json(BalanceDetailResponse {
        address,
        dyo,
        dys: 0.0,
        staked: 0.0,
        total: available_dyo + dyo,
        available_dyo,
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

// DEX handlers
async fn execute_swap(
    State(state): State<AppState>,
    Json(request): Json<SwapRequest>,
) -> Result<Json<SwapResponse>, StatusCode> {
    // Check if user has sufficient balance (release lock immediately)
    let has_balance = {
        let token = state.token.lock().unwrap();
        token.has_balance(&request.user, request.amount)
    };
    
    if !has_balance {
        return Ok(Json(SwapResponse {
            success: false,
            message: "Insufficient balance".to_string(),
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
            // Update token balances (release lock immediately)
            let transfer_result = {
                let mut token = state.token.lock().unwrap();
                token.transfer(&request.user, "DEX_CONTRACT", request.amount, "")
            };
            
            if let Err(e) = transfer_result {
                return Ok(Json(SwapResponse {
                    success: false,
                    message: format!("Failed to deduct balance: {}", e),
                    tx_hash: None,
                    amount_received: None,
                    price_impact: None,
                }));
            }
            
            // Credit the received tokens to user (release lock immediately)
            if let Some(amount_received) = swap_response.amount_received {
                let mint_result = {
                    let mut token = state.token.lock().unwrap();
                    token.mint(&request.user, amount_received)
                };
                
                if let Err(e) = mint_result {
                    return Ok(Json(SwapResponse {
                        success: false,
                        message: format!("Failed to credit received tokens: {}", e),
                        tx_hash: None,
                        amount_received: None,
                        price_impact: None,
                    }));
                }
            }

            // Persist DEX transaction to PostgreSQL
            if let Some(tx_hash) = &swap_response.tx_hash {
                let pool_id = format!("{}_{}", request.from, request.to);
                let amount_received = swap_response.amount_received.unwrap_or(0.0);
                if let Err(e) = state.storage.save_dex_transaction(
                    tx_hash,
                    &request.user,
                    "DEX_CONTRACT",
                    request.amount as i64,
                    amount_received as i64,
                    &pool_id,
                    "swap"
                ).await {
                    println!("⚠️  Failed to save DEX transaction to DB: {}", e);
                } else {
                    println!("✅ DEX transaction saved to DB: {}", tx_hash);
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
    
    // Public routes (no authentication required)
    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/blocks", get(get_blocks))
        .route("/balance/:address", get(get_balance))
        .route("/balance-detail/:address", get(get_balance_detail))
        .route("/tokens/:address", get(get_tokens_by_owner))
        .route("/transactions/:address", get(get_transaction_history))
        .route("/pool/:id", get(get_pool))
        .route("/ws", get(websocket_handler))
        .route("/login", post(login_handler))
        .route("/register", post(crate::auth::register_handler))
        .route("/api/v1/auth/google", post(crate::routes::oauth::google_oauth_handler))
        .route("/api/v1/auth/apple", post(crate::routes::oauth::apple_oauth_handler))
        .route("/api/wallet/connect", post(connect_wallet))
        .route("/api/wallet/session", get(get_wallet_session))
        .route("/api/wallet/disconnect", post(disconnect_wallet))
        .route("/api/v1/metrics", get(get_metrics_handler)); // ✅ MVP-CRITICAL: Métricas endpoint directo
    
    // Protected routes (require JWT authentication)
    // IMPORTANT: Apply middleware AFTER nesting routes so Axum can find them first
    let protected_routes = Router::new()
        .route("/transaction", post(submit_transaction))
        .route("/mint", post(mint_tokens))
        .route("/swap", post(execute_swap))
        .route("/liquidity/add", post(add_liquidity))
        // Stream-earn is handled by stream_earn_routes
        .nest("/api/v1/user", user::user_routes()) // ✅ User routes (become-artist, get type)
        .nest("/api/v1/onboarding", onboarding::onboarding_routes()) // ✅ ONBOARDING EXTENSION: Onboarding routes
        .nest("/api/v1/stream-earn", stream_earn::stream_earn_routes()) // ✅ STREAM-EARN: Core functionality
        .nest("/api/v1/analytics", analytics::analytics_routes()) // ✅ Analytics routes
        .nest("/api/v1/royalties", royalties::royalties_routes()) // ✅ Royalties routes
        .nest("/api/v1/content", upload::content_routes()) // ✅ Content routes (from upload module)
        .nest("/api/v1/upload", upload::upload_routes()) // ✅ Upload routes
        .nest("/api/v1/playlists", playlists::playlist_routes()) // ✅ Playlists routes
        .nest("/api/v1/search", search::search_routes()) // ✅ Search routes
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
        .nest("/api/v1/nfts", nfts::nft_routes()); // ✅ NFT routes
    
    // Apply JWT middleware to protected routes
    let protected_routes = protected_routes
        .route_layer(axum::middleware::from_fn_with_state(
            jwt_config,
            jwt_middleware,
        ));
    
    // ✅ MVP-CRITICAL: Setup Redis rate limiting middleware
    use crate::security::rate_limiter_memory::RateLimitConfig;
    let rate_limit_state = RedisRateLimitState {
        redis_pool: state.redis_pool.clone(),
        memory_limiter: Arc::new(RateLimiter::new(RateLimitConfig::default())),
        rules: Arc::new(RateLimitRules::default()),
    };
    
    // ✅ MVP-CRITICAL: Aplicar rate limiting a rutas públicas y protegidas por separado
    // Esto asegura que el rate limiting se aplique correctamente a todas las rutas
    let public_routes_with_rate_limit = public_routes
        .layer(axum::middleware::from_fn_with_state(
            rate_limit_state.clone(),
            redis_rate_limiting_middleware,
        ));
    
    let protected_routes_with_rate_limit = protected_routes
        .layer(axum::middleware::from_fn_with_state(
            rate_limit_state,
            redis_rate_limiting_middleware,
        ));
    
    // Combine public and protected routes
    public_routes_with_rate_limit
        .merge(protected_routes_with_rate_limit)
        // TODO: Enable input validation middleware after fixing dependencies (regex, etc.)
        // .layer(axum::middleware::from_fn(input_validation_middleware)) // ✅ Input validation middleware applied to all routes
        .layer(
            CorsLayer::new()
                .allow_origin(
                    "https://dujyo.com".parse::<axum::http::HeaderValue>().unwrap_or_else(|_| "*".parse().unwrap())
                )
                .allow_origin(
                    "https://www.dujyo.com".parse::<axum::http::HeaderValue>().unwrap_or_else(|_| "*".parse().unwrap())
                )
                .allow_origin(
                    "http://localhost:5173".parse::<axum::http::HeaderValue>().unwrap_or_else(|_| "*".parse().unwrap())
                )
                .allow_origin(
                    "http://localhost:3000".parse::<axum::http::HeaderValue>().unwrap_or_else(|_| "*".parse().unwrap())
                )
                .allow_methods([axum::http::Method::GET, axum::http::Method::POST, axum::http::Method::PUT, axum::http::Method::DELETE, axum::http::Method::OPTIONS])
                .allow_headers([
                    axum::http::header::CONTENT_TYPE,
                    axum::http::header::AUTHORIZATION,
                    axum::http::header::ACCEPT,
                ])
                .allow_credentials(true)
        )
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
        std::env::set_var("JWT_SECRET", "dujyo_jwt_secret_key_2024_minimum_32_chars_for_dev");
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
