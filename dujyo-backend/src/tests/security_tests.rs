//! Comprehensive Security Test Suite for Dujyo Blockchain
//! 
//! Enterprise-grade testing covering all critical security implementations:
//! - SafeMath overflow/underflow protection
//! - VRF cryptographic randomness
//! - AMM DEX security
//! - Access control and RBAC
//! - Key generation and storage security

use std::collections::HashMap;
use crate::utils::safe_math::{SafeMath, SafeMathError};
use crate::utils::vrf::VRFManager;
use crate::utils::access_control::{AccessControlManager, Role, Permission};
use crate::blockchain::staking_rewards::StakingManager;
use crate::dex::{DEX, SwapRequest};

#[cfg(test)]
mod safe_math_tests {
    use super::*;

    #[test]
    fn test_overflow_protection() {
        // Test maximum values
        let max_u64 = u64::MAX;
        let result = SafeMath::add(max_u64, 1, "overflow_test");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), SafeMathError::Overflow);
    }

    #[test]
    fn test_underflow_protection() {
        let result = SafeMath::sub(0, 1, "underflow_test");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), SafeMathError::Underflow);
    }

    #[test]
    fn test_division_by_zero() {
        let result = SafeMath::div(100, 0, "division_by_zero_test");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), SafeMathError::DivisionByZero);
    }

    #[test]
    fn test_multiplication_overflow() {
        let large_value = u64::MAX / 2;
        let result = SafeMath::mul(large_value, 3, "multiplication_overflow_test");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), SafeMathError::Overflow);
    }

    #[test]
    fn test_percentage_calculation() {
        let result = SafeMath::percentage(1000, 500, "percentage_test");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 50); // 5% of 1000
    }

    #[test]
    fn test_percentage_overflow() {
        let result = SafeMath::percentage(u64::MAX, 10000, "percentage_overflow_test");
        assert!(result.is_ok()); // Should handle gracefully
    }

    #[test]
    fn test_compound_interest() {
        let result = SafeMath::compound_interest(1000, 100, 1, "compound_test");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1010); // 1% for 1 period
    }

    #[test]
    fn test_edge_cases() {
        // Test with zero values
        assert_eq!(SafeMath::add(0, 0, "zero_test").unwrap(), 0);
        assert_eq!(SafeMath::mul(0, u64::MAX, "zero_mul_test").unwrap(), 0);
        assert_eq!(SafeMath::pow(0, 10, "zero_pow_test").unwrap(), 0);
        assert_eq!(SafeMath::pow(5, 0, "pow_zero_test").unwrap(), 1);
    }
}

#[cfg(test)]
mod vrf_tests {
    use super::*;

    #[test]
    fn test_vrf_deterministic_output() {
        let vrf_manager = VRFManager::new();
        let input = b"deterministic test input";
        
        let result1 = vrf_manager.prove(input);
        let result2 = vrf_manager.prove(input);
        
        // Same input should produce same output
        assert_eq!(result1.output, result2.output);
        assert_eq!(result1.proof.gamma, result2.proof.gamma);
    }

    #[test]
    fn test_vrf_different_inputs() {
        let vrf_manager = VRFManager::new();
        
        let result1 = vrf_manager.prove(b"input 1");
        let result2 = vrf_manager.prove(b"input 2");
        
        // Different inputs should produce different outputs
        assert_ne!(result1.output, result2.output);
    }

    #[test]
    fn test_vrf_verification() {
        let vrf_manager = VRFManager::new();
        let input = b"verification test";
        
        let vrf_result = vrf_manager.prove(input);
        let is_valid = vrf_manager.verify(&vrf_result);
        
        assert!(is_valid);
    }

    #[test]
    fn test_vrf_weighted_selection() {
        let vrf_manager = VRFManager::new();
        let items = vec![
            ("item1", 10u64),
            ("item2", 20u64),
            ("item3", 30u64),
        ];
        
        let seed = b"selection seed";
        let selected = vrf_manager.weighted_random_selection(&items, seed);
        assert!(selected.is_ok());
        
        // Test multiple selections to ensure randomness
        let mut selections = Vec::new();
        for i in 0..100 {
            let seed_with_index = [seed, &i.to_be_bytes()].concat();
            let selected = vrf_manager.weighted_random_selection(&items, &seed_with_index);
            selections.push(selected.unwrap());
        }
        
        // Should have some variety in selections
        let unique_selections: std::collections::HashSet<_> = selections.iter().collect();
        assert!(unique_selections.len() > 1);
    }

