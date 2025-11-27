//! Role-Based Access Control (RBAC) and Multi-Signature System for Dujyo
//!
//! Enterprise-grade access control with comprehensive audit trails,
//! multi-signature requirements, and emergency pause functionality.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{error, info, warn};

/// Access control roles with hierarchical permissions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Role {
    SuperAdmin, // Full system access
    Admin,      // Administrative functions
    Operator,   // Operational functions
    Validator,  // Validation functions
    User,       // Basic user functions
    ReadOnly,   // Read-only access
}

/// Permission levels for fine-grained access control
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Permission {
    // System permissions
    SystemShutdown,
    SystemPause,
    SystemConfig,

    // Staking permissions
    StakingCreate,
    StakingModify,
    StakingDistribute,
    StakingSlash,

    // DEX permissions
    DexCreatePool,
    DexModifyPool,
    DexEmergencyStop,

    // Validator permissions
    ValidatorRegister,
    ValidatorRemove,
    ValidatorScoreModify,

    // User permissions
    UserCreate,
    UserModify,
    UserSuspend,

    // Read permissions
    ReadAll,
    ReadStaking,
    ReadDex,
    ReadValidators,
}

/// Multi-signature requirement configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiSigConfig {
    pub required_signatures: u32,
    pub authorized_addresses: HashSet<String>,
    pub timeout_seconds: u64,
    pub created_at: u64,
    pub created_by: String,
}

/// Pending multi-signature transaction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingMultiSigTx {
    pub tx_id: String,
    pub action: String,
    pub parameters: serde_json::Value,
    pub signatures: HashMap<String, String>,
    pub created_at: u64,
    pub created_by: String,
    pub expires_at: u64,
}

/// Access control event for audit trail
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessEvent {
    pub event_id: String,
    pub timestamp: u64,
    pub user_address: String,
    pub action: String,
    pub resource: String,
    pub success: bool,
    pub error_message: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

/// User access profile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub address: String,
    pub roles: HashSet<Role>,
    pub permissions: HashSet<Permission>,
    pub is_active: bool,
    pub created_at: u64,
    pub last_activity: u64,
    pub failed_attempts: u32,
    pub locked_until: Option<u64>,
}

/// Access Control Manager
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessControlManager {
    pub users: HashMap<String, UserProfile>,
    pub role_permissions: HashMap<Role, HashSet<Permission>>,
    pub multi_sig_configs: HashMap<String, MultiSigConfig>,
    pub pending_multi_sig_txs: HashMap<String, PendingMultiSigTx>,
    pub access_events: Vec<AccessEvent>,
    pub system_paused: bool,
    pub emergency_pause_reason: Option<String>,
    pub emergency_paused_by: Option<String>,
    pub emergency_paused_at: Option<u64>,
}

impl AccessControlManager {
    /// Create new access control manager with default configuration
    pub fn new() -> Self {
        let mut manager = Self {
            users: HashMap::new(),
            role_permissions: HashMap::new(),
            multi_sig_configs: HashMap::new(),
            pending_multi_sig_txs: HashMap::new(),
            access_events: Vec::new(),
            system_paused: false,
            emergency_pause_reason: None,
            emergency_paused_by: None,
            emergency_paused_at: None,
        };

        // Initialize default role permissions
        manager.initialize_default_permissions();
        
        // ✅ BOOTSTRAP: Create system user with SuperAdmin role and all permissions
        // This allows the system to create the first admin user
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        let mut system_permissions = HashSet::new();
        system_permissions.extend(manager.role_permissions.get(&Role::SuperAdmin).unwrap().clone());
        
        manager.users.insert(
            "system".to_string(),
            UserProfile {
                address: "system".to_string(),
                roles: HashSet::from([Role::SuperAdmin]),
                permissions: system_permissions,
                is_active: true,
                created_at: now,
                last_activity: now,
                failed_attempts: 0,
                locked_until: None,
            },
        );
        
        manager
    }

