use axum::{
    extract::{State, Extension},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use sqlx::Row;
use crate::server::AppState;
use crate::auth::Claims;

#[derive(Debug, Serialize)]
pub struct ConnectStartResponse {
    pub success: bool,
    pub stripe_account_id: String,
    pub onboarding_url: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ConnectStatusResponse {
    pub success: bool,
    pub connected: bool,
    pub payouts_enabled: bool,
    pub stripe_account_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StripePayoutRequest {
    pub amount_dyo: f64, // payout amount in DYO
}

#[derive(Debug, Serialize)]
pub struct StripePayoutResponse {
    pub success: bool,
    pub message: String,
    pub payout_id: Option<String>,
    pub stripe_tx_id: Option<String>,
    pub new_balance_dyo: Option<f64>,
}

/// Ensure auxiliary table exists (idempotent)
async fn ensure_tables(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS stripe_accounts (
            user_address TEXT PRIMARY KEY,
            stripe_account_id TEXT NOT NULL,
            payouts_enabled BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#
    ).execute(pool).await?;
    Ok(())
}

/// POST /api/v1/stripe/connect/start
pub async fn connect_start_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<ConnectStartResponse>, StatusCode> {
    let user_address = &claims.sub;
    let pool = &state.storage.pool;
    ensure_tables(pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Fetch or create a mock Stripe account id
    let existing = sqlx::query("SELECT stripe_account_id FROM stripe_accounts WHERE user_address = $1")
        .bind(user_address)
        .fetch_optional(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let stripe_account_id = if let Some(row) = existing {
        row.get::<String, _>(0)
    } else {
        let acct = format!("acct_{}", Uuid::new_v4().to_string().replace('-', "").chars().take(16).collect::<String>());
        sqlx::query(
            r#"
            INSERT INTO stripe_accounts (user_address, stripe_account_id, payouts_enabled, created_at, updated_at)
            VALUES ($1, $2, true, NOW(), NOW())
            ON CONFLICT (user_address) DO UPDATE SET stripe_account_id = EXCLUDED.stripe_account_id, updated_at = NOW()
            "#
        )
        .bind(user_address)
        .bind(&acct)
        .execute(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        acct
    };

    // Mock onboarding link (sandbox)
    let onboarding_url = format!("https://connect.stripe.com/test/onboarding?account={}", stripe_account_id);

    Ok(Json(ConnectStartResponse {
        success: true,
        stripe_account_id,
        onboarding_url,
        message: "Stripe Connect (test) initialized".to_string(),
    }))
}

/// GET /api/v1/stripe/connect/status
pub async fn connect_status_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<ConnectStatusResponse>, StatusCode> {
    let user_address = &claims.sub;
    let pool = &state.storage.pool;
    ensure_tables(pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let row = sqlx::query("SELECT stripe_account_id, payouts_enabled FROM stripe_accounts WHERE user_address = $1")
        .bind(user_address)
        .fetch_optional(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some(row) = row {
        let acct: String = row.get(0);
        let payouts_enabled: bool = row.get(1);
        Ok(Json(ConnectStatusResponse {
            success: true,
            connected: true,
            payouts_enabled,
            stripe_account_id: Some(acct),
        }))
    } else {
        Ok(Json(ConnectStatusResponse {
            success: true,
            connected: false,
            payouts_enabled: false,
            stripe_account_id: None,
        }))
    }
}

/// POST /api/v1/stripe/payouts
pub async fn stripe_payout_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<StripePayoutRequest>,
) -> Result<Json<StripePayoutResponse>, StatusCode> {
    let user_address = &claims.sub;
    let pool = &state.storage.pool;
    ensure_tables(pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if req.amount_dyo <= 0.0 {
        return Ok(Json(StripePayoutResponse {
            success: false,
            message: "Amount must be > 0".to_string(),
            payout_id: None,
            stripe_tx_id: None,
            new_balance_dyo: None,
        }));
    }

    // Ensure connected
    let acct_row = sqlx::query("SELECT stripe_account_id, payouts_enabled FROM stripe_accounts WHERE user_address = $1")
        .bind(user_address)
        .fetch_optional(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if acct_row.is_none() {
        return Ok(Json(StripePayoutResponse {
            success: false,
            message: "Stripe not connected".to_string(),
            payout_id: None,
            stripe_tx_id: None,
            new_balance_dyo: None,
        }));
    }

    // Check balance (storage source of truth)
    let current_cents = state.storage.get_balance(user_address).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let amount_cents = (req.amount_dyo * 100.0).round() as u64;
    if current_cents < amount_cents {
        return Ok(Json(StripePayoutResponse {
            success: false,
            message: format!("Insufficient balance. Available: {:.2} DYO", (current_cents as f64)/100.0),
            payout_id: None,
            stripe_tx_id: None,
            new_balance_dyo: Some((current_cents as f64)/100.0),
        }));
    }

    // Deduct from storage
    let new_cents = current_cents.saturating_sub(amount_cents);
    state.storage.update_balance(user_address, new_cents).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Record payout in royalty_payments as a fiat off-ramp via Stripe (test)
    let payout_id = Uuid::new_v4().to_string();
    let stripe_tx_id = format!("stripe_tx_{}", Uuid::new_v4().to_string().replace('-', ""));
    let _ = sqlx::query(
        r#"
        INSERT INTO royalty_payments (
            payment_id, artist_id, amount, currency, status,
            payment_date, source, transaction_hash, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        "#
    )
    .bind(&payout_id)
    .bind(user_address)
    .bind(req.amount_dyo) // record DYO amount moved off-ramp
    .bind("DYO")
    .bind("completed")
    .bind(Utc::now().date_naive())
    .bind("stripe_test")
    .bind(Some(stripe_tx_id.clone()))
    .execute(pool)
    .await;

    Ok(Json(StripePayoutResponse {
        success: true,
        message: "Stripe test payout processed".to_string(),
        payout_id: Some(payout_id),
        stripe_tx_id: Some(stripe_tx_id),
        new_balance_dyo: Some((new_cents as f64)/100.0),
    }))
}

/// POST /api/v1/stripe/webhook
pub async fn stripe_webhook_handler(
    body: String,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // In sandbox, just log and ACK
    eprintln!("🔔 [stripe_webhook] Event: {}", body);
    Ok(Json(serde_json::json!({
        "received": true
    })))
}

pub fn stripe_routes() -> Router<AppState> {
    Router::new()
        .route("/connect/start", post(connect_start_handler))
        .route("/connect/status", get(connect_status_handler))
        .route("/payouts", post(stripe_payout_handler))
        .route("/webhook", post(stripe_webhook_handler))
}


