use std::sync::{Arc, Mutex};
use crate::blockchain::blockchain::{Blockchain, Transaction};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize)]
pub struct WalletBalance {
    pub address: String,
    pub balance: u64,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferRequest {
    pub from: String,
    pub to: String,
    pub amount: u64,
    pub memo: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferResponse {
    pub transaction_id: String,
    pub status: String,
    pub amount: u64,
    pub from: String,
    pub to: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WalletInfo {
    pub address: String,
    pub balance: u64,
    pub transaction_count: u64,
    pub first_seen: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
}

// Handler to get wallet balance
pub async fn get_wallet_balance(
    blockchain: Arc<Mutex<Blockchain>>,
    address: String
) -> Result<WalletBalance, String> {
    let blockchain_guard = blockchain.lock().map_err(|_| "Failed to acquire blockchain lock")?;
    
    let balance = blockchain_guard.get_balance(&address);
    
    Ok(WalletBalance {
        address: address.clone(),
        balance,
        last_updated: Utc::now(),
    })
}

// Handler to transfer funds
pub async fn transfer_funds(
    blockchain: Arc<Mutex<Blockchain>>,
    request: TransferRequest
) -> Result<TransferResponse, String> {
    // Validate the transfer request
    if request.amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }
    
    if request.from == request.to {
        return Err("Cannot transfer to the same address".to_string());
    }
    
    let mut blockchain_guard = blockchain.lock().map_err(|_| "Failed to acquire blockchain lock")?;
    
    // Check if sender has sufficient balance
    let sender_balance = blockchain_guard.get_balance(&request.from);
    if sender_balance < request.amount {
        return Err(format!("Insufficient balance. Available: {}, Required: {}", sender_balance, request.amount));
    }
    
    // Create transaction
    let transaction = Transaction {
        from: request.from.clone(),
        to: request.to.clone(),
        amount: request.amount,
        nft_id: None,
    };
    
    // Add transaction to blockchain
    blockchain_guard.add_transaction(transaction).map_err(|e| format!("Failed to add transaction: {}", e))?;
    
    // Generate transaction ID (in a real implementation, this would be the transaction hash)
    let transaction_id = format!("tx_{}_{}", request.from, chrono::Utc::now().timestamp());
    
    Ok(TransferResponse {
        transaction_id,
        status: "completed".to_string(),
        amount: request.amount,
        from: request.from,
        to: request.to,
        timestamp: Utc::now(),
    })
}

// Handler to get complete wallet information
pub async fn get_wallet_info(
    blockchain: Arc<Mutex<Blockchain>>,
    address: String
) -> Result<WalletInfo, String> {
    let blockchain_guard = blockchain.lock().map_err(|_| "Failed to acquire blockchain lock")?;
    
    let balance = blockchain_guard.get_balance(&address);
    
    // Count transactions for this address (simplified)
    let transaction_count = blockchain_guard.chain.len() as u64;
    
    Ok(WalletInfo {
        address: address.clone(),
        balance,
        transaction_count,
        first_seen: Utc::now(), // In a real implementation, this would be tracked
        last_activity: Utc::now(),
    })
}

// Handler to get transaction history
pub async fn get_transaction_history(
    blockchain: Arc<Mutex<Blockchain>>,
    address: String,
    limit: Option<usize>
) -> Result<Vec<Transaction>, String> {
    let blockchain_guard = blockchain.lock().map_err(|_| "Failed to acquire blockchain lock")?;
    
    let mut relevant_transactions = Vec::new();
    
    // Filter transactions for the given address
    for block in &blockchain_guard.chain {
        for transaction in &block.transactions {
            if transaction.from == address || transaction.to == address {
                relevant_transactions.push(transaction.clone());
            }
        }
    }
    
    // Apply limit if specified
    if let Some(limit) = limit {
        relevant_transactions.truncate(limit);
    }
    
    Ok(relevant_transactions)
}

// Handler to validate wallet address
pub async fn validate_wallet_address(address: String) -> Result<bool, String> {
    // Basic validation - in a real implementation, this would check the address format
    if address.is_empty() {
        return Err("Address cannot be empty".to_string());
    }
    
    if address.len() < 10 {
        return Err("Address too short".to_string());
    }
    
    if address.len() > 100 {
        return Err("Address too long".to_string());
    }
    
    // Check if address contains only valid characters (simplified)
    if !address.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return Err("Address contains invalid characters".to_string());
    }
    
    Ok(true)
}