    /// Initialize default role permissions
    fn initialize_default_permissions(&mut self) {
        // SuperAdmin - Full access
        self.role_permissions.insert(
            Role::SuperAdmin,
            HashSet::from([
                Permission::SystemShutdown,
                Permission::SystemPause,
                Permission::SystemConfig,
                Permission::StakingCreate,
                Permission::StakingModify,
                Permission::StakingDistribute,
                Permission::StakingSlash,
                Permission::DexCreatePool,
                Permission::DexModifyPool,
                Permission::DexEmergencyStop,
                Permission::ValidatorRegister,
                Permission::ValidatorRemove,
                Permission::ValidatorScoreModify,
                Permission::UserCreate,
                Permission::UserModify,
                Permission::UserSuspend,
                Permission::ReadAll,
            ]),
        );

        // Admin - Administrative functions
        self.role_permissions.insert(
            Role::Admin,
            HashSet::from([
                Permission::StakingCreate,
                Permission::StakingModify,
                Permission::StakingDistribute,
                Permission::DexCreatePool,
                Permission::DexModifyPool,
                Permission::ValidatorRegister,
                Permission::UserCreate,
                Permission::UserModify,
                Permission::ReadAll,
            ]),
        );

        // Operator - Operational functions
        self.role_permissions.insert(
            Role::Operator,
            HashSet::from([
                Permission::StakingDistribute,
                Permission::DexModifyPool,
                Permission::ReadAll,
            ]),
        );

        // Validator - Validation functions
        self.role_permissions
            .insert(Role::Validator, HashSet::from([Permission::ReadValidators]));

        // User - Basic functions
        self.role_permissions.insert(
            Role::User,
            HashSet::from([Permission::ReadStaking, Permission::ReadDex]),
        );

        // ReadOnly - Read access only
        self.role_permissions
            .insert(Role::ReadOnly, HashSet::from([Permission::ReadAll]));
    }

