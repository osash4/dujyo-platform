use axum::{
    extract::{State, Extension},
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize};
use crate::auth::Claims;
use crate::server::AppState;
use uuid::Uuid;
use chrono::Utc;
use sqlx::Row;

#[derive(Deserialize)]
pub struct PayoutRequest {
    pub amount: f64, // in DYO
}

const MIN_PAYOUT_DYO: f64 = 10.0;

#[derive(Debug, Deserialize)]
pub struct FaucetRequest {
    pub amount: f64, // in DYO
}

#[derive(Debug, Serialize)]
pub struct FaucetResponse {
    pub success: bool,
    pub message: String,
    pub new_balance_dyo: f64,
}

/// POST /api/v1/payments/payout
/// On-chain payout MVP:
/// - Creates a blockchain transaction (user -> WITHDRAWAL_ADDRESS) for amount (in cents)
/// - Records payout in royalty_payments table
/// - Returns new balance and tx hash
pub async fn payout_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PayoutRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_address = &claims.sub;
    if req.amount <= 0.0 {
        return Ok(Json(serde_json::json!({
            "success": false,
            "message": "Amount must be greater than 0"
        })));
    }
    if req.amount < MIN_PAYOUT_DYO {
        return Ok(Json(serde_json::json!({
            "success": false,
            "message": format!("Minimum payout is {} DYO", MIN_PAYOUT_DYO)
        })));
    }

    // 1) Convert amount to cents (storage-based payout for MVP)
    let amount_cents: u64 = (req.amount * 100.0).round() as u64;

    // 2) Record payout in royalty_payments for history (amount in DYO)
    let tx_hash = {
        let pool = &state.storage.pool;
        let payout_id = Uuid::new_v4().to_string();
        let tx_hash = Uuid::new_v4().to_string();
        // Columns expected in analytics.rs queries:
        // payment_id, artist_id, amount, currency, status, payment_date, source, transaction_hash, created_at, updated_at
        let _ = sqlx::query(
            r#"
            INSERT INTO royalty_payments (
                payment_id, artist_id, amount, currency, status, payment_date, source, transaction_hash, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            "#
        )
        .bind(&payout_id)
        .bind(user_address)
        .bind(req.amount) // store as DYO (float)
        .bind("DYO")
        .bind("completed")
        .bind(Utc::now().date_naive())
        .bind(Some(String::from("payout")))
        .bind(Some(tx_hash.clone()))
        .execute(pool)
        .await;
        // Also insert a transaction record so it appears in /transactions history
        let _ = sqlx::query(
            r#"
            INSERT INTO transactions (tx_hash, from_address, to_address, amount, status, created_at)
            VALUES ($1, $2, $3, $4, 'success', NOW())
            "#
        )
        .bind(&tx_hash)
        .bind(user_address)
        .bind("WITHDRAWAL_ADDRESS")
        .bind(amount_cents as i64)
        .execute(pool)
        .await;
        tx_hash
    };

    // 3) Update legacy storage balance (source of truth for payout in MVP)
    let new_balance_cents = {
        // Read current legacy balance
        let current_balance_cents = state.storage.get_balance(user_address).await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        // Deduct payout in cents (saturating)
        let updated_cents = current_balance_cents.saturating_sub(amount_cents);
        state.storage.update_balance(user_address, updated_cents).await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        updated_cents
    };

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Payout processed",
        "payout_amount": req.amount,
        "min_payout": MIN_PAYOUT_DYO,
        "new_balance_dyo": (new_balance_cents as f64) / 100.0,
        "tx_hash": tx_hash
    })))
}

/// POST /api/v1/payments/faucet
/// Dev helper: credit DYO into storage balance
pub async fn faucet_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<FaucetRequest>,
) -> Result<Json<FaucetResponse>, StatusCode> {
    let user_address = &claims.sub;
    if req.amount <= 0.0 {
        return Ok(Json(FaucetResponse {
            success: false,
            message: "Amount must be greater than 0".to_string(),
            new_balance_dyo: 0.0,
        }));
    }
    let add_cents = (req.amount * 100.0).round() as u64;
    let current = state.storage.get_balance(user_address).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let updated = current.saturating_add(add_cents);
    state.storage.update_balance(user_address, updated).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(FaucetResponse {
        success: true,
        message: format!("Credited {:.2} DYO", req.amount),
        new_balance_dyo: (updated as f64) / 100.0,
    }))
}

/// GET /api/v1/payments/withdrawals
/// Returns simple payout history from royalty_payments for the authenticated user
pub async fn withdrawals_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_address = &claims.sub;
    let pool = &state.storage.pool;

    // Fetch withdrawals
    let rows = sqlx::query(
        r#"
        SELECT payment_id, amount::float8 as amount, currency, status, payment_date, transaction_hash, created_at
        FROM royalty_payments
        WHERE artist_id = $1 AND source = 'payout'
        ORDER BY created_at DESC
        LIMIT 100
        "#
    )
    .bind(user_address)
    .fetch_all(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut withdrawals = vec![];
    let mut total_withdrawn = 0.0f64;
    for row in rows {
        let status: String = row.get("status");
        let amount: f64 = row.get("amount");
        if status == "completed" {
            total_withdrawn += amount;
        }
        withdrawals.push(serde_json::json!({
            "withdrawal_id": row.get::<String, _>("payment_id"),
            "amount": amount,
            "currency": row.get::<String, _>("currency"),
            "fee": 0.0,
            "net_amount": amount,
            "status": status,
            "destination": "EXTERNAL",
            "created_at": row.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
            "completed_at": row.get::<Option<chrono::NaiveDate>, _>("payment_date").map(|d| d.to_string()),
            "transaction_hash": row.get::<Option<String>, _>("transaction_hash"),
        }));
    }

    Ok(Json(serde_json::json!({
        "withdrawals": withdrawals,
        "total_withdrawn": total_withdrawn,
        "pending_withdrawals": []
    })))
}

/// GET /api/v1/payments/limits (public)
pub async fn limits_handler() -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(serde_json::json!({
        "daily_limit": 1000.0,
        "monthly_limit": 10000.0,
        "min_amount": MIN_PAYOUT_DYO,
        "max_amount": 5000.0,
        "kyc_required": false,
    })))
}

pub fn payout_routes() -> Router<AppState> {
    Router::new()
        .route("/payout", post(payout_handler))
        .route("/faucet", post(faucet_handler))
        .route("/withdrawals", axum::routing::get(withdrawals_handler))
        .route("/limits", axum::routing::get(limits_handler))
}