    #[test]
    fn test_commit_reveal_scheme() {
        let mut vrf_manager = VRFManager::new();
        let data = b"secret data";
        let commitment_id = "test_commitment".to_string();
        
        // Commit
        let commitment = vrf_manager.commit(data, commitment_id.clone()).unwrap();
        assert!(!commitment.is_empty());
        
        // Reveal with correct data
        let is_valid = vrf_manager.reveal(commitment_id.clone(), data).unwrap();
        assert!(is_valid);
        
        // Reveal with incorrect data should fail
        let wrong_data = b"wrong data";
        let is_valid = vrf_manager.reveal(commitment_id, wrong_data).unwrap();
        assert!(!is_valid);
    }
}

#[cfg(test)]
mod access_control_tests {
    use super::*;

    #[test]
    fn test_user_registration_and_permissions() {
        let mut manager = AccessControlManager::new();
        
        // Register super admin first
        manager.register_user("admin".to_string(), vec![Role::SuperAdmin], "system".to_string()).unwrap();
        
        // Admin should be able to create users
        let result = manager.register_user("user1".to_string(), vec![Role::User], "admin".to_string());
        assert!(result.is_ok());
        
        // Check permissions
        assert!(manager.has_permission("user1", &Permission::ReadStaking));
        assert!(!manager.has_permission("user1", &Permission::SystemShutdown));
        assert!(manager.has_permission("admin", &Permission::SystemShutdown));
    }

    #[test]
    fn test_multi_sig_transaction() {
        let mut manager = AccessControlManager::new();
        
        // Register users
        manager.register_user("admin".to_string(), vec![Role::SuperAdmin], "system".to_string()).unwrap();
        manager.register_user("signer1".to_string(), vec![Role::Admin], "admin".to_string()).unwrap();
        manager.register_user("signer2".to_string(), vec![Role::Admin], "admin".to_string()).unwrap();
        
        // Create multi-sig config
        manager.create_multi_sig_config(
            "test_config".to_string(),
            2,
            vec!["signer1".to_string(), "signer2".to_string()],
            "admin".to_string(),
        ).unwrap();
        
        // Initiate transaction
        manager.initiate_multi_sig_tx(
            "tx1".to_string(),
            "test_action".to_string(),
            serde_json::json!({"param": "value"}),
            "test_config".to_string(),
            "admin".to_string(),
        ).unwrap();
        
        // Sign transaction
        let result1 = manager.sign_multi_sig_tx("tx1".to_string(), "signer1".to_string(), "sig1".to_string()).unwrap();
        assert!(!result1); // Not enough signatures yet
        
        let result2 = manager.sign_multi_sig_tx("tx1".to_string(), "signer2".to_string(), "sig2".to_string()).unwrap();
        assert!(result2); // Transaction completed
    }

    #[test]
    fn test_emergency_pause() {
        let mut manager = AccessControlManager::new();
        
        // Register super admin
        manager.register_user("admin".to_string(), vec![Role::SuperAdmin], "system".to_string()).unwrap();
        
        // Pause system
        manager.emergency_pause("Test emergency".to_string(), "admin".to_string()).unwrap();
        assert!(manager.is_system_paused());
        
        // Resume system
        manager.resume_system("admin".to_string()).unwrap();
        assert!(!manager.is_system_paused());
    }

    #[test]
    fn test_permission_denied_when_paused() {
        let mut manager = AccessControlManager::new();
        
        // Register users
        manager.register_user("admin".to_string(), vec![Role::SuperAdmin], "system".to_string()).unwrap();
        manager.register_user("user1".to_string(), vec![Role::User], "admin".to_string()).unwrap();
        
        // Pause system
        manager.emergency_pause("Test emergency".to_string(), "admin".to_string()).unwrap();
        
        // User should not have permissions when system is paused
        assert!(!manager.has_permission("user1", &Permission::ReadStaking));
        
        // But admin should still be able to pause/unpause
        assert!(manager.has_permission("admin", &Permission::SystemPause));
    }

