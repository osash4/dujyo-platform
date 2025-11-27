use crate::utils::access_control::{AccessControlManager, Permission};
use crate::utils::safe_math::{SafeMath, SafeMathResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{error, info, warn};

/// ✅ SECURITY FIX: Safe timestamp helper
fn get_current_timestamp() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .map_err(|e| {
            error!(error = %e, "CRITICAL: System time error in staking rewards");
            format!("System time error: {}", e)
        })
}

/// Sistema de Staking y Rewards para Dujyo con integración CPV
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingManager {
    pub staking_contracts: HashMap<String, StakingContract>,
    pub reward_pools: HashMap<String, RewardPool>,
    pub global_stats: StakingStats,
    pub access_control: AccessControlManager,
    pub emergency_paused: bool,
    pub emergency_pause_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StakingContract {
    pub contract_id: String,
    pub name: String,
    pub purpose: String, // "VALIDATORS", "CREATIVE", "COMMUNITY"
    pub total_staked: u64,
    pub total_rewards_distributed: u64,
    pub total_rewards_pending: u64,
    pub stakers: HashMap<String, StakerInfo>,
    pub created_at: u64,
    pub last_reward_distribution: u64,
    pub reward_frequency: u64, // seconds
    pub min_stake: u64,
    pub max_stake: Option<u64>,
    pub slashing_enabled: bool,
    pub slashing_rate: f64, // percentage
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakerInfo {
    pub address: String,
    pub staked_amount: u64,
    pub staked_at: u64,
    pub last_claim: u64,
    pub pending_rewards: u64,
    pub total_rewards_claimed: u64,
    pub slashing_events: u32,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewardPool {
    pub pool_id: String,
    pub name: String,
    pub purpose: String,
    pub total_rewards: u64,
    pub distributed_rewards: u64,
    pub pending_rewards: u64,
    pub reward_rate: u64, // DYO per validation/period
    pub max_rewards_per_day: u64,
    pub daily_distributed: u64,
    pub last_reset: u64,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingStats {
    pub total_contracts: u32,
    pub total_stakers: u32,
    pub total_staked: u64,
    pub total_rewards_distributed: u64,
    pub total_rewards_pending: u64,
    pub active_stakers: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakeRequest {
    pub contract_id: String,
    pub staker: String,
    pub amount: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnstakeRequest {
    pub contract_id: String,
    pub staker: String,
    pub amount: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimRewardsRequest {
    pub contract_id: String,
    pub staker: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStakingContractRequest {
    pub name: String,
    pub purpose: String,
    pub min_stake: u64,
    pub max_stake: Option<u64>,
    pub reward_frequency: u64,
    pub slashing_enabled: bool,
    pub slashing_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRewardPoolRequest {
    pub name: String,
    pub purpose: String,
    pub total_rewards: u64,
    pub reward_rate: u64,
    pub max_rewards_per_day: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

impl StakingManager {
    pub fn new() -> Self {
        Self {
            staking_contracts: HashMap::new(),
            reward_pools: HashMap::new(),
            global_stats: StakingStats {
                total_contracts: 0,
                total_stakers: 0,
                total_staked: 0,
                total_rewards_distributed: 0,
                total_rewards_pending: 0,
                active_stakers: 0,
            },
            access_control: AccessControlManager::new(),
            emergency_paused: false,
            emergency_pause_reason: None,
        }
    }

    /// Crear nuevo contrato de staking
    pub fn create_staking_contract(
        &mut self,
        request: CreateStakingContractRequest,
    ) -> Result<StakingResponse, String> {
        let contract_id = self.generate_contract_id(&request.name);
        let now = get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?;

        let contract = StakingContract {
            contract_id: contract_id.clone(),
            name: request.name.clone(),
            purpose: request.purpose.clone(),
            total_staked: 0,
            total_rewards_distributed: 0,
            total_rewards_pending: 0,
            stakers: HashMap::new(),
            created_at: now,
            last_reward_distribution: now,
            reward_frequency: request.reward_frequency,
            min_stake: request.min_stake,
            max_stake: request.max_stake,
            slashing_enabled: request.slashing_enabled,
            slashing_rate: request.slashing_rate,
        };

        self.staking_contracts.insert(contract_id.clone(), contract);
        self.global_stats.total_contracts += 1;

        Ok(StakingResponse {
            success: true,
            message: "Staking contract created successfully".to_string(),
            data: Some(serde_json::json!({
                "contract_id": contract_id,
                "name": request.name,
                "purpose": request.purpose
            })),
        })
    }

    /// Crear pool de recompensas
    pub fn create_reward_pool(
        &mut self,
        request: CreateRewardPoolRequest,
    ) -> Result<StakingResponse, String> {
        let pool_id = self.generate_pool_id(&request.name);
        let now = get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?;

        let pool = RewardPool {
            pool_id: pool_id.clone(),
            name: request.name.clone(),
            purpose: request.purpose.clone(),
            total_rewards: request.total_rewards,
            distributed_rewards: 0,
            pending_rewards: request.total_rewards,
            reward_rate: request.reward_rate,
            max_rewards_per_day: request.max_rewards_per_day,
            daily_distributed: 0,
            last_reset: now,
            created_at: now,
        };

        self.reward_pools.insert(pool_id.clone(), pool);

        Ok(StakingResponse {
            success: true,
            message: "Reward pool created successfully".to_string(),
            data: Some(serde_json::json!({
                "pool_id": pool_id,
                "name": request.name,
                "purpose": request.purpose
            })),
        })
    }

    /// Stake tokens en un contrato
    pub fn stake_tokens(&mut self, request: StakeRequest) -> Result<StakingResponse, String> {
        let contract = self
            .staking_contracts
            .get_mut(&request.contract_id)
            .ok_or("Staking contract not found")?;

        // Verificar límites de stake
        if request.amount < contract.min_stake {
            return Err(format!(
                "Minimum stake amount is {} DYO",
                contract.min_stake
            ));
        }

        if let Some(max_stake) = contract.max_stake {
            if request.amount > max_stake {
                return Err(format!("Maximum stake amount is {} DYO", max_stake));
            }
        }

        let now = get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?;

        // Actualizar o crear información del staker
        let staker_info = contract
            .stakers
            .entry(request.staker.clone())
            .or_insert(StakerInfo {
                address: request.staker.clone(),
                staked_amount: 0,
                staked_at: now,
                last_claim: now,
                pending_rewards: 0,
                total_rewards_claimed: 0,
                slashing_events: 0,
                is_active: true,
            });

        // Si es un staker existente, calcular rewards pendientes antes de agregar más stake
        if staker_info.staked_amount > 0 {
            let pending = Self::calculate_pending_rewards_static(
                &StakingContract {
                    total_staked: contract.total_staked,
                    reward_frequency: contract.reward_frequency,
                    ..Default::default()
                },
                staker_info,
                now,
            )
            .map_err(|e| format!("Failed to calculate pending rewards: {}", e))?;

            staker_info.pending_rewards = SafeMath::add(
                staker_info.pending_rewards,
                pending,
                "staking_add_pending_rewards",
            )
            .map_err(|e| format!("Failed to add pending rewards: {}", e))?;
        }

        // Actualizar stake con SafeMath
        staker_info.staked_amount = SafeMath::add(
            staker_info.staked_amount,
            request.amount,
            "staking_update_staker_amount",
        )
        .map_err(|e| format!("Failed to update staker amount: {}", e))?;

        staker_info.staked_at = now;

        contract.total_staked = SafeMath::add(
            contract.total_staked,
            request.amount,
            "staking_update_total_staked",
        )
        .map_err(|e| format!("Failed to update total staked: {}", e))?;

        // Actualizar estadísticas globales
        if staker_info.staked_amount == request.amount {
            // Nuevo staker
            self.global_stats.total_stakers += 1;
            self.global_stats.active_stakers += 1;
        }
        self.global_stats.total_staked += request.amount;

        Ok(StakingResponse {
            success: true,
            message: format!("Staked {} DYO successfully", request.amount),
            data: Some(serde_json::json!({
                "contract_id": request.contract_id,
                "staker": request.staker,
                "staked_amount": staker_info.staked_amount,
                "total_staked": contract.total_staked
            })),
        })
    }

    /// Unstake tokens de un contrato - SECURED AGAINST FLASH LOANS
    pub fn unstake_tokens(&mut self, request: UnstakeRequest) -> Result<StakingResponse, String> {
        // Check emergency pause
        if self.emergency_paused {
            return Err(format!(
                "System is emergency paused: {}",
                self.emergency_pause_reason
                    .as_deref()
                    .unwrap_or("Unknown reason")
            ));
        }

        let contract = self
            .staking_contracts
            .get_mut(&request.contract_id)
            .ok_or("Staking contract not found")?;

        let staker_info = contract
            .stakers
            .get_mut(&request.staker)
            .ok_or("Staker not found")?;

        if staker_info.staked_amount < request.amount {
            return Err("Insufficient staked amount".to_string());
        }

        let now = get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?;

        // SECURITY: Enforce minimum lock period (7 days = 604800 seconds)
        const MIN_LOCK_PERIOD: u64 = 604800; // 7 days
        let stake_duration = now.saturating_sub(staker_info.staked_at);

        if stake_duration < MIN_LOCK_PERIOD {
            let remaining = MIN_LOCK_PERIOD - stake_duration;
            return Err(format!(
                "Minimum lock period not met. Please wait {} more seconds ({} days)",
                remaining,
                remaining / 86400
            ));
        }

        // SECURITY: Apply early withdrawal fee if unstaking before 30 days
        const FULL_LOCK_PERIOD: u64 = 2592000; // 30 days
        let early_withdrawal_fee_rate = if stake_duration < FULL_LOCK_PERIOD {
            0.05 // 5% penalty for early withdrawal
        } else {
            0.01 // 1% standard fee
        };

        // Calculate fee with SafeMath
        let fee_amount = SafeMath::percentage(
            request.amount,
            (early_withdrawal_fee_rate * 10000.0) as u64,
            "unstake_calculate_fee",
        )
        .map_err(|e| format!("Failed to calculate unstaking fee: {}", e))?;

        let amount_after_fee = SafeMath::sub(request.amount, fee_amount, "unstake_subtract_fee")
            .map_err(|e| format!("Failed to calculate amount after fee: {}", e))?;

        // Calcular rewards pendientes antes del unstake
        let pending = Self::calculate_pending_rewards_static(
            &StakingContract {
                total_staked: contract.total_staked,
                reward_frequency: contract.reward_frequency,
                ..Default::default()
            },
            staker_info,
            now,
        );
        staker_info.pending_rewards = SafeMath::add(
            staker_info.pending_rewards,
            pending.map_err(|e| e.to_string())?,
            "unstake_add_pending_rewards",
        )
        .map_err(|e| format!("Failed to add pending rewards: {}", e))?;

        staker_info.last_claim = now;

        // Actualizar stake con SafeMath
        staker_info.staked_amount = SafeMath::sub(
            staker_info.staked_amount,
            request.amount,
            "unstake_subtract_staked",
        )
        .map_err(|e| format!("Failed to update staked amount: {}", e))?;

        contract.total_staked = SafeMath::sub(
            contract.total_staked,
            request.amount,
            "unstake_subtract_total",
        )
        .map_err(|e| format!("Failed to update total staked: {}", e))?;

        // Si no queda stake, marcar como inactivo
        if staker_info.staked_amount == 0 {
            staker_info.is_active = false;
            self.global_stats.active_stakers -= 1;
        }

        self.global_stats.total_staked = self
            .global_stats
            .total_staked
            .saturating_sub(request.amount);

        info!("Unstake completed: {} unstaked {} DYO (fee: {} DYO, received: {} DYO, stake_duration: {} days)",
            request.staker, request.amount, fee_amount, amount_after_fee, stake_duration / 86400);

        Ok(StakingResponse {
            success: true,
            message: format!(
                "Unstaked {} DYO successfully (fee: {} DYO)",
                request.amount, fee_amount
            ),
            data: Some(serde_json::json!({
                "contract_id": request.contract_id,
                "staker": request.staker,
                "unstaked_amount": request.amount,
                "fee_amount": fee_amount,
                "amount_received": amount_after_fee,
                "remaining_staked": staker_info.staked_amount,
                "total_staked": contract.total_staked,
                "stake_duration_days": stake_duration / 86400,
                "early_withdrawal": stake_duration < FULL_LOCK_PERIOD
            })),
        })
    }

    /// Reclamar rewards
    pub fn claim_rewards(
        &mut self,
        request: ClaimRewardsRequest,
    ) -> Result<StakingResponse, String> {
        let contract = self
            .staking_contracts
            .get_mut(&request.contract_id)
            .ok_or("Staking contract not found")?;

        let staker_info = contract
            .stakers
            .get_mut(&request.staker)
            .ok_or("Staker not found")?;

        let now = get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?;

        // Calcular rewards pendientes
        let pending = Self::calculate_pending_rewards_static(
            &StakingContract {
                total_staked: contract.total_staked,
                reward_frequency: contract.reward_frequency,
                ..Default::default()
            },
            staker_info,
            now,
        );
        let total_claimable = staker_info.pending_rewards + pending.map_err(|e| e.to_string())?;

        if total_claimable == 0 {
            return Err("No rewards available to claim".to_string());
        }

        // Actualizar información del staker
        staker_info.pending_rewards = 0;
        staker_info.last_claim = now;
        staker_info.total_rewards_claimed += total_claimable;

        // Actualizar estadísticas del contrato
        contract.total_rewards_distributed += total_claimable;
        contract.total_rewards_pending -= total_claimable;

        // Actualizar estadísticas globales
        self.global_stats.total_rewards_distributed += total_claimable;
        self.global_stats.total_rewards_pending -= total_claimable;

        Ok(StakingResponse {
            success: true,
            message: format!("Claimed {} DYO rewards", total_claimable),
            data: Some(serde_json::json!({
                "contract_id": request.contract_id,
                "staker": request.staker,
                "claimed_amount": total_claimable,
                "total_claimed": staker_info.total_rewards_claimed
            })),
        })
    }

    /// Calcular rewards pendientes para un staker con SafeMath
    fn calculate_pending_rewards_static(
        contract: &StakingContract,
        staker: &StakerInfo,
        current_time: u64,
    ) -> SafeMathResult<u64> {
        if staker.staked_amount == 0 || !staker.is_active {
            return Ok(0);
        }

        // Safe time calculation with underflow protection
        let time_elapsed = current_time.saturating_sub(staker.last_claim);
        let periods_elapsed = SafeMath::div(
            time_elapsed,
            contract.reward_frequency,
            "staking_periods_elapsed",
        )?;

        if periods_elapsed == 0 {
            return Ok(0);
        }

        // Validate input ranges for security
        SafeMath::validate_range(staker.staked_amount, 1, u64::MAX, "staker_amount")?;
        SafeMath::validate_range(contract.total_staked, 1, u64::MAX, "total_staked")?;
        SafeMath::validate_range(periods_elapsed, 1, 365 * 24 * 60 * 60, "periods_elapsed")?; // Max 1 year

        // Calculate reward per period using SafeMath
        // Formula: (staker_amount * 100) / total_staked (0.01% per period)
        let reward_per_period = SafeMath::div(
            SafeMath::mul(staker.staked_amount, 100, "staking_reward_numerator")?,
            contract.total_staked,
            "staking_reward_denominator",
        )?;

        // Calculate total pending rewards
        let total_rewards =
            SafeMath::mul(reward_per_period, periods_elapsed, "staking_total_rewards")?;

        // Apply maximum reward cap to prevent runaway rewards
        let max_reward_cap =
            SafeMath::percentage(staker.staked_amount, 10000, "staking_max_reward_cap")?; // 100% of stake as max reward

        let final_rewards = if total_rewards > max_reward_cap {
            warn!("Staking rewards capped for staker {}: {} -> {} (context: calculate_pending_rewards)", 
                staker.address, total_rewards, max_reward_cap);
            max_reward_cap
        } else {
            total_rewards
        };

        info!("Calculated pending rewards for staker {}: {} DYO (stake: {}, periods: {}, reward_per_period: {})", 
            staker.address, final_rewards, staker.staked_amount, periods_elapsed, reward_per_period);

        Ok(final_rewards)
    }

    /// Distribuir rewards desde un pool con access control
    pub fn distribute_rewards(
        &mut self,
        pool_id: &str,
        contract_id: &str,
        amount: u64,
        caller_address: &str,
    ) -> Result<StakingResponse, String> {
        // Check if system is paused
        if self.emergency_paused {
            return Err(format!(
                "System is emergency paused: {}",
                self.emergency_pause_reason
                    .as_deref()
                    .unwrap_or("Unknown reason")
            ));
        }

        // Check access control permissions
        if !self
            .access_control
            .has_permission(caller_address, &Permission::StakingDistribute)
        {
            return Err("Unauthorized: Insufficient permissions to distribute rewards".to_string());
        }

        // Validate amount limits
        if amount > 1_000_000 {
            // Maximum 1M tokens per distribution
            return Err(
                "Amount exceeds maximum distribution limit of 1,000,000 tokens".to_string(),
            );
        }
        let pool = self
            .reward_pools
            .get_mut(pool_id)
            .ok_or("Reward pool not found")?;

        let contract = self
            .staking_contracts
            .get_mut(contract_id)
            .ok_or("Staking contract not found")?;

        let now = get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?;

        // Verificar límite diario
        if now - pool.last_reset > 86400 {
            // 24 horas
            pool.daily_distributed = 0;
            pool.last_reset = now;
        }

        if pool.daily_distributed + amount > pool.max_rewards_per_day {
            return Err("Daily reward limit exceeded".to_string());
        }

        if amount > pool.pending_rewards {
            return Err("Insufficient rewards in pool".to_string());
        }

        // Distribuir rewards a todos los stakers activos
        let total_staked = contract.total_staked;
        if total_staked == 0 {
            return Err("No active stakers to distribute rewards to".to_string());
        }

        for staker_info in contract.stakers.values_mut() {
            if staker_info.is_active && staker_info.staked_amount > 0 {
                // Calculate staker reward using SafeMath
                let staker_reward = SafeMath::div(
                    SafeMath::mul(
                        amount,
                        staker_info.staked_amount,
                        "distribute_rewards_numerator",
                    )
                    .map_err(|e| format!("Failed to calculate reward numerator: {}", e))?,
                    total_staked,
                    "distribute_rewards_denominator",
                )
                .map_err(|e| format!("Failed to calculate staker reward: {}", e))?;

                // Add reward to pending rewards
                staker_info.pending_rewards = SafeMath::add(
                    staker_info.pending_rewards,
                    staker_reward,
                    "distribute_rewards_add_pending",
                )
                .map_err(|e| format!("Failed to add reward to pending: {}", e))?;
            }
        }

        // Actualizar pools y contratos con SafeMath
        pool.distributed_rewards = SafeMath::add(
            pool.distributed_rewards,
            amount,
            "distribute_rewards_update_distributed",
        )
        .map_err(|e| format!("Failed to update distributed rewards: {}", e))?;

        pool.pending_rewards = SafeMath::sub(
            pool.pending_rewards,
            amount,
            "distribute_rewards_update_pending",
        )
        .map_err(|e| format!("Failed to update pending rewards: {}", e))?;

        pool.daily_distributed = SafeMath::add(
            pool.daily_distributed,
            amount,
            "distribute_rewards_update_daily",
        )
        .map_err(|e| format!("Failed to update daily distributed: {}", e))?;

        contract.total_rewards_pending = SafeMath::add(
            contract.total_rewards_pending,
            amount,
            "distribute_rewards_update_contract_pending",
        )
        .map_err(|e| format!("Failed to update contract pending rewards: {}", e))?;

        contract.last_reward_distribution = now;

        // Actualizar estadísticas globales
        self.global_stats.total_rewards_pending = SafeMath::add(
            self.global_stats.total_rewards_pending,
            amount,
            "distribute_rewards_update_global_pending",
        )
        .map_err(|e| format!("Failed to update global pending rewards: {}", e))?;

        info!(
            "Rewards distributed successfully: {} DYO from pool {} to contract {} by {}",
            amount, pool_id, contract_id, caller_address
        );

        Ok(StakingResponse {
            success: true,
            message: format!("Distributed {} DYO rewards to stakers", amount),
            data: Some(serde_json::json!({
                "pool_id": pool_id,
                "contract_id": contract_id,
                "distributed_amount": amount,
                "active_stakers": contract.stakers.values().filter(|s| s.is_active).count(),
                "distributed_by": caller_address
            })),
        })
    }

    /// Emergency pause staking system
    pub fn emergency_pause(&mut self, reason: String, paused_by: String) -> Result<(), String> {
        if !self
            .access_control
            .has_permission(&paused_by, &Permission::SystemPause)
        {
            return Err("Unauthorized: Insufficient permissions to pause system".to_string());
        }

        self.emergency_paused = true;
        self.emergency_pause_reason = Some(reason.clone());

        error!(
            "STAKING SYSTEM EMERGENCY PAUSE: {} by {}",
            reason, paused_by
        );
        Ok(())
    }

    /// Resume staking system from emergency pause
    pub fn resume_system(&mut self, resumed_by: String) -> Result<(), String> {
        if !self
            .access_control
            .has_permission(&resumed_by, &Permission::SystemPause)
        {
            return Err("Unauthorized: Insufficient permissions to resume system".to_string());
        }

        self.emergency_paused = false;
        self.emergency_pause_reason = None;

        info!("Staking system resumed by {}", resumed_by);
        Ok(())
    }

    /// Get system status including access control
    pub fn get_system_status(&self) -> serde_json::Value {
        serde_json::json!({
            "emergency_paused": self.emergency_paused,
            "emergency_pause_reason": self.emergency_pause_reason,
            "total_contracts": self.staking_contracts.len(),
            "total_pools": self.reward_pools.len(),
            "total_stakers": self.global_stats.total_stakers,
            "total_staked": self.global_stats.total_staked,
            "total_rewards_pending": self.global_stats.total_rewards_pending,
            "access_control_status": self.access_control.get_system_status()
        })
    }

    /// Aplicar slashing a un staker
    pub fn slash_staker(
        &mut self,
        contract_id: &str,
        staker: &str,
        reason: &str,
    ) -> Result<StakingResponse, String> {
        let contract = self
            .staking_contracts
            .get_mut(contract_id)
            .ok_or("Staking contract not found")?;

        if !contract.slashing_enabled {
            return Err("Slashing is not enabled for this contract".to_string());
        }

        let staker_info = contract.stakers.get_mut(staker).ok_or("Staker not found")?;

        if !staker_info.is_active {
            return Err("Staker is not active".to_string());
        }

        let slash_amount =
            (staker_info.staked_amount as f64 * contract.slashing_rate / 100.0) as u64;

        if slash_amount > staker_info.staked_amount {
            return Err("Slash amount exceeds staked amount".to_string());
        }

        // Aplicar slashing
        staker_info.staked_amount -= slash_amount;
        staker_info.slashing_events += 1;
        contract.total_staked -= slash_amount;

        // Si no queda stake, marcar como inactivo
        if staker_info.staked_amount == 0 {
            staker_info.is_active = false;
            self.global_stats.active_stakers -= 1;
        }

        self.global_stats.total_staked -= slash_amount;

        Ok(StakingResponse {
            success: true,
            message: format!(
                "Slashed {} DYO from staker {}: {}",
                slash_amount, staker, reason
            ),
            data: Some(serde_json::json!({
                "contract_id": contract_id,
                "staker": staker,
                "slash_amount": slash_amount,
                "remaining_staked": staker_info.staked_amount,
                "slashing_events": staker_info.slashing_events
            })),
        })
    }

    /// Obtener información de un contrato de staking
    pub fn get_staking_contract(&self, contract_id: &str) -> Option<&StakingContract> {
        self.staking_contracts.get(contract_id)
    }

    /// Obtener información de un staker
    pub fn get_staker_info(&self, contract_id: &str, staker: &str) -> Option<&StakerInfo> {
        self.staking_contracts.get(contract_id)?.stakers.get(staker)
    }

    /// Obtener estadísticas globales
    pub fn get_global_stats(&self) -> &StakingStats {
        &self.global_stats
    }

    /// Obtener estadísticas detalladas
    pub fn get_detailed_stats(&self) -> serde_json::Value {
        let mut total_contracts = 0;
        let mut total_stakers = 0;
        let mut total_staked = 0;
        let mut total_rewards_distributed = 0;
        let mut total_rewards_pending = 0;
        let mut active_stakers = 0;

        for contract in self.staking_contracts.values() {
            total_contracts += 1;
            total_staked += contract.total_staked;
            total_rewards_distributed += contract.total_rewards_distributed;
            total_rewards_pending += contract.total_rewards_pending;

            for staker in contract.stakers.values() {
                total_stakers += 1;
                if staker.is_active {
                    active_stakers += 1;
                }
            }
        }

        serde_json::json!({
            "global_stats": {
                "total_contracts": total_contracts,
                "total_stakers": total_stakers,
                "total_staked": total_staked,
                "total_rewards_distributed": total_rewards_distributed,
                "total_rewards_pending": total_rewards_pending,
                "active_stakers": active_stakers
            },
            "contracts": self.staking_contracts.len(),
            "reward_pools": self.reward_pools.len()
        })
    }

    /// Generar ID único para contrato
    fn generate_contract_id(&self, name: &str) -> String {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis().to_string())
            .unwrap_or_else(|e| {
                error!(error = %e, "CRITICAL: System time error in contract ID generation");
                {
                    use std::collections::hash_map::DefaultHasher;
                    use std::hash::{Hash, Hasher};
                    let mut hasher = DefaultHasher::new();
                    name.hash(&mut hasher);
                    hasher.finish().to_string()
                }
            });
        format!("STK_{}_{}", name.to_uppercase().replace(" ", "_"), now)
    }

    /// Generar ID único para pool
    fn generate_pool_id(&self, name: &str) -> String {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis().to_string())
            .unwrap_or_else(|e| {
                error!(error = %e, "CRITICAL: System time error in contract ID generation");
                {
                    use std::collections::hash_map::DefaultHasher;
                    use std::hash::{Hash, Hasher};
                    let mut hasher = DefaultHasher::new();
                    name.hash(&mut hasher);
                    hasher.finish().to_string()
                }
            });
        format!("POOL_{}_{}", name.to_uppercase().replace(" ", "_"), now)
    }
}

/// Configuraciones predefinidas para diferentes tipos de staking
pub struct StakingConfigs;

impl StakingConfigs {
    /// Configuración para Validadores Económicos
    pub fn economic_validators() -> (u64, Option<u64>, u64, bool, f64) {
        let min_stake = 1_000_000; // 1M DYO
        let max_stake = Some(100_000_000); // 100M DYO
        let reward_frequency = 86400; // 1 día
        let slashing_enabled = true;
        let slashing_rate = 5.0; // 5%

        (
            min_stake,
            max_stake,
            reward_frequency,
            slashing_enabled,
            slashing_rate,
        )
    }

    /// Configuración para Validadores Creativos
    pub fn creative_validators() -> (u64, Option<u64>, u64, bool, f64) {
        let min_stake = 0; // Sin mínimo
        let max_stake = Some(50_000_000); // 50M DYO
        let reward_frequency = 604800; // 1 semana
        let slashing_enabled = false;
        let slashing_rate = 0.0;

        (
            min_stake,
            max_stake,
            reward_frequency,
            slashing_enabled,
            slashing_rate,
        )
    }

    /// Configuración para Validadores Comunitarios
    pub fn community_validators() -> (u64, Option<u64>, u64, bool, f64) {
        let min_stake = 0; // Sin mínimo
        let max_stake = Some(10_000_000); // 10M DYO
        let reward_frequency = 604800; // 1 semana
        let slashing_enabled = false;
        let slashing_rate = 0.0;

        (
            min_stake,
            max_stake,
            reward_frequency,
            slashing_enabled,
            slashing_rate,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_staking_manager_creation() {
        let manager = StakingManager::new();
        assert_eq!(manager.global_stats.total_contracts, 0);
        assert_eq!(manager.global_stats.total_stakers, 0);
    }

    #[test]
    fn test_create_staking_contract() {
        let mut manager = StakingManager::new();

        let request = CreateStakingContractRequest {
            name: "Economic Validators".to_string(),
            purpose: "VALIDATORS".to_string(),
            min_stake: 1000000,
            max_stake: Some(100000000),
            reward_frequency: 86400,
            slashing_enabled: true,
            slashing_rate: 5.0,
        };

        let result = manager.create_staking_contract(request);
        assert!(result.is_ok());
        assert_eq!(manager.global_stats.total_contracts, 1);
    }

    #[test]
    fn test_stake_tokens() {
        let mut manager = StakingManager::new();

        // Crear contrato
        let create_request = CreateStakingContractRequest {
            name: "Test Contract".to_string(),
            purpose: "TEST".to_string(),
            min_stake: 1000,
            max_stake: None,
            reward_frequency: 86400,
            slashing_enabled: false,
            slashing_rate: 0.0,
        };
        let result = manager.create_staking_contract(create_request);
        assert!(result.is_ok());

        let contract_id = result.unwrap().data.unwrap()["contract_id"]
            .as_str()
            .unwrap()
            .to_string();

        // Stake tokens
        let stake_request = StakeRequest {
            contract_id: contract_id.clone(),
            staker: "staker1".to_string(),
            amount: 5000,
        };

        let result = manager.stake_tokens(stake_request);
        assert!(result.is_ok());
        assert_eq!(manager.global_stats.total_stakers, 1);
        assert_eq!(manager.global_stats.total_staked, 5000);
    }
}
