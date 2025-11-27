// Funciones de emergencia REALES y USABLES
use serde::{Deserialize, Serialize};
use tracing::{error, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityStatus {
    pub emergency_paused: bool,
    pub reentrancy_guard_active: bool,
    pub total_supply: u64,
    pub max_supply: u64,
    pub active_balances: usize,
    pub pending_timelocks: usize,
    pub vulnerabilities_detected: Vec<SecurityIssue>,
    pub last_audit: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityIssue {
    pub severity: Severity,
    pub description: String,
    pub affected_component: String,
    pub recommendation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
}

/// Emergency Functions for Native Token
pub struct EmergencyManager;

impl EmergencyManager {
    /// Verificar integridad del sistema
    pub fn verify_integrity_checks(
        token: &crate::blockchain::native_token::NativeToken,
    ) -> Vec<SecurityIssue> {
        let mut issues = Vec::new();

        // Check 1: Total supply vs balances
        let sum_balances: u64 = token.balances.values().sum();
        if sum_balances != token.total_supply {
            issues.push(SecurityIssue {
                severity: Severity::Critical,
                description: format!(
                    "Balance mismatch: sum({}) != total_supply({})",
                    sum_balances, token.total_supply
                ),
                affected_component: "Token Balances".to_string(),
                recommendation: "Emergency audit required immediately".to_string(),
            });
            error!("CRITICAL: Balance integrity violation detected!");
        }

        // Check 2: Max supply not exceeded
        if token.total_supply > token.max_supply {
            issues.push(SecurityIssue {
                severity: Severity::Critical,
                description: format!(
                    "Max supply exceeded: {} > {}",
                    token.total_supply, token.max_supply
                ),
                affected_component: "Supply Management".to_string(),
                recommendation: "Emergency pause required".to_string(),
            });
            error!("CRITICAL: Max supply exceeded!");
        }

        // Check 3: Reentrancy guard not stuck
        if token.reentrancy_guard {
            issues.push(SecurityIssue {
                severity: Severity::High,
                description: "Reentrancy guard is active - possible stuck state".to_string(),
                affected_component: "Reentrancy Protection".to_string(),
                recommendation: "Investigate if this is expected or a bug".to_string(),
            });
            warn!("Reentrancy guard is active");
        }

        // Check 4: Emergency pause status
        if token.emergency_paused {
            issues.push(SecurityIssue {
                severity: Severity::Medium,
                description: format!(
                    "System is emergency paused: {}",
                    token.emergency_pause_reason.as_deref().unwrap_or("Unknown")
                ),
                affected_component: "Emergency Controls".to_string(),
                recommendation: "Review pause reason and consider resuming".to_string(),
            });
        }

        // Check 5: Locked balances vs balances
        for (address, locked) in &token.locked_balances {
            if let Some(balance) = token.balances.get(address) {
                if *locked > *balance {
                    issues.push(SecurityIssue {
                        severity: Severity::High,
                        description: format!(
                            "Address {} has more locked ({}) than balance ({})",
                            address, locked, balance
                        ),
                        affected_component: "Vesting System".to_string(),
                        recommendation: "Audit vesting contracts".to_string(),
                    });
                }
            }
        }

        if issues.is_empty() {
            info!("Integrity check passed: No issues detected");
        } else {
            warn!("Integrity check found {} issue(s)", issues.len());
        }

        issues
    }

    /// Obtener estado de seguridad completo
    pub fn get_security_status(
        token: &crate::blockchain::native_token::NativeToken,
    ) -> SecurityStatus {
        let vulnerabilities = Self::verify_integrity_checks(token);

        SecurityStatus {
            emergency_paused: token.emergency_paused,
            reentrancy_guard_active: token.reentrancy_guard,
            total_supply: token.total_supply,
            max_supply: token.max_supply,
            active_balances: token.balances.len(),
            pending_timelocks: token.pending_transfers.len(),
            vulnerabilities_detected: vulnerabilities,
            last_audit: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }

    /// Emergency drain to safe wallet (solo en caso de hack)
    pub fn emergency_drain_to_safe_wallet(
        token: &mut crate::blockchain::native_token::NativeToken,
        safe_wallet: &str,
        admin: &str,
    ) -> Result<String, String> {
        if admin != token.admin {
            return Err("Only admin can execute emergency drain".to_string());
        }

        if !token.emergency_paused {
            return Err("Must pause system before emergency drain".to_string());
        }

        // Mover TODOS los fondos a safe wallet
        let mut total_drained = 0u64;
        let addresses: Vec<String> = token.balances.keys().cloned().collect();

        for address in addresses {
            if address == safe_wallet {
                continue; // Skip safe wallet itself
            }

            if let Some(balance) = token.balances.get(&address) {
                let amount = *balance;
                if amount > 0 {
                    token.balances.insert(address.clone(), 0);
                    total_drained += amount;
                }
            }
        }

        // Agregar al safe wallet
        let safe_balance = token.balances.entry(safe_wallet.to_string()).or_insert(0);
        *safe_balance += total_drained;

        error!(
            "EMERGENCY DRAIN EXECUTED: {} DYO moved to safe wallet {} by {}",
            total_drained, safe_wallet, admin
        );

        Ok(format!(
            "Emergency drain complete: {} DYO moved to {}",
            total_drained, safe_wallet
        ))
    }

    /// Generar reporte de seguridad
    pub fn generate_security_report(
        token: &crate::blockchain::native_token::NativeToken,
    ) -> String {
        let status = Self::get_security_status(token);

        let mut report = String::from("=== DUJYO SECURITY REPORT ===\n\n");

        report.push_str(&format!("Emergency Paused: {}\n", status.emergency_paused));
        report.push_str(&format!(
            "Reentrancy Guard Active: {}\n",
            status.reentrancy_guard_active
        ));
        report.push_str(&format!(
            "Total Supply: {} / {}\n",
            status.total_supply, status.max_supply
        ));
        report.push_str(&format!("Active Balances: {}\n", status.active_balances));
        report.push_str(&format!(
            "Pending Timelocks: {}\n\n",
            status.pending_timelocks
        ));

        if status.vulnerabilities_detected.is_empty() {
            report.push_str("✅ NO VULNERABILITIES DETECTED\n");
        } else {
            report.push_str(&format!(
                "⚠️  {} ISSUES DETECTED:\n\n",
                status.vulnerabilities_detected.len()
            ));

            for (i, issue) in status.vulnerabilities_detected.iter().enumerate() {
                report.push_str(&format!(
                    "{}. [{:?}] {}\n",
                    i + 1,
                    issue.severity,
                    issue.description
                ));
                report.push_str(&format!("   Component: {}\n", issue.affected_component));
                report.push_str(&format!("   Recommendation: {}\n\n", issue.recommendation));
            }
        }

        report.push_str(&format!("Last Audit: {}\n", status.last_audit));
        report.push_str("=============================\n");

        report
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::blockchain::native_token::*;

    #[test]
    fn test_integrity_check_detects_balance_mismatch() {
        let mut token = NativeToken::new("admin".to_string());

        // Mint normal
        token
            .initial_mint(MintRequest {
                to: "user1".to_string(),
                amount: 1000,
                minter: "admin".to_string(),
            })
            .unwrap();

        // Simular corrupción (SOLO PARA TEST)
        token.total_supply = 9999; // Incorrectamente modificado

        let issues = EmergencyManager::verify_integrity_checks(&token);

        assert!(!issues.is_empty(), "Should detect balance mismatch");
        assert!(matches!(issues[0].severity, Severity::Critical));

        println!("✅ TEST PASSED: Integrity check detects corruption");
    }

    #[test]
    fn test_security_status_report() {
        let token = NativeToken::new("admin".to_string());
        let status = EmergencyManager::get_security_status(&token);

        assert_eq!(status.total_supply, 0);
        assert_eq!(status.max_supply, 1_000_000_000);
        assert!(!status.emergency_paused);

        println!("✅ TEST PASSED: Security status report works");
    }

    #[test]
    fn test_emergency_drain_requires_pause() {
        let mut token = NativeToken::new("admin".to_string());

        // Mint some tokens
        token
            .initial_mint(MintRequest {
                to: "user1".to_string(),
                amount: 1000,
                minter: "admin".to_string(),
            })
            .unwrap();

        // Try drain without pause - MUST FAIL
        let result =
            EmergencyManager::emergency_drain_to_safe_wallet(&mut token, "safe_wallet", "admin");

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Must pause"));

        println!("✅ TEST PASSED: Emergency drain requires pause");
    }
}