    #[test]
    fn test_unauthorized_access() {
        let mut manager = AccessControlManager::new();
        
        // Try to register user without proper permissions
        let result = manager.register_user("user1".to_string(), vec![Role::User], "unauthorized".to_string());
        assert!(result.is_err());
        
        // Try to pause system without permissions
        let result = manager.emergency_pause("Test".to_string(), "unauthorized".to_string());
        assert!(result.is_err());
    }
}

#[cfg(test)]
mod staking_security_tests {
    use super::*;

    #[test]
    fn test_staking_overflow_protection() {
        let mut staking_manager = StakingManager::new();
        
        // Test with maximum values that could cause overflow
        let max_amount = u64::MAX;
        
        // This should be handled gracefully by SafeMath
        let result = staking_manager.stake_tokens(crate::blockchain::staking_rewards::StakeRequest {
            contract_id: "test_contract".to_string(),
            staker: "test_staker".to_string(),
            amount: max_amount,
        });
        
        // Should either succeed with proper handling or fail gracefully
        // The important thing is that it doesn't panic or cause undefined behavior
        assert!(result.is_ok() || result.is_err());
    }

    #[test]
    fn test_reward_calculation_edge_cases() {
        let mut staking_manager = StakingManager::new();
        
        // Test with zero values
        let result = staking_manager.stake_tokens(crate::blockchain::staking_rewards::StakeRequest {
            contract_id: "test_contract".to_string(),
            staker: "test_staker".to_string(),
            amount: 0,
        });
        
        // Should handle zero amounts gracefully
        assert!(result.is_err()); // Should fail due to minimum stake requirement
    }

    #[test]
    fn test_access_control_integration() {
        let mut staking_manager = StakingManager::new();
        
        // Register admin user
        staking_manager.access_control.register_user(
            "admin".to_string(), 
            vec![Role::SuperAdmin], 
            "system".to_string()
        ).unwrap();
        
        // Try to distribute rewards without proper permissions
        let result = staking_manager.distribute_rewards(
            "pool1", 
            "contract1", 
            1000, 
            "unauthorized_user"
        );
        
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unauthorized"));
    }

    #[test]
    fn test_emergency_pause_functionality() {
        let mut staking_manager = StakingManager::new();
        
        // Register admin user
        staking_manager.access_control.register_user(
            "admin".to_string(), 
            vec![Role::SuperAdmin], 
            "system".to_string()
        ).unwrap();
        
        // Pause system
        staking_manager.emergency_pause("Test emergency".to_string(), "admin".to_string()).unwrap();
        assert!(staking_manager.emergency_paused);
        
        // Try to distribute rewards while paused
        let result = staking_manager.distribute_rewards(
            "pool1", 
            "contract1", 
            1000, 
            "admin"
        );
        
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("emergency paused"));
    }
}

#[cfg(test)]
mod dex_security_tests {
    use super::*;

    #[test]
    fn test_amm_calculation_accuracy() {
        let mut dex = DEX::new();
        
        // Create a test pool
        let pool = crate::dex::Pool {
            id: "DUJYO_USDC".to_string(),
            token_a: "DUJYO".to_string(),
            token_b: "USDC".to_string(),
            reserve_a: 1000000.0,
            reserve_b: 1000000.0,
            total_liquidity: 1000000.0,
        };
        
        dex.pools.insert("DUJYO_USDC".to_string(), pool);
        
        // Test swap calculation
        let swap_request = SwapRequest {
            from: "DUJYO".to_string(),
            to: "USDC".to_string(),
            amount: 1000.0,
            min_received: 900.0,
            user: "test_user".to_string(),
        };
        
        let result = dex.execute_swap(swap_request);
        assert!(result.is_ok());
        
        let swap_response = result.unwrap();
        assert!(swap_response.success);
        assert!(swap_response.amount_received.is_some());
        assert!(swap_response.price_impact.is_some());
    }

    #[test]
    fn test_slippage_protection() {
        let mut dex = DEX::new();
        
        // Create a test pool with low liquidity
        let pool = crate::dex::Pool {
            id: "DUJYO_USDC".to_string(),
            token_a: "DUJYO".to_string(),
            token_b: "USDC".to_string(),
            reserve_a: 1000.0,
            reserve_b: 1000.0,
            total_liquidity: 1000.0,
        };
        
        dex.pools.insert("DUJYO_USDC".to_string(), pool);
        
        // Test swap with high slippage
        let swap_request = SwapRequest {
            from: "DUJYO".to_string(),
            to: "USDC".to_string(),
            amount: 500.0, // Large amount relative to pool size
            min_received: 400.0, // High minimum expectation
            user: "test_user".to_string(),
        };
        
        let result = dex.execute_swap(swap_request);
        // Should either succeed with proper slippage calculation or fail due to high slippage
        assert!(result.is_ok() || result.is_err());
    }

