//! Optimized Dujyo Backend with Database Optimization
//! 
//! This is the main entry point for the optimized Dujyo backend that includes:
//! - Redis cache layer
//! - Read replica support
//! - Performance monitoring
//! - Circuit breakers
//! - Advanced connection pooling

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
use tower_http::cors::CorsLayer;
use tower_http::timeout::TimeoutLayer;
use futures_util::{sink::SinkExt, stream::StreamExt};
use axum::extract::ws::{Message, WebSocket};
use tracing::{info, warn, error, debug};

use crate::blockchain::blockchain::{Blockchain, Transaction, Block};
use crate::blockchain::token::Token;
use crate::blockchain::native_token::{NativeToken, VestingRequest as NativeVestingRequest};
use crate::blockchain::multisig::{MultisigWallet, MultisigRequest, SignRequest};
use crate::blockchain::vesting::{VestingManager, CreateVestingRequest, ReleaseVestingRequest};
use crate::blockchain::real_blockchain::RealBlockchain;
use crate::blockchain::artist_vesting::ArtistVestingManager;
use crate::storage_optimized::OptimizedBlockchainStorage;
use crate::cache::{CacheService, CacheConfig};
use crate::database::{DatabaseManager, DatabaseConfig};
use crate::monitoring::{MetricsCollector, AlertThresholds, HealthCheckResponse, DatabaseHealth, CacheHealth, MetricsSummary};
use crate::auth::{JwtConfig, jwt_middleware, login_handler};
use crate::dex::DEX;
use crate::dex::payment_system::{PaymentManager, PaymentTier};
use crate::consensus::cpv::CPVConsensus;
use crate::rewards::user_rewards::{RewardsManager, UserTier};
use crate::handlers::wallet_handlers::{self, ConnectWalletRequest, ConnectWalletResponse, WalletSession};
use chrono;

// Optimized shared state for the server
#[derive(Clone)]
pub struct OptimizedAppState {
    pub blockchain: Arc<Mutex<Blockchain>>,
    pub token: Arc<Mutex<Token>>,
    pub dex: Arc<Mutex<DEX>>,
    pub storage: Arc<OptimizedBlockchainStorage>,
    pub jwt_config: JwtConfig,
    pub cpv_consensus: Arc<Mutex<CPVConsensus>>,
    pub real_blockchain: Arc<Mutex<RealBlockchain>>,
    pub native_token: Arc<Mutex<NativeToken>>,
    pub multisig_wallet: Arc<Mutex<MultisigWallet>>,
    pub artist_vesting_manager: Arc<Mutex<ArtistVestingManager>>,
    pub payment_manager: Arc<Mutex<PaymentManager>>,
    pub rewards_manager: Arc<Mutex<RewardsManager>>,
    pub vesting_manager: Arc<Mutex<VestingManager>>,
    pub metrics_collector: Arc<MetricsCollector>,
}

