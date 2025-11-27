use axum::{
    extract::{Path, Extension, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
// ✅ FIX: Temporarily commented - modules don't exist yet
// use crate::payments::withdrawal_service::{WithdrawalService, WithdrawalCurrency, WithdrawalDestination};
// use crate::compliance::kyc_service::KycService;
use crate::auth::Claims;
use crate::server::AppState;
use std::sync::Arc;

#[derive(Deserialize)]
pub struct WithdrawalRequestDto {
    pub amount: f64,
    pub currency: String,
    pub destination: WithdrawalDestinationRequest,
    pub memo: Option<String>,
}

#[derive(Deserialize)]
pub struct WithdrawalDestinationRequest {
    pub destination_type: String, // "crypto", "bank", "stripe"
    pub address: Option<String>,
    pub network: Option<String>,
    pub account_number: Option<String>,
    pub routing_number: Option<String>,
    pub account_type: Option<String>,
    pub stripe_account_id: Option<String>,
}

#[derive(Serialize)]
pub struct WithdrawalResponse {
    pub success: bool,
    pub withdrawal_id: Option<String>,
    pub message: String,
    pub fee: Option<f64>,
    pub net_amount: Option<f64>,
}

#[derive(Serialize)]
pub struct WithdrawalHistoryResponse {
    pub withdrawals: Vec<WithdrawalRecordResponse>,
    pub total_withdrawn: f64,
    pub pending_withdrawals: Vec<WithdrawalRecordResponse>,
}

#[derive(Serialize)]
pub struct WithdrawalRecordResponse {
    pub withdrawal_id: String,
    pub amount: f64,
    pub currency: String,
    pub fee: f64,
    pub net_amount: f64,
    pub status: String,
    pub destination: String,
    pub created_at: String,
    pub completed_at: Option<String>,
    pub transaction_hash: Option<String>,
}

// ✅ FIX: Temporarily commented - WithdrawalService and KycService don't exist
/*
/// POST /api/v1/payments/withdraw
/// Process withdrawal request
pub async fn create_withdrawal(
    State(state): State<crate::server::AppState>,
    Extension(claims): Extension<Claims>,
    Extension(kyc_service): Extension<Arc<KycService>>,
    Extension(withdrawal_service): Extension<Arc<WithdrawalService>>,
    Json(request): Json<WithdrawalRequestDto>,
) -> Result<Json<WithdrawalResponse>, StatusCode> {
    let user_id = claims.sub;

    // Check KYC status
    let kyc_verified = kyc_service.is_verified(&user_id).await;
    if !kyc_verified {
        return Ok(Json(WithdrawalResponse {
            success: false,
            withdrawal_id: None,
            message: "KYC verification required for withdrawals".to_string(),
            fee: None,
            net_amount: None,
        }));
    }

    // ✅ SECURITY FIX #3: Atomic balance verification and withdrawal with mutex lock
    // CRITICAL: TOCTOU vulnerability - balance check and withdrawal were separate operations
    // SOLUTION: Use mutex lock to atomically check and deduct balance
    // Since balances are in-memory (blockchain/token), we use mutex locks instead of DB transactions
    // This prevents concurrent withdrawals from exceeding the user's balance
    
    // ✅ SECURITY FIX: Validate input to prevent negative amounts and zero amounts
    // CRITICAL: Negative amounts can cause underflow or unexpected behavior
    if request.amount <= 0.0 {
        return Ok(Json(WithdrawalResponse {
            success: false,
            withdrawal_id: None,
            message: "Invalid withdrawal amount. Amount must be greater than 0.".to_string(),
            fee: None,
            net_amount: None,
        }));
    }
    
    // Calculate fee first (doesn't require lock)
    let fee = withdrawal_service.calculate_fee(
        &match request.currency.as_str() {
            "DYO" => crate::payments::withdrawal_service::WithdrawalCurrency::DYO,
            "DYS" => crate::payments::withdrawal_service::WithdrawalCurrency::DYS,
            "USD" => crate::payments::withdrawal_service::WithdrawalCurrency::USD,
            _ => return Err(StatusCode::BAD_REQUEST),
        },
        request.amount
    );
    let total_required = request.amount + fee;
    
    // ✅ ATOMIC OPERATION: Verify balance and deduct atomically using mutex lock
    // CRITICAL: All balance operations must happen within the same lock to prevent TOCTOU
    let balance_verified = match request.currency.as_str() {
        "DYO" => {
            // Lock blockchain mutex for atomic check + deduction
            let mut blockchain = state.blockchain.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            
            // Get current balance (in cents)
            let current_balance_cents = blockchain.get_balance(&user_id);
            let current_balance = current_balance_cents as f64 / 100.0;
            let deduction_cents = (total_required * 100.0) as u64;
            
            // ✅ ATOMIC VERIFICATION: Check balance within lock
            if current_balance_cents < deduction_cents {
                return Ok(Json(WithdrawalResponse {
                    success: false,
                    withdrawal_id: None,
                    message: format!(
                        "Insufficient balance. Required: {} {}, Available: {} {}",
                        total_required, request.currency, current_balance, request.currency
                    ),
                    fee: Some(fee),
                    net_amount: None,
                }));
            }
            
            // ✅ ATOMIC DEDUCTION: Deduct balance within same lock (prevents TOCTOU)
            // Create transaction to deduct balance
            let tx_blockchain = crate::blockchain::blockchain::Transaction {
                from: user_id.clone(),
                to: "WITHDRAWAL_ADDRESS".to_string(), // Special address for withdrawals
                amount: deduction_cents,
                nft_id: None,
            };
            blockchain.add_transaction(tx_blockchain).map_err(|e| {
                eprintln!("❌ Error adding withdrawal transaction: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
            
            // Lock released here - balance already deducted
            true
        }
        "DYS" => {
            // Lock token mutex for atomic check + deduction
            let mut token = state.token.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            
            // Get current balance
            let current_balance = token.balance_of(&user_id);
            
            // ✅ ATOMIC VERIFICATION: Check balance within lock
            if current_balance < total_required {
                return Ok(Json(WithdrawalResponse {
                    success: false,
                    withdrawal_id: None,
                    message: format!(
                        "Insufficient balance. Required: {} {}, Available: {} {}",
                        total_required, request.currency, current_balance, request.currency
                    ),
                    fee: Some(fee),
                    net_amount: None,
                }));
            }
            
            // ✅ ATOMIC DEDUCTION: Deduct balance within same lock (prevents TOCTOU)
            token.transfer(&user_id, "WITHDRAWAL_ADDRESS", total_required, "WITHDRAWAL").map_err(|e| {
                eprintln!("❌ Error transferring tokens for withdrawal: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
            
            // Lock released here - balance already deducted
            true
        }
        "USD" => {
            // For USD, use DYS (stablecoin)
            let mut token = state.token.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            let current_balance = token.balance_of(&user_id);
            
            if current_balance < total_required {
                return Ok(Json(WithdrawalResponse {
                    success: false,
                    withdrawal_id: None,
                    message: format!(
                        "Insufficient balance. Required: {} {}, Available: {} {}",
                        total_required, request.currency, current_balance, request.currency
                    ),
                    fee: Some(fee),
                    net_amount: None,
                }));
            }
            
            token.transfer(&user_id, "WITHDRAWAL_ADDRESS", total_required, "WITHDRAWAL").map_err(|e| {
                eprintln!("❌ Error transferring tokens for withdrawal: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
            true
        }
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    // Convert request to service format
    let currency = match request.currency.as_str() {
        "DYO" => crate::payments::withdrawal_service::WithdrawalCurrency::DYO,
        "DYS" => crate::payments::withdrawal_service::WithdrawalCurrency::DYS,
        "USD" => crate::payments::withdrawal_service::WithdrawalCurrency::USD,
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let destination = match request.destination.destination_type.as_str() {
        "crypto" => {
            let address = request.destination.address.ok_or(StatusCode::BAD_REQUEST)?;
            let network = request.destination.network.unwrap_or_else(|| "ethereum".to_string());
            crate::payments::withdrawal_service::WithdrawalDestination::Crypto { address, network }
        }
        "bank" => {
            let account_number = request.destination.account_number.ok_or(StatusCode::BAD_REQUEST)?;
            let routing_number = request.destination.routing_number.ok_or(StatusCode::BAD_REQUEST)?;
            let account_type = request.destination.account_type.unwrap_or_else(|| "checking".to_string());
            crate::payments::withdrawal_service::WithdrawalDestination::BankAccount {
                account_number,
                routing_number,
                account_type,
            }
        }
        "stripe" => {
            let account_id = request.destination.stripe_account_id.ok_or(StatusCode::BAD_REQUEST)?;
            crate::payments::withdrawal_service::WithdrawalDestination::StripeConnect { account_id }
        }
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let withdrawal_request = crate::payments::withdrawal_service::WithdrawalRequest {
        user_id,
        amount: request.amount,
        currency,
        destination,
        memo: request.memo,
    };

    // Process withdrawal
    match withdrawal_service.process_withdrawal(withdrawal_request, kyc_verified).await {
        Ok(response) => {
            Ok(Json(WithdrawalResponse {
                success: true,
                withdrawal_id: Some(response.withdrawal_id),
                message: format!("Withdrawal processed successfully. Status: {:?}", response.status),
                fee: Some(response.fee),
                net_amount: Some(response.net_amount),
            }))
        }
        Err(e) => {
            Ok(Json(WithdrawalResponse {
                success: false,
                withdrawal_id: None,
                message: e,
                fee: None,
                net_amount: None,
            }))
        }
    }
}

/// GET /api/v1/payments/withdrawals
/// Get withdrawal history
pub async fn get_withdrawal_history(
    Extension(claims): Extension<Claims>,
    Extension(withdrawal_service): Extension<Arc<WithdrawalService>>,
) -> Result<Json<WithdrawalHistoryResponse>, StatusCode> {
    let user_id = claims.sub;

    let history = withdrawal_service.get_withdrawal_history(&user_id).await;

    let withdrawals: Vec<WithdrawalRecordResponse> = history
        .withdrawals
        .iter()
        .map(|w| WithdrawalRecordResponse {
            withdrawal_id: w.withdrawal_id.clone(),
            amount: w.amount,
            currency: w.currency.clone(),
            fee: w.fee,
            net_amount: w.net_amount,
            status: format!("{:?}", w.status),
            destination: w.destination.clone(),
            created_at: w.created_at.to_rfc3339(),
            completed_at: w.completed_at.map(|d| d.to_rfc3339()),
            transaction_hash: w.transaction_hash.clone(),
        })
        .collect();

    let pending_withdrawals: Vec<WithdrawalRecordResponse> = history
        .pending_withdrawals
        .iter()
        .map(|w| WithdrawalRecordResponse {
            withdrawal_id: w.withdrawal_id.clone(),
            amount: w.amount,
            currency: w.currency.clone(),
            fee: w.fee,
            net_amount: w.net_amount,
            status: format!("{:?}", w.status),
            destination: w.destination.clone(),
            created_at: w.created_at.to_rfc3339(),
            completed_at: w.completed_at.map(|d| d.to_rfc3339()),
            transaction_hash: w.transaction_hash.clone(),
        })
        .collect();

    Ok(Json(WithdrawalHistoryResponse {
        withdrawals,
        total_withdrawn: history.total_withdrawn,
        pending_withdrawals,
    }))
}

/// GET /api/v1/payments/limits
/// Get withdrawal limits
pub async fn get_withdrawal_limits(
    Extension(withdrawal_service): Extension<Arc<WithdrawalService>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let limits = withdrawal_service.get_limits();
    
    Ok(Json(serde_json::json!({
        "daily_limit": limits.daily_limit,
        "monthly_limit": limits.monthly_limit,
        "min_amount": limits.min_amount,
        "max_amount": limits.max_amount,
        "kyc_required": limits.kyc_required,
    })))
}

pub fn payments_protected_routes() -> Router<AppState> {
    // Create services
    let withdrawal_service = Arc::new(WithdrawalService::new());
    let kyc_service = Arc::new(KycService::new());
    
    Router::new()
        .route("/withdraw", post(create_withdrawal))
        .route("/withdrawals", get(get_withdrawal_history))
        .layer(Extension(withdrawal_service))
        .layer(Extension(kyc_service))
}

pub fn payments_public_routes() -> Router<AppState> {
    // ✅ FIX: Temporarily commented - WithdrawalService doesn't exist
    /*
    let withdrawal_service = Arc::new(WithdrawalService::new());
    
    Router::new()
        .route("/limits", get(get_withdrawal_limits))
        .layer(Extension(withdrawal_service))
    */
    Router::new()
        .route("/limits", get(|| async { 
            axum::response::Json(serde_json::json!({
                "daily_limit": 1000.0,
                "monthly_limit": 10000.0,
                "min_amount": 10.0,
                "max_amount": 5000.0,
                "kyc_required": true,
            }))
        }))
}
*/