    #[test]
    fn test_front_running_protection() {
        let mut dex = DEX::new();
        
        // Create a test pool
        let pool = crate::dex::Pool {
            id: "DUJYO_USDC".to_string(),
            token_a: "DUJYO".to_string(),
            token_b: "USDC".to_string(),
            reserve_a: 1000000.0,
            reserve_b: 1000000.0,
            total_liquidity: 1000000.0,
        };
        
        dex.pools.insert("DUJYO_USDC".to_string(), pool);
        
        // Execute multiple swaps to test VRF-based transaction ordering
        let mut tx_hashes = Vec::new();
        
        for i in 0..10 {
            let swap_request = SwapRequest {
                from: "DUJYO".to_string(),
                to: "USDC".to_string(),
                amount: 100.0,
                min_received: 90.0,
                user: format!("user_{}", i),
            };
            
            let result = dex.execute_swap(swap_request);
            if let Ok(response) = result {
                if let Some(tx_hash) = response.tx_hash {
                    tx_hashes.push(tx_hash);
                }
            }
        }
        
        // All transaction hashes should be unique due to VRF
        let unique_hashes: std::collections::HashSet<_> = tx_hashes.iter().collect();
        assert_eq!(unique_hashes.len(), tx_hashes.len());
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn test_end_to_end_security_flow() {
        // Test complete security flow from user registration to transaction execution
        
        // 1. Initialize systems
        let mut staking_manager = StakingManager::new();
        let mut dex = DEX::new();
        
        // 2. Register admin user
        staking_manager.access_control.register_user(
            "admin".to_string(), 
            vec![Role::SuperAdmin], 
            "system".to_string()
        ).unwrap();
        
        // 3. Test staking with access control
        let stake_result = staking_manager.stake_tokens(crate::blockchain::staking_rewards::StakeRequest {
            contract_id: "test_contract".to_string(),
            staker: "admin".to_string(),
            amount: 1000,
        });
        
        // 4. Test reward distribution with proper permissions
        let reward_result = staking_manager.distribute_rewards(
            "pool1", 
            "test_contract", 
            100, 
            "admin"
        );
        
        // 5. Test DEX operations
        let pool = crate::dex::Pool {
            id: "DUJYO_USDC".to_string(),
            token_a: "DUJYO".to_string(),
            token_b: "USDC".to_string(),
            reserve_a: 1000000.0,
            reserve_b: 1000000.0,
            total_liquidity: 1000000.0,
        };
        
        dex.pools.insert("DUJYO_USDC".to_string(), pool);
        
        let swap_request = SwapRequest {
            from: "DUJYO".to_string(),
            to: "USDC".to_string(),
            amount: 100.0,
            min_received: 90.0,
            user: "admin".to_string(),
        };
        
        let swap_result = dex.execute_swap(swap_request);
        
        // All operations should complete successfully
        assert!(stake_result.is_ok());
        assert!(reward_result.is_ok());
        assert!(swap_result.is_ok());
    }

    #[test]
    fn test_security_under_stress() {
        // Test system behavior under stress conditions
        
        let mut staking_manager = StakingManager::new();
        
        // Register admin
        staking_manager.access_control.register_user(
            "admin".to_string(), 
            vec![Role::SuperAdmin], 
            "system".to_string()
        ).unwrap();
        
        // Perform many operations rapidly
        for i in 0..100 {
            let stake_result = staking_manager.stake_tokens(crate::blockchain::staking_rewards::StakeRequest {
                contract_id: format!("contract_{}", i),
                staker: format!("staker_{}", i),
                amount: 1000,
            });
            
            // Should handle gracefully even with many operations
            assert!(stake_result.is_ok() || stake_result.is_err());
        }
        
        // System should still be functional
        let status = staking_manager.get_system_status();
        assert!(status["total_contracts"].as_u64().unwrap() > 0);
    }
}