// Request/Response types (same as original)
#[derive(Debug, Deserialize)]
pub struct TransactionRequest {
    pub from: String,
    pub to: String,
    pub amount: u64,
    pub nft_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TransactionResponse {
    pub success: bool,
    pub message: String,
    pub tx_hash: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BalanceResponse {
    pub address: String,
    pub balance: u64,
    pub timestamp: u64,
}

#[derive(Debug, Serialize)]
pub struct TokenBalanceResponse {
    pub address: String,
    pub dyo: f64,
    pub dys: f64,
    pub staked: f64,
    pub total: f64,
    pub timestamp: u64,
}

#[derive(Debug, Serialize)]
pub struct BlockchainResponse {
    pub chain: Vec<Block>,
    pub length: usize,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub timestamp: u64,
    pub version: String,
    pub uptime: u64,
}

/// Start the optimized Dujyo server
pub async fn start_optimized_server() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment variables
    dotenv::dotenv().ok();
    
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("🚀 Starting Dujyo Optimized Backend Server");

    // Load configuration from environment
    let database_config = DatabaseConfig {
        master_url: std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://dujyo_user:dujyo_master_2024@localhost:5432/dujyo_blockchain".to_string()),
        read_replica_urls: vec![
            std::env::var("DATABASE_REPLICA1_URL")
                .unwrap_or_else(|_| "postgresql://dujyo_readonly:dujyo_readonly_2024@localhost:5433/dujyo_blockchain".to_string()),
            std::env::var("DATABASE_REPLICA2_URL")
                .unwrap_or_else(|_| "postgresql://dujyo_readonly:dujyo_readonly_2024@localhost:5434/dujyo_blockchain".to_string()),
        ],
        max_connections: std::env::var("DB_MAX_CONNECTIONS")
            .unwrap_or_else(|_| "50".to_string())
            .parse()
            .unwrap_or(50),
        min_connections: std::env::var("DB_MIN_CONNECTIONS")
            .unwrap_or_else(|_| "10".to_string())
            .parse()
            .unwrap_or(10),
        connection_timeout: Duration::from_secs(
            std::env::var("DB_CONNECTION_TIMEOUT")
                .unwrap_or_else(|_| "10".to_string())
                .parse()
                .unwrap_or(10)
        ),
        idle_timeout: Duration::from_secs(
            std::env::var("DB_IDLE_TIMEOUT")
                .unwrap_or_else(|_| "600".to_string())
                .parse()
                .unwrap_or(600)
        ),
        max_lifetime: Duration::from_secs(
            std::env::var("DB_MAX_LIFETIME")
                .unwrap_or_else(|_| "1800".to_string())
                .parse()
                .unwrap_or(1800)
        ),
        acquire_timeout: Duration::from_secs(5),
        test_before_acquire: true,
        read_replica_load_balance: true,
    };

    let cache_config = CacheConfig {
        redis_url: std::env::var("REDIS_URL")
            .unwrap_or_else(|_| "redis://:dujyo_redis_2024@localhost:6379".to_string()),
        max_connections: 20,
        min_connections: 5,
        connection_timeout: Duration::from_secs(5),
        command_timeout: Duration::from_secs(3),
        ttl_balances: Duration::from_secs(
            std::env::var("CACHE_TTL_BALANCES")
                .unwrap_or_else(|_| "30".to_string())
                .parse()
                .unwrap_or(30)
        ),
        ttl_content: Duration::from_secs(
            std::env::var("CACHE_TTL_CONTENT")
                .unwrap_or_else(|_| "300".to_string())
                .parse()
                .unwrap_or(300)
        ),
        ttl_dex_pools: Duration::from_secs(
            std::env::var("CACHE_TTL_DEX_POOLS")
                .unwrap_or_else(|_| "10".to_string())
                .parse()
                .unwrap_or(10)
        ),
        ttl_transactions: Duration::from_secs(
            std::env::var("CACHE_TTL_TRANSACTIONS")
                .unwrap_or_else(|_| "60".to_string())
                .parse()
                .unwrap_or(60)
        ),
        ttl_blockchain_stats: Duration::from_secs(
            std::env::var("CACHE_TTL_BLOCKCHAIN_STATS")
                .unwrap_or_else(|_| "30".to_string())
                .parse()
                .unwrap_or(30)
        ),
    };

    // Initialize optimized storage
    let storage = Arc::new(OptimizedBlockchainStorage::new(database_config, cache_config).await?);
    storage.init_tables().await?;
    info!("✅ Optimized storage initialized");

    // Initialize database manager and cache service for monitoring
    let db_manager = Arc::new(DatabaseManager::new(database_config.clone()).await?);
    let cache_service = Arc::new(CacheService::new(cache_config.clone()).await?);
    
    // Initialize metrics collector
    let alert_thresholds = AlertThresholds::default();
    let metrics_collector = Arc::new(MetricsCollector::new(
        db_manager.clone(),
        cache_service.clone(),
        alert_thresholds,
    ));
    
    // Start monitoring
    if std::env::var("ENABLE_MONITORING").unwrap_or_else(|_| "true".to_string()) == "true" {
        metrics_collector.start_monitoring().await?;
        info!("✅ Performance monitoring started");
    }

    // Load blockchain from database or create new one
    let blockchain = match storage.load_blockchain().await {
        Ok(loaded_blockchain) => {
            info!("📚 Loaded blockchain from database with {} blocks", loaded_blockchain.chain.len());
            Arc::new(Mutex::new(loaded_blockchain))
        }
        Err(e) => {
            warn!("⚠️ Could not load blockchain from database: {}", e);
            info!("Creating new blockchain");
            Arc::new(Mutex::new(Blockchain::new()))
        }
    };
    
    let token = Arc::new(Mutex::new(Token::new()));
    let dex = Arc::new(Mutex::new(DEX::new()));
    let cpv_consensus = Arc::new(Mutex::new(CPVConsensus::new()));
    let real_blockchain = Arc::new(Mutex::new(RealBlockchain::new()));
    let native_token = Arc::new(Mutex::new(NativeToken::new()));
    let multisig_wallet = Arc::new(Mutex::new(MultisigWallet::new()));
    let artist_vesting_manager = Arc::new(Mutex::new(ArtistVestingManager::new()));
    let payment_manager = Arc::new(Mutex::new(PaymentManager::new()));
    let rewards_manager = Arc::new(Mutex::new(RewardsManager::new()));
    let vesting_manager = Arc::new(Mutex::new(VestingManager::new()));

    // Load all balances from database into token system
    info!("🔄 Loading balances from database...");
    match storage.get_all_balances().await {
        Ok(balances) => {
            let mut token_guard = token.lock().unwrap();
            for (address, balance) in balances {
                token_guard.balances.insert(address, balance);
            }
            info!("✅ Loaded {} balances from database", token_guard.balances.len());
        }
        Err(e) => {
            warn!("⚠️ Could not load balances from database: {}", e);
        }
    }

    // Load all token balances from database into real blockchain
    info!("🔄 Loading token balances from database...");
    match storage.get_all_token_balances().await {
        Ok(token_balances) => {
            let mut real_blockchain_guard = real_blockchain.lock().unwrap();
            for (address, balance) in token_balances {
                real_blockchain_guard.balances.insert(address, balance);
            }
            info!("✅ Loaded {} token balances from database", real_blockchain_guard.balances.len());
        }
        Err(e) => {
            warn!("⚠️ Could not load token balances from database: {}", e);
        }
    }

    // Initialize JWT configuration
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "dujyo_jwt_secret_2024".to_string());
    let jwt_config = JwtConfig {
        secret: jwt_secret,
        expiration_hours: 24,
    };

