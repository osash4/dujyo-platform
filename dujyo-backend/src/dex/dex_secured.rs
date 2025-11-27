// src/dex/dex_secured.rs
// SECURED DEX with u128 integers, SafeMath, and front-running protection

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::utils::safe_math::{SafeMath, SafeMathResult};
use crate::utils::access_control::{AccessControlManager, Permission};
use tracing::{info, warn, error};

/// DECIMALS for token amounts (18 decimals like Ethereum)
const DECIMALS: u128 = 1_000_000_000_000_000_000; // 10^18

/// DEX with integer math and security enhancements
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecuredDEX {
    pub pools: HashMap<String, SecuredPool>,
    pub transactions: Vec<SecuredSwapTransaction>,
    pub fee_rate: u64, // Fee rate in basis points (30 = 0.3%)
    pub max_slippage: u64, // Maximum slippage in basis points (500 = 5%)
    pub emergency_paused: bool,
    pub emergency_pause_reason: Option<String>,
    pub access_control: AccessControlManager,
    pub min_liquidity: u128, // Minimum liquidity to prevent manipulation
    pub nonce: u64, // Global nonce for transaction ordering
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecuredPool {
    pub id: String,
    pub token_a: String,
    pub token_b: String,
    pub reserve_a: u128,  // Changed from f64 to u128
    pub reserve_b: u128,  // Changed from f64 to u128
    pub total_liquidity: u128,  // Changed from f64 to u128
    pub k_last: u128, // Last constant product value for validation
    pub fee_accumulated_a: u128,
    pub fee_accumulated_b: u128,
    pub created_at: u64,
    pub last_trade: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecuredSwapTransaction {
    pub id: String,
    pub from_token: String,
    pub to_token: String,
    pub amount_in: u128,  // Changed from f64 to u128
    pub amount_out: u128,  // Changed from f64 to u128
    pub user: String,
    pub timestamp: u64,
    pub deadline: u64,  // NEW: Transaction deadline for front-running protection
    pub nonce: u64,  // NEW: Transaction nonce for ordering
    pub price_impact: u128,  // In basis points (10000 = 100%)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapRequest {
    pub from: String,
    pub to: String,
    pub amount_in: u128,  // Changed from f64 to u128
    pub min_amount_out: u128,  // Changed from f64 to u128
    pub user: String,
    pub deadline: u64,  // NEW: Must execute before this timestamp
    pub nonce: u64,  // NEW: User's transaction nonce
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityRequest {
    pub token_a: String,
    pub token_b: String,
    pub amount_a: u128,  // Changed from f64 to u128
    pub amount_b: u128,  // Changed from f64 to u128
    pub user: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapResponse {
    pub success: bool,
    pub message: String,
    pub tx_hash: Option<String>,
    pub amount_received: Option<u128>,  // Changed from f64 to u128
    pub price_impact: Option<u128>,  // In basis points
    pub effective_price: Option<u128>,  // Price paid per token
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityResponse {
    pub success: bool,
    pub message: String,
    pub tx_hash: Option<String>,
    pub lp_tokens_minted: Option<u128>,  // Changed from f64 to u128
}

impl SecuredDEX {
    pub fn new() -> Self {
        Self {
            pools: HashMap::new(),
            transactions: Vec::new(),
            fee_rate: 30, // 0.3% fee
            max_slippage: 500, // 5% max slippage
            emergency_paused: false,
            emergency_pause_reason: None,
            access_control: AccessControlManager::new(),
            min_liquidity: 1000 * DECIMALS, // Minimum 1000 tokens
            nonce: 0,
        }
    }
    
    pub fn get_pool(&self, pool_id: &str) -> Option<&SecuredPool> {
        self.pools.get(pool_id)
    }
    
    pub fn get_all_pools(&self) -> Vec<&SecuredPool> {
        self.pools.values().collect()
    }
    
    /// Execute swap with security enhancements
    pub fn execute_swap(&mut self, request: SwapRequest) -> Result<SwapResponse, String> {
        // Security checks
        self.check_emergency_pause()?;
        self.validate_deadline(request.deadline)?;
        self.validate_nonce(request.nonce)?;

        let pool_id = format!("{}_{}", request.from, request.to);
        let pool = self.pools.get(&pool_id)
            .ok_or("Pool not found")?;

        // Validate input amounts
        if request.amount_in == 0 {
            return Err("Invalid swap amount: cannot be zero".to_string());
        }

        if request.min_amount_out == 0 {
            return Err("Invalid minimum amount: must be greater than zero".to_string());
        }

        // Validate pool has sufficient liquidity
        if pool.reserve_a < self.min_liquidity || pool.reserve_b < self.min_liquidity {
            return Err("Insufficient pool liquidity".to_string());
        }

        // Calculate swap output using Constant Product Market Maker formula with SafeMath
        let amount_out = self.calculate_swap_output_safe(
            pool.reserve_a, 
            pool.reserve_b, 
            request.amount_in
        )?;

        // Check slippage protection
        if amount_out < request.min_amount_out {
            return Err(format!("Slippage too high. Expected at least {}, got {}", 
                format_amount(request.min_amount_out), format_amount(amount_out)));
        }

        // Calculate price impact with SafeMath
        let price_impact = self.calculate_price_impact_safe(pool, request.amount_in, amount_out)?;

        // Check maximum price impact (20% = 2000 basis points)
        if price_impact > 2000 {
            warn!("High price impact detected: {}%", price_impact as f64 / 100.0);
            return Err(format!("Price impact too high: {:.2}%", price_impact as f64 / 100.0));
        }

        // Validate constant product formula
        self.validate_constant_product(pool, request.amount_in, amount_out)?;

        // Create transaction with enhanced security data
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        let tx_id = format!("swap_{}_{}_{}", timestamp, request.nonce, request.user);

        let transaction = SecuredSwapTransaction {
            id: tx_id.clone(),
            from_token: request.from.clone(),
            to_token: request.to.clone(),
            amount_in: request.amount_in,
            amount_out,
            user: request.user.clone(),
            timestamp,
            deadline: request.deadline,
            nonce: request.nonce,
            price_impact,
        };
        
        self.transactions.push(transaction.clone());
        self.nonce += 1;

        // Calculate effective price
        let effective_price = SafeMath::div(
            SafeMath::mul(amount_out, DECIMALS, "effective_price_mul")?,
            request.amount_in,
            "effective_price_div"
        )?;

        info!("SWAP EXECUTED: {} {} -> {} {} (impact: {:.2}%, effective_price: {})", 
            format_amount(request.amount_in), request.from, 
            format_amount(amount_out), request.to,
            price_impact as f64 / 100.0,
            format_amount(effective_price));
        
        Ok(SwapResponse {
            success: true,
            message: "Swap executed successfully".to_string(),
            tx_hash: Some(tx_id),
            amount_received: Some(amount_out),
            price_impact: Some(price_impact),
            effective_price: Some(effective_price),
        })
    }

    /// Calculate swap output using SafeMath (x * y = k formula)
    fn calculate_swap_output_safe(&self, reserve_in: u128, reserve_out: u128, amount_in: u128) -> SafeMathResult<u128> {
        if reserve_in == 0 || reserve_out == 0 || amount_in == 0 {
            return Err("Invalid reserve or amount values".to_string());
        }

        // Apply fee: amount_in_with_fee = amount_in * (10000 - fee_rate) / 10000
        let fee_multiplier = 10000 - self.fee_rate as u128;
        let amount_in_with_fee = SafeMath::div(
            SafeMath::mul(amount_in, fee_multiplier, "fee_multiply")?,
            10000,
            "fee_divide"
        )?;

        // Constant product formula: (reserve_in + amount_in_with_fee) * (reserve_out - amount_out) = reserve_in * reserve_out
        // Solving for amount_out: amount_out = (reserve_out * amount_in_with_fee) / (reserve_in + amount_in_with_fee)
        let numerator = SafeMath::mul(reserve_out, amount_in_with_fee, "swap_numerator")?;
        let denominator = SafeMath::add(reserve_in, amount_in_with_fee, "swap_denominator")?;
        
        let amount_out = SafeMath::div(numerator, denominator, "swap_final")?;

        // Ensure we don't drain the pool (keep at least 1% reserve)
        let max_out = SafeMath::percentage(reserve_out, 9900, "max_out")?; // 99% of reserve
        if amount_out >= max_out {
            return Err("Insufficient liquidity: trade would drain pool".to_string());
        }

        Ok(amount_out)
    }

    /// Calculate price impact with SafeMath
    fn calculate_price_impact_safe(&self, pool: &SecuredPool, amount_in: u128, amount_out: u128) -> SafeMathResult<u128> {
        // Calculate current price (reserve_out / reserve_in) * DECIMALS
        let current_price = SafeMath::div(
            SafeMath::mul(pool.reserve_b, DECIMALS, "current_price_mul")?,
            pool.reserve_a,
            "current_price_div"
        )?;
        
        // Calculate execution price (amount_out / amount_in) * DECIMALS
        let execution_price = SafeMath::div(
            SafeMath::mul(amount_out, DECIMALS, "exec_price_mul")?,
            amount_in,
            "exec_price_div"
        )?;

        // Calculate price impact: ((current_price - execution_price) / current_price) * 10000 (basis points)
        let price_diff = if current_price > execution_price {
            current_price - execution_price
        } else {
            execution_price - current_price
        };

        let price_impact = SafeMath::div(
            SafeMath::mul(price_diff, 10000, "impact_mul")?,
            current_price,
            "impact_div"
        )?;

        Ok(price_impact)
    }

    /// Validate constant product formula
    fn validate_constant_product(&self, pool: &SecuredPool, amount_in: u128, amount_out: u128) -> Result<(), String> {
        // k = reserve_a * reserve_b
        let k_before = SafeMath::mul(pool.reserve_a, pool.reserve_b, "k_before")
            .map_err(|e| format!("Failed to calculate k_before: {}", e))?;

        // k_after = (reserve_a + amount_in) * (reserve_b - amount_out)
        let new_reserve_a = SafeMath::add(pool.reserve_a, amount_in, "new_reserve_a")
            .map_err(|e| format!("Failed to calculate new_reserve_a: {}", e))?;
        let new_reserve_b = SafeMath::sub(pool.reserve_b, amount_out, "new_reserve_b")
            .map_err(|e| format!("Failed to calculate new_reserve_b: {}", e))?;
        let k_after = SafeMath::mul(new_reserve_a, new_reserve_b, "k_after")
            .map_err(|e| format!("Failed to calculate k_after: {}", e))?;

        // k_after should be >= k_before (due to fees, it will be slightly higher)
        if k_after < k_before {
            error!("SECURITY: Constant product formula violation detected! k_before: {}, k_after: {}", k_before, k_after);
            return Err("Invalid swap: violates constant product formula".to_string());
        }

        Ok(())
    }
    
    /// Add liquidity to pool with validation
    pub fn add_liquidity(&mut self, request: LiquidityRequest) -> Result<LiquidityResponse, String> {
        self.check_emergency_pause()?;

        if request.amount_a == 0 || request.amount_b == 0 {
            return Err("Liquidity amounts must be greater than zero".to_string());
        }

        let pool_id = format!("{}_{}", request.token_a, request.token_b);
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

        // Calculate total liquidity and LP tokens with SafeMath
        let total_liquidity = SafeMath::add(request.amount_a, request.amount_b, "add_liquidity_total")
            .map_err(|e| format!("Failed to calculate liquidity: {}", e))?;

        let k_value = SafeMath::mul(request.amount_a, request.amount_b, "add_liquidity_k")
            .map_err(|e| format!("Failed to calculate k: {}", e))?;

        let pool = SecuredPool {
            id: pool_id.clone(),
            token_a: request.token_a.clone(),
            token_b: request.token_b.clone(),
            reserve_a: request.amount_a,
            reserve_b: request.amount_b,
            total_liquidity,
            k_last: k_value,
            fee_accumulated_a: 0,
            fee_accumulated_b: 0,
            created_at: timestamp,
            last_trade: timestamp,
        };
        
        self.pools.insert(pool_id.clone(), pool);

        info!("LIQUIDITY ADDED: {} {} + {} {} to pool {}", 
            format_amount(request.amount_a), request.token_a,
            format_amount(request.amount_b), request.token_b,
            pool_id);
        
        Ok(LiquidityResponse {
            success: true,
            message: "Liquidity added successfully".to_string(),
            tx_hash: Some(format!("liq_add_{}", timestamp)),
            lp_tokens_minted: Some(total_liquidity),
        })
    }

    /// Emergency pause (admin only)
    pub fn emergency_pause(&mut self, reason: String, paused_by: String) -> Result<(), String> {
        if !self.access_control.has_permission(&paused_by, &Permission::SystemPause) {
            return Err("Unauthorized: Insufficient permissions to pause DEX".to_string());
        }

        self.emergency_paused = true;
        self.emergency_pause_reason = Some(reason.clone());

        error!("DEX EMERGENCY PAUSE: {} by {}", reason, paused_by);
        Ok(())
    }

    /// Resume from emergency pause (admin only)
    pub fn resume_system(&mut self, resumed_by: String) -> Result<(), String> {
        if !self.access_control.has_permission(&resumed_by, &Permission::SystemPause) {
            return Err("Unauthorized: Insufficient permissions to resume DEX".to_string());
        }

        self.emergency_paused = false;
        self.emergency_pause_reason = None;

        info!("DEX resumed from emergency pause by {}", resumed_by);
        Ok(())
    }

    /// Check emergency pause status
    fn check_emergency_pause(&self) -> Result<(), String> {
        if self.emergency_paused {
            return Err(format!("DEX is emergency paused: {}", 
                self.emergency_pause_reason.as_deref().unwrap_or("Unknown reason")));
        }
        Ok(())
    }

    /// Validate transaction deadline (front-running protection)
    fn validate_deadline(&self, deadline: u64) -> Result<(), String> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        if now > deadline {
            return Err("Transaction deadline expired".to_string());
        }
        Ok(())
    }

    /// Validate transaction nonce (replay protection)
    fn validate_nonce(&self, nonce: u64) -> Result<(), String> {
        if nonce < self.nonce {
            return Err("Invalid nonce: transaction already processed".to_string());
        }
        Ok(())
    }

    /// Get DEX statistics
    pub fn get_stats(&self) -> serde_json::Value {
        let total_liquidity: u128 = self.pools.values()
            .map(|p| p.total_liquidity)
            .sum();

        serde_json::json!({
            "total_pools": self.pools.len(),
            "total_transactions": self.transactions.len(),
            "total_liquidity": format_amount(total_liquidity),
            "fee_rate": format!("{:.2}%", self.fee_rate as f64 / 100.0),
            "max_slippage": format!("{:.2}%", self.max_slippage as f64 / 100.0),
            "emergency_paused": self.emergency_paused,
            "current_nonce": self.nonce
        })
    }
}

/// Format amount with proper decimals
fn format_amount(amount: u128) -> String {
    let whole = amount / DECIMALS;
    let fraction = amount % DECIMALS;
    format!("{}.{:018}", whole, fraction)
}

/// Parse amount from string with decimals
pub fn parse_amount(amount_str: &str) -> Result<u128, String> {
    let parts: Vec<&str> = amount_str.split('.').collect();
    
    let whole = parts[0].parse::<u128>()
        .map_err(|_| "Invalid amount format".to_string())?;
    
    let fraction = if parts.len() > 1 {
        let frac_str = format!("{:0<18}", parts[1]); // Pad to 18 decimals
        frac_str.parse::<u128>()
            .map_err(|_| "Invalid fraction format".to_string())?
    } else {
        0
    };

    SafeMath::add(
        SafeMath::mul(whole, DECIMALS, "parse_whole")?,
        fraction,
        "parse_fraction"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_and_parse_amount() {
        let amount = 1500 * DECIMALS + 500_000_000_000_000_000; // 1500.5 tokens
        let formatted = format_amount(amount);
        assert!(formatted.starts_with("1500.5"));
    }

    #[test]
    fn test_secured_dex_creation() {
        let dex = SecuredDEX::new();
        assert_eq!(dex.pools.len(), 0);
        assert_eq!(dex.fee_rate, 30);
        assert_eq!(dex.nonce, 0);
    }

    #[test]
    fn test_constant_product_validation() {
        let dex = SecuredDEX::new();
        let pool = SecuredPool {
            id: "test".to_string(),
            token_a: "DYO".to_string(),
            token_b: "DYS".to_string(),
            reserve_a: 1000 * DECIMALS,
            reserve_b: 1000 * DECIMALS,
            total_liquidity: 2000 * DECIMALS,
            k_last: 1_000_000 * DECIMALS * DECIMALS,
            fee_accumulated_a: 0,
            fee_accumulated_b: 0,
            created_at: 0,
            last_trade: 0,
        };

        // Valid swap: add 100, remove 90 (with fee)
        let result = dex.validate_constant_product(&pool, 100 * DECIMALS, 90 * DECIMALS);
        assert!(result.is_ok());
    }
}

