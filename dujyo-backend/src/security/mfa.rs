// Multi-Factor Authentication (MFA) Implementation
// TOTP (Time-based One-Time Password) support

use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use sha2::{Sha256, Digest};
use base64::{Engine as _, engine::general_purpose};
use tracing::{info, warn, error};

/// TOTP Configuration
const TOTP_DIGITS: usize = 6;
const TOTP_PERIOD: u64 = 30; // 30 seconds
const TOTP_WINDOW: u64 = 1; // Allow 1 period before/after for clock skew

/// MFA Manager
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MFAManager {
    pub enabled_users: std::collections::HashMap<String, MFAConfig>,
    pub backup_codes: std::collections::HashMap<String, Vec<BackupCode>>,
    pub totp_secrets: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MFAConfig {
    pub user_address: String,
    pub enabled: bool,
    pub secret: String,
    pub backup_codes_generated: usize,
    pub created_at: u64,
    pub last_used: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupCode {
    pub code: String,
    pub used: bool,
    pub used_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MFASetupRequest {
    pub user_address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MFAVerifyRequest {
    pub user_address: String,
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MFASetupResponse {
    pub success: bool,
    pub message: String,
    pub secret: Option<String>,
    pub qr_code_url: Option<String>,
    pub backup_codes: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MFAVerifyResponse {
    pub success: bool,
    pub message: String,
    pub valid: bool,
}

impl MFAManager {
    pub fn new() -> Self {
        Self {
            enabled_users: std::collections::HashMap::new(),
            backup_codes: std::collections::HashMap::new(),
            totp_secrets: std::collections::HashMap::new(),
        }
    }

    /// Setup MFA for a user
    pub fn setup_mfa(&mut self, request: MFASetupRequest) -> Result<MFASetupResponse, String> {
        // Check if already enabled
        if self.enabled_users.contains_key(&request.user_address) {
            return Err("MFA already enabled for this user".to_string());
        }

        // Generate secret key (base32 encoded)
        let secret = Self::generate_secret();
        
        // Generate backup codes
        let backup_codes = Self::generate_backup_codes(10);
        
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .map_err(|e| {
                tracing::error!(error = %e, "CRITICAL: System time error in MFA setup");
                format!("System time error: {}", e)
            })?;
        
        // Create MFA config
        let config = MFAConfig {
            user_address: request.user_address.clone(),
            enabled: true,
            secret: secret.clone(),
            backup_codes_generated: backup_codes.len(),
            created_at: now,
            last_used: None,
        };
        
        // Store backup codes
        let backup_code_structs: Vec<BackupCode> = backup_codes.iter()
            .map(|code| BackupCode {
                code: code.clone(),
                used: false,
                used_at: None,
            })
            .collect();
        
        self.backup_codes.insert(request.user_address.clone(), backup_code_structs);
        self.totp_secrets.insert(request.user_address.clone(), secret.clone());
        self.enabled_users.insert(request.user_address.clone(), config);
        
        // Generate QR code URL for authenticator apps
        let qr_code_url = Self::generate_qr_code_url(&request.user_address, &secret);
        
        info!("MFA setup completed for user: {}", request.user_address);
        
        Ok(MFASetupResponse {
            success: true,
            message: "MFA setup successful. Save your backup codes in a secure location.".to_string(),
            secret: Some(secret),
            qr_code_url: Some(qr_code_url),
            backup_codes: Some(backup_codes),
        })
    }

    /// Verify TOTP code
    pub fn verify_totp(&mut self, request: MFAVerifyRequest) -> Result<MFAVerifyResponse, String> {
        // Check if MFA is enabled for user
        let config = self.enabled_users.get_mut(&request.user_address)
            .ok_or("MFA not enabled for this user")?;
        
        if !config.enabled {
            return Err("MFA is disabled for this user".to_string());
        }
        
        let secret = self.totp_secrets.get(&request.user_address)
            .ok_or("MFA secret not found")?;
        
        // Check if it's a backup code
        if let Some(backup_codes) = self.backup_codes.get_mut(&request.user_address) {
            for backup_code in backup_codes.iter_mut() {
                if backup_code.code == request.code && !backup_code.used {
                    backup_code.used = true;
                    backup_code.used_at = Some(SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs());
                    
                    config.last_used = Some(SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs());
                    
                    info!("Backup code used for user: {}", request.user_address);
                    
                    return Ok(MFAVerifyResponse {
                        success: true,
                        message: "Backup code verified successfully".to_string(),
                        valid: true,
                    });
                }
            }
        }
        
        // Verify TOTP code
        let valid = Self::verify_totp_code(secret, &request.code)?;
        
        if valid {
            config.last_used = Some(SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs());
            info!("TOTP verified successfully for user: {}", request.user_address);
        } else {
            warn!("Invalid TOTP code for user: {}", request.user_address);
        }
        
        Ok(MFAVerifyResponse {
            success: true,
            message: if valid { "TOTP verified successfully".to_string() } else { "Invalid TOTP code".to_string() },
            valid,
        })
    }

    /// Disable MFA for a user
    pub fn disable_mfa(&mut self, user_address: &str, verification_code: &str) -> Result<String, String> {
        // Verify code before disabling
        let verify_request = MFAVerifyRequest {
            user_address: user_address.to_string(),
            code: verification_code.to_string(),
        };
        
        let verify_result = self.verify_totp(verify_request)?;
        if !verify_result.valid {
            return Err("Invalid verification code. Cannot disable MFA.".to_string());
        }
        
        // Remove MFA config
        self.enabled_users.remove(user_address);
        self.backup_codes.remove(user_address);
        self.totp_secrets.remove(user_address);
        
        info!("MFA disabled for user: {}", user_address);
        
        Ok("MFA disabled successfully".to_string())
    }

    /// Generate backup codes for user
    pub fn regenerate_backup_codes(&mut self, user_address: &str) -> Result<Vec<String>, String> {
        let config = self.enabled_users.get_mut(user_address)
            .ok_or("MFA not enabled for this user")?;
        
        let new_codes = Self::generate_backup_codes(10);
        
        let backup_code_structs: Vec<BackupCode> = new_codes.iter()
            .map(|code| BackupCode {
                code: code.clone(),
                used: false,
                used_at: None,
            })
            .collect();
        
        self.backup_codes.insert(user_address.to_string(), backup_code_structs);
        config.backup_codes_generated = new_codes.len();
        
        info!("Backup codes regenerated for user: {}", user_address);
        
        Ok(new_codes)
    }

    /// Generate secret key (base32 encoded random bytes)
    fn generate_secret() -> String {
        use rand::Rng;
        let mut rng = rand::rng();
        let random_bytes: Vec<u8> = (0..20).map(|_| rng.gen()).collect();
        general_purpose::STANDARD.encode(&random_bytes)
    }

    /// Generate backup codes
    fn generate_backup_codes(count: usize) -> Vec<String> {
        use rand::Rng;
        let mut rng = rand::rng();
        
        (0..count).map(|_| {
            // Generate 8-character alphanumeric code
            let code: String = (0..8)
                .map(|_| {
                    let chars = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                    chars[rng.gen_range(0..chars.len())] as char
                })
                .collect();
            
            // Format as XXXX-XXXX
            format!("{}-{}", &code[0..4], &code[4..8])
        }).collect()
    }

    /// Generate QR code URL for authenticator apps
    fn generate_qr_code_url(user_address: &str, secret: &str) -> String {
        // Format: otpauth://totp/Dujyo:user@address?secret=SECRET&issuer=Dujyo
        let label = format!("Dujyo:{}", user_address);
        format!(
            "otpauth://totp/{}?secret={}&issuer=Dujyo&algorithm=SHA1&digits={}&period={}",
            urlencoding::encode(&label),
            secret,
            TOTP_DIGITS,
            TOTP_PERIOD
        )
    }

    /// Verify TOTP code with time window
    fn verify_totp_code(secret: &str, code: &str) -> Result<bool, String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .map_err(|e| {
                tracing::error!(error = %e, "CRITICAL: System time error in MFA setup");
                format!("System time error: {}", e)
            })?;
        let current_counter = now / TOTP_PERIOD;
        
        // Check current time window and adjacent windows (for clock skew)
        for window_offset in -(TOTP_WINDOW as i64)..=(TOTP_WINDOW as i64) {
            let counter = (current_counter as i64 + window_offset) as u64;
            let generated_code = Self::generate_totp_code(secret, counter)?;
            
            if generated_code == code {
                return Ok(true);
            }
        }
        
        Ok(false)
    }

    /// Generate TOTP code for a given counter
    fn generate_totp_code(secret: &str, counter: u64) -> Result<String, String> {
        // Decode base32 secret
        let secret_bytes = general_purpose::STANDARD.decode(secret)
            .map_err(|e| format!("Failed to decode secret: {}", e))?;
        
        // Convert counter to bytes (big-endian)
        let counter_bytes = counter.to_be_bytes();
        
        // HMAC-SHA256
        let mut mac = hmac::Hmac::<Sha256>::new_from_slice(&secret_bytes)
            .map_err(|e| format!("Failed to create HMAC: {}", e))?;
        
        use hmac::Mac;
        mac.update(&counter_bytes);
        let result = mac.finalize();
        let hash = result.into_bytes();
        
        // Dynamic truncation
        let offset = (hash[hash.len() - 1] & 0x0f) as usize;
        let truncated = u32::from_be_bytes([
            hash[offset] & 0x7f,
            hash[offset + 1],
            hash[offset + 2],
            hash[offset + 3],
        ]);
        
        // Generate code
        let code = truncated % 10_u32.pow(TOTP_DIGITS as u32);
        
        // Format with leading zeros
        Ok(format!("{:0width$}", code, width = TOTP_DIGITS))
    }

    /// Get MFA status for user
    pub fn get_mfa_status(&self, user_address: &str) -> serde_json::Value {
        if let Some(config) = self.enabled_users.get(user_address) {
            let backup_codes = self.backup_codes.get(user_address);
            let unused_codes = backup_codes.map(|codes| 
                codes.iter().filter(|c| !c.used).count()
            ).unwrap_or(0);
            
            serde_json::json!({
                "enabled": config.enabled,
                "created_at": config.created_at,
                "last_used": config.last_used,
                "backup_codes_remaining": unused_codes,
                "total_backup_codes": config.backup_codes_generated
            })
        } else {
            serde_json::json!({
                "enabled": false
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mfa_setup() {
        let mut mfa = MFAManager::new();
        let request = MFASetupRequest {
            user_address: "xw1test000000000000000000000000000000000".to_string(),
        };
        
        let result = mfa.setup_mfa(request);
        assert!(result.is_ok());
        
        let response = result.unwrap();
        assert!(response.success);
        assert!(response.secret.is_some());
        assert!(response.backup_codes.is_some());
        assert_eq!(response.backup_codes.unwrap().len(), 10);
    }

    #[test]
    fn test_backup_code_generation() {
        let codes = MFAManager::generate_backup_codes(5);
        assert_eq!(codes.len(), 5);
        
        for code in codes {
            assert_eq!(code.len(), 9); // XXXX-XXXX format
            assert!(code.contains('-'));
        }
    }

    #[test]
    fn test_totp_code_generation() {
        let secret = "JBSWY3DPEHPK3PXP"; // Test secret
        let counter = 1;
        
        let code = MFAManager::generate_totp_code(secret, counter);
        assert!(code.is_ok());
        assert_eq!(code.unwrap().len(), 6);
    }
}