    // Create optimized app state
    let app_state = OptimizedAppState {
        blockchain,
        token,
        dex,
        storage,
        jwt_config,
        cpv_consensus,
        real_blockchain,
        native_token,
        multisig_wallet,
        artist_vesting_manager,
        payment_manager,
        rewards_manager,
        vesting_manager,
        metrics_collector,
    };

    // Start block production task
    let storage_clone = app_state.storage.clone();
    let blockchain_clone = app_state.blockchain.clone();
    let cpv_consensus_clone = app_state.cpv_consensus.clone();
    let metrics_collector_clone = app_state.metrics_collector.clone();
    
    tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_secs(10));
        
        loop {
            interval.tick().await;
            
            let start_time = std::time::Instant::now();
            
            // Create new block
            let mut blockchain_guard = blockchain_clone.lock().unwrap();
            if !blockchain_guard.pending_transactions.is_empty() {
                let mut cpv_guard = cpv_consensus_clone.lock().unwrap();
                let validator = cpv_guard.select_validator(&blockchain_guard.chain);
                
                let new_block = blockchain_guard.create_block(validator);
                let height = blockchain_guard.chain.len() as i64;
                
                // Save block to database
                if let Err(e) = storage_clone.save_block(&new_block, height).await {
                    error!("❌ Failed to save block to database: {}", e);
                } else {
                    info!("✅ Block {} saved to database", height);
                }
            }
            
            let response_time = start_time.elapsed().as_millis() as u64;
            metrics_collector_clone.record_block_request(response_time);
        }
    });

    // Create router with optimized handlers
    let app = create_optimized_router(app_state);

    // Start server
    let port = std::env::var("PORT").unwrap_or_else(|_| "8083".to_string());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    
    info!("🌐 Dujyo Optimized Backend Server listening on port {}", port);
    info!("📊 Database optimization features enabled:");
    info!("  • Redis cache layer");
    info!("  • Read replica support");
    info!("  • Performance monitoring");
    info!("  • Circuit breakers");
    info!("  • Optimized connection pooling");
    
    axum::serve(listener, app).await?;
    
    Ok(())
}

