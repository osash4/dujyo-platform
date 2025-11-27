use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

/// Sistema de Vesting Avanzado para Dujyo Token
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VestingManager {
    pub schedules: HashMap<String, VestingSchedule>,
    pub global_stats: VestingStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VestingSchedule {
    pub id: String,
    pub beneficiary: String,
    pub total_amount: u64,
    pub released_amount: u64,
    pub start_time: u64,
    pub cliff_duration: u64,    // seconds
    pub vesting_duration: u64,  // seconds
    pub release_frequency: u64, // seconds
    pub revocable: bool,
    pub revoked: bool,
    pub revoked_at: Option<u64>,
    pub created_by: String,
    pub created_at: u64,
    pub last_release: Option<u64>,
    pub release_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VestingStats {
    pub total_schedules: u32,
    pub total_vested_amount: u64,
    pub total_released_amount: u64,
    pub total_locked_amount: u64,
    pub active_schedules: u32,
    pub revoked_schedules: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVestingRequest {
    pub beneficiary: String,
    pub total_amount: u64,
    pub cliff_duration: u64,
    pub vesting_duration: u64,
    pub release_frequency: u64,
    pub revocable: bool,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseVestingRequest {
    pub schedule_id: String,
    pub requester: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevokeVestingRequest {
    pub schedule_id: String,
    pub revoker: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VestingResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

impl VestingManager {
    pub fn new() -> Self {
        Self {
            schedules: HashMap::new(),
            global_stats: VestingStats {
                total_schedules: 0,
                total_vested_amount: 0,
                total_released_amount: 0,
                total_locked_amount: 0,
                active_schedules: 0,
                revoked_schedules: 0,
            },
        }
    }

    /// Crear nuevo schedule de vesting
    pub fn create_vesting_schedule(
        &mut self,
        request: CreateVestingRequest,
    ) -> Result<VestingResponse, String> {
        // ✅ SECURITY FIX VULN-008: Use centralized validation function
        Self::validate_vesting_inputs(
            request.total_amount,
            request.cliff_duration,
            request.vesting_duration,
            request.release_frequency,
        )?;
        
        // ✅ SECURITY FIX: Release frequency must be reasonable (at least 1 day)
        const MIN_RELEASE_FREQUENCY: u64 = 24 * 60 * 60; // 1 day in seconds
        if request.release_frequency < MIN_RELEASE_FREQUENCY {
            return Err("Release frequency must be at least 1 day".to_string());
        }

        if request.cliff_duration > request.vesting_duration {
            return Err("Cliff duration cannot be greater than vesting duration".to_string());
        }
        
        // ✅ SECURITY FIX: Calculate release count and check for overflow
        let release_count = request.vesting_duration / request.release_frequency;
        if release_count == 0 {
            return Err("Release count cannot be zero. Increase vesting duration or decrease release frequency.".to_string());
        }
        
        // ✅ SECURITY FIX: Prevent overflow in release_count (max u32::MAX)
        if release_count > u32::MAX as u64 {
            return Err(format!("Release count {} exceeds maximum allowed value ({}). Decrease vesting duration or increase release frequency.", 
                release_count, u32::MAX));
        }
        
        // ✅ SECURITY FIX: Calculate release amount and check for overflow
        // Use checked division to prevent overflow
        let release_amount = request.total_amount.checked_div(release_count as u64)
            .ok_or_else(|| "Division overflow in release amount calculation".to_string())?;
        
        if release_amount == 0 {
            return Err("Release amount cannot be zero. Increase total amount or decrease release count.".to_string());
        }
        
        // ✅ SECURITY FIX: Validate that total_amount can be divided evenly (or warn)
        let total_release_amount = release_amount.checked_mul(release_count as u64)
            .ok_or_else(|| "Multiplication overflow in total release amount calculation".to_string())?;
        
        if total_release_amount != request.total_amount {
            // Warn if there's a remainder (not a critical error, but should be noted)
            eprintln!("⚠️  WARNING: Total amount {} cannot be evenly divided into {} releases. Remainder: {}",
                request.total_amount, release_count, request.total_amount - total_release_amount);
        }

        // Generar ID único
        let schedule_id = self.generate_schedule_id(&request.beneficiary);

        // Verificar que no existe ya un schedule para este beneficiario
        if self
            .schedules
            .values()
            .any(|s| s.beneficiary == request.beneficiary && !s.revoked)
        {
            return Err("Active vesting schedule already exists for this beneficiary".to_string());
        }

        // ✅ SECURITY FIX: Replace unwrap() with proper error handling
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or_else(|e| {
                eprintln!("❌ Failed to get system time: {}", e);
                0u64 // Fallback to 0 if time calculation fails
            });

        // Crear schedule
        let schedule = VestingSchedule {
            id: schedule_id.clone(),
            beneficiary: request.beneficiary.clone(),
            total_amount: request.total_amount,
            released_amount: 0,
            start_time: now,
            cliff_duration: request.cliff_duration,
            vesting_duration: request.vesting_duration,
            release_frequency: request.release_frequency,
            revocable: request.revocable,
            revoked: false,
            revoked_at: None,
            created_by: request.created_by,
            created_at: now,
            last_release: None,
            release_count: 0,
        };

        // ✅ SECURITY FIX: Update statistics with overflow protection
        // Actualizar estadísticas
        self.global_stats.total_schedules = self.global_stats.total_schedules
            .checked_add(1)
            .ok_or_else(|| "Overflow in total_schedules".to_string())?;
        
        self.global_stats.total_vested_amount = self.global_stats.total_vested_amount
            .checked_add(request.total_amount)
            .ok_or_else(|| format!("Overflow in total_vested_amount: {} + {}", self.global_stats.total_vested_amount, request.total_amount))?;
        
        self.global_stats.total_locked_amount = self.global_stats.total_locked_amount
            .checked_add(request.total_amount)
            .ok_or_else(|| format!("Overflow in total_locked_amount: {} + {}", self.global_stats.total_locked_amount, request.total_amount))?;
        
        self.global_stats.active_schedules = self.global_stats.active_schedules
            .checked_add(1)
            .ok_or_else(|| "Overflow in active_schedules".to_string())?;

        self.schedules.insert(schedule_id.clone(), schedule);

        Ok(VestingResponse {
            success: true,
            message: format!("Vesting schedule created for {} DYO", request.total_amount),
            data: Some(serde_json::json!({
                "schedule_id": schedule_id,
                "beneficiary": request.beneficiary,
                "total_amount": request.total_amount,
                "cliff_duration": request.cliff_duration,
                "vesting_duration": request.vesting_duration,
                "release_frequency": request.release_frequency
            })),
        })
    }

    /// Liberar tokens vestidos
    pub fn release_vested_tokens(
        &mut self,
        request: ReleaseVestingRequest,
    ) -> Result<VestingResponse, String> {
        let schedule = self
            .schedules
            .get_mut(&request.schedule_id)
            .ok_or("Vesting schedule not found")?;

        if schedule.revoked {
            return Err("Vesting schedule has been revoked".to_string());
        }

        // ✅ SECURITY FIX: Replace unwrap() with proper error handling
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or_else(|e| {
                eprintln!("❌ Failed to get system time: {}", e);
                0u64 // Fallback to 0 if time calculation fails
            });

        // Verificar si ha pasado el cliff
        if now < schedule.start_time + schedule.cliff_duration {
            return Err("Cliff period has not ended yet".to_string());
        }

        // Calcular tokens liberables
        let releasable = Self::calculate_releasable_amount_static(schedule, now);

        if releasable == 0 {
            return Err("No tokens available for release at this time".to_string());
        }

        // Verificar que no se exceda el total
        // ✅ SECURITY FIX VULN-005: Use SafeMath for overflow protection
        use crate::utils::safe_math::SafeMath;
        let new_released = SafeMath::add(schedule.released_amount, releasable, "vesting_release")
            .map_err(|e| format!("Arithmetic overflow in vesting release: {}", e))?;
        
        if new_released > schedule.total_amount {
            return Err("Release would exceed total vesting amount".to_string());
        }

        // Liberar tokens
        schedule.released_amount = new_released;
        schedule.last_release = Some(now);
        schedule.release_count += 1;

        // Actualizar estadísticas
        // ✅ SECURITY FIX VULN-005: Use SafeMath for statistics update
        self.global_stats.total_released_amount = SafeMath::add(
            self.global_stats.total_released_amount, 
            releasable, 
            "vesting_stats_released"
        ).map_err(|e| format!("Arithmetic overflow in vesting stats: {}", e))?;
        
        self.global_stats.total_locked_amount = SafeMath::sub(
            self.global_stats.total_locked_amount, 
            releasable, 
            "vesting_stats_locked"
        ).map_err(|e| format!("Arithmetic underflow in vesting stats: {}", e))?;

        // Si se liberaron todos los tokens, marcar como completado
        if schedule.released_amount >= schedule.total_amount {
            self.global_stats.active_schedules -= 1;
        }

        Ok(VestingResponse {
            success: true,
            message: format!("Released {} DYO from vesting", releasable),
            data: Some(serde_json::json!({
                "schedule_id": request.schedule_id,
                "released_amount": releasable,
                "total_released": schedule.released_amount,
                "remaining_amount": schedule.total_amount - schedule.released_amount,
                "release_count": schedule.release_count
            })),
        })
    }

    /// Revocar schedule de vesting (solo si es revocable)
    pub fn revoke_vesting_schedule(
        &mut self,
        request: RevokeVestingRequest,
    ) -> Result<VestingResponse, String> {
        let schedule = self
            .schedules
            .get_mut(&request.schedule_id)
            .ok_or("Vesting schedule not found")?;

        if schedule.revoked {
            return Err("Vesting schedule is already revoked".to_string());
        }

        if !schedule.revocable {
            return Err("This vesting schedule is not revocable".to_string());
        }

        // Solo el creador puede revocar
        if schedule.created_by != request.revoker {
            return Err("Only the creator can revoke this vesting schedule".to_string());
        }

        // ✅ SECURITY FIX: Replace unwrap() with proper error handling
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or_else(|e| {
                eprintln!("❌ Failed to get system time: {}", e);
                0u64 // Fallback to 0 if time calculation fails
            });

        // Marcar como revocado
        schedule.revoked = true;
        schedule.revoked_at = Some(now);

        // Calcular tokens no liberados que se revocan
        let revoked_amount = schedule.total_amount - schedule.released_amount;

        // Actualizar estadísticas
        self.global_stats.active_schedules -= 1;
        self.global_stats.revoked_schedules += 1;
        self.global_stats.total_locked_amount -= revoked_amount;

        Ok(VestingResponse {
            success: true,
            message: format!(
                "Vesting schedule revoked. {} DYO returned to treasury",
                revoked_amount
            ),
            data: Some(serde_json::json!({
                "schedule_id": request.schedule_id,
                "revoked_amount": revoked_amount,
                "released_amount": schedule.released_amount,
                "revoked_at": now
            })),
        })
    }

    // ✅ SECURITY FIX VULN-008: Enhanced input validation for vesting calculations
    fn validate_vesting_inputs(
        total_amount: u64,
        cliff_duration: u64,
        vesting_duration: u64,
        release_frequency: u64,
    ) -> Result<(), String> {
        // Validate total amount
        if total_amount == 0 {
            return Err("Total amount must be greater than 0".to_string());
        }
        
        // ✅ SECURITY FIX VULN-005: Prevent overflow in total_amount
        if total_amount > u64::MAX / 2 {
            return Err(format!("Total amount {} exceeds maximum allowed value", total_amount));
        }

        // Validate vesting duration
        if vesting_duration == 0 {
            return Err("Vesting duration must be greater than 0".to_string());
        }
        
        // ✅ SECURITY FIX: Prevent unreasonably long vesting periods (max 10 years)
        const MAX_VESTING_DURATION: u64 = 10 * 365 * 24 * 60 * 60; // 10 years in seconds
        if vesting_duration > MAX_VESTING_DURATION {
            return Err(format!("Vesting duration {} exceeds maximum allowed duration (10 years)", vesting_duration));
        }

        // Validate release frequency
        if release_frequency == 0 {
            return Err("Release frequency must be greater than 0".to_string());
        }
        
        // ✅ SECURITY FIX: Release frequency must be less than or equal to vesting duration
        if release_frequency > vesting_duration {
            return Err("Release frequency cannot be greater than vesting duration".to_string());
        }
        
        // ✅ SECURITY FIX: Cliff duration must be less than vesting duration
        if cliff_duration >= vesting_duration {
            return Err("Cliff duration must be less than vesting duration".to_string());
        }

        Ok(())
    }

    /// Calcular cantidad liberable en un momento dado
    fn calculate_releasable_amount_static(schedule: &VestingSchedule, current_time: u64) -> u64 {
        if current_time < schedule.start_time + schedule.cliff_duration {
            return 0; // Aún en período de cliff
        }

        // ✅ SECURITY FIX VULN-005: Use SafeMath for vesting calculations
        use crate::utils::safe_math::SafeMath;
        
        let vesting_start = schedule.start_time + schedule.cliff_duration;
        let elapsed = current_time.checked_sub(vesting_start).unwrap_or(0);
        let total_vesting_time = schedule.vesting_duration;

        if elapsed >= total_vesting_time {
            // Todo el período de vesting ha pasado
            // ✅ SECURITY FIX VULN-005: Use SafeMath for subtraction
            return SafeMath::sub(schedule.total_amount, schedule.released_amount, "vesting_complete")
                .unwrap_or(0);
        }

        // Calcular tokens vestidos hasta ahora
        // ✅ SECURITY FIX VULN-005: Use SafeMath for multiplication and division
        let vested_amount = SafeMath::mul(schedule.total_amount, elapsed, "vesting_multiply")
            .and_then(|num| SafeMath::div(num, total_vesting_time, "vesting_divide"))
            .unwrap_or(0);

        // Calcular tokens liberables (considerando releases previos)
        if vested_amount > schedule.released_amount {
            SafeMath::sub(vested_amount, schedule.released_amount, "vesting_releasable")
                .unwrap_or(0)
        } else {
            0
        }
    }

    /// Obtener información de un schedule
    pub fn get_vesting_schedule(&self, schedule_id: &str) -> Option<&VestingSchedule> {
        self.schedules.get(schedule_id)
    }

    /// Obtener schedules de un beneficiario
    pub fn get_beneficiary_schedules(&self, beneficiary: &str) -> Vec<&VestingSchedule> {
        self.schedules
            .values()
            .filter(|s| s.beneficiary == beneficiary)
            .collect()
    }

    /// Obtener schedules que pueden liberar tokens
    pub fn get_releasable_schedules(&self) -> Vec<&VestingSchedule> {
        // ✅ SECURITY FIX VULN-009: Replace unwrap() with proper error handling
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or_else(|e| {
                eprintln!("❌ Failed to get system time: {}", e);
                // Return 0 as fallback (will filter out all schedules)
                0u64
            });

        self.schedules
            .values()
            .filter(|s| {
                !s.revoked
                    && s.released_amount < s.total_amount
                    && now >= s.start_time + s.cliff_duration
            })
            .collect()
    }

    /// Procesar liberaciones automáticas (llamar periódicamente)
    pub fn process_automatic_releases(&mut self) -> Vec<VestingResponse> {
        let mut releases = Vec::new();

        // Get schedule IDs that are releasable
        let releasable_ids: Vec<String> = self
            .get_releasable_schedules()
            .iter()
            .map(|s| s.id.clone())
            .collect();

        for schedule_id in releasable_ids {
            let request = ReleaseVestingRequest {
                schedule_id: schedule_id.clone(),
                requester: "system".to_string(),
            };

            match self.release_vested_tokens(request) {
                Ok(response) => releases.push(response),
                Err(_) => {
                    // Ignorar errores en liberaciones automáticas
                }
            }
        }

        releases
    }

    /// Obtener estadísticas globales
    pub fn get_global_stats(&self) -> &VestingStats {
        &self.global_stats
    }

    /// Obtener estadísticas detalladas
    pub fn get_detailed_stats(&self) -> serde_json::Value {
        // ✅ SECURITY FIX VULN-009: Replace unwrap() with proper error handling
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or_else(|e| {
                eprintln!("❌ Failed to get system time: {}", e);
                // Return 0 as fallback
                0u64
            });

        let mut cliff_schedules = 0;
        let mut vesting_schedules = 0;
        let mut completed_schedules = 0;
        let mut total_vested_but_unreleased = 0;

        for schedule in self.schedules.values() {
            if schedule.revoked {
                continue;
            }

            if now < schedule.start_time + schedule.cliff_duration {
                cliff_schedules += 1;
            } else if schedule.released_amount < schedule.total_amount {
                vesting_schedules += 1;
                let vested = Self::calculate_releasable_amount_static(schedule, now)
                    + schedule.released_amount;
                total_vested_but_unreleased += vested - schedule.released_amount;
            } else {
                completed_schedules += 1;
            }
        }

        serde_json::json!({
            "global_stats": self.global_stats,
            "detailed_stats": {
                "cliff_schedules": cliff_schedules,
                "vesting_schedules": vesting_schedules,
                "completed_schedules": completed_schedules,
                "total_vested_but_unreleased": total_vested_but_unreleased
            },
            "total_schedules": self.schedules.len()
        })
    }

    /// Generar ID único para schedule
    fn generate_schedule_id(&self, beneficiary: &str) -> String {
        // ✅ SECURITY FIX: Handle timestamp error gracefully
        let now = match SystemTime::now().duration_since(UNIX_EPOCH) {
            Ok(duration) => duration.as_millis().to_string(),
            Err(e) => {
                tracing::error!(error = %e, "CRITICAL: System time error in vesting schedule ID generation");
                // Fallback: use a simple counter or hash
                {
                    use std::collections::hash_map::DefaultHasher;
                    use std::hash::{Hash, Hasher};
                    let mut hasher = DefaultHasher::new();
                    beneficiary.hash(&mut hasher);
                    hasher.finish().to_string()
                }
            }
        };
        format!("VEST_{}_{}", beneficiary, now)
    }
}

/// Configuraciones predefinidas para diferentes tipos de vesting
pub struct VestingConfigs;

impl VestingConfigs {
    /// Configuración para Treasury (12 meses cliff + 36 meses lineal)
    pub fn treasury_vesting() -> (u64, u64, u64) {
        let cliff_duration = 12 * 30 * 24 * 60 * 60; // 12 meses en segundos
        let vesting_duration = 36 * 30 * 24 * 60 * 60; // 36 meses en segundos
        let release_frequency = 30 * 24 * 60 * 60; // 1 mes en segundos

        (cliff_duration, vesting_duration, release_frequency)
    }

    /// Configuración para Incentivos Creativos (10% inmediato + 24 meses)
    pub fn creative_incentives_vesting() -> (u64, u64, u64) {
        let cliff_duration = 0; // Sin cliff
        let vesting_duration = 24 * 30 * 24 * 60 * 60; // 24 meses en segundos
        let release_frequency = 30 * 24 * 60 * 60; // 1 mes en segundos

        (cliff_duration, vesting_duration, release_frequency)
    }

    /// Configuración para Validadores (48 meses lineal)
    pub fn validators_vesting() -> (u64, u64, u64) {
        let cliff_duration = 0; // Sin cliff
        let vesting_duration = 48 * 30 * 24 * 60 * 60; // 48 meses en segundos
        let release_frequency = 30 * 24 * 60 * 60; // 1 mes en segundos

        (cliff_duration, vesting_duration, release_frequency)
    }

    /// Configuración para Comunidad (24 meses lineal)
    pub fn community_vesting() -> (u64, u64, u64) {
        let cliff_duration = 0; // Sin cliff
        let vesting_duration = 24 * 30 * 24 * 60 * 60; // 24 meses en segundos
        let release_frequency = 30 * 24 * 60 * 60; // 1 mes en segundos

        (cliff_duration, vesting_duration, release_frequency)
    }

    /// Configuración para Inversores Semilla (6 meses cliff + 24 meses lineal)
    pub fn seed_investors_vesting() -> (u64, u64, u64) {
        let cliff_duration = 6 * 30 * 24 * 60 * 60; // 6 meses en segundos
        let vesting_duration = 24 * 30 * 24 * 60 * 60; // 24 meses en segundos
        let release_frequency = 30 * 24 * 60 * 60; // 1 mes en segundos

        (cliff_duration, vesting_duration, release_frequency)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vesting_manager_creation() {
        let manager = VestingManager::new();
        assert_eq!(manager.global_stats.total_schedules, 0);
        assert_eq!(manager.global_stats.total_vested_amount, 0);
    }

    #[test]
    fn test_create_vesting_schedule() {
        let mut manager = VestingManager::new();

        let request = CreateVestingRequest {
            beneficiary: "beneficiary1".to_string(),
            total_amount: 1000000,
            cliff_duration: 31536000,   // 1 año
            vesting_duration: 94608000, // 3 años
            release_frequency: 2592000, // 1 mes
            revocable: true,
            created_by: "admin".to_string(),
        };

        let result = manager.create_vesting_schedule(request);
        assert!(result.is_ok());
        assert_eq!(manager.global_stats.total_schedules, 1);
        assert_eq!(manager.global_stats.total_vested_amount, 1000000);
    }

    #[test]
    fn test_vesting_configs() {
        let (cliff, vesting, frequency) = VestingConfigs::treasury_vesting();
        assert!(cliff > 0);
        assert!(vesting > cliff);
        assert!(frequency > 0);
    }
}
