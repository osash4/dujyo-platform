use tokio::sync::Mutex;
use lazy_static::lazy_static;
use crate::models::models::Transaction;
use crate::handlers::wallet_repository;
use sqlx::{PgPool, Row};
use tracing;

// Sincronización de la cuenta conectada
lazy_static! {
    static ref CONNECTED_ACCOUNT: Mutex<Option<String>> = Mutex::new(None);
}

// Obtener la cuenta conectada
pub async fn get_connected_account() -> Option<String> {
    let account = CONNECTED_ACCOUNT.lock().await;
    account.clone()
}

// Conectar una cuenta
pub async fn connect_account(account: String) -> Result<String, String> {
    let mut connected_account = CONNECTED_ACCOUNT.lock().await;
    *connected_account = Some(account.clone());
    Ok(account)
}

// Desconectar una cuenta
pub async fn disconnect_account() -> Result<(), String> {
    let mut connected_account = CONNECTED_ACCOUNT.lock().await;
    *connected_account = None;
    Ok(())
}

// Obtener el saldo de la wallet
pub async fn get_wallet_balance(pool: &PgPool) -> Result<f64, String> {
    match get_connected_account().await {
        Some(account_id) => {
            // Obtener la wallet de la cuenta conectada
            match wallet_repository::get_wallet_by_id(pool, &account_id).await {
                Ok(wallet) => {
                    Ok(wallet.balance)
                }
                Err(err) => Err(format!("Failed to retrieve wallet: {}", err)),
            }
        }
        None => Err("No connected account found".to_string()),
    }
}

// Realizar una transferencia atómica
pub async fn transfer(
    pool: &PgPool,
    from_wallet: String,
    to_wallet: String,
    amount: f64,
) -> Result<Transaction, String> {
    // Validaciones iniciales
    if from_wallet.trim().is_empty() || to_wallet.trim().is_empty() {
        return Err("Wallet IDs cannot be empty".to_string());
    }

    if from_wallet == to_wallet {
        return Err("Source and destination wallets cannot be the same".to_string());
    }

    if amount <= 0.0 {
        return Err("Amount must be greater than 0".to_string());
    }

    // ✅ ATOMIC TRANSACTION - All or nothing
    let mut tx = pool.begin().await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to begin transaction");
            format!("Database error: {}", e)
        })?;

    // Get balances with row-level lock (FOR UPDATE)
    let from_balance: Option<f64> = sqlx::query_scalar(
        "SELECT balance::float8 FROM wallets WHERE id = $1 FOR UPDATE"
    )
    .bind(&from_wallet)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, from = from_wallet, "Failed to get from wallet balance");
        format!("Database error: {}", e)
    })?;

    let from_balance: f64 = from_balance.ok_or_else(|| "From wallet not found".to_string())?;

    let _to_balance: Option<f64> = sqlx::query_scalar(
        "SELECT balance::float8 FROM wallets WHERE id = $1 FOR UPDATE"
    )
    .bind(&to_wallet)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, to = to_wallet, "Failed to get to wallet balance");
        format!("Database error: {}", e)
    })?;

    let _to_balance: f64 = _to_balance.ok_or_else(|| "To wallet not found".to_string())?;

    // Verify sufficient balance
    if from_balance < amount {
        tx.rollback().await.ok(); // Ignore rollback errors
        return Err("Insufficient balance".to_string());
    }

    // Update balances atomically
    sqlx::query(
        "UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2"
    )
    .bind(amount)
    .bind(&from_wallet)
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, from = from_wallet, "Failed to update from wallet");
        format!("Database error: {}", e)
    })?;

    sqlx::query(
        "UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2"
    )
    .bind(amount)
    .bind(&to_wallet)
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, to = to_wallet, "Failed to update to wallet");
        format!("Database error: {}", e)
    })?;

    // Create transaction record
    let transaction_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO wallet_transactions (id, from_wallet, to_wallet, amount, currency, created_at)
         VALUES ($1, $2, $3, $4, 'DYO', NOW())"
    )
    .bind(&transaction_id)
    .bind(&from_wallet)
    .bind(&to_wallet)
    .bind(amount)
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to create transaction record");
        format!("Database error: {}", e)
    })?;

    // Create audit log
    let audit_id = uuid::Uuid::new_v4();
    let audit_details = serde_json::json!({
        "from": from_wallet,
        "to": to_wallet,
        "amount": amount
    });
    sqlx::query(
        "INSERT INTO audit_logs (id, timestamp, action_type, resource, details, success, status_code)
         VALUES ($1, NOW(), $2, $3, $4, true, 200)"
    )
    .bind(audit_id)
    .bind("wallet_transfer")
    .bind(&transaction_id)
    .bind(audit_details)
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to create audit log");
        format!("Database error: {}", e)
    })?;

    // Commit transaction
    tx.commit().await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to commit transaction");
            format!("Database error: {}", e)
        })?;

    Ok(Transaction {
        from_wallet: from_wallet.clone(),
        to_wallet: to_wallet.clone(),
        amount,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}
