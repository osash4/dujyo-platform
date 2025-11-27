use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::utils::safe_math::SafeMath;
// ✅ SECURITY FIX: Removed unused imports (SafeMathResult, AtomicBool, Ordering, warn) to fix clippy warnings
use tracing::{info, error};

/// ✅ SECURITY FIX: Safe timestamp helper to replace unwrap()
fn get_current_timestamp() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .map_err(|e| {
            error!(error = %e, "CRITICAL: System time error in native token");
            format!("System time error: {}", e)
        })
}

/// ✅ SECURITY FIX: Safe timestamp helper for milliseconds
fn get_current_timestamp_ms() -> Result<u128, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .map_err(|e| {
            error!(error = %e, "CRITICAL: System time error in native token (ms)");
            format!("System time error: {}", e)
        })
}

/// Dujyo Native Token (DYO) - Token nativo con cap fijo y funcionalidades avanzadas
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeToken {
    // Token básico
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub max_supply: u64,
    pub balances: HashMap<String, u64>,
    
    // Funcionalidades avanzadas
    pub allowances: HashMap<String, HashMap<String, u64>>, // owner -> spender -> amount
    pub paused: bool,
    pub admin: String,
    pub minters: Vec<String>,
    
    // Vesting y locks
    pub vesting_schedules: HashMap<String, VestingSchedule>,
    pub locked_balances: HashMap<String, u64>,
    
    // Timelock
    pub timelock_delays: HashMap<String, u64>, // address -> delay in seconds
    pub pending_transfers: HashMap<String, PendingTransfer>,
    
    // Anti-dump
    pub daily_limits: HashMap<String, DailyLimit>,
    pub kyc_verified: HashMap<String, bool>,
    
    // Hooks para staking/rewards
    pub staking_contracts: Vec<String>,
    pub reward_contracts: Vec<String>,
    
    // Security enhancements
    pub reentrancy_guard: bool,
    pub emergency_paused: bool,
    pub emergency_pause_reason: Option<String>,
    
    // Audit trail
    pub event_log: Vec<TokenEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VestingSchedule {
    pub beneficiary: String,
    pub total_amount: u64,
    pub released_amount: u64,
    pub start_time: u64,
    pub cliff_duration: u64, // seconds
    pub vesting_duration: u64, // seconds
    pub release_frequency: u64, // seconds (monthly = 2592000)
    pub revocable: bool,
    pub revoked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingTransfer {
    pub from: String,
    pub to: String,
    pub amount: u64,
    pub execute_time: u64,
    pub tx_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyLimit {
    pub address: String,
    pub daily_limit: u64,
    pub used_today: u64,
    pub last_reset: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferRequest {
    pub from: String,
    pub to: String,
    pub amount: u64,
    pub content_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MintRequest {
    pub to: String,
    pub amount: u64,
    pub minter: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VestingRequest {
    pub beneficiary: String,
    pub total_amount: u64,
    pub cliff_duration: u64,
    pub vesting_duration: u64,
    pub release_frequency: u64,
    pub revocable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelockRequest {
    pub from: String,
    pub to: String,
    pub amount: u64,
    pub delay: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    pub success: bool,
    pub message: String,
    pub tx_hash: Option<String>,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenEvent {
    pub event_type: String,
    pub from: Option<String>,
    pub to: Option<String>,
    pub amount: u64,
    pub timestamp: u64,
    pub tx_hash: String,
    pub details: String,
}

impl NativeToken {
    /// Crear nuevo token nativo DYO
    pub fn new(admin: String) -> Self {
        Self {
            name: "Dujyo Token".to_string(),
            symbol: "DYO".to_string(),
            decimals: 18,
            total_supply: 0,
            max_supply: 1_000_000_000, // 1B tokens cap
            balances: HashMap::new(),
            allowances: HashMap::new(),
            paused: false,
            admin,
            minters: vec![],
            vesting_schedules: HashMap::new(),
            locked_balances: HashMap::new(),
            timelock_delays: HashMap::new(),
            pending_transfers: HashMap::new(),
            daily_limits: HashMap::new(),
            kyc_verified: HashMap::new(),
            staking_contracts: vec![],
            reward_contracts: vec![],
            reentrancy_guard: false,
            emergency_paused: false,
            emergency_pause_reason: None,
            event_log: Vec::new(),
        }
    }

    /// Mint inicial de tokens (solo admin) - SECURED
    pub fn initial_mint(&mut self, request: MintRequest) -> Result<TokenResponse, String> {
        // Security checks
        self.check_emergency_pause()?;
        self.check_reentrancy()?;

        if request.minter != self.admin {
            error!("Unauthorized mint attempt by {}", request.minter);
            return Err("Only admin can perform initial mint".to_string());
        }

        if self.paused {
            return Err("Token is paused".to_string());
        }

        // SafeMath for supply check
        let new_supply = SafeMath::add(
            self.total_supply,
            request.amount,
            "mint_check_max_supply"
        ).map_err(|e| format!("Mint calculation failed: {}", e))?;

        if new_supply > self.max_supply {
            return Err("Mint would exceed max supply".to_string());
        }

        // Set reentrancy guard
        self.reentrancy_guard = true;

        // Actualizar balance con SafeMath
        let current_balance = self.balances.entry(request.to.clone()).or_insert(0);
        *current_balance = SafeMath::add(
            *current_balance,
            request.amount,
            "mint_update_balance"
        ).map_err(|e| {
            self.reentrancy_guard = false;
            format!("Failed to update balance: {}", e)
        })?;
        
        self.total_supply = new_supply;

        let tx_hash = self.generate_tx_hash("mint");

        // Emit event
        self.emit_event(TokenEvent {
            event_type: "MINT".to_string(),
            from: None,
            to: Some(request.to.clone()),
            amount: request.amount,
            timestamp: get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?,
            tx_hash: tx_hash.clone(),
            details: format!("Minted by admin to {}", request.to),
        });

        // Release reentrancy guard
        self.reentrancy_guard = false;

        info!("Minted {} DYO to {} (tx: {})", request.amount, request.to, tx_hash);

        Ok(TokenResponse {
            success: true,
            message: format!("Minted {} DYO to {}", request.amount, request.to),
            tx_hash: Some(tx_hash),
            data: Some(serde_json::json!({
                "to": request.to,
                "amount": request.amount,
                "total_supply": self.total_supply
            })),
        })
    }

    /// Transfer con verificación de límites diarios y KYC
    pub fn transfer(&mut self, request: TransferRequest) -> Result<TokenResponse, String> {
        // SECURITY CHECKS - CRITICAL
        self.check_emergency_pause()?;
        self.check_reentrancy()?;
        
        // Set reentrancy guard
        self.reentrancy_guard = true;
        
        if self.paused {
            self.reentrancy_guard = false;
            return Err("Token is paused".to_string());
        }

        // Verificar balance
        let from_balance = self.balances.get(&request.from)
            .ok_or("Insufficient balance")?;
        
        if *from_balance < request.amount {
            return Err("Insufficient balance".to_string());
        }

        // Verificar límites diarios para transfers grandes
        if request.amount > 50_000_000 { // > $50k USD equivalent
            if !self.kyc_verified.get(&request.from).unwrap_or(&false) {
                return Err("KYC verification required for large transfers".to_string());
            }

            // Verificar límite diario
            if let Some(limit) = self.daily_limits.get_mut(&request.from) {
                let now = get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?;
                
                // Reset diario si es un nuevo día
                if now - limit.last_reset > 86400 { // 24 horas
                    limit.used_today = 0;
                    limit.last_reset = now;
                }

                if limit.used_today + request.amount > limit.daily_limit {
                    return Err("Daily transfer limit exceeded".to_string());
                }

                limit.used_today += request.amount;
            }
        }

        // Verificar si hay timelock delay
        if let Some(delay) = self.timelock_delays.get(&request.from) {
            if *delay > 0 {
                return self.schedule_timelock_transfer(request, *delay);
            }
        }

        // Ejecutar transfer inmediato
        self.execute_transfer(&request.from, &request.to, request.amount).map_err(|e| {
            self.reentrancy_guard = false;
            e
        })?;

        let tx_hash = self.generate_tx_hash("transfer");

        // Emit event for audit trail
        self.emit_event(TokenEvent {
            event_type: "TRANSFER".to_string(),
            from: Some(request.from.clone()),
            to: Some(request.to.clone()),
            amount: request.amount,
            timestamp: get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?,
            tx_hash: tx_hash.clone(),
            details: format!("Transfer from {} to {}", request.from, request.to),
        });

        // Release reentrancy guard
        self.reentrancy_guard = false;

        Ok(TokenResponse {
            success: true,
            message: format!("Transferred {} DYO from {} to {}", request.amount, request.from, request.to),
            tx_hash: Some(tx_hash),
            data: Some(serde_json::json!({
                "from": request.from,
                "to": request.to,
                "amount": request.amount
            })),
        })
    }

    /// Ejecutar transfer (función interna) - SECURED WITH SAFEMATH
    fn execute_transfer(&mut self, from: &str, to: &str, amount: u64) -> Result<(), String> {
        // Get current balances WITHOUT mutability first (checks phase)
        let from_balance = *self.balances.get(from)
            .ok_or("From address not found")?;
        
        if from_balance < amount {
            return Err("Insufficient balance".to_string());
        }

        // Effects phase - Update balances with SafeMath
        let new_from_balance = SafeMath::sub(
            from_balance,
            amount,
            "transfer_subtract_from"
        ).map_err(|e| format!("Failed to subtract from balance: {}", e))?;

        let to_balance_current = self.balances.get(to).copied().unwrap_or(0);
        let new_to_balance = SafeMath::add(
            to_balance_current,
            amount,
            "transfer_add_to"
        ).map_err(|e| format!("Failed to add to balance: {}", e))?;

        // Commit changes AFTER all calculations succeed
        self.balances.insert(from.to_string(), new_from_balance);
        self.balances.insert(to.to_string(), new_to_balance);

        Ok(())
    }

    /// Programar transfer con timelock
    fn schedule_timelock_transfer(&mut self, request: TransferRequest, _delay: u64) -> Result<TokenResponse, String> {
        let now = get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?;
        let execute_time = now + _delay;
        let tx_hash = self.generate_tx_hash("timelock_transfer");

        let pending_transfer = PendingTransfer {
            from: request.from.clone(),
            to: request.to.clone(),
            amount: request.amount,
            execute_time,
            tx_hash: tx_hash.clone(),
        };

        self.pending_transfers.insert(tx_hash.clone(), pending_transfer);

        Ok(TokenResponse {
            success: true,
            message: format!("Transfer scheduled for execution at {}", execute_time),
            tx_hash: Some(tx_hash),
            data: Some(serde_json::json!({
                "execute_time": execute_time,
                "delay": _delay
            })),
        })
    }

    /// Ejecutar transfers pendientes (llamar periódicamente)
    pub fn execute_pending_transfers(&mut self) -> Vec<TokenResponse> {
        // ✅ SECURITY FIX: Handle timestamp error gracefully
        let now = match get_current_timestamp() {
            Ok(ts) => ts,
            Err(e) => {
                error!(error = %e, "CRITICAL: Failed to get timestamp in execute_pending_transfers");
                return Vec::new(); // Return empty if timestamp fails
            }
        };
        let mut executed = Vec::new();
        let mut to_remove = Vec::new();

        // Collect pending transfers that are ready to execute
        for (tx_hash, pending) in &self.pending_transfers {
            if pending.execute_time <= now {
                to_remove.push(tx_hash.clone());
            }
        }

        // Execute transfers and remove them
        for tx_hash in to_remove {
            if let Some(pending) = self.pending_transfers.remove(&tx_hash) {
                match self.execute_transfer(&pending.from, &pending.to, pending.amount) {
                    Ok(_) => {
                        executed.push(TokenResponse {
                            success: true,
                            message: format!("Timelock transfer executed: {} DYO", pending.amount),
                            tx_hash: Some(tx_hash),
                            data: None,
                        });
                    }
                    Err(e) => {
                        executed.push(TokenResponse {
                            success: false,
                            message: format!("Failed to execute timelock transfer: {}", e),
                            tx_hash: Some(tx_hash),
                            data: None,
                        });
                    }
                }
            }
        }

        executed
    }

    /// Crear schedule de vesting
    pub fn create_vesting_schedule(&mut self, request: VestingRequest) -> Result<TokenResponse, String> {
        if self.paused {
            return Err("Token is paused".to_string());
        }

        // Verificar que el admin tiene suficientes tokens
        let admin_balance = *self.balances.get(&self.admin)
            .ok_or("Admin balance not found")?;
        
        if admin_balance < request.total_amount {
            return Err("Insufficient admin balance for vesting".to_string());
        }

        // Crear schedule de vesting
        let schedule = VestingSchedule {
            beneficiary: request.beneficiary.clone(),
            total_amount: request.total_amount,
            released_amount: 0,
            start_time: get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?,
            cliff_duration: request.cliff_duration,
            vesting_duration: request.vesting_duration,
            release_frequency: request.release_frequency,
            revocable: request.revocable,
            revoked: false,
        };

        // Bloquear tokens
        let admin_balance = self.balances.get_mut(&self.admin)
            .ok_or_else(|| {
                error!("CRITICAL: Admin balance not found in vesting creation");
                "Admin balance not found".to_string()
            })?;
        *admin_balance -= request.total_amount;
        
        self.locked_balances.insert(request.beneficiary.clone(), request.total_amount);
        self.vesting_schedules.insert(request.beneficiary.clone(), schedule);

        let tx_hash = self.generate_tx_hash("create_vesting");

        Ok(TokenResponse {
            success: true,
            message: format!("Vesting schedule created for {} DYO", request.total_amount),
            tx_hash: Some(tx_hash),
            data: Some(serde_json::json!({
                "beneficiary": request.beneficiary,
                "total_amount": request.total_amount,
                "cliff_duration": request.cliff_duration,
                "vesting_duration": request.vesting_duration
            })),
        })
    }

    /// Liberar tokens vestidos
    pub fn release_vested_tokens(&mut self, beneficiary: &str) -> Result<TokenResponse, String> {
        let schedule = self.vesting_schedules.get_mut(beneficiary)
            .ok_or("No vesting schedule found")?;

        if schedule.revoked {
            return Err("Vesting schedule has been revoked".to_string());
        }

        let now = get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?;
        
        // Verificar si ha pasado el cliff
        if now < schedule.start_time + schedule.cliff_duration {
            return Err("Cliff period has not ended".to_string());
        }

        // Calcular tokens liberables
        let elapsed = now - (schedule.start_time + schedule.cliff_duration);
        let total_vesting_time = schedule.vesting_duration;
        
        let vested_amount = if elapsed >= total_vesting_time {
            schedule.total_amount
        } else {
            (schedule.total_amount * elapsed) / total_vesting_time
        };

        let releasable = vested_amount - schedule.released_amount;
        
        if releasable == 0 {
            return Err("No tokens available for release".to_string());
        }

        // Liberar tokens
        schedule.released_amount += releasable;
        
        let beneficiary_balance = self.balances.entry(beneficiary.to_string()).or_insert(0);
        *beneficiary_balance += releasable;

        // Actualizar locked balance
        if let Some(locked) = self.locked_balances.get_mut(beneficiary) {
            *locked -= releasable;
            if *locked == 0 {
                self.locked_balances.remove(beneficiary);
            }
        }

        let total_released = schedule.released_amount;
        let tx_hash = self.generate_tx_hash("release_vested");

        Ok(TokenResponse {
            success: true,
            message: format!("Released {} DYO from vesting", releasable),
            tx_hash: Some(tx_hash),
            data: Some(serde_json::json!({
                "beneficiary": beneficiary,
                "released_amount": releasable,
                "total_released": total_released
            })),
        })
    }

    /// Configurar timelock delay para una dirección
    pub fn set_timelock_delay(&mut self, address: &str, delay: u64, admin: &str) -> Result<TokenResponse, String> {
        if admin != self.admin {
            return Err("Only admin can set timelock delays".to_string());
        }

        self.timelock_delays.insert(address.to_string(), delay);

        Ok(TokenResponse {
            success: true,
            message: format!("Timelock delay set to {} seconds for {}", delay, address),
            tx_hash: Some(self.generate_tx_hash("set_timelock")),
            data: None,
        })
    }

    /// Configurar límite diario para una dirección
    pub fn set_daily_limit(&mut self, address: &str, limit: u64, admin: &str) -> Result<TokenResponse, String> {
        if admin != self.admin {
            return Err("Only admin can set daily limits".to_string());
        }

        let now = get_current_timestamp().map_err(|e| format!("Failed to get timestamp: {}", e))?;
        
        self.daily_limits.insert(address.to_string(), DailyLimit {
            address: address.to_string(),
            daily_limit: limit,
            used_today: 0,
            last_reset: now,
        });

        Ok(TokenResponse {
            success: true,
            message: format!("Daily limit set to {} DYO for {}", limit, address),
            tx_hash: Some(self.generate_tx_hash("set_daily_limit")),
            data: None,
        })
    }

    /// Verificar KYC para una dirección
    pub fn verify_kyc(&mut self, address: &str, verified: bool, admin: &str) -> Result<TokenResponse, String> {
        if admin != self.admin {
            return Err("Only admin can verify KYC".to_string());
        }

        self.kyc_verified.insert(address.to_string(), verified);

        Ok(TokenResponse {
            success: true,
            message: format!("KYC verification {} for {}", if verified { "approved" } else { "revoked" }, address),
            tx_hash: Some(self.generate_tx_hash("verify_kyc")),
            data: None,
        })
    }

    /// Pausar/despausar token (solo admin)
    pub fn pause(&mut self, paused: bool, admin: &str) -> Result<TokenResponse, String> {
        if admin != self.admin {
            return Err("Only admin can pause/unpause token".to_string());
        }

        self.paused = paused;

        Ok(TokenResponse {
            success: true,
            message: format!("Token {}", if paused { "paused" } else { "unpaused" }),
            tx_hash: Some(self.generate_tx_hash("pause")),
            data: None,
        })
    }

    /// Obtener balance de una dirección
    pub fn balance_of(&self, address: &str) -> u64 {
        self.balances.get(address).copied().unwrap_or(0)
    }

    /// Obtener balance bloqueado (vesting)
    pub fn locked_balance_of(&self, address: &str) -> u64 {
        self.locked_balances.get(address).copied().unwrap_or(0)
    }

    /// Obtener información de vesting
    pub fn get_vesting_info(&self, address: &str) -> Option<&VestingSchedule> {
        self.vesting_schedules.get(address)
    }

    /// Obtener estadísticas del token
    pub fn get_token_stats(&self) -> serde_json::Value {
        let locked_total: u64 = self.locked_balances.values().sum();
        serde_json::json!({
            "name": self.name,
            "symbol": self.symbol,
            "decimals": self.decimals,
            "total_supply": self.total_supply,
            "max_supply": self.max_supply,
            "circulating_supply": self.total_supply - locked_total,
            "paused": self.paused,
            "admin": self.admin,
            "total_addresses": self.balances.len(),
            "vesting_schedules": self.vesting_schedules.len(),
            "pending_transfers": self.pending_transfers.len()
        })
    }

    /// Generar hash de transacción
    fn generate_tx_hash(&self, tx_type: &str) -> String {
        // ✅ SECURITY FIX: Handle timestamp error gracefully
        let now = match get_current_timestamp_ms() {
            Ok(ts) => ts.to_string(),
            Err(e) => {
                error!(error = %e, "CRITICAL: Failed to get timestamp for tx hash, using fallback");
                // Fallback: use counter or random value
                format!("{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_nanos())
                    .unwrap_or(0))
            }
        };
        format!("DYO_{}_{}", tx_type, now)
    }

    /// Check for reentrancy attack
    fn check_reentrancy(&self) -> Result<(), String> {
        if self.reentrancy_guard {
            error!("SECURITY: Reentrancy attack detected and blocked");
            return Err("Reentrancy attack detected".to_string());
        }
        Ok(())
    }

    /// Check emergency pause status
    fn check_emergency_pause(&self) -> Result<(), String> {
        if self.emergency_paused {
            return Err(format!("System is emergency paused: {}", 
                self.emergency_pause_reason.as_deref().unwrap_or("Unknown reason")));
        }
        Ok(())
    }

    /// Emergency pause (admin only)
    pub fn emergency_pause(&mut self, reason: String, admin: &str) -> Result<TokenResponse, String> {
        if admin != self.admin {
            return Err("Only admin can emergency pause".to_string());
        }

        self.emergency_paused = true;
        self.emergency_pause_reason = Some(reason.clone());

        error!("TOKEN EMERGENCY PAUSE: {} by {}", reason, admin);

        Ok(TokenResponse {
            success: true,
            message: format!("Token emergency paused: {}", reason),
            tx_hash: Some(self.generate_tx_hash("emergency_pause")),
            data: None,
        })
    }

    /// Resume from emergency pause (admin only)
    pub fn resume_from_emergency(&mut self, admin: &str) -> Result<TokenResponse, String> {
        if admin != self.admin {
            return Err("Only admin can resume from emergency pause".to_string());
        }

        self.emergency_paused = false;
        self.emergency_pause_reason = None;

        info!("Token resumed from emergency pause by {}", admin);

        Ok(TokenResponse {
            success: true,
            message: "Token resumed from emergency pause".to_string(),
            tx_hash: Some(self.generate_tx_hash("resume_emergency")),
            data: None,
        })
    }

    /// Emit event for audit trail
    fn emit_event(&mut self, event: TokenEvent) {
        info!("TOKEN EVENT: {} - {}", event.event_type, event.details);
        self.event_log.push(event);
        
        // Keep only last 10000 events to prevent memory bloat
        if self.event_log.len() > 10000 {
            self.event_log.remove(0);
        }
    }

    /// Get audit log
    pub fn get_audit_log(&self, limit: usize) -> Vec<&TokenEvent> {
        let start = if self.event_log.len() > limit {
            self.event_log.len() - limit
        } else {
            0
        };
        self.event_log[start..].iter().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_creation() {
        let token = NativeToken::new("admin".to_string());
        assert_eq!(token.name, "Dujyo Token");
        assert_eq!(token.symbol, "DYO");
        assert_eq!(token.max_supply, 1_000_000_000);
        assert_eq!(token.total_supply, 0);
    }

    #[test]
    fn test_initial_mint() {
        let mut token = NativeToken::new("admin".to_string());
        let request = MintRequest {
            to: "user1".to_string(),
            amount: 1000,
            minter: "admin".to_string(),
        };

        let result = token.initial_mint(request);
        assert!(result.is_ok());
        assert_eq!(token.balance_of("user1"), 1000);
        assert_eq!(token.total_supply, 1000);
    }

    #[test]
    fn test_max_supply_limit() {
        let mut token = NativeToken::new("admin".to_string());
        let request = MintRequest {
            to: "user1".to_string(),
            amount: 1_000_000_001, // Exceeds max supply
            minter: "admin".to_string(),
        };

        let result = token.initial_mint(request);
        assert!(result.is_err());
    }

    #[test]
    fn test_vesting_schedule() {
        let mut token = NativeToken::new("admin".to_string());
        
        // Mint tokens to admin first
        let mint_request = MintRequest {
            to: "admin".to_string(),
            amount: 1000000,
            minter: "admin".to_string(),
        };
        token.initial_mint(mint_request).unwrap();

        // Create vesting schedule
        let vesting_request = VestingRequest {
            beneficiary: "beneficiary".to_string(),
            total_amount: 100000,
            cliff_duration: 31536000, // 1 year
            vesting_duration: 94608000, // 3 years
            release_frequency: 2592000, // 1 month
            revocable: true,
        };

        let result = token.create_vesting_schedule(vesting_request);
        assert!(result.is_ok());
        assert_eq!(token.locked_balance_of("beneficiary"), 100000);
    }

    // ========== CRITICAL SECURITY TESTS ==========

    #[test]
    fn test_emergency_pause_blocks_transfers() {
        let mut token = NativeToken::new("admin".to_string());
        
        // Mint inicial
        let mint = MintRequest {
            to: "user1".to_string(),
            amount: 1000000,
            minter: "admin".to_string(),
        };
        token.initial_mint(mint).unwrap();
        
        // Pausar sistema
        let pause_result = token.emergency_pause("Test emergency".to_string(), "admin");
        assert!(pause_result.is_ok(), "Emergency pause should succeed");
        
        // Intentar transfer durante pausa - DEBE FALLAR
        let transfer = TransferRequest {
            from: "user1".to_string(),
            to: "user2".to_string(),
            amount: 100,
            content_id: None,
        };
        
        let transfer_result = token.transfer(transfer);
        assert!(transfer_result.is_err(), "Transfer should fail when paused");
        assert!(transfer_result.unwrap_err().contains("emergency paused"), 
            "Error should mention emergency pause");
        
        println!("✅ SECURITY TEST PASSED: Emergency pause blocks transfers");
    }

    #[test]
    fn test_reentrancy_guard_protection() {
        let mut token = NativeToken::new("admin".to_string());
        
        // Mint tokens
        token.initial_mint(MintRequest {
            to: "user1".to_string(),
            amount: 1000000,
            minter: "admin".to_string(),
        }).unwrap();
        
        // Set reentrancy guard manualmente para simular ataque
        token.reentrancy_guard = true;
        
        // Intentar mint durante reentrancy guard activo - DEBE FALLAR
        let result = token.initial_mint(MintRequest {
            to: "user2".to_string(),
            amount: 100,
            minter: "admin".to_string(),
        });
        
        assert!(result.is_err(), "Should detect reentrancy");
        assert!(result.unwrap_err().contains("Reentrancy"), 
            "Error should mention reentrancy attack");
        
        println!("✅ SECURITY TEST PASSED: Reentrancy guard works");
    }

    #[test]
    fn test_safemath_overflow_protection() {
        use crate::utils::safe_math::SafeMath;
        
        // Test overflow en add
        let max_u64 = u64::MAX;
        let result = SafeMath::add(max_u64, 1, "overflow_test");
        assert!(result.is_err(), "Should detect overflow");
        
        // Test underflow en sub
        let result = SafeMath::sub(0u64, 1, "underflow_test");
        assert!(result.is_err(), "Should detect underflow");
        
        println!("✅ SECURITY TEST PASSED: SafeMath prevents overflow/underflow");
    }
}
