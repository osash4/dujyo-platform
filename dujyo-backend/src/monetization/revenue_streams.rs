//! Revenue Streams for Dujyo
//! 
//! This module implements multiple revenue streams:
//! - DEX trading fees (0.3%)
//! - Premium features and subscriptions
//! - Artist promotion and advertising
//! - NFT marketplace fees (2.5%)
//! - Staking fees (1% early unstake)
//! - Transaction fees
//! - Premium content access
//! - Virtual goods and cosmetics

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
pub struct RevenueStream {
    pub id: String,
    pub name: String,
    pub description: String,
    pub stream_type: RevenueStreamType,
    pub fee_percentage: f64,
    pub fixed_fee: Option<u64>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RevenueStreamType {
    DexTrading,
    PremiumSubscription,
    ArtistPromotion,
    NftMarketplace,
    Staking,
    Transaction,
    PremiumContent,
    VirtualGoods,
    Advertising,
    DataAnalytics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevenueTransaction {
    pub id: String,
    pub stream_id: String,
    pub user_id: String,
    pub amount: u64,
    pub fee_amount: u64,
    pub currency: String,
    pub transaction_type: TransactionType,
    pub metadata: HashMap<String, serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TransactionType {
    Trading,
    Subscription,
    Promotion,
    NftSale,
    Staking,
    Transaction,
    Content,
    Goods,
    Advertisement,
    Analytics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevenueReport {
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub total_revenue: u64,
    pub revenue_by_stream: HashMap<String, u64>,
    pub transaction_count: u64,
    pub average_transaction_value: f64,
    pub top_revenue_streams: Vec<(String, u64)>,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreasuryManagement {
    pub total_fees_collected: u64,
    pub reserve_fund: u64,
    pub development_fund: u64,
    pub burn_amount: u64,
    pub auto_conversion_enabled: bool,
    pub last_conversion: Option<DateTime<Utc>>,
    pub conversion_rate: f64,
}

// ===========================================
// REVENUE MANAGER
// ===========================================

pub struct RevenueManager {
    streams: Arc<RwLock<HashMap<String, RevenueStream>>>,
    transactions: Arc<RwLock<Vec<RevenueTransaction>>>,
    treasury: Arc<RwLock<TreasuryManagement>>,
    config: RevenueConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevenueConfig {
    pub dex_fee_percentage: f64,
    pub nft_marketplace_fee_percentage: f64,
    pub staking_early_unstake_fee_percentage: f64,
    pub premium_subscription_monthly_fee: u64,
    pub artist_promotion_base_fee: u64,
    pub transaction_fee_base: u64,
    pub reserve_fund_percentage: f64,
    pub development_fund_percentage: f64,
    pub burn_percentage: f64,
    pub auto_conversion_threshold: u64,
}

impl Default for RevenueConfig {
    fn default() -> Self {
        Self {
            dex_fee_percentage: 0.3,
            nft_marketplace_fee_percentage: 2.5,
            staking_early_unstake_fee_percentage: 1.0,
            premium_subscription_monthly_fee: 1000, // 10 DYO
            artist_promotion_base_fee: 500, // 5 DYO
            transaction_fee_base: 10, // 0.1 DYO
            reserve_fund_percentage: 10.0,
            development_fund_percentage: 20.0,
            burn_percentage: 5.0,
            auto_conversion_threshold: 10000, // 100 DYO
        }
    }
}

impl RevenueManager {
    pub fn new(config: RevenueConfig) -> Self {
        let mut streams = HashMap::new();
        
        // Initialize default revenue streams
        let default_streams = vec![
            RevenueStream {
                id: "dex_trading".to_string(),
                name: "DEX Trading Fees".to_string(),
                description: "Fees from decentralized exchange trading".to_string(),
                stream_type: RevenueStreamType::DexTrading,
                fee_percentage: config.dex_fee_percentage,
                fixed_fee: None,
                is_active: true,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            RevenueStream {
                id: "nft_marketplace".to_string(),
                name: "NFT Marketplace Fees".to_string(),
                description: "Fees from NFT sales and transactions".to_string(),
                stream_type: RevenueStreamType::NftMarketplace,
                fee_percentage: config.nft_marketplace_fee_percentage,
                fixed_fee: None,
                is_active: true,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            RevenueStream {
                id: "premium_subscription".to_string(),
                name: "Premium Subscriptions".to_string(),
                description: "Monthly premium subscription fees".to_string(),
                stream_type: RevenueStreamType::PremiumSubscription,
                fee_percentage: 0.0,
                fixed_fee: Some(config.premium_subscription_monthly_fee),
                is_active: true,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            RevenueStream {
                id: "artist_promotion".to_string(),
                name: "Artist Promotion".to_string(),
                description: "Fees for artist promotion and advertising".to_string(),
                stream_type: RevenueStreamType::ArtistPromotion,
                fee_percentage: 0.0,
                fixed_fee: Some(config.artist_promotion_base_fee),
                is_active: true,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            RevenueStream {
                id: "staking_fees".to_string(),
                name: "Staking Fees".to_string(),
                description: "Fees for early unstaking".to_string(),
                stream_type: RevenueStreamType::Staking,
                fee_percentage: config.staking_early_unstake_fee_percentage,
                fixed_fee: None,
                is_active: true,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
        ];
        
        for stream in default_streams {
            streams.insert(stream.id.clone(), stream);
        }
        
        Self {
            streams: Arc::new(RwLock::new(streams)),
            transactions: Arc::new(RwLock::new(Vec::new())),
            treasury: Arc::new(RwLock::new(TreasuryManagement {
                total_fees_collected: 0,
                reserve_fund: 0,
                development_fund: 0,
                burn_amount: 0,
                auto_conversion_enabled: true,
                last_conversion: None,
                conversion_rate: 1.0,
            })),
            config,
        }
    }

    // ===========================================
    // REVENUE STREAM MANAGEMENT
    // ===========================================

    pub async fn add_revenue_stream(&self, stream: RevenueStream) -> Result<(), String> {
        let mut streams = self.streams.write().await;
        streams.insert(stream.id.clone(), stream);
        Ok(())
    }

    pub async fn get_revenue_stream(&self, stream_id: &str) -> Option<RevenueStream> {
        let streams = self.streams.read().await;
        streams.get(stream_id).cloned()
    }

    pub async fn get_all_revenue_streams(&self) -> Vec<RevenueStream> {
        let streams = self.streams.read().await;
        streams.values().cloned().collect()
    }

    pub async fn update_revenue_stream(&self, stream_id: &str, updates: RevenueStreamUpdate) -> Result<(), String> {
        let mut streams = self.streams.write().await;
        if let Some(stream) = streams.get_mut(stream_id) {
            if let Some(fee_percentage) = updates.fee_percentage {
                stream.fee_percentage = fee_percentage;
            }
            if let Some(fixed_fee) = updates.fixed_fee {
                stream.fixed_fee = Some(fixed_fee);
            }
            if let Some(is_active) = updates.is_active {
                stream.is_active = is_active;
            }
            stream.updated_at = Utc::now();
            Ok(())
        } else {
            Err("Revenue stream not found".to_string())
        }
    }

    // ===========================================
    // FEE CALCULATION
    // ===========================================

    pub async fn calculate_fee(&self, stream_id: &str, amount: u64) -> Result<u64, String> {
        let streams = self.streams.read().await;
        if let Some(stream) = streams.get(stream_id) {
            if !stream.is_active {
                return Ok(0);
            }
            
            let fee = if let Some(fixed_fee) = stream.fixed_fee {
                fixed_fee
            } else {
                ((amount as f64 * stream.fee_percentage) / 100.0) as u64
            };
            
            Ok(fee)
        } else {
            Err("Revenue stream not found".to_string())
        }
    }

    pub async fn process_transaction(&self, stream_id: &str, user_id: String, amount: u64, currency: String, metadata: HashMap<String, serde_json::Value>) -> Result<RevenueTransaction, String> {
        let fee_amount = self.calculate_fee(stream_id, amount).await?;
        
        let transaction = RevenueTransaction {
            id: Uuid::new_v4().to_string(),
            stream_id: stream_id.to_string(),
            user_id,
            amount,
            fee_amount,
            currency,
            transaction_type: self.get_transaction_type_from_stream(stream_id),
            metadata,
            created_at: Utc::now(),
        };
        
        // Store transaction
        {
            let mut transactions = self.transactions.write().await;
            transactions.push(transaction.clone());
        }
        
        // Update treasury
        self.update_treasury(fee_amount).await;
        
        Ok(transaction)
    }

    fn get_transaction_type_from_stream(&self, stream_id: &str) -> TransactionType {
        match stream_id {
            "dex_trading" => TransactionType::Trading,
            "nft_marketplace" => TransactionType::NftSale,
            "premium_subscription" => TransactionType::Subscription,
            "artist_promotion" => TransactionType::Promotion,
            "staking_fees" => TransactionType::Staking,
            _ => TransactionType::Transaction,
        }
    }

    // ===========================================
    // TREASURY MANAGEMENT
    // ===========================================

    async fn update_treasury(&self, fee_amount: u64) {
        let mut treasury = self.treasury.write().await;
        treasury.total_fees_collected += fee_amount;
        
        // Calculate allocations
        let reserve_amount = ((fee_amount as f64 * self.config.reserve_fund_percentage) / 100.0) as u64;
        let development_amount = ((fee_amount as f64 * self.config.development_fund_percentage) / 100.0) as u64;
        let burn_amount = ((fee_amount as f64 * self.config.burn_percentage) / 100.0) as u64;
        
        treasury.reserve_fund += reserve_amount;
        treasury.development_fund += development_amount;
        treasury.burn_amount += burn_amount;
        
        // Check if auto-conversion is needed
        if treasury.auto_conversion_enabled && treasury.total_fees_collected >= self.config.auto_conversion_threshold {
            self.auto_convert_to_stablecoin().await;
        }
    }

    async fn auto_convert_to_stablecoin(&self) {
        let mut treasury = self.treasury.write().await;
        
        // In a real implementation, this would trigger a DEX swap
        // For now, we'll just update the timestamp
        treasury.last_conversion = Some(Utc::now());
        
        // Reset the counter
        treasury.total_fees_collected = 0;
    }

    pub async fn get_treasury_status(&self) -> TreasuryManagement {
        let treasury = self.treasury.read().await;
        treasury.clone()
    }

    pub async fn manual_conversion(&self) -> Result<(), String> {
        let mut treasury = self.treasury.write().await;
        
        if treasury.total_fees_collected == 0 {
            return Err("No fees to convert".to_string());
        }
        
        // Trigger conversion
        treasury.last_conversion = Some(Utc::now());
        treasury.total_fees_collected = 0;
        
        Ok(())
    }

    // ===========================================
    // REPORTING
    // ===========================================

    pub async fn generate_revenue_report(&self, start_date: DateTime<Utc>, end_date: DateTime<Utc>) -> RevenueReport {
        let transactions = self.transactions.read().await;
        
        let period_transactions: Vec<&RevenueTransaction> = transactions
            .iter()
            .filter(|t| t.created_at >= start_date && t.created_at <= end_date)
            .collect();
        
        let total_revenue: u64 = period_transactions.iter().map(|t| t.fee_amount).sum();
        let transaction_count = period_transactions.len() as u64;
        let average_transaction_value = if transaction_count > 0 {
            total_revenue as f64 / transaction_count as f64
        } else {
            0.0
        };
        
        // Calculate revenue by stream
        let mut revenue_by_stream: HashMap<String, u64> = HashMap::new();
        for transaction in &period_transactions {
            *revenue_by_stream.entry(transaction.stream_id.clone()).or_insert(0) += transaction.fee_amount;
        }
        
        // Get top revenue streams
        let mut top_revenue_streams: Vec<(String, u64)> = revenue_by_stream
            .iter()
            .map(|(k, v)| (k.clone(), *v))
            .collect();
        top_revenue_streams.sort_by(|a, b| b.1.cmp(&a.1));
        
        RevenueReport {
            period_start: start_date,
            period_end: end_date,
            total_revenue,
            revenue_by_stream,
            transaction_count,
            average_transaction_value,
            top_revenue_streams,
            generated_at: Utc::now(),
        }
    }

    pub async fn get_revenue_by_stream(&self, stream_id: &str, days: u32) -> u64 {
        let transactions = self.transactions.read().await;
        let cutoff_date = Utc::now() - chrono::Duration::days(days as i64);
        
        transactions
            .iter()
            .filter(|t| t.stream_id == stream_id && t.created_at >= cutoff_date)
            .map(|t| t.fee_amount)
            .sum()
    }

    pub async fn get_total_revenue(&self, days: u32) -> u64 {
        let transactions = self.transactions.read().await;
        let cutoff_date = Utc::now() - chrono::Duration::days(days as i64);
        
        transactions
            .iter()
            .filter(|t| t.created_at >= cutoff_date)
            .map(|t| t.fee_amount)
            .sum()
    }

    // ===========================================
    // ANALYTICS
    // ===========================================

    pub async fn get_revenue_analytics(&self) -> RevenueAnalytics {
        let transactions = self.transactions.read().await;
        let streams = self.streams.read().await;
        
        let total_transactions = transactions.len();
        let total_revenue: u64 = transactions.iter().map(|t| t.fee_amount).sum();
        
        let mut stream_performance: HashMap<String, StreamPerformance> = HashMap::new();
        
        for (stream_id, stream) in streams.iter() {
            let stream_transactions: Vec<&RevenueTransaction> = transactions
                .iter()
                .filter(|t| t.stream_id == stream_id)
                .collect();
            
            let stream_revenue: u64 = stream_transactions.iter().map(|t| t.fee_amount).sum();
            let transaction_count = stream_transactions.len();
            let average_transaction_value = if transaction_count > 0 {
                stream_revenue as f64 / transaction_count as f64
            } else {
                0.0
            };
            
            stream_performance.insert(stream_id.clone(), StreamPerformance {
                stream_id: stream_id.clone(),
                stream_name: stream.name.clone(),
                total_revenue: stream_revenue,
                transaction_count,
                average_transaction_value,
                is_active: stream.is_active,
            });
        }
        
        RevenueAnalytics {
            total_revenue,
            total_transactions,
            active_streams: streams.values().filter(|s| s.is_active).count(),
            stream_performance,
            generated_at: Utc::now(),
        }
    }
}

// ===========================================
// SUPPORTING STRUCTS
// ===========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevenueStreamUpdate {
    pub fee_percentage: Option<f64>,
    pub fixed_fee: Option<u64>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevenueAnalytics {
    pub total_revenue: u64,
    pub total_transactions: usize,
    pub active_streams: usize,
    pub stream_performance: HashMap<String, StreamPerformance>,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamPerformance {
    pub stream_id: String,
    pub stream_name: String,
    pub total_revenue: u64,
    pub transaction_count: usize,
    pub average_transaction_value: f64,
    pub is_active: bool,
}

// ===========================================
// PREMIUM FEATURES
// ===========================================

pub struct PremiumFeatures {
    revenue_manager: Arc<RevenueManager>,
}

impl PremiumFeatures {
    pub fn new(revenue_manager: Arc<RevenueManager>) -> Self {
        Self { revenue_manager }
    }

    pub async fn create_premium_subscription(&self, user_id: String, plan: PremiumPlan) -> Result<String, String> {
        let mut metadata = HashMap::new();
        metadata.insert("plan".to_string(), serde_json::json!(plan));
        metadata.insert("duration".to_string(), serde_json::json!("monthly"));
        
        let transaction = self.revenue_manager
            .process_transaction("premium_subscription", user_id, plan.monthly_fee, "DYO".to_string(), metadata)
            .await?;
        
        Ok(transaction.id)
    }

    pub async fn process_artist_promotion(&self, user_id: String, promotion_type: PromotionType) -> Result<String, String> {
        let mut metadata = HashMap::new();
        metadata.insert("promotion_type".to_string(), serde_json::json!(promotion_type));
        
        let fee = match promotion_type {
            PromotionType::Banner => 500, // 5 DYO
            PromotionType::Featured => 1000, // 10 DYO
            PromotionType::Sponsored => 2000, // 20 DYO
        };
        
        let transaction = self.revenue_manager
            .process_transaction("artist_promotion", user_id, fee, "DYO".to_string(), metadata)
            .await?;
        
        Ok(transaction.id)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PremiumPlan {
    pub name: String,
    pub monthly_fee: u64,
    pub features: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PromotionType {
    Banner,
    Featured,
    Sponsored,
}

// ===========================================
// TESTS
// ===========================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_revenue_manager() {
        let config = RevenueConfig::default();
        let manager = RevenueManager::new(config);
        
        // Test fee calculation
        let fee = manager.calculate_fee("dex_trading", 10000).await.unwrap();
        assert_eq!(fee, 30); // 0.3% of 10000
        
        // Test transaction processing
        let mut metadata = HashMap::new();
        metadata.insert("test".to_string(), serde_json::json!("value"));
        
        let transaction = manager.process_transaction(
            "dex_trading",
            "user_123".to_string(),
            10000,
            "DYO".to_string(),
            metadata,
        ).await.unwrap();
        
        assert_eq!(transaction.fee_amount, 30);
        assert_eq!(transaction.amount, 10000);
    }

    #[tokio::test]
    async fn test_treasury_management() {
        let config = RevenueConfig::default();
        let manager = RevenueManager::new(config);
        
        // Process a transaction
        let mut metadata = HashMap::new();
        metadata.insert("test".to_string(), serde_json::json!("value"));
        
        manager.process_transaction(
            "dex_trading",
            "user_123".to_string(),
            10000,
            "DYO".to_string(),
            metadata,
        ).await.unwrap();
        
        let treasury = manager.get_treasury_status().await;
        assert_eq!(treasury.total_fees_collected, 30);
        assert_eq!(treasury.reserve_fund, 3); // 10% of 30
        assert_eq!(treasury.development_fund, 6); // 20% of 30
        assert_eq!(treasury.burn_amount, 1); // 5% of 30
    }

    #[tokio::test]
    async fn test_revenue_reporting() {
        let config = RevenueConfig::default();
        let manager = RevenueManager::new(config);
        
        // Process some transactions
        let mut metadata = HashMap::new();
        metadata.insert("test".to_string(), serde_json::json!("value"));
        
        manager.process_transaction(
            "dex_trading",
            "user_123".to_string(),
            10000,
            "DYO".to_string(),
            metadata.clone(),
        ).await.unwrap();
        
        manager.process_transaction(
            "nft_marketplace",
            "user_456".to_string(),
            5000,
            "DYO".to_string(),
            metadata,
        ).await.unwrap();
        
        let start_date = Utc::now() - chrono::Duration::days(1);
        let end_date = Utc::now();
        
        let report = manager.generate_revenue_report(start_date, end_date).await;
        
        assert_eq!(report.total_revenue, 155); // 30 + 125
        assert_eq!(report.transaction_count, 2);
    }
}