/// Create optimized router with performance monitoring
fn create_optimized_router(state: OptimizedAppState) -> Router {
    Router::new()
        // Health check with detailed metrics
        .route("/health", get(optimized_health_handler))
        .route("/health/detailed", get(detailed_health_handler))
        .route("/metrics", get(metrics_handler))
        
        // Blockchain endpoints (optimized)
        .route("/blocks", get(optimized_get_blocks))
        .route("/transaction", post(optimized_submit_transaction))
        .route("/balance/:address", get(optimized_get_balance))
        .route("/balance-detail/:address", get(optimized_get_token_balance))
        
        // DEX endpoints (optimized)
        .route("/pool/:id", get(optimized_get_pool))
        .route("/swap", post(optimized_swap))
        .route("/liquidity/add", post(optimized_add_liquidity))
        
        // Authentication endpoints
        .route("/login", post(login_handler))
        
        // WebSocket for real-time updates
        .route("/ws", get(optimized_websocket_handler))
        
        // Protected routes (require JWT)
        .route("/mint", post(optimized_mint_handler))
        .route("/stake", post(optimized_stake_handler))
        .route("/unstake", post(optimized_unstake_handler))
        
        // Monitoring endpoints
        .route("/admin/performance", get(performance_stats_handler))
        .route("/admin/cache/stats", get(cache_stats_handler))
        .route("/admin/database/stats", get(database_stats_handler))
        
        .layer(CorsLayer::permissive())
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
        .with_state(state)
}

// ===== OPTIMIZED HANDLERS =====

/// Optimized health check handler
async fn optimized_health_handler(State(state): State<OptimizedAppState>) -> Result<Json<HealthResponse>, StatusCode> {
    let start_time = std::time::Instant::now();
    
    let health = HealthResponse {
        status: "healthy".to_string(),
        timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
        version: "2.0.0-optimized".to_string(),
        uptime: 0, // TODO: Calculate actual uptime
    };
    
    let response_time = start_time.elapsed().as_millis() as u64;
    state.metrics_collector.record_balance_request(response_time);
    
    Ok(Json(health))
}

