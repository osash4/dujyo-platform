use std::collections::HashMap;
// use std::sync::{Arc, Mutex}; // Not used in this file
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::error;

/// ✅ SECURITY FIX: Safe timestamp helper
fn get_current_timestamp() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .map_err(|e| {
            error!(error = %e, "CRITICAL: System time error in real blockchain");
            format!("System time error: {}", e)
        })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealTransaction {
    pub from: String,
    pub to: String,
    pub amount: f64,
    pub token: String, // "DYO" or "DYS"
    pub timestamp: u64,
    pub nonce: u64,
    pub tx_type: String, // "TRANSFER", "MINT", "STAKE", "UNSTAKE", "SWAP"
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealBlock {
    pub height: u64,
    pub previous_hash: String,
    pub merkle_root: String,
    pub timestamp: u64,
    pub proposer: String,
    pub transactions: Vec<RealTransaction>,
    pub hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenBalance {
    pub dyo: f64,
    pub dys: f64,
    pub staked: f64,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapResult {
    pub success: bool,
    pub amount_in: f64,
    pub amount_out: f64,
    pub price_impact: f64,
    pub fee: f64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingResult {
    pub success: bool,
    pub position_id: Option<String>,
    pub amount: Option<f64>,
    pub rewards: Option<f64>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolInfo {
    pub token_a: String,
    pub token_b: String,
    pub reserve_a: f64,
    pub reserve_b: f64,
    pub total_liquidity: f64,
    pub fee: f64,
}

pub struct RealBlockchain {
    pub blocks: Vec<RealBlock>,
    pub balances: HashMap<String, TokenBalance>,
    pub pools: HashMap<String, PoolInfo>,
    pub staking_positions: HashMap<String, StakingPosition>,
    pub mempool: Vec<RealTransaction>,
    pub total_supply_dyo: f64,
    pub total_supply_dys: f64,
    pub is_running: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingPosition {
    pub id: String,
    pub user: String,
    pub amount: f64,
    pub start_time: u64,
    pub end_time: u64,
    pub rewards: f64,
    pub is_active: bool,
}

impl RealBlockchain {
    pub fn new() -> Self {
        let mut blockchain = RealBlockchain {
            blocks: Vec::new(),
            balances: HashMap::new(),
            pools: HashMap::new(),
            staking_positions: HashMap::new(),
            mempool: Vec::new(),
            total_supply_dyo: 0.0,
            total_supply_dys: 0.0,
            is_running: true,
        };

        // Create genesis block
        blockchain.create_genesis_block().unwrap_or_else(|e| {
            eprintln!("Error creating genesis block: {}", e);
        });

        // Initialize admin wallet with initial supply
        blockchain.mint_tokens("ADMIN_ADDRESS", 10000000.0, "DYO");
        blockchain.mint_tokens("ADMIN_ADDRESS", 1000000.0, "DYS");

        // Add initial liquidity
        blockchain.add_initial_liquidity();

        blockchain
    }

    fn create_genesis_block(&mut self) -> Result<(), String> {
        let genesis_block = RealBlock {
            height: 0,
            previous_hash: "0".repeat(64),
            merkle_root: "0".repeat(64),
            timestamp: get_current_timestamp().unwrap_or_else(|_| 0),
            proposer: "genesis".to_string(),
            transactions: Vec::new(),
            hash: "GENESIS_BLOCK_HASH".to_string(),
        };

        self.blocks.push(genesis_block);
        println!("✅ Genesis block created");
        Ok(())
    }

    fn add_initial_liquidity(&mut self) {
        // Add initial liquidity to DYO/DYS pool
        let pool_id = "DYO-DYS".to_string();
        let pool = PoolInfo {
            token_a: "DYO".to_string(),
            token_b: "DYS".to_string(),
            reserve_a: 100000.0, // 100k DYO
            reserve_b: 100000.0, // 100k DYS
            total_liquidity: 100000.0,
            fee: 0.3, // 0.3% fee
        };

        self.pools.insert(pool_id, pool);
        println!("🏊 Initial liquidity added to DYO/DYS pool");
    }

    pub fn get_balance(&self, address: &str) -> TokenBalance {
        self.balances.get(address).cloned().unwrap_or(TokenBalance {
            dyo: 0.0,
            dys: 0.0,
            staked: 0.0,
            total: 0.0,
        })
    }

    pub fn mint_tokens(&mut self, to: &str, amount: f64, token: &str) -> bool {
        let balance = self.balances.entry(to.to_string()).or_insert(TokenBalance {
            dyo: 0.0,
            dys: 0.0,
            staked: 0.0,
            total: 0.0,
        });

        match token {
            "DYO" => {
                balance.dyo += amount;
                self.total_supply_dyo += amount;
            }
            "DYS" => {
                balance.dys += amount;
                self.total_supply_dys += amount;
            }
            _ => return false,
        }

        balance.total = balance.dyo + balance.dys + balance.staked;

        // Add transaction to mempool
        let tx = RealTransaction {
            from: "SYSTEM".to_string(),
            to: to.to_string(),
            amount,
            token: token.to_string(),
            timestamp: get_current_timestamp().unwrap_or_else(|_| 0),
            nonce: 0,
            tx_type: "MINT".to_string(),
            data: None,
        };

        self.mempool.push(tx);
        println!("🪙 Minted {} {} to {}", amount, token, to);
        true
    }

    pub fn transfer_tokens(&mut self, from: &str, to: &str, amount: f64, token: &str) -> bool {
        // Check if sender has sufficient balance first
        let from_balance = self.get_balance(from);
        let from_amount = match token {
            "DYO" => from_balance.dyo,
            "DYS" => from_balance.dys,
            _ => return false,
        };

        if from_amount < amount {
            return false;
        }

        // Update balances - handle from and to separately to avoid borrow conflicts
        {
            let from_entry = self
                .balances
                .entry(from.to_string())
                .or_insert(TokenBalance {
                    dyo: 0.0,
                    dys: 0.0,
                    staked: 0.0,
                    total: 0.0,
                });

            match token {
                "DYO" => from_entry.dyo -= amount,
                "DYS" => from_entry.dys -= amount,
                _ => return false,
            }
            from_entry.total = from_entry.dyo + from_entry.dys + from_entry.staked;
        }

        {
            let to_entry = self.balances.entry(to.to_string()).or_insert(TokenBalance {
                dyo: 0.0,
                dys: 0.0,
                staked: 0.0,
                total: 0.0,
            });

            match token {
                "DYO" => to_entry.dyo += amount,
                "DYS" => to_entry.dys += amount,
                _ => return false,
            }
            to_entry.total = to_entry.dyo + to_entry.dys + to_entry.staked;
        }

        // Add transaction to mempool
        let tx = RealTransaction {
            from: from.to_string(),
            to: to.to_string(),
            amount,
            token: token.to_string(),
            timestamp: get_current_timestamp().unwrap_or_else(|_| 0),
            nonce: 0,
            tx_type: "TRANSFER".to_string(),
            data: None,
        };

        self.mempool.push(tx);
        println!("💸 Transfer: {} -> {} ({} {})", from, to, amount, token);
        true
    }

    pub fn swap_tokens(
        &mut self,
        user: &str,
        from_token: &str,
        to_token: &str,
        amount_in: f64,
        min_amount_out: f64,
    ) -> Result<SwapResult, String> {
        // Use consistent pool ID for both directions (DYO↔DYS)
        let pool_id = if (from_token == "DYO" && to_token == "DYS")
            || (from_token == "DYS" && to_token == "DYO")
        {
            "DYO-DYS".to_string()
        } else {
            return Ok(SwapResult {
                success: false,
                amount_in: 0.0,
                amount_out: 0.0,
                price_impact: 0.0,
                fee: 0.0,
                error: Some("Pool not found".to_string()),
            });
        };

        let pool = match self.pools.get(&pool_id) {
            Some(p) => p.clone(),
            None => {
                return Ok(SwapResult {
                    success: false,
                    amount_in: 0.0,
                    amount_out: 0.0,
                    price_impact: 0.0,
                    fee: 0.0,
                    error: Some("Pool not found".to_string()),
                });
            }
        };

        // Check user balance
        let user_balance = self.get_balance(user);
        let user_amount = if from_token == "DYO" {
            user_balance.dyo
        } else {
            user_balance.dys
        };

        if user_amount < amount_in {
            return Ok(SwapResult {
                success: false,
                amount_in: 0.0,
                amount_out: 0.0,
                price_impact: 0.0,
                fee: 0.0,
                error: Some("Insufficient balance".to_string()),
            });
        }

        // Calculate swap using constant product formula
        let (reserve_in, reserve_out) = if from_token == "DYO" {
            (pool.reserve_a, pool.reserve_b)
        } else {
            (pool.reserve_b, pool.reserve_a)
        };

        if reserve_in < amount_in {
            return Ok(SwapResult {
                success: false,
                amount_in: 0.0,
                amount_out: 0.0,
                price_impact: 0.0,
                fee: 0.0,
                error: Some("Insufficient liquidity".to_string()),
            });
        }

        // Calculate fee (0.3%)
        let fee_amount = amount_in * 0.003;
        let amount_in_after_fee = amount_in - fee_amount;

        // Calculate output using constant product formula: x * y = k
        let amount_out = (amount_in_after_fee * reserve_out) / (reserve_in + amount_in_after_fee);

        // Calculate price impact
        let price_before = reserve_out / reserve_in;
        let price_after = (reserve_out - amount_out) / (reserve_in + amount_in_after_fee);
        let price_impact = (price_after - price_before).abs() / price_before;

        if amount_out < min_amount_out {
            return Ok(SwapResult {
                success: false,
                amount_in: 0.0,
                amount_out: 0.0,
                price_impact: 0.0,
                fee: 0.0,
                error: Some("Insufficient output amount".to_string()),
            });
        }

        // Execute swap - Update user balances directly
        if let Some(balance) = self.balances.get_mut(user) {
            // Deduct input tokens
            if from_token == "DYO" {
                balance.dyo -= amount_in;
            } else {
                balance.dys -= amount_in;
            }

            // Add output tokens
            if to_token == "DYO" {
                balance.dyo += amount_out;
            } else {
                balance.dys += amount_out;
            }

            // Update total
            balance.total = balance.dyo + balance.dys + balance.staked;
        } else {
            return Ok(SwapResult {
                success: false,
                amount_in: 0.0,
                amount_out: 0.0,
                price_impact: 0.0,
                fee: 0.0,
                error: Some("User balance not found".to_string()),
            });
        }

        // Update pool reserves
        let mut updated_pool = pool.clone();
        if from_token == "DYO" {
            updated_pool.reserve_a += amount_in;
            updated_pool.reserve_b -= amount_out;
        } else {
            updated_pool.reserve_b += amount_in;
            updated_pool.reserve_a -= amount_out;
        }
        self.pools.insert(pool_id, updated_pool);

        // Add transaction to mempool
        let tx = RealTransaction {
            from: user.to_string(),
            to: "POOL".to_string(),
            amount: amount_in,
            token: from_token.to_string(),
            timestamp: get_current_timestamp().unwrap_or_else(|_| 0),
            nonce: 0,
            tx_type: "SWAP".to_string(),
            data: Some(serde_json::json!({
                "to_token": to_token,
                "amount_out": amount_out,
                "price_impact": price_impact
            })),
        };

        self.mempool.push(tx);

        println!(
            "🔄 Swap: {} {} -> {} {} (impact: {:.2}%)",
            amount_in,
            from_token,
            amount_out,
            to_token,
            price_impact * 100.0
        );

        Ok(SwapResult {
            success: true,
            amount_in,
            amount_out,
            price_impact,
            fee: fee_amount,
            error: None,
        })
    }

    pub fn stake_tokens(&mut self, user: &str, amount: f64) -> Result<StakingResult, String> {
        let user_balance = self.get_balance(user);

        if user_balance.dyo < amount {
            return Ok(StakingResult {
                success: false,
                position_id: None,
                amount: None,
                rewards: None,
                error: Some("Insufficient balance".to_string()),
            });
        }

        if amount < 1.0 {
            return Ok(StakingResult {
                success: false,
                position_id: None,
                amount: None,
                rewards: None,
                error: Some("Minimum stake is 1 DYO".to_string()),
            });
        }

        // Update user balance directly (stake tokens)
        if let Some(balance) = self.balances.get_mut(user) {
            balance.dyo -= amount;
            balance.staked += amount;
            balance.total = balance.dyo + balance.dys + balance.staked;
        } else {
            return Ok(StakingResult {
                success: false,
                position_id: None,
                amount: None,
                rewards: None,
                error: Some("User balance not found".to_string()),
            });
        }

        // Create staking position
        let position_id = format!(
            "{}-{}",
            user,
            get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?
        );
        let now = get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?;
        let end_time = now + (30 * 24 * 3600); // 30 days lock period

        let position = StakingPosition {
            id: position_id.clone(),
            user: user.to_string(),
            amount,
            start_time: now,
            end_time,
            rewards: 0.0,
            is_active: true,
        };

        self.staking_positions.insert(position_id.clone(), position);

        // Update user balance to reflect staked amount
        if let Some(balance) = self.balances.get_mut(user) {
            balance.staked += amount;
            balance.total = balance.dyo + balance.dys + balance.staked;
        }

        // Add transaction to mempool
        let tx = RealTransaction {
            from: user.to_string(),
            to: "STAKING_CONTRACT".to_string(),
            amount,
            token: "DYO".to_string(),
            timestamp: now,
            nonce: 0,
            tx_type: "STAKE".to_string(),
            data: Some(serde_json::json!({
                "position_id": position_id,
                "lock_period": 30 * 24 * 3600
            })),
        };

        self.mempool.push(tx);

        println!("🏦 Staked {} DYO for user {}", amount, user);

        Ok(StakingResult {
            success: true,
            position_id: Some(position_id),
            amount: Some(amount),
            rewards: None,
            error: None,
        })
    }

    pub fn unstake_tokens(
        &mut self,
        user: &str,
        position_id: &str,
    ) -> Result<StakingResult, String> {
        let position = match self.staking_positions.get(position_id) {
            Some(p) => p.clone(),
            None => {
                return Ok(StakingResult {
                    success: false,
                    position_id: None,
                    amount: None,
                    rewards: None,
                    error: Some("Position not found".to_string()),
                });
            }
        };

        if position.user != user {
            return Ok(StakingResult {
                success: false,
                position_id: None,
                amount: None,
                rewards: None,
                error: Some("Unauthorized".to_string()),
            });
        }

        if !position.is_active {
            return Ok(StakingResult {
                success: false,
                position_id: None,
                amount: None,
                rewards: None,
                error: Some("Position is not active".to_string()),
            });
        }

        let now = get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?;
        if now < position.end_time {
            return Ok(StakingResult {
                success: false,
                position_id: None,
                amount: None,
                rewards: None,
                error: Some("Position is still locked".to_string()),
            });
        }

        // Calculate rewards (12% APY)
        let staking_duration = (now - position.start_time) as f64;
        let staking_duration_years = staking_duration / (365.0 * 24.0 * 3600.0);
        let rewards = position.amount * 0.12 * staking_duration_years;

        // Calculate unstaking fee (1%)
        let fee_amount = position.amount * 0.01;
        let amount_to_return = position.amount - fee_amount;

        // Update user balance directly (unstake tokens + rewards)
        if let Some(balance) = self.balances.get_mut(user) {
            balance.staked -= position.amount;
            balance.dyo += amount_to_return + rewards;
            balance.total = balance.dyo + balance.dys + balance.staked;
        } else {
            return Ok(StakingResult {
                success: false,
                position_id: None,
                amount: None,
                rewards: None,
                error: Some("User balance not found".to_string()),
            });
        }

        // Update position
        let mut updated_position = position.clone();
        updated_position.is_active = false;
        updated_position.rewards = rewards;
        self.staking_positions
            .insert(position_id.to_string(), updated_position);

        // Update user balance
        if let Some(balance) = self.balances.get_mut(user) {
            balance.staked -= position.amount;
            balance.total = balance.dyo + balance.dys + balance.staked;
        }

        // Add transaction to mempool
        let tx = RealTransaction {
            from: "STAKING_CONTRACT".to_string(),
            to: user.to_string(),
            amount: amount_to_return + rewards,
            token: "DYO".to_string(),
            timestamp: now,
            nonce: 0,
            tx_type: "UNSTAKE".to_string(),
            data: Some(serde_json::json!({
                "position_id": position_id,
                "amount": amount_to_return,
                "rewards": rewards,
                "fee": fee_amount
            })),
        };

        self.mempool.push(tx);

        println!(
            "🏦 Unstaked {} DYO + {} rewards for user {}",
            amount_to_return, rewards, user
        );

        Ok(StakingResult {
            success: true,
            position_id: Some(position_id.to_string()),
            amount: Some(amount_to_return),
            rewards: Some(rewards),
            error: None,
        })
    }

    pub fn get_swap_quote(
        &self,
        from_token: &str,
        to_token: &str,
        amount_in: f64,
    ) -> Option<SwapResult> {
        // Use consistent pool ID for both directions (DYO↔DYS)
        let pool_id = if (from_token == "DYO" && to_token == "DYS")
            || (from_token == "DYS" && to_token == "DYO")
        {
            "DYO-DYS".to_string()
        } else {
            return None;
        };

        let pool = self.pools.get(&pool_id)?;

        let (reserve_in, reserve_out) = if from_token == "DYO" {
            (pool.reserve_a, pool.reserve_b)
        } else {
            (pool.reserve_b, pool.reserve_a)
        };

        if reserve_in < amount_in {
            return None;
        }

        let fee_amount = amount_in * 0.003;
        let amount_in_after_fee = amount_in - fee_amount;
        let amount_out = (amount_in_after_fee * reserve_out) / (reserve_in + amount_in_after_fee);

        let price_before = reserve_out / reserve_in;
        let price_after = (reserve_out - amount_out) / (reserve_in + amount_in_after_fee);
        let price_impact = (price_after - price_before).abs() / price_before;

        Some(SwapResult {
            success: true,
            amount_in,
            amount_out,
            price_impact,
            fee: fee_amount,
            error: None,
        })
    }

    pub fn get_staking_positions(&self, user: &str) -> Vec<StakingPosition> {
        self.staking_positions
            .values()
            .filter(|p| p.user == user)
            .cloned()
            .collect()
    }

    pub fn get_pool_info(&self, token_a: &str, token_b: &str) -> Option<PoolInfo> {
        let pool_id = format!("{}-{}", token_a, token_b);
        self.pools.get(&pool_id).cloned()
    }

    pub fn get_network_stats(&self) -> serde_json::Value {
        serde_json::json!({
            "total_blocks": self.blocks.len(),
            "total_transactions": self.mempool.len(),
            "total_wallets": self.balances.len(),
            "total_supply_dyo": self.total_supply_dyo,
            "total_supply_dys": self.total_supply_dys,
            "total_staked": self.staking_positions.values().filter(|p| p.is_active).map(|p| p.amount).sum::<f64>(),
            "total_liquidity": self.pools.values().map(|p| p.total_liquidity).sum::<f64>(),
            "is_running": self.is_running
        })
    }
}