    /// Register a new user with specified roles
    pub fn register_user(
        &mut self,
        address: String,
        roles: Vec<Role>,
        created_by: String,
    ) -> Result<(), String> {
        // Check if creator has permission to create users
        if !self.has_permission(&created_by, &Permission::UserCreate) {
            self.log_access_event(
                &created_by,
                "register_user",
                &address,
                false,
                Some("Insufficient permissions".to_string()),
            );
            return Err("Insufficient permissions to create users".to_string());
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Collect all permissions for the user
        let mut permissions = HashSet::new();
        for role in &roles {
            if let Some(role_perms) = self.role_permissions.get(role) {
                permissions.extend(role_perms.clone());
            }
        }

        let user_roles = roles.clone();
        let user_profile = UserProfile {
            address: address.clone(),
            roles: roles.into_iter().collect(),
            permissions,
            is_active: true,
            created_at: now,
            last_activity: now,
            failed_attempts: 0,
            locked_until: None,
        };

        self.users.insert(address.clone(), user_profile);
        self.log_access_event(&created_by, "register_user", &address, true, None);

        info!("User registered: {} with roles: {:?}", address, user_roles);
        Ok(())
    }

    /// Check if user has specific permission
    pub fn has_permission(&self, address: &str, permission: &Permission) -> bool {
        if self.system_paused && permission != &Permission::SystemPause {
            return false;
        }

        if let Some(user) = self.users.get(address) {
            if !user.is_active {
                return false;
            }

            // Check if user is locked
            if let Some(locked_until) = user.locked_until {
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                if now < locked_until {
                    return false;
                }
            }

            user.permissions.contains(permission)
        } else {
            false
        }
    }

    /// Check if user has any of the specified roles
    pub fn has_role(&self, address: &str, roles: &[Role]) -> bool {
        if let Some(user) = self.users.get(address) {
            if !user.is_active {
                return false;
            }

            roles.iter().any(|role| user.roles.contains(role))
        } else {
            false
        }
    }

    /// Create multi-signature configuration
    pub fn create_multi_sig_config(
        &mut self,
        config_id: String,
        required_signatures: u32,
        authorized_addresses: Vec<String>,
        created_by: String,
    ) -> Result<(), String> {
        if !self.has_permission(&created_by, &Permission::SystemConfig) {
            return Err("Insufficient permissions to create multi-sig config".to_string());
        }

        if required_signatures == 0 || required_signatures > authorized_addresses.len() as u32 {
            return Err("Invalid multi-sig configuration".to_string());
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let config = MultiSigConfig {
            required_signatures,
            authorized_addresses: authorized_addresses.into_iter().collect(),
            timeout_seconds: 3600, // 1 hour default timeout
            created_at: now,
            created_by,
        };

        self.multi_sig_configs.insert(config_id.clone(), config);
        info!(
            "Multi-sig config created: {} requiring {} signatures",
            config_id, required_signatures
        );
        Ok(())
    }

    /// Initiate multi-signature transaction
    pub fn initiate_multi_sig_tx(
        &mut self,
        tx_id: String,
        action: String,
        parameters: serde_json::Value,
        config_id: String,
        initiator: String,
    ) -> Result<(), String> {
        if !self.has_permission(&initiator, &Permission::SystemConfig) {
            return Err("Insufficient permissions to initiate multi-sig transaction".to_string());
        }

        let config = self
            .multi_sig_configs
            .get(&config_id)
            .ok_or("Multi-sig configuration not found")?;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let pending_tx = PendingMultiSigTx {
            tx_id: tx_id.clone(),
            action,
            parameters,
            signatures: HashMap::new(),
            created_at: now,
            created_by: initiator.clone(),
            expires_at: now + config.timeout_seconds,
        };

        self.pending_multi_sig_txs.insert(tx_id.clone(), pending_tx);
        info!(
            "Multi-sig transaction initiated: {} by {}",
            tx_id, initiator
        );
        Ok(())
    }

    /// Sign multi-signature transaction
    pub fn sign_multi_sig_tx(
        &mut self,
        tx_id: String,
        signer: String,
        signature: String,
    ) -> Result<bool, String> {
        let pending_tx = self
            .pending_multi_sig_txs
            .get_mut(&tx_id)
            .ok_or("Multi-sig transaction not found")?;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Check if transaction has expired
        if now > pending_tx.expires_at {
            self.pending_multi_sig_txs.remove(&tx_id);
            return Err("Multi-sig transaction has expired".to_string());
        }

        // Find the config for this transaction (simplified - in real implementation, store config_id in pending_tx)
        let config = self
            .multi_sig_configs
            .values()
            .find(|c| c.authorized_addresses.contains(&signer))
            .ok_or("Signer not authorized for multi-sig")?;

        if !config.authorized_addresses.contains(&signer) {
            return Err("Signer not authorized for this multi-sig transaction".to_string());
        }

        // Add signature
        pending_tx.signatures.insert(signer.clone(), signature);

        info!("Multi-sig transaction signed: {} by {}", tx_id, signer);

        // Check if we have enough signatures
        let signature_count = pending_tx.signatures.len();
        if signature_count >= config.required_signatures as usize {
            // Transaction is ready to execute
            self.pending_multi_sig_txs.remove(&tx_id);
            info!(
                "Multi-sig transaction completed: {} with {} signatures",
                tx_id, signature_count
            );
            return Ok(true);
        }

        Ok(false)
    }

    /// Emergency pause system
    pub fn emergency_pause(&mut self, reason: String, paused_by: String) -> Result<(), String> {
        if !self.has_permission(&paused_by, &Permission::SystemPause) {
            return Err("Insufficient permissions to pause system".to_string());
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        self.system_paused = true;
        self.emergency_pause_reason = Some(reason.clone());
        self.emergency_paused_by = Some(paused_by.clone());
        self.emergency_paused_at = Some(now);

        self.log_access_event(&paused_by, "emergency_pause", "system", true, None);

        error!("SYSTEM EMERGENCY PAUSE: {} by {}", reason, paused_by);
        Ok(())
    }

    /// Resume system from emergency pause
    pub fn resume_system(&mut self, resumed_by: String) -> Result<(), String> {
        if !self.has_permission(&resumed_by, &Permission::SystemPause) {
            return Err("Insufficient permissions to resume system".to_string());
        }

        self.system_paused = false;
        self.emergency_pause_reason = None;
        self.emergency_paused_by = None;
        self.emergency_paused_at = None;

        self.log_access_event(&resumed_by, "resume_system", "system", true, None);

        info!("System resumed by {}", resumed_by);
        Ok(())
    }

    /// Lock user account after failed attempts
    pub fn lock_user(
        &mut self,
        address: String,
        lock_duration_seconds: u64,
        locked_by: String,
    ) -> Result<(), String> {
        if !self.has_permission(&locked_by, &Permission::UserSuspend) {
            return Err("Insufficient permissions to lock users".to_string());
        }

        if let Some(user) = self.users.get_mut(&address) {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            user.locked_until = Some(now + lock_duration_seconds);
            user.failed_attempts += 1;

            self.log_access_event(&locked_by, "lock_user", &address, true, None);
            warn!(
                "User locked: {} until {}",
                address,
                now + lock_duration_seconds
            );
        }

        Ok(())
    }

    /// Log access control event
    fn log_access_event(
        &mut self,
        user_address: &str,
        action: &str,
        resource: &str,
        success: bool,
        error_message: Option<String>,
    ) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let event = AccessEvent {
            event_id: format!("access_{}_{}", now, user_address),
            timestamp: now,
            user_address: user_address.to_string(),
            action: action.to_string(),
            resource: resource.to_string(),
            success,
            error_message,
            ip_address: None, // Would be populated from request context
            user_agent: None, // Would be populated from request context
        };

        self.access_events.push(event);

        // Keep only last 10000 events to prevent memory bloat
        if self.access_events.len() > 10000 {
            self.access_events.remove(0);
        }
    }

    /// Get access events for audit
    pub fn get_access_events(&self, limit: Option<usize>) -> Vec<AccessEvent> {
        let limit = limit.unwrap_or(1000);
        self.access_events
            .iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Check if system is paused
    pub fn is_system_paused(&self) -> bool {
        self.system_paused
    }

    /// Get system status
    pub fn get_system_status(&self) -> serde_json::Value {
        serde_json::json!({
            "paused": self.system_paused,
            "pause_reason": self.emergency_pause_reason,
            "paused_by": self.emergency_paused_by,
            "paused_at": self.emergency_paused_at,
            "total_users": self.users.len(),
            "active_users": self.users.values().filter(|u| u.is_active).count(),
            "locked_users": self.users.values().filter(|u| u.locked_until.is_some()).count(),
            "pending_multi_sig_txs": self.pending_multi_sig_txs.len(),
        })
    }
}

impl Default for AccessControlManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_registration() {
        let mut manager = AccessControlManager::new();

        // Register super admin first
        manager
            .register_user(
                "admin".to_string(),
                vec![Role::SuperAdmin],
                "system".to_string(),
            )
            .unwrap();

        // Admin should be able to create users
        let result =
            manager.register_user("user1".to_string(), vec![Role::User], "admin".to_string());
        assert!(result.is_ok());

        // Check permissions
        assert!(manager.has_permission("user1", &Permission::ReadStaking));
        assert!(!manager.has_permission("user1", &Permission::SystemShutdown));
    }

    #[test]
    fn test_multi_sig_transaction() {
        let mut manager = AccessControlManager::new();

        // Register users
        manager
            .register_user(
                "admin".to_string(),
                vec![Role::SuperAdmin],
                "system".to_string(),
            )
            .unwrap();
        manager
            .register_user(
                "signer1".to_string(),
                vec![Role::Admin],
                "admin".to_string(),
            )
            .unwrap();
        manager
            .register_user(
                "signer2".to_string(),
                vec![Role::Admin],
                "admin".to_string(),
            )
            .unwrap();

        // Create multi-sig config
        manager
            .create_multi_sig_config(
                "test_config".to_string(),
                2,
                vec!["signer1".to_string(), "signer2".to_string()],
                "admin".to_string(),
            )
            .unwrap();

        // Initiate transaction
        manager
            .initiate_multi_sig_tx(
                "tx1".to_string(),
                "test_action".to_string(),
                serde_json::json!({"param": "value"}),
                "test_config".to_string(),
                "admin".to_string(),
            )
            .unwrap();

        // Sign transaction
        let result1 = manager
            .sign_multi_sig_tx("tx1".to_string(), "signer1".to_string(), "sig1".to_string())
            .unwrap();
        assert!(!result1); // Not enough signatures yet

        let result2 = manager
            .sign_multi_sig_tx("tx1".to_string(), "signer2".to_string(), "sig2".to_string())
            .unwrap();
        assert!(result2); // Transaction completed
    }

    #[test]
    fn test_emergency_pause() {
        let mut manager = AccessControlManager::new();

        // Register super admin
        manager
            .register_user(
                "admin".to_string(),
                vec![Role::SuperAdmin],
                "system".to_string(),
            )
            .unwrap();

        // Pause system
        manager
            .emergency_pause("Test emergency".to_string(), "admin".to_string())
            .unwrap();
        assert!(manager.is_system_paused());

        // Resume system
        manager.resume_system("admin".to_string()).unwrap();
        assert!(!manager.is_system_paused());
    }

    #[test]
    fn test_permission_denied_when_paused() {
        let mut manager = AccessControlManager::new();

        // Register users
        manager
            .register_user(
                "admin".to_string(),
                vec![Role::SuperAdmin],
                "system".to_string(),
            )
            .unwrap();
        manager
            .register_user("user1".to_string(), vec![Role::User], "admin".to_string())
            .unwrap();

        // Pause system
        manager
            .emergency_pause("Test emergency".to_string(), "admin".to_string())
            .unwrap();

        // User should not have permissions when system is paused
        assert!(!manager.has_permission("user1", &Permission::ReadStaking));

        // But admin should still be able to pause/unpause
        assert!(manager.has_permission("admin", &Permission::SystemPause));
    }
}