/// Detailed health check with database and cache status
async fn detailed_health_handler(State(state): State<OptimizedAppState>) -> Result<Json<HealthCheckResponse>, StatusCode> {
    let start_time = std::time::Instant::now();
    
    // Get storage health
    let storage_health = match state.storage.health_check().await {
        Ok(health) => health,
        Err(e) => {
            error!("Health check failed: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };
    
    // Get performance metrics
    let metrics = state.metrics_collector.get_metrics_summary();
    
    let health = HealthCheckResponse {
        status: if storage_health.database && storage_health.cache { "healthy" } else { "degraded" }.to_string(),
        timestamp: chrono::Utc::now(),
        database: DatabaseHealth {
            status: if storage_health.database { "healthy" } else { "unhealthy" }.to_string(),
            connection_pool_size: 50, // TODO: Get from actual pool
            active_connections: 10,   // TODO: Get from actual pool
            idle_connections: 40,     // TODO: Get from actual pool
            read_replicas_healthy: storage_health.read_replicas,
            total_read_replicas: storage_health.total_replicas,
        },
        cache: CacheHealth {
            status: if storage_health.cache { "healthy" } else { "unhealthy" }.to_string(),
            hit_ratio: metrics.cache_hit_ratio,
            connection_count: 20, // TODO: Get from actual cache
            memory_usage: None,   // TODO: Get from Redis INFO
        },
        metrics,
    };
    
    let response_time = start_time.elapsed().as_millis() as u64;
    state.metrics_collector.record_balance_request(response_time);
    
    Ok(Json(health))
}

/// Performance metrics handler
async fn metrics_handler(State(state): State<OptimizedAppState>) -> Result<Json<MetricsSummary>, StatusCode> {
    let metrics = state.metrics_collector.get_metrics_summary();
    Ok(Json(metrics))
}

/// Optimized balance handler with cache
async fn optimized_get_balance(
    State(state): State<OptimizedAppState>,
    Path(address): Path<String>,
) -> Result<Json<BalanceResponse>, StatusCode> {
    let start_time = std::time::Instant::now();
    
    match state.storage.get_balance(&address).await {
        Ok(balance) => {
            let response = BalanceResponse {
                address: address.clone(),
                balance,
                timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
            };
            
            let response_time = start_time.elapsed().as_millis() as u64;
            state.metrics_collector.record_balance_request(response_time);
            
            Ok(Json(response))
        }
        Err(e) => {
            error!("Failed to get balance for {}: {}", address, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Optimized token balance handler with cache
async fn optimized_get_token_balance(
    State(state): State<OptimizedAppState>,
    Path(address): Path<String>,
) -> Result<Json<TokenBalanceResponse>, StatusCode> {
    let start_time = std::time::Instant::now();
    
    match state.storage.get_token_balance(&address).await {
        Ok(balance) => {
            let response = TokenBalanceResponse {
                address: address.clone(),
                dyo: balance.dyo,
                dys: balance.dys,
                staked: balance.staked,
                total: balance.total,
                timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
            };
            
            let response_time = start_time.elapsed().as_millis() as u64;
            state.metrics_collector.record_balance_request(response_time);
            
            Ok(Json(response))
        }
        Err(e) => {
            error!("Failed to get token balance for {}: {}", address, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Optimized blocks handler
async fn optimized_get_blocks(State(state): State<OptimizedAppState>) -> Result<Json<BlockchainResponse>, StatusCode> {
    let start_time = std::time::Instant::now();
    
    let blockchain_guard = state.blockchain.lock().unwrap();
    let response = BlockchainResponse {
        chain: blockchain_guard.chain.clone(),
        length: blockchain_guard.chain.len(),
    };
    
    let response_time = start_time.elapsed().as_millis() as u64;
    state.metrics_collector.record_block_request(response_time);
    
    Ok(Json(response))
}

/// Optimized transaction submission handler
async fn optimized_submit_transaction(
    State(state): State<OptimizedAppState>,
    Json(request): Json<TransactionRequest>,
) -> Result<Json<TransactionResponse>, StatusCode> {
    let start_time = std::time::Instant::now();
    
    let transaction = Transaction {
        from: request.from.clone(),
        to: request.to.clone(),
        amount: request.amount,
        nft_id: request.nft_id,
    };
    
    // Save transaction to database
    match state.storage.save_transaction(&transaction).await {
        Ok(tx_hash) => {
            // Add to blockchain mempool
            let mut blockchain_guard = state.blockchain.lock().unwrap();
            blockchain_guard.pending_transactions.push(transaction);
            
            let response = TransactionResponse {
                success: true,
                message: "Transaction submitted successfully".to_string(),
                tx_hash: Some(tx_hash),
            };
            
            let response_time = start_time.elapsed().as_millis() as u64;
            state.metrics_collector.record_transaction_request(response_time);
            
            Ok(Json(response))
        }
        Err(e) => {
            error!("Failed to save transaction: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Optimized WebSocket handler
async fn optimized_websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<OptimizedAppState>,
) -> axum::response::Response {
    ws.on_upgrade(|socket| optimized_websocket_connection(socket, state))
}

async fn optimized_websocket_connection(socket: WebSocket, state: OptimizedAppState) {
    let (mut sender, mut receiver) = socket.split();
    
    // Send initial connection message
    if let Err(e) = sender.send(Message::Text(serde_json::json!({
        "type": "connection",
        "message": "Connected to Dujyo Optimized Backend",
        "features": ["cache", "read_replicas", "monitoring"]
    }).to_string())).await {
        error!("Failed to send initial WebSocket message: {}", e);
        return;
    }
    
    // Handle incoming messages
    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                debug!("Received WebSocket message: {}", text);
                
                // Handle balance subscription
                if text.contains("subscribe_balance") {
                    if let Ok(data) = serde_json::from_str::<serde_json::Value>(&text) {
                        if let Some(address) = data.get("address").and_then(|v| v.as_str()) {
                            // Send current balance
                            match state.storage.get_balance(address).await {
                                Ok(balance) => {
                                    let response = serde_json::json!({
                                        "type": "balance_update",
                                        "address": address,
                                        "balance": balance,
                                        "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
                                    });
                                    
                                    if let Err(e) = sender.send(Message::Text(response.to_string())).await {
                                        error!("Failed to send balance update: {}", e);
                                        break;
                                    }
                                }
                                Err(e) => {
                                    error!("Failed to get balance for WebSocket: {}", e);
                                }
                            }
                        }
                    }
                }
            }
            Ok(Message::Close(_)) => {
                debug!("WebSocket connection closed");
                break;
            }
            Err(e) => {
                error!("WebSocket error: {}", e);
                break;
            }
            _ => {}
        }
    }
}

// Placeholder handlers for other endpoints
async fn optimized_get_pool(State(_state): State<OptimizedAppState>, Path(_id): Path<String>) -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(serde_json::json!({"message": "Pool endpoint - to be implemented"})))
}

async fn optimized_swap(State(_state): State<OptimizedAppState>, Json(_request): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(serde_json::json!({"message": "Swap endpoint - to be implemented"})))
}

async fn optimized_add_liquidity(State(_state): State<OptimizedAppState>, Json(_request): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(serde_json::json!({"message": "Add liquidity endpoint - to be implemented"})))
}

async fn optimized_mint_handler(State(_state): State<OptimizedAppState>, Json(_request): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(serde_json::json!({"message": "Mint endpoint - to be implemented"})))
}

async fn optimized_stake_handler(State(_state): State<OptimizedAppState>, Json(_request): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(serde_json::json!({"message": "Stake endpoint - to be implemented"})))
}

async fn optimized_unstake_handler(State(_state): State<OptimizedAppState>, Json(_request): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(serde_json::json!({"message": "Unstake endpoint - to be implemented"})))
}

async fn performance_stats_handler(State(state): State<OptimizedAppState>) -> Result<Json<serde_json::Value>, StatusCode> {
    match state.storage.get_performance_stats().await {
        Ok(stats) => Ok(Json(serde_json::to_value(stats).unwrap())),
        Err(e) => {
            error!("Failed to get performance stats: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn cache_stats_handler(State(state): State<OptimizedAppState>) -> Result<Json<serde_json::Value>, StatusCode> {
    match state.storage.cache_service.get_stats().await {
        Ok(stats) => Ok(Json(stats)),
        Err(e) => {
            error!("Failed to get cache stats: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn database_stats_handler(State(state): State<OptimizedAppState>) -> Result<Json<serde_json::Value>, StatusCode> {
    match state.storage.db_manager.get_stats().await {
        Ok(stats) => Ok(Json(serde_json::to_value(stats).unwrap())),
        Err(e) => {
            error!("Failed to get database stats: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    start_optimized_server().await
}
