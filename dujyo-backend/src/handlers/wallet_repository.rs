use crate::models::models::{Wallet, Transaction};
use sqlx::{PgPool, Row};
use chrono::Utc;
use tracing;

// Obtener una wallet por ID desde la base de datos
pub async fn get_wallet_by_id(pool: &PgPool, wallet_id: &str) -> Result<Wallet, String> {
    let row = sqlx::query(
        "SELECT id, balance::float8 FROM wallets WHERE id = $1"
    )
    .bind(wallet_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, wallet_id = wallet_id, "Failed to get wallet from database");
        format!("Database error: {}", e)
    })?;

    match row {
        Some(row) => {
            let id: String = row.get::<String, _>(0);
            let balance: f64 = row.get::<f64, _>(1);
            Ok(Wallet {
                id,
                balance,
            })
        }
        None => Err("Wallet not found".to_string()),
    }
}

// Crear una wallet si no existe
pub async fn create_wallet_if_not_exists(pool: &PgPool, wallet_id: &str, user_id: Option<&str>) -> Result<Wallet, String> {
    // Try to get existing wallet
    if let Ok(wallet) = get_wallet_by_id(pool, wallet_id).await {
        return Ok(wallet);
    }

    // Create new wallet
    sqlx::query(
        "INSERT INTO wallets (id, balance, currency, user_id, created_at, updated_at) 
         VALUES ($1, 0.0, 'DYO', $2, NOW(), NOW())"
    )
    .bind(wallet_id)
    .bind(user_id)
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, wallet_id = wallet_id, "Failed to create wallet");
        format!("Database error: {}", e)
    })?;

    Ok(Wallet {
        id: wallet_id.to_string(),
        balance: 0.0,
    })
}

// Actualizar una wallet en la base de datos
pub async fn update_wallet(pool: &PgPool, wallet: &Wallet) -> Result<(), String> {
    sqlx::query(
        "UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2"
    )
    .bind(wallet.balance)
    .bind(&wallet.id)
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, wallet_id = %wallet.id, "Failed to update wallet");
        format!("Database error: {}", e)
    })?;

    Ok(())
}

// Crear una transacción de wallet (solo registro, no actualiza balances)
pub async fn create_transaction_record(
    pool: &PgPool,
    from_wallet: &str,
    to_wallet: &str,
    amount: f64,
) -> Result<Transaction, String> {
    let transaction_id = uuid::Uuid::new_v4().to_string();
    
    sqlx::query(
        "INSERT INTO wallet_transactions (id, from_wallet, to_wallet, amount, currency, created_at)
         VALUES ($1, $2, $3, $4, 'DYO', NOW())"
    )
    .bind(&transaction_id)
    .bind(from_wallet)
    .bind(to_wallet)
    .bind(amount)
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, from = from_wallet, to = to_wallet, "Failed to create transaction record");
        format!("Database error: {}", e)
    })?;

    Ok(Transaction {
        from_wallet: from_wallet.to_string(),
        to_wallet: to_wallet.to_string(),
        amount,
        timestamp: Utc::now().to_rfc3339(),
    })
}
