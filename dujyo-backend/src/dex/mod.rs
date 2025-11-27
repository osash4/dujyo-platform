// src/dex/mod.rs

pub mod payment_system;
// pub mod dex_secured; // TODO: Fix SafeMath error mapping before enabling

// Re-exportar estructuras necesarias para compatibilidad
use serde::{Deserialize, Serialize};
use chrono;
use tracing::info;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DEX {
    pub pools: std::collections::HashMap<String, Pool>,
    pub mempool: Vec<SwapTransaction>,
    pub fee_rate: u64, // Fee rate in basis points (30 = 0.3%)
    pub max_slippage: u64, // Maximum slippage in basis points (500 = 5%)
    
    // Security enhancements
    pub emergency_paused: bool,
    pub emergency_pause_reason: Option<String>,
    
    // ✅ SECURITY FIX VULN-006: Reentrancy protection
    #[serde(skip)]
    pub reentrancy_guard: Arc<Mutex<bool>>, // Reentrancy guard (not serialized, uses Arc for Clone)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pool {
    pub id: String,
    pub token_a: String,
    pub token_b: String,
    pub reserve_a: f64,
    pub reserve_b: f64,
    pub total_liquidity: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapTransaction {
    pub id: String,
    pub from_token: String,
    pub to_token: String,
    pub amount_in: f64,
    pub amount_out: f64,
    pub user: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapRequest {
    pub from: String,
    pub to: String,
    pub amount: f64,
    pub min_received: f64,
    pub user: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityRequest {
    pub token_a: String,
    pub token_b: String,
    pub amount_a: f64,
    pub amount_b: f64,
    pub user: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapResponse {
    pub success: bool,
    pub message: String,
    pub tx_hash: Option<String>,
    pub amount_received: Option<f64>,
    pub price_impact: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityResponse {
    pub success: bool,
    pub message: String,
    pub tx_hash: Option<String>,
    pub lp_tokens_minted: Option<f64>,
}

impl DEX {
    pub fn new() -> Self {
        let mut dex = Self {
            pools: std::collections::HashMap::new(),
            mempool: Vec::new(),
            fee_rate: 30, // 0.3% fee
            max_slippage: 500, // 5% max slippage
            emergency_paused: false,
            emergency_pause_reason: None,
            // ✅ SECURITY FIX VULN-006: Initialize reentrancy guard
            reentrancy_guard: Arc::new(Mutex::new(false)),
        };
        
        // ✅ Crear pools iniciales para DYO/DYS
        let dyo_dys_pool = Pool {
            id: "DYO_DYS".to_string(),
            token_a: "DYO".to_string(),
            token_b: "DYS".to_string(),
            reserve_a: 1000000.0, // 1M DYO inicial
            reserve_b: 1000000.0, // 1M DYS inicial (1:1 ratio)
            total_liquidity: 1000000.0,
        };
        
        dex.pools.insert("DYO_DYS".to_string(), dyo_dys_pool.clone());
        // También agregar el pool invertido para búsqueda
        dex.pools.insert("DYS_DYO".to_string(), Pool {
            id: "DYS_DYO".to_string(),
            token_a: "DYS".to_string(),
            token_b: "DYO".to_string(),
            reserve_a: dyo_dys_pool.reserve_b,
            reserve_b: dyo_dys_pool.reserve_a,
            total_liquidity: dyo_dys_pool.total_liquidity,
        });
        
        println!("✅ DEX initialized with DYO/DYS pool (1M:1M ratio)");
        
        dex
    }
    
    /// Check if DEX is emergency paused
    fn check_emergency_pause(&self) -> Result<(), String> {
        if self.emergency_paused {
            return Err(format!("DEX is emergency paused: {}", 
                self.emergency_pause_reason.as_deref().unwrap_or("Unknown reason")));
        }
        Ok(())
    }
    
    // ✅ SECURITY FIX VULN-006: Check reentrancy guard
    fn check_reentrancy(&self) -> Result<(), String> {
        let guard = self.reentrancy_guard.lock()
            .map_err(|_| "Failed to acquire reentrancy guard lock".to_string())?;
        
        if *guard {
            return Err("Reentrancy attack detected: operation already in progress".to_string());
        }
        Ok(())
    }
    
    // ✅ SECURITY FIX VULN-006: Set reentrancy guard
    fn set_reentrancy_guard(&self, value: bool) -> Result<(), String> {
        let mut guard = self.reentrancy_guard.lock()
            .map_err(|_| "Failed to acquire reentrancy guard lock".to_string())?;
        *guard = value;
        Ok(())
    }
    
    /// Emergency pause the DEX (admin only)
    pub fn emergency_pause(&mut self, reason: String) -> Result<(), String> {
        info!("DEX emergency pause activated: {}", reason);
        self.emergency_paused = true;
        self.emergency_pause_reason = Some(reason);
        Ok(())
    }
    
    /// Resume DEX from emergency pause (admin only)
    pub fn resume_from_emergency(&mut self) -> Result<(), String> {
        info!("DEX resumed from emergency pause");
        self.emergency_paused = false;
        self.emergency_pause_reason = None;
        Ok(())
    }
    
    pub fn get_pool(&self, pool_id: &str) -> Option<&Pool> {
        self.pools.get(pool_id)
    }
    
    pub fn get_all_pools(&self) -> Vec<&Pool> {
        self.pools.values().collect()
    }
    
    // ✅ SECURITY FIX VULN-006: Execute swap with reentrancy protection and checks-effects-interactions pattern
    pub fn execute_swap(&mut self, request: SwapRequest) -> Result<SwapResponse, String> {
        // ✅ CHECKS PHASE: All validations before state changes
        // Check emergency pause first
        self.check_emergency_pause()?;
        
        // ✅ SECURITY FIX: Check reentrancy guard
        self.check_reentrancy()?;
        
        // ✅ Set reentrancy guard BEFORE any state changes
        self.set_reentrancy_guard(true)?;
        
        // Use defer-like pattern to ensure guard is released
        struct GuardRelease {
            guard: Arc<Mutex<bool>>,
        }
        
        impl Drop for GuardRelease {
            fn drop(&mut self) {
                if let Ok(mut g) = self.guard.lock() {
                    *g = false;
                }
            }
        }
        
        let guard_release = GuardRelease {
            guard: Arc::clone(&self.reentrancy_guard),
        };
        
        let pool_id = format!("{}_{}", request.from, request.to);
        
        // ✅ CHECKS: Get pool for validation (immutable borrow)
        let (reserve_a, reserve_b) = {
            let pool = self.pools.get(&pool_id)
                .ok_or("Pool not found")?;
            (pool.reserve_a, pool.reserve_b)
        };

        // ✅ CHECKS: Validate input
        if request.amount <= 0.0 {
            return Err("Invalid swap amount".to_string());
        }

        if request.min_received < 0.0 {
            return Err("Invalid minimum received amount".to_string());
        }

        // ✅ CHECKS: Calculate swap output using Constant Product Market Maker formula
        let amount_out = self.calculate_swap_output(
            reserve_a, 
            reserve_b, 
            request.amount
        )?;

        // ✅ CHECKS: Calculate price impact
        let price_impact = self.calculate_price_impact_from_reserves(reserve_a, reserve_b, request.amount, amount_out)?;

        // ✅ CHECKS: Check slippage protection
        if amount_out < request.min_received {
            return Err(format!("Slippage too high. Expected at least {}, got {}", 
                request.min_received, amount_out));
        }

        // ✅ CHECKS: Check maximum slippage limit
        let slippage_basis_points = ((request.min_received - amount_out) / request.min_received * 10000.0) as u64;
        if slippage_basis_points > self.max_slippage {
            return Err(format!("Slippage {}% exceeds maximum {}%", 
                slippage_basis_points as f64 / 100.0, self.max_slippage as f64 / 100.0));
        }

        // ✅ EFFECTS PHASE: Update state BEFORE external interactions
        // Update pool reserves (state change) - now we can borrow mutably
        {
            let pool = self.pools.get_mut(&pool_id)
                .ok_or("Pool not found")?;
            
            // ✅ Update reserves atomically (within guard)
            // ✅ SECURITY FIX VULN-005: Use safe arithmetic for reserve updates
            use crate::utils::arithmetic::Arithmetic;
            pool.reserve_a = Arithmetic::checked_add_f64(pool.reserve_a, request.amount, "dex_reserve_a_add")
                .map_err(|e| format!("Arithmetic overflow in reserve_a: {}", e))?;
            pool.reserve_b = Arithmetic::checked_sub_f64(pool.reserve_b, amount_out, "dex_reserve_b_sub")
                .map_err(|e| format!("Arithmetic underflow in reserve_b: {}", e))?;
        }
        
        // Create transaction with timestamp for uniqueness
        let timestamp = chrono::Utc::now().timestamp() as u64;
        let tx_id = format!("swap_{}_{}", timestamp, request.user);

        let transaction = SwapTransaction {
            id: tx_id.clone(),
            from_token: request.from.clone(),
            to_token: request.to.clone(),
            amount_in: request.amount,
            amount_out,
            user: request.user.clone(),
            timestamp,
        };
        
        // ✅ Update mempool (state change)
        self.mempool.push(transaction.clone());

        // ✅ INTERACTIONS PHASE: External calls happen AFTER state updates
        // In a real implementation, token transfers would happen here
        // But since state is already updated, reentrancy is prevented
        
        info!("Swap executed: {} {} -> {} {} (price impact: {:.4}%)", 
            request.amount, request.from, amount_out, request.to, price_impact * 100.0);
        
        // Guard is released automatically when guard_release is dropped
        drop(guard_release);
        
        Ok(SwapResponse {
            success: true,
            message: "Swap executed successfully".to_string(),
            tx_hash: Some(tx_id),
            amount_received: Some(amount_out),
            price_impact: Some(price_impact),
        })
    }
    
    // ✅ Helper function to calculate price impact without borrowing pool
    fn calculate_price_impact_from_reserves(&self, reserve_a: f64, reserve_b: f64, amount_in: f64, amount_out: f64) -> Result<f64, String> {
        if reserve_a <= 0.0 || reserve_b <= 0.0 {
            return Err("Invalid reserves".to_string());
        }
        
        // Calculate current price (reserve_out / reserve_in)
        // ✅ SECURITY FIX VULN-005: Use safe division
        use crate::utils::arithmetic::Arithmetic;
        let current_price = Arithmetic::checked_div_f64(reserve_b, reserve_a, "dex_price_impact_current_price")
            .map_err(|e| format!("Arithmetic error in current price: {}", e))?;
        
        // Calculate execution price (amount_out / amount_in)
        if amount_in <= 0.0 {
            return Err("Invalid amount_in".to_string());
        }
        let execution_price = Arithmetic::checked_div_f64(amount_out, amount_in, "dex_execution_price")
            .map_err(|e| format!("Arithmetic error in execution price: {}", e))?;
        
        // Calculate price impact: (current_price - execution_price) / current_price
        if current_price <= 0.0 {
            return Err("Invalid current price".to_string());
        }
        let price_diff = Arithmetic::checked_sub_f64(current_price, execution_price, "dex_price_diff")
            .map_err(|e| format!("Arithmetic error in price diff: {}", e))?;
        let price_impact = Arithmetic::checked_div_f64(price_diff.abs(), current_price, "dex_price_impact")
            .map_err(|e| format!("Arithmetic error in price impact: {}", e))?;
        
        Ok(price_impact)
    }

    /// Calculate swap output using Constant Product Market Maker formula: x * y = k
    fn calculate_swap_output(&self, reserve_in: f64, reserve_out: f64, amount_in: f64) -> Result<f64, String> {
        if reserve_in <= 0.0 || reserve_out <= 0.0 || amount_in <= 0.0 {
            return Err("Invalid reserve or amount values".to_string());
        }

        // Apply fee: amount_in_with_fee = amount_in * (1 - fee_rate)
        let fee_multiplier = 10000 - self.fee_rate; // Convert to basis points
        // ✅ SECURITY FIX VULN-005: Use safe arithmetic for fee calculation
        use crate::utils::arithmetic::Arithmetic;
        let fee_ratio = Arithmetic::checked_div_f64(fee_multiplier as f64, 10000.0, "dex_fee_ratio")
            .map_err(|e| format!("Arithmetic error in fee ratio: {}", e))?;
        let amount_in_with_fee = Arithmetic::checked_mul_f64(amount_in, fee_ratio, "dex_amount_in_with_fee")
            .map_err(|e| format!("Arithmetic overflow in amount_in_with_fee: {}", e))?;

        // Constant product formula: (reserve_in + amount_in_with_fee) * (reserve_out - amount_out) = reserve_in * reserve_out
        // Solving for amount_out: amount_out = (reserve_out * amount_in_with_fee) / (reserve_in + amount_in_with_fee)
        let numerator = Arithmetic::checked_mul_f64(reserve_out, amount_in_with_fee, "dex_swap_numerator")
            .map_err(|e| format!("Arithmetic overflow in swap numerator: {}", e))?;
        let denominator = Arithmetic::checked_add_f64(reserve_in, amount_in_with_fee, "dex_swap_denominator")
            .map_err(|e| format!("Arithmetic overflow in swap denominator: {}", e))?;
        
        if denominator == 0.0 {
            return Err("Division by zero".to_string());
        }

        let amount_out = numerator / denominator;

        // Ensure we don't drain the pool
        if amount_out >= reserve_out {
            return Err("Insufficient liquidity".to_string());
        }

        Ok(amount_out)
    }

    /// Calculate price impact of a swap
    #[allow(dead_code)] // ✅ SECURITY FIX: Allow dead code (used in tests or future features)
    fn calculate_price_impact(&self, pool: &Pool, amount_in: f64, amount_out: f64) -> Result<f64, String> {
        // Calculate current price (reserve_out / reserve_in)
        if pool.reserve_a <= 0.0 {
            return Err("Division by zero".to_string());
        }

        // ✅ SECURITY FIX VULN-005: Use safe division
        use crate::utils::arithmetic::Arithmetic;
        let current_price = Arithmetic::checked_div_f64(pool.reserve_b, pool.reserve_a, "dex_current_price")
            .map_err(|e| format!("Arithmetic error in current price: {}", e))?;
        
        // Calculate execution price (amount_out / amount_in)
        if amount_in <= 0.0 {
            return Err("Division by zero".to_string());
        }

        let execution_price = Arithmetic::checked_div_f64(amount_out, amount_in, "dex_price_impact_execution_price")
            .map_err(|e| format!("Arithmetic error in execution price: {}", e))?;

        // Calculate price impact: (current_price - execution_price) / current_price
        if current_price <= 0.0 {
            return Err("Division by zero".to_string());
        }

        let price_impact = (current_price - execution_price) / current_price;
        
        // Ensure price impact is positive (price goes down when selling)
        Ok(price_impact.abs())
    }
    
    pub fn add_liquidity(&mut self, request: LiquidityRequest) -> Result<LiquidityResponse, String> {
        // ✅ SECURITY FIX VULN-006: Reentrancy protection for add_liquidity
        // Check emergency pause first
        self.check_emergency_pause()?;
        
        // ✅ SECURITY FIX: Check reentrancy guard
        self.check_reentrancy()?;
        
        // ✅ Set reentrancy guard BEFORE any state changes
        self.set_reentrancy_guard(true)?;
        
        // Use defer-like pattern to ensure guard is released
        struct GuardRelease {
            guard: Arc<Mutex<bool>>,
        }
        
        impl Drop for GuardRelease {
            fn drop(&mut self) {
                if let Ok(mut g) = self.guard.lock() {
                    *g = false;
                }
            }
        }
        
        let guard_release = GuardRelease {
            guard: Arc::clone(&self.reentrancy_guard),
        };
        
        let pool_id = format!("{}_{}", request.token_a, request.token_b);
        
        // ✅ SECURITY FIX VULN-005: Use SafeMath for liquidity calculation
        use crate::utils::safe_math::SafeMath;
        let total_liquidity = SafeMath::f64_add(request.amount_a, request.amount_b, "add_liquidity_total")
            .map_err(|e| format!("Arithmetic overflow in liquidity calculation: {}", e))?;
        
        let pool = Pool {
            id: pool_id.clone(),
            token_a: request.token_a.clone(),
            token_b: request.token_b.clone(),
            reserve_a: request.amount_a,
            reserve_b: request.amount_b,
            total_liquidity,
        };
        
        self.pools.insert(pool_id.clone(), pool);
        
        // Guard is released automatically when guard_release is dropped
        drop(guard_release);
        
        Ok(LiquidityResponse {
            success: true,
            message: "Liquidity added successfully".to_string(),
            tx_hash: Some(format!("liq_{}", chrono::Utc::now().timestamp())),
            lp_tokens_minted: Some(total_liquidity),
        })
    }
}
