//! Treasury Management for Dujyo
//! 
//! This module manages the platform treasury:
//! - Auto-conversion of fees to stablecoin
//! - Reserve fund management (10% of fees)
//! - Development fund allocation (20% of fees)
//! - Token burn mechanism (5% of fees)
//! - Multi-signature wallet management
//! - Treasury reporting and analytics
//! - Risk management and diversification

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

// ===========================================
// TYPES & STRUCTS
// ===========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Treasury {
    pub id: String,
    pub total_assets: u64,
    pub dyo_balance: u64,
    pub dys_balance: u64,
    pub reserve_fund: u64,
    pub development_fund: u64,
    pub burn_pool: u64,
    pub last_updated: DateTime<Utc>,
    pub auto_conversion_enabled: bool,
    pub conversion_threshold: u64,
    pub risk_level: RiskLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RiskLevel {
    Conservative,
    Moderate,
    Aggressive,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreasuryTransaction {
    pub id: String,
    pub transaction_type: TreasuryTransactionType,
    pub amount: u64,
    pub currency: String,
    pub from_fund: Option<TreasuryFund>,
    pub to_fund: Option<TreasuryFund>,
    pub description: String,
    pub metadata: HashMap<String, serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub executed_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TreasuryTransactionType {
    FeeCollection,
    AutoConversion,
    ManualConversion,
    FundAllocation,
    BurnExecution,
    DevelopmentSpend,
    ReserveWithdrawal,
    EmergencyWithdrawal,
    Rebalancing,
    Investment,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TreasuryFund {
    Main,
    Reserve,
    Development,
    Burn,
    Investment,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreasuryPolicy {
    pub reserve_fund_percentage: f64,
    pub development_fund_percentage: f64,
    pub burn_percentage: f64,
    pub investment_percentage: f64,
    pub auto_conversion_threshold: u64,
    pub max_single_investment: u64,
    pub emergency_reserve_minimum: u64,
    pub rebalancing_threshold: f64,
    pub risk_tolerance: RiskLevel,
}

impl Default for TreasuryPolicy {
    fn default() -> Self {
        Self {
            reserve_fund_percentage: 10.0,
            development_fund_percentage: 20.0,
            burn_percentage: 5.0,
            investment_percentage: 15.0,
            auto_conversion_threshold: 10000, // 100 DYO
            max_single_investment: 5000, // 50 DYO
            emergency_reserve_minimum: 50000, // 500 DYO
            rebalancing_threshold: 0.1, // 10%
            risk_tolerance: RiskLevel::Moderate,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreasuryReport {
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub total_assets: u64,
    pub asset_allocation: HashMap<String, u64>,
    pub revenue_collected: u64,
    pub fees_paid: u64,
    pub net_growth: u64,
    pub growth_percentage: f64,
    pub transactions_count: u64,
    pub generated_at: DateTime<Utc>,
}

// ===========================================
// TREASURY MANAGER
// ===========================================

pub struct TreasuryManager {
    treasury: Arc<RwLock<Treasury>>,
    transactions: Arc<RwLock<Vec<TreasuryTransaction>>>,
    policy: TreasuryPolicy,
    multisig_wallets: Arc<RwLock<HashMap<String, MultisigWallet>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultisigWallet {
    pub id: String,
    pub name: String,
    pub address: String,
    pub required_signatures: u32,
    pub total_signers: u32,
    pub signers: Vec<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

impl TreasuryManager {
    pub fn new(policy: TreasuryPolicy) -> Self {
        let treasury = Treasury {
            id: Uuid::new_v4().to_string(),
            total_assets: 0,
            dyo_balance: 0,
            dys_balance: 0,
            reserve_fund: 0,
            development_fund: 0,
            burn_pool: 0,
            last_updated: Utc::now(),
            auto_conversion_enabled: true,
            conversion_threshold: policy.auto_conversion_threshold,
            risk_level: policy.risk_tolerance.clone(),
        };
        
        Self {
            treasury: Arc::new(RwLock::new(treasury)),
            transactions: Arc::new(RwLock::new(Vec::new())),
            policy,
            multisig_wallets: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    // ===========================================
    // FEE COLLECTION AND ALLOCATION
    // ===========================================

    pub async fn collect_fees(&self, amount: u64, source: String) -> Result<String, String> {
        let mut treasury = self.treasury.write().await;
        
        // Update total assets
        treasury.total_assets += amount;
        treasury.dyo_balance += amount;
        treasury.last_updated = Utc::now();
        
        // Calculate allocations
        let reserve_amount = ((amount as f64 * self.policy.reserve_fund_percentage) / 100.0) as u64;
        let development_amount = ((amount as f64 * self.policy.development_fund_percentage) / 100.0) as u64;
        let burn_amount = ((amount as f64 * self.policy.burn_percentage) / 100.0) as u64;
        let investment_amount = ((amount as f64 * self.policy.investment_percentage) / 100.0) as u64;
        
        // Allocate to funds
        treasury.reserve_fund += reserve_amount;
        treasury.development_fund += development_amount;
        treasury.burn_pool += burn_amount;
        
        // Record transaction
        let transaction_id = self.record_transaction(TreasuryTransaction {
            id: Uuid::new_v4().to_string(),
            transaction_type: TreasuryTransactionType::FeeCollection,
            amount,
            currency: "DYO".to_string(),
            from_fund: None,
            to_fund: Some(TreasuryFund::Main),
            description: format!("Fee collection from {}", source),
            metadata: {
                let mut meta = HashMap::new();
                meta.insert("source".to_string(), serde_json::json!(source));
                meta.insert("reserve_allocation".to_string(), serde_json::json!(reserve_amount));
                meta.insert("development_allocation".to_string(), serde_json::json!(development_amount));
                meta.insert("burn_allocation".to_string(), serde_json::json!(burn_amount));
                meta
            },
            created_at: Utc::now(),
            executed_by: "system".to_string(),
        }).await;
        
        // Check if auto-conversion is needed
        if treasury.auto_conversion_enabled && treasury.dyo_balance >= treasury.conversion_threshold {
            self.auto_convert_to_stablecoin().await?;
        }
        
        Ok(transaction_id)
    }

    // ===========================================
    // AUTO-CONVERSION TO STABLECOIN
    // ===========================================

    async fn auto_convert_to_stablecoin(&self) -> Result<(), String> {
        let mut treasury = self.treasury.write().await;
        
        if treasury.dyo_balance < treasury.conversion_threshold {
            return Err("Insufficient balance for conversion".to_string());
        }
        
        let conversion_amount = treasury.dyo_balance;
        let conversion_rate = self.get_conversion_rate().await;
        let stablecoin_amount = (conversion_amount as f64 * conversion_rate) as u64;
        
        // Update balances
        treasury.dyo_balance = 0;
        treasury.dys_balance += stablecoin_amount;
        treasury.last_updated = Utc::now();
        
        // Record transaction
        self.record_transaction(TreasuryTransaction {
            id: Uuid::new_v4().to_string(),
            transaction_type: TreasuryTransactionType::AutoConversion,
            amount: conversion_amount,
            currency: "DYO".to_string(),
            from_fund: Some(TreasuryFund::Main),
            to_fund: Some(TreasuryFund::Main),
            description: format!("Auto-conversion of {} DYO to {} DYS", conversion_amount, stablecoin_amount),
            metadata: {
                let mut meta = HashMap::new();
                meta.insert("conversion_rate".to_string(), serde_json::json!(conversion_rate));
                meta.insert("stablecoin_amount".to_string(), serde_json::json!(stablecoin_amount));
                meta
            },
            created_at: Utc::now(),
            executed_by: "system".to_string(),
        }).await;
        
        Ok(())
    }

    pub async fn manual_conversion(&self, amount: u64, executed_by: String) -> Result<String, String> {
        let mut treasury = self.treasury.write().await;
        
        if treasury.dyo_balance < amount {
            return Err("Insufficient DYO balance".to_string());
        }
        
        let conversion_rate = self.get_conversion_rate().await;
        let stablecoin_amount = (amount as f64 * conversion_rate) as u64;
        
        // Update balances
        treasury.dyo_balance -= amount;
        treasury.dys_balance += stablecoin_amount;
        treasury.last_updated = Utc::now();
        
        // Record transaction
        let transaction_id = self.record_transaction(TreasuryTransaction {
            id: Uuid::new_v4().to_string(),
            transaction_type: TreasuryTransactionType::ManualConversion,
            amount,
            currency: "DYO".to_string(),
            from_fund: Some(TreasuryFund::Main),
            to_fund: Some(TreasuryFund::Main),
            description: format!("Manual conversion of {} DYO to {} DYS", amount, stablecoin_amount),
            metadata: {
                let mut meta = HashMap::new();
                meta.insert("conversion_rate".to_string(), serde_json::json!(conversion_rate));
                meta.insert("stablecoin_amount".to_string(), serde_json::json!(stablecoin_amount));
                meta
            },
            created_at: Utc::now(),
            executed_by,
        }).await;
        
        Ok(transaction_id)
    }

    // ===========================================
    // TOKEN BURN MECHANISM
    // ===========================================

    pub async fn execute_burn(&self, amount: u64, executed_by: String) -> Result<String, String> {
        let mut treasury = self.treasury.write().await;
        
        if treasury.burn_pool < amount {
            return Err("Insufficient burn pool balance".to_string());
        }
        
        // Update balances
        treasury.burn_pool -= amount;
        treasury.total_assets -= amount;
        treasury.last_updated = Utc::now();
        
        // Record transaction
        let transaction_id = self.record_transaction(TreasuryTransaction {
            id: Uuid::new_v4().to_string(),
            transaction_type: TreasuryTransactionType::BurnExecution,
            amount,
            currency: "DYO".to_string(),
            from_fund: Some(TreasuryFund::Burn),
            to_fund: None,
            description: format!("Token burn of {} DYO", amount),
            metadata: {
                let mut meta = HashMap::new();
                meta.insert("burn_type".to_string(), serde_json::json!("treasury_burn"));
                meta.insert("remaining_burn_pool".to_string(), serde_json::json!(treasury.burn_pool));
                meta
            },
            created_at: Utc::now(),
            executed_by,
        }).await;
        
        // In a real implementation, this would trigger the actual burn on the blockchain
        self.trigger_blockchain_burn(amount).await;
        
        Ok(transaction_id)
    }

    async fn trigger_blockchain_burn(&self, amount: u64) {
        // This would interact with the blockchain to actually burn the tokens
        // For now, we'll just log the action
        println!("Triggering blockchain burn of {} DYO", amount);
    }

    // ===========================================
    // FUND MANAGEMENT
    // ===========================================

    pub async fn allocate_to_development(&self, amount: u64, purpose: String, executed_by: String) -> Result<String, String> {
        let mut treasury = self.treasury.write().await;
        
        if treasury.development_fund < amount {
            return Err("Insufficient development fund balance".to_string());
        }
        
        // Update balances
        treasury.development_fund -= amount;
        treasury.last_updated = Utc::now();
        
        // Record transaction
        let transaction_id = self.record_transaction(TreasuryTransaction {
            id: Uuid::new_v4().to_string(),
            transaction_type: TreasuryTransactionType::DevelopmentSpend,
            amount,
            currency: "DYO".to_string(),
            from_fund: Some(TreasuryFund::Development),
            to_fund: None,
            description: format!("Development fund allocation: {}", purpose),
            metadata: {
                let mut meta = HashMap::new();
                meta.insert("purpose".to_string(), serde_json::json!(purpose));
                meta.insert("remaining_development_fund".to_string(), serde_json::json!(treasury.development_fund));
                meta
            },
            created_at: Utc::now(),
            executed_by,
        }).await;
        
        Ok(transaction_id)
    }

    pub async fn emergency_withdrawal(&self, amount: u64, reason: String, executed_by: String) -> Result<String, String> {
        let mut treasury = self.treasury.write().await;
        
        // Check if we have enough in reserve
        if treasury.reserve_fund < amount {
            return Err("Insufficient reserve fund for emergency withdrawal".to_string());
        }
        
        // Check if withdrawal would go below minimum
        if treasury.reserve_fund - amount < self.policy.emergency_reserve_minimum {
            return Err("Emergency withdrawal would go below minimum reserve".to_string());
        }
        
        // Update balances
        treasury.reserve_fund -= amount;
        treasury.total_assets -= amount;
        treasury.last_updated = Utc::now();
        
        // Record transaction
        let transaction_id = self.record_transaction(TreasuryTransaction {
            id: Uuid::new_v4().to_string(),
            transaction_type: TreasuryTransactionType::EmergencyWithdrawal,
            amount,
            currency: "DYO".to_string(),
            from_fund: Some(TreasuryFund::Reserve),
            to_fund: None,
            description: format!("Emergency withdrawal: {}", reason),
            metadata: {
                let mut meta = HashMap::new();
                meta.insert("reason".to_string(), serde_json::json!(reason));
                meta.insert("remaining_reserve_fund".to_string(), serde_json::json!(treasury.reserve_fund));
                meta
            },
            created_at: Utc::now(),
            executed_by,
        }).await;
        
        Ok(transaction_id)
    }

    // ===========================================
    // MULTISIG WALLET MANAGEMENT
    // ===========================================

    pub async fn create_multisig_wallet(&self, name: String, signers: Vec<String>, required_signatures: u32) -> Result<String, String> {
        if required_signatures > signers.len() as u32 {
            return Err("Required signatures cannot exceed total signers".to_string());
        }
        
        let wallet = MultisigWallet {
            id: Uuid::new_v4().to_string(),
            name: name.clone(),
            address: format!("0x{}", Uuid::new_v4().to_string().replace("-", "")),
            required_signatures,
            total_signers: signers.len() as u32,
            signers,
            is_active: true,
            created_at: Utc::now(),
        };
        
        let mut wallets = self.multisig_wallets.write().await;
        wallets.insert(wallet.id.clone(), wallet);
        
        Ok(wallet.id)
    }

    pub async fn get_multisig_wallets(&self) -> Vec<MultisigWallet> {
        let wallets = self.multisig_wallets.read().await;
        wallets.values().cloned().collect()
    }

    // ===========================================
    // REPORTING AND ANALYTICS
    // ===========================================

    pub async fn generate_treasury_report(&self, start_date: DateTime<Utc>, end_date: DateTime<Utc>) -> TreasuryReport {
        let treasury = self.treasury.read().await;
        let transactions = self.transactions.read().await;
        
        let period_transactions: Vec<&TreasuryTransaction> = transactions
            .iter()
            .filter(|t| t.created_at >= start_date && t.created_at <= end_date)
            .collect();
        
        let revenue_collected: u64 = period_transactions
            .iter()
            .filter(|t| t.transaction_type == TreasuryTransactionType::FeeCollection)
            .map(|t| t.amount)
            .sum();
        
        let fees_paid: u64 = period_transactions
            .iter()
            .filter(|t| matches!(t.transaction_type, 
                TreasuryTransactionType::DevelopmentSpend | 
                TreasuryTransactionType::EmergencyWithdrawal |
                TreasuryTransactionType::BurnExecution
            ))
            .map(|t| t.amount)
            .sum();
        
        let net_growth = revenue_collected.saturating_sub(fees_paid);
        let growth_percentage = if treasury.total_assets > 0 {
            (net_growth as f64 / treasury.total_assets as f64) * 100.0
        } else {
            0.0
        };
        
        let mut asset_allocation = HashMap::new();
        asset_allocation.insert("DYO".to_string(), treasury.dyo_balance);
        asset_allocation.insert("DYS".to_string(), treasury.dys_balance);
        asset_allocation.insert("Reserve Fund".to_string(), treasury.reserve_fund);
        asset_allocation.insert("Development Fund".to_string(), treasury.development_fund);
        asset_allocation.insert("Burn Pool".to_string(), treasury.burn_pool);
        
        TreasuryReport {
            period_start: start_date,
            period_end: end_date,
            total_assets: treasury.total_assets,
            asset_allocation,
            revenue_collected,
            fees_paid,
            net_growth,
            growth_percentage,
            transactions_count: period_transactions.len() as u64,
            generated_at: Utc::now(),
        }
    }

    pub async fn get_treasury_status(&self) -> Treasury {
        let treasury = self.treasury.read().await;
        treasury.clone()
    }

    // ===========================================
    // UTILITY FUNCTIONS
    // ===========================================

    async fn get_conversion_rate(&self) -> f64 {
        // In a real implementation, this would fetch the current DYO/DYS rate from the DEX
        // For now, we'll return a fixed rate
        1.0
    }

    async fn record_transaction(&self, transaction: TreasuryTransaction) -> String {
        let transaction_id = transaction.id.clone();
        let mut transactions = self.transactions.write().await;
        transactions.push(transaction);
        transaction_id
    }

    // ===========================================
    // RISK MANAGEMENT
    // ===========================================

    pub async fn assess_risk(&self) -> RiskAssessment {
        let treasury = self.treasury.read().await;
        
        let reserve_ratio = if treasury.total_assets > 0 {
            treasury.reserve_fund as f64 / treasury.total_assets as f64
        } else {
            0.0
        };
        
        let diversification_score = self.calculate_diversification_score().await;
        let liquidity_score = self.calculate_liquidity_score().await;
        
        let overall_risk = match (reserve_ratio, diversification_score, liquidity_score) {
            (r, d, l) if r > 0.15 && d > 0.7 && l > 0.8 => RiskLevel::Conservative,
            (r, d, l) if r > 0.10 && d > 0.5 && l > 0.6 => RiskLevel::Moderate,
            _ => RiskLevel::Aggressive,
        };
        
        RiskAssessment {
            overall_risk,
            reserve_ratio,
            diversification_score,
            liquidity_score,
            recommendations: self.generate_risk_recommendations(overall_risk, reserve_ratio, diversification_score, liquidity_score),
            assessed_at: Utc::now(),
        }
    }

    async fn calculate_diversification_score(&self) -> f64 {
        // In a real implementation, this would analyze the distribution of assets
        // For now, we'll return a fixed score
        0.6
    }

    async fn calculate_liquidity_score(&self) -> f64 {
        // In a real implementation, this would analyze the liquidity of assets
        // For now, we'll return a fixed score
        0.7
    }

    fn generate_risk_recommendations(&self, risk_level: RiskLevel, reserve_ratio: f64, diversification_score: f64, liquidity_score: f64) -> Vec<String> {
        let mut recommendations = Vec::new();
        
        if reserve_ratio < 0.10 {
            recommendations.push("Increase reserve fund to at least 10% of total assets".to_string());
        }
        
        if diversification_score < 0.5 {
            recommendations.push("Diversify asset allocation across different categories".to_string());
        }
        
        if liquidity_score < 0.6 {
            recommendations.push("Increase liquidity by holding more stable assets".to_string());
        }
        
        match risk_level {
            RiskLevel::Aggressive => {
                recommendations.push("Consider reducing risk exposure".to_string());
                recommendations.push("Increase reserve fund allocation".to_string());
            },
            RiskLevel::Moderate => {
                recommendations.push("Current risk level is acceptable".to_string());
                recommendations.push("Monitor market conditions regularly".to_string());
            },
            RiskLevel::Conservative => {
                recommendations.push("Risk level is well-managed".to_string());
                recommendations.push("Consider slight increase in growth investments".to_string());
            },
        }
        
        recommendations
    }
}

// ===========================================
// SUPPORTING STRUCTS
// ===========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub overall_risk: RiskLevel,
    pub reserve_ratio: f64,
    pub diversification_score: f64,
    pub liquidity_score: f64,
    pub recommendations: Vec<String>,
    pub assessed_at: DateTime<Utc>,
}

// ===========================================
// TESTS
// ===========================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_treasury_manager() {
        let policy = TreasuryPolicy::default();
        let manager = TreasuryManager::new(policy);
        
        // Test fee collection
        let transaction_id = manager.collect_fees(1000, "dex_trading".to_string()).await.unwrap();
        assert!(!transaction_id.is_empty());
        
        let treasury = manager.get_treasury_status().await;
        assert_eq!(treasury.total_assets, 1000);
        assert_eq!(treasury.reserve_fund, 100); // 10% of 1000
        assert_eq!(treasury.development_fund, 200); // 20% of 1000
        assert_eq!(treasury.burn_pool, 50); // 5% of 1000
    }

    #[tokio::test]
    async fn test_auto_conversion() {
        let policy = TreasuryPolicy {
            auto_conversion_threshold: 500,
            ..Default::default()
        };
        let manager = TreasuryManager::new(policy);
        
        // Collect fees above threshold
        manager.collect_fees(1000, "dex_trading".to_string()).await.unwrap();
        
        let treasury = manager.get_treasury_status().await;
        assert_eq!(treasury.dyo_balance, 0); // Should be converted
        assert_eq!(treasury.dys_balance, 1000); // Converted to stablecoin
    }

    #[tokio::test]
    async fn test_burn_execution() {
        let policy = TreasuryPolicy::default();
        let manager = TreasuryManager::new(policy);
        
        // Collect fees to build burn pool
        manager.collect_fees(1000, "dex_trading".to_string()).await.unwrap();
        
        // Execute burn
        let burn_id = manager.execute_burn(50, "admin".to_string()).await.unwrap();
        assert!(!burn_id.is_empty());
        
        let treasury = manager.get_treasury_status().await;
        assert_eq!(treasury.burn_pool, 0);
        assert_eq!(treasury.total_assets, 950); // Reduced by burn amount
    }

    #[tokio::test]
    async fn test_emergency_withdrawal() {
        let policy = TreasuryPolicy {
            emergency_reserve_minimum: 50,
            ..Default::default()
        };
        let manager = TreasuryManager::new(policy);
        
        // Collect fees to build reserve
        manager.collect_fees(1000, "dex_trading".to_string()).await.unwrap();
        
        // Emergency withdrawal
        let withdrawal_id = manager.emergency_withdrawal(50, "Emergency".to_string(), "admin".to_string()).await.unwrap();
        assert!(!withdrawal_id.is_empty());
        
        let treasury = manager.get_treasury_status().await;
        assert_eq!(treasury.reserve_fund, 50); // 100 - 50
    }

    #[tokio::test]
    async fn test_treasury_reporting() {
        let policy = TreasuryPolicy::default();
        let manager = TreasuryManager::new(policy);
        
        // Collect some fees
        manager.collect_fees(1000, "dex_trading".to_string()).await.unwrap();
        manager.collect_fees(500, "nft_marketplace".to_string()).await.unwrap();
        
        let start_date = Utc::now() - chrono::Duration::days(1);
        let end_date = Utc::now();
        
        let report = manager.generate_treasury_report(start_date, end_date).await;
        
        assert_eq!(report.total_assets, 1500);
        assert_eq!(report.revenue_collected, 1500);
        assert_eq!(report.transactions_count, 2);
    }
}
