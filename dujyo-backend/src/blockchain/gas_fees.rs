//! Gas Fees System for DUJYO Blockchain
//! 
//! This module implements a hybrid gas fee model:
//! - ✅ MVP-CRITICAL: Price fixing in USD (converted to DYO automatically)
//! - ✅ MVP-CRITICAL: Auto-swap mechanism (DYS → DYO if insufficient balance)
//! - Fixed fees for simple transactions (in USD, predictable)
//! - Dynamic fees for complex operations (percentage-based)
//! - Free transactions for Stream-to-Earn (incentivizes content consumption)
//! - Discounts for Premium users and Creative Validators

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TransactionType {
    // Financial transactions
    Transfer,
    TransferWithData,
    MultiSigTransfer,
    
    // Content transactions (unique to DUJYO)
    StreamEarn,        // FREE - incentivizes consumption
    UploadContent,
    MintNFT,
    TransferNFT,
    
    // DEX transactions
    DexSwap,
    AddLiquidity,
    RemoveLiquidity,
    
    // Staking transactions
    Stake,
    Unstake,
    ClaimRewards,
    
    // Validation transactions (CPV)
    RegisterValidator,
    ProposeBlock,      // FREE for validators
    Vote,
    
    // Social transactions
    Follow,
    Comment,
    Like,
    Review,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GasFeeModel {
    /// Fixed fee in USD (converted to DYO automatically)
    Fixed(f64),
    
    /// Percentage of transaction amount
    Percentage(f64),
    
    /// Hybrid: base fee (USD) + percentage
    Hybrid {
        base: f64,      // Base fee in USD
        percentage: f64,
        min: f64,        // Min fee in USD
        max: Option<f64>, // Max fee in USD
    },
    
    /// Free transaction (no gas fee)
    Free,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasFeeConfig {
    pub transaction_type: TransactionType,
    pub model: GasFeeModel,
    pub min_fee: f64,
    pub max_fee: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserTier {
    Regular,
    Premium,           // 50% discount
    CreativeValidator, // 50% discount
    CommunityValidator, // 25% discount
    EconomicValidator, // No discount (they have stake)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkState {
    pub congestion_level: f64, // 0.0 to 1.0 (0 = no congestion, 1 = max congestion)
    pub dyo_price_usd: f64,    // Current DYO price in USD
    pub daily_volume: f64,     // Daily transaction volume
}

// ============================================================================
// GAS FEE CALCULATOR
// ============================================================================

pub struct GasFeeCalculator {
    configs: HashMap<TransactionType, GasFeeConfig>,
}

impl GasFeeCalculator {
    pub fn new() -> Self {
        let mut configs = HashMap::new();
        
        // ✅ MVP-CRITICAL: All fees now in USD (will be converted to DYO automatically)
        // Financial transactions
        configs.insert(TransactionType::Transfer, GasFeeConfig {
            transaction_type: TransactionType::Transfer,
            model: GasFeeModel::Fixed(0.001), // $0.001 USD
            min_fee: 0.001, // Min in DYO (legacy, will be converted)
            max_fee: None,
        });
        
        configs.insert(TransactionType::TransferWithData, GasFeeConfig {
            transaction_type: TransactionType::TransferWithData,
            model: GasFeeModel::Fixed(0.002), // $0.002 USD
            min_fee: 0.002,
            max_fee: None,
        });
        
        configs.insert(TransactionType::MultiSigTransfer, GasFeeConfig {
            transaction_type: TransactionType::MultiSigTransfer,
            model: GasFeeModel::Fixed(0.005), // $0.005 USD
            min_fee: 0.005,
            max_fee: None,
        });
        
        // Content transactions
        configs.insert(TransactionType::StreamEarn, GasFeeConfig {
            transaction_type: TransactionType::StreamEarn,
            model: GasFeeModel::Free,
            min_fee: 0.0,
            max_fee: None,
        });
        
        configs.insert(TransactionType::UploadContent, GasFeeConfig {
            transaction_type: TransactionType::UploadContent,
            model: GasFeeModel::Fixed(0.02), // $0.02 USD
            min_fee: 0.1, // Legacy min in DYO
            max_fee: None,
        });
        
        configs.insert(TransactionType::MintNFT, GasFeeConfig {
            transaction_type: TransactionType::MintNFT,
            model: GasFeeModel::Fixed(0.05), // $0.05 USD
            min_fee: 0.05,
            max_fee: None,
        });
        
        configs.insert(TransactionType::TransferNFT, GasFeeConfig {
            transaction_type: TransactionType::TransferNFT,
            model: GasFeeModel::Fixed(0.001), // $0.001 USD
            min_fee: 0.01,
            max_fee: None,
        });
        
        // DEX transactions
        configs.insert(TransactionType::DexSwap, GasFeeConfig {
            transaction_type: TransactionType::DexSwap,
            model: GasFeeModel::Hybrid {
                base: 0.0, // Base in USD
                percentage: 0.003, // 0.3%
                min: 0.01, // Min $0.01 USD
                max: Some(10.0), // Max $10 USD
            },
            min_fee: 0.01,
            max_fee: Some(10.0),
        });
        
        configs.insert(TransactionType::AddLiquidity, GasFeeConfig {
            transaction_type: TransactionType::AddLiquidity,
            model: GasFeeModel::Fixed(0.02), // $0.02 USD
            min_fee: 0.1,
            max_fee: None,
        });
        
        configs.insert(TransactionType::RemoveLiquidity, GasFeeConfig {
            transaction_type: TransactionType::RemoveLiquidity,
            model: GasFeeModel::Fixed(0.02), // $0.02 USD
            min_fee: 0.05,
            max_fee: None,
        });
        
        // Staking transactions
        configs.insert(TransactionType::Stake, GasFeeConfig {
            transaction_type: TransactionType::Stake,
            model: GasFeeModel::Fixed(0.02), // $0.02 USD
            min_fee: 0.02,
            max_fee: None,
        });
        
        configs.insert(TransactionType::Unstake, GasFeeConfig {
            transaction_type: TransactionType::Unstake,
            model: GasFeeModel::Hybrid {
                base: 0.05, // $0.05 USD base
                percentage: 0.01, // 1% if early withdrawal
                min: 0.05, // Min $0.05 USD
                max: None,
            },
            min_fee: 0.05,
            max_fee: None,
        });
        
        configs.insert(TransactionType::ClaimRewards, GasFeeConfig {
            transaction_type: TransactionType::ClaimRewards,
            model: GasFeeModel::Fixed(0.01), // $0.01 USD
            min_fee: 0.01,
            max_fee: None,
        });
        
        // Validation transactions
        configs.insert(TransactionType::RegisterValidator, GasFeeConfig {
            transaction_type: TransactionType::RegisterValidator,
            model: GasFeeModel::Fixed(0.1), // $0.1 USD
            min_fee: 0.1,
            max_fee: None,
        });
        
        configs.insert(TransactionType::ProposeBlock, GasFeeConfig {
            transaction_type: TransactionType::ProposeBlock,
            model: GasFeeModel::Free,
            min_fee: 0.0,
            max_fee: None,
        });
        
        configs.insert(TransactionType::Vote, GasFeeConfig {
            transaction_type: TransactionType::Vote,
            model: GasFeeModel::Fixed(0.001), // $0.001 USD
            min_fee: 0.001,
            max_fee: None,
        });
        
        // Social transactions
        configs.insert(TransactionType::Follow, GasFeeConfig {
            transaction_type: TransactionType::Follow,
            model: GasFeeModel::Fixed(0.001), // $0.001 USD
            min_fee: 0.001,
            max_fee: None,
        });
        
        configs.insert(TransactionType::Comment, GasFeeConfig {
            transaction_type: TransactionType::Comment,
            model: GasFeeModel::Fixed(0.002), // $0.002 USD
            min_fee: 0.002,
            max_fee: None,
        });
        
        configs.insert(TransactionType::Like, GasFeeConfig {
            transaction_type: TransactionType::Like,
            model: GasFeeModel::Fixed(0.0005), // $0.0005 USD
            min_fee: 0.0005,
            max_fee: None,
        });
        
        configs.insert(TransactionType::Review, GasFeeConfig {
            transaction_type: TransactionType::Review,
            model: GasFeeModel::Fixed(0.005), // $0.005 USD
            min_fee: 0.005,
            max_fee: None,
        });
        
        Self { configs }
    }
    
    /// Calculate gas fee for a transaction
    /// Returns fee in DYO (converted from USD if needed)
    pub fn calculate_gas_fee(
        &self,
        tx_type: &TransactionType,
        amount: Option<f64>,
        user_tier: &UserTier,
        network_state: &NetworkState,
        is_early_unstake: bool,
    ) -> Result<f64, String> {
        let config = self.configs.get(tx_type)
            .ok_or_else(|| format!("Gas fee config not found for transaction type: {:?}", tx_type))?;
        
        // Calculate base fee in USD
        let base_fee_usd = match &config.model {
            GasFeeModel::Free => {
                return Ok(0.0);
            }
            GasFeeModel::Fixed(fee_usd) => *fee_usd,
            GasFeeModel::Percentage(percentage) => {
                // For percentage, calculate in USD based on amount value
                let amount = amount.ok_or("Amount required for percentage-based fee")?;
                // Assume amount is in DYO, convert to USD first, then apply percentage
                let amount_usd = amount * network_state.dyo_price_usd;
                amount_usd * percentage
            }
            GasFeeModel::Hybrid { base, percentage, min, max } => {
                // Base is in USD, percentage applies to transaction amount
                let percentage_fee_usd = if let Some(amt) = amount {
                    let amount_usd = amt * network_state.dyo_price_usd;
                    amount_usd * percentage
                } else {
                    0.0
                };
                let total_usd = base + percentage_fee_usd;
                
                // Apply min/max bounds (in USD)
                let bounded = total_usd.max(*min);
                if let Some(max_val) = *max {
                    bounded.min(max_val)
                } else {
                    bounded
                }
            }
        };
        
        // Apply network congestion multiplier (0.5x to 2.0x)
        let congestion_multiplier = 0.5 + (network_state.congestion_level * 1.5);
        let adjusted_fee_usd = base_fee_usd * congestion_multiplier;
        
        // Apply user tier discount
        let discount = match user_tier {
            UserTier::Regular => 0.0,
            UserTier::Premium => 0.5, // 50% discount
            UserTier::CreativeValidator => 0.5, // 50% discount
            UserTier::CommunityValidator => 0.25, // 25% discount
            UserTier::EconomicValidator => 0.0, // No discount
        };
        
        let final_fee_usd = adjusted_fee_usd * (1.0 - discount);
        
        // Apply min/max bounds from config
        // min_fee and max_fee in config are in USD (not DYO)
        // They represent the minimum/maximum fee in USD terms
        // IMPORTANT: Apply discount to min_fee as well so discounts work correctly
        let min_fee_usd = config.min_fee * (1.0 - discount); // Apply discount to min_fee
        let mut final_fee_usd = final_fee_usd.max(min_fee_usd);
        if let Some(max_fee) = config.max_fee {
            let max_fee_usd = max_fee; // Max fee doesn't get discount
            final_fee_usd = final_fee_usd.min(max_fee_usd);
        }
        
        // Special case: early unstake penalty (in USD)
        if is_early_unstake && *tx_type == TransactionType::Unstake {
            let amount_usd = amount.map(|a| a * network_state.dyo_price_usd).unwrap_or(0.0);
            let penalty_usd = amount_usd * 0.01; // 1% penalty
            final_fee_usd = final_fee_usd + penalty_usd;
        }
        
        // ✅ MVP-CRITICAL: Convert USD to DYO
        if network_state.dyo_price_usd <= 0.0 {
            return Err("Invalid DYO price in USD. Cannot calculate gas fee.".to_string());
        }
        let final_fee_dyo = final_fee_usd / network_state.dyo_price_usd;
        
        Ok(final_fee_dyo)
    }
    
    /// Calculate gas fee in USD (for display purposes)
    pub fn calculate_gas_fee_usd(
        &self,
        tx_type: &TransactionType,
        amount: Option<f64>,
        user_tier: &UserTier,
        network_state: &NetworkState,
        is_early_unstake: bool,
    ) -> Result<f64, String> {
        let fee_dyo = self.calculate_gas_fee(tx_type, amount, user_tier, network_state, is_early_unstake)?;
        Ok(fee_dyo * network_state.dyo_price_usd)
    }
    
    /// Get gas fee config for a transaction type
    pub fn get_config(&self, tx_type: &TransactionType) -> Option<&GasFeeConfig> {
        self.configs.get(tx_type)
    }
    
    /// Check if transaction is free
    pub fn is_free(&self, tx_type: &TransactionType) -> bool {
        if let Some(config) = self.configs.get(tx_type) {
            matches!(config.model, GasFeeModel::Free)
        } else {
            false
        }
    }
}

// ============================================================================
// AUTO-SWAP MECHANISM (MVP-CRITICAL)
// ============================================================================

/// Result of auto-swap operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoSwapResult {
    pub success: bool,
    pub dyo_received: f64,
    pub dys_used: f64,
    pub swap_executed: bool,
    pub message: String,
}

/// ✅ MVP-CRITICAL: Auto-swap mechanism for gas fees
/// If user doesn't have enough DYO, automatically swap from DYS (stablecoin)
/// 
/// This function should be called before executing a transaction when:
/// 1. Gas fee is calculated
/// 2. User balance in DYO is insufficient
/// 3. User has DYS balance available
pub async fn handle_gas_fee_with_auto_swap(
    required_dyo: f64,
    user_dyo_balance: f64,
    user_dys_balance: f64,
    user_address: &str,
    dyo_price_usd: f64,
    dex: &mut crate::dex::DEX,
) -> Result<AutoSwapResult, String> {
    // If transaction is free, no swap needed
    if required_dyo == 0.0 {
        return Ok(AutoSwapResult {
            success: true,
            dyo_received: 0.0,
            dys_used: 0.0,
            swap_executed: false,
            message: "Transaction is free, no gas fee required".to_string(),
        });
    }
    
    // If user has enough DYO, no swap needed
    if user_dyo_balance >= required_dyo {
        return Ok(AutoSwapResult {
            success: true,
            dyo_received: 0.0,
            dys_used: 0.0,
            swap_executed: false,
            message: "Sufficient DYO balance, no swap needed".to_string(),
        });
    }
    
    // Calculate how much DYO we need to swap
    let dyo_needed = required_dyo - user_dyo_balance;
    
    // Calculate how much DYS we need (DYS is pegged to USD: 1 DYS = $1 USD)
    // DYO price in USD: dyo_price_usd
    // So: dyo_needed * dyo_price_usd = dys_needed
    let dys_needed = dyo_needed * dyo_price_usd;
    
    // Add 5% buffer for slippage and DEX fees
    let dys_with_buffer = dys_needed * 1.05;
    
    // Check if user has enough DYS
    if user_dys_balance < dys_with_buffer {
        return Err(format!(
            "Insufficient balance. Need {} DYO (or {} DYS), but only have {} DYO and {} DYS",
            required_dyo, dys_with_buffer, user_dyo_balance, user_dys_balance
        ));
    }
    
    // Execute swap: DYS -> DYO
    // Use DEX swap function
    let swap_request = crate::dex::SwapRequest {
        from: "DYS".to_string(),
        to: "DYO".to_string(),
        amount: dys_with_buffer,
        min_received: dyo_needed * 0.95, // 5% slippage tolerance
        user: user_address.to_string(),
    };
    
    match dex.execute_swap(swap_request) {
        Ok(swap_response) => {
            if let Some(amount_received) = swap_response.amount_received {
                Ok(AutoSwapResult {
                    success: true,
                    dyo_received: amount_received,
                    dys_used: dys_with_buffer,
                    swap_executed: true,
                    message: format!(
                        "Auto-swapped {} DYS for {} DYO to pay gas fee",
                        dys_with_buffer, amount_received
                    ),
                })
            } else {
                Err("Swap executed but no amount received".to_string())
            }
        }
        Err(e) => Err(format!("Auto-swap failed: {}", e)),
    }
}

impl Default for GasFeeCalculator {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// FEE DISTRIBUTION
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeDistribution {
    pub treasury: f64,      // 40%
    pub validators: f64,    // 30%
    pub liquidity_providers: f64, // 20%
    pub burn: f64,          // 10%
}

impl FeeDistribution {
    pub fn distribute(fee_amount: f64) -> Self {
        Self {
            treasury: fee_amount * 0.40,
            validators: fee_amount * 0.30,
            liquidity_providers: fee_amount * 0.20,
            burn: fee_amount * 0.10,
        }
    }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub max_per_hour: u32,
    pub max_per_day: u32,
    pub max_per_minute: Option<u32>,
}

pub struct RateLimiter {
    limits: HashMap<TransactionType, RateLimitConfig>,
}

impl RateLimiter {
    pub fn new() -> Self {
        let mut limits = HashMap::new();
        
        limits.insert(TransactionType::StreamEarn, RateLimitConfig {
            max_per_hour: 100,
            max_per_day: 1000,
            max_per_minute: Some(10),
        });
        
        limits.insert(TransactionType::UploadContent, RateLimitConfig {
            max_per_hour: 5,
            max_per_day: 10,
            max_per_minute: None,
        });
        
        limits.insert(TransactionType::Comment, RateLimitConfig {
            max_per_hour: 30,
            max_per_day: 200,
            max_per_minute: Some(5),
        });
        
        limits.insert(TransactionType::Like, RateLimitConfig {
            max_per_hour: 100,
            max_per_day: 1000,
            max_per_minute: Some(20),
        });
        
        Self { limits }
    }
    
    pub fn get_limit(&self, tx_type: &TransactionType) -> Option<&RateLimitConfig> {
        self.limits.get(tx_type)
    }
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_free_transactions() {
        let calculator = GasFeeCalculator::new();
        let network_state = NetworkState {
            congestion_level: 0.0,
            dyo_price_usd: 0.001,
            daily_volume: 1000.0,
        };
        
        // Stream-to-Earn should be free
        let fee = calculator.calculate_gas_fee(
            &TransactionType::StreamEarn,
            None,
            &UserTier::Regular,
            &network_state,
            false,
        ).unwrap();
        assert_eq!(fee, 0.0);
        
        // Propose Block should be free
        let fee = calculator.calculate_gas_fee(
            &TransactionType::ProposeBlock,
            None,
            &UserTier::Regular,
            &network_state,
            false,
        ).unwrap();
        assert_eq!(fee, 0.0);
    }
    
    #[test]
    fn test_premium_discount() {
        let calculator = GasFeeCalculator::new();
        let network_state = NetworkState {
            congestion_level: 0.0,
            dyo_price_usd: 0.001,
            daily_volume: 1000.0,
        };
        
        // Regular user
        let regular_fee = calculator.calculate_gas_fee(
            &TransactionType::Transfer,
            None,
            &UserTier::Regular,
            &network_state,
            false,
        ).unwrap();
        
        // Premium user (50% discount)
        let premium_fee = calculator.calculate_gas_fee(
            &TransactionType::Transfer,
            None,
            &UserTier::Premium,
            &network_state,
            false,
        ).unwrap();
        
        assert_eq!(premium_fee, regular_fee * 0.5);
    }
    
    #[test]
    fn test_dex_swap_fee() {
        let calculator = GasFeeCalculator::new();
        let network_state = NetworkState {
            congestion_level: 0.0,
            dyo_price_usd: 0.001, // $0.001 per DYO
            daily_volume: 1000.0,
        };
        
        // Swap of 1000 DYO = $1 USD
        // 0.3% of $1 = $0.003 USD
        // $0.003 / $0.001 = 3 DYO
        let fee = calculator.calculate_gas_fee(
            &TransactionType::DexSwap,
            Some(1000.0),
            &UserTier::Regular,
            &network_state,
            false,
        ).unwrap();
        
        // Should be approximately 3 DYO (0.3% of $1 USD = $0.003 = 3 DYO at $0.001/DYO)
        // But with min of $0.01 USD = 10 DYO
        assert!(fee >= 10.0); // Min fee is $0.01 USD = 10 DYO
    }
    
    #[test]
    fn test_price_fixing_usd() {
        let calculator = GasFeeCalculator::new();
        
        // Test with different DYO prices
        let network_state_low = NetworkState {
            congestion_level: 0.0,
            dyo_price_usd: 0.0005, // Lower price
            daily_volume: 1000.0,
        };
        
        let network_state_high = NetworkState {
            congestion_level: 0.0,
            dyo_price_usd: 0.002, // Higher price
            daily_volume: 1000.0,
        };
        
        // Transfer fee is $0.001 USD fixed
        let fee_low = calculator.calculate_gas_fee(
            &TransactionType::Transfer,
            None,
            &UserTier::Regular,
            &network_state_low,
            false,
        ).unwrap();
        
        let fee_high = calculator.calculate_gas_fee(
            &TransactionType::Transfer,
            None,
            &UserTier::Regular,
            &network_state_high,
            false,
        ).unwrap();
        
        // At $0.0005/DYO: $0.001 / $0.0005 = 2 DYO
        // At $0.002/DYO: $0.001 / $0.002 = 0.5 DYO
        assert!(fee_low > fee_high); // Lower DYO price = more DYO needed
    }
}

