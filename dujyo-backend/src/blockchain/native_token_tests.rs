// Tests de seguridad REALES para native_token.rs
#[cfg(test)]
mod security_tests {
    use super::super::native_token::*;

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
        assert!(
            transfer_result.unwrap_err().contains("emergency paused"),
            "Error should mention emergency pause"
        );

        println!("✅ TEST PASSED: Emergency pause blocks transfers");
    }

    #[test]
    fn test_reentrancy_guard_protection() {
        let mut token = NativeToken::new("admin".to_string());

        // Mint tokens
        token
            .initial_mint(MintRequest {
                to: "user1".to_string(),
                amount: 1000000,
                minter: "admin".to_string(),
            })
            .unwrap();

        // Set reentrancy guard manualmente para simular ataque
        token.reentrancy_guard = true;

        // Intentar mint durante reentrancy guard activo - DEBE FALLAR
        let result = token.initial_mint(MintRequest {
            to: "user2".to_string(),
            amount: 100,
            minter: "admin".to_string(),
        });

        assert!(result.is_err(), "Should detect reentrancy");
        assert!(
            result.unwrap_err().contains("Reentrancy"),
            "Error should mention reentrancy attack"
        );

        println!("✅ TEST PASSED: Reentrancy guard works");
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

        println!("✅ TEST PASSED: SafeMath prevents overflow/underflow");
    }

    #[test]
    fn test_max_supply_enforcement() {
        let mut token = NativeToken::new("admin".to_string());

        // Intentar mint más del max supply - DEBE FALLAR
        let result = token.initial_mint(MintRequest {
            to: "user1".to_string(),
            amount: 1_000_000_001, // Excede max_supply de 1B
            minter: "admin".to_string(),
        });

        assert!(result.is_err(), "Should reject mint exceeding max supply");
        assert!(result.unwrap_err().contains("exceed max supply"));

        println!("✅ TEST PASSED: Max supply enforced");
    }

    #[test]
    fn test_admin_only_functions() {
        let mut token = NativeToken::new("admin".to_string());

        // Non-admin intenta hacer mint - DEBE FALLAR
        let result = token.initial_mint(MintRequest {
            to: "user1".to_string(),
            amount: 1000,
            minter: "hacker".to_string(), // No es admin
        });

        assert!(result.is_err(), "Non-admin should not be able to mint");
        assert!(result.unwrap_err().contains("Only admin"));

        // Non-admin intenta pausar - DEBE FALLAR
        let result = token.emergency_pause("hack attempt".to_string(), "hacker");
        assert!(result.is_err(), "Non-admin should not be able to pause");

        println!("✅ TEST PASSED: Admin-only functions protected");
    }

    #[test]
    fn test_balance_integrity_after_transfer() {
        let mut token = NativeToken::new("admin".to_string());

        // Setup
        token
            .initial_mint(MintRequest {
                to: "user1".to_string(),
                amount: 1000000,
                minter: "admin".to_string(),
            })
            .unwrap();

        let initial_supply = token.total_supply;
        let user1_balance = token.balance_of("user1");

        // Transfer
        token
            .transfer(TransferRequest {
                from: "user1".to_string(),
                to: "user2".to_string(),
                amount: 100000,
                content_id: None,
            })
            .unwrap();

        // Verificar integridad
        let user1_new = token.balance_of("user1");
        let user2_new = token.balance_of("user2");

        assert_eq!(
            user1_new + user2_new,
            user1_balance,
            "Total balance should be conserved"
        );
        assert_eq!(
            token.total_supply, initial_supply,
            "Total supply should not change"
        );

        println!("✅ TEST PASSED: Balance integrity maintained");
    }

    #[test]
    fn test_event_logging() {
        let mut token = NativeToken::new("admin".to_string());

        // Realizar operación
        token
            .initial_mint(MintRequest {
                to: "user1".to_string(),
                amount: 1000,
                minter: "admin".to_string(),
            })
            .unwrap();

        // Verificar que se registró evento
        let events = token.get_audit_log(10);
        assert!(!events.is_empty(), "Should have logged event");

        let last_event = events.last().unwrap();
        assert_eq!(last_event.event_type, "MINT");
        assert_eq!(last_event.to, Some("user1".to_string()));

        println!("✅ TEST PASSED: Events are logged correctly");
    }
}

#[cfg(test)]
mod integration_tests {
    use super::super::native_token::*;

    #[test]
    fn test_complete_token_lifecycle() {
        let mut token = NativeToken::new("admin".to_string());

        // 1. Mint
        token
            .initial_mint(MintRequest {
                to: "user1".to_string(),
                amount: 1000000,
                minter: "admin".to_string(),
            })
            .unwrap();

        // 2. Transfer
        token
            .transfer(TransferRequest {
                from: "user1".to_string(),
                to: "user2".to_string(),
                amount: 100000,
                content_id: None,
            })
            .unwrap();

        // 3. Verificar estado
        assert_eq!(token.balance_of("user1"), 900000);
        assert_eq!(token.balance_of("user2"), 100000);
        assert_eq!(token.total_supply, 1000000);

        // 4. Emergency pause
        token.emergency_pause("Test".to_string(), "admin").unwrap();

        // 5. Transfer debe fallar
        let result = token.transfer(TransferRequest {
            from: "user1".to_string(),
            to: "user2".to_string(),
            amount: 1000,
            content_id: None,
        });
        assert!(result.is_err());

        // 6. Resume
        token.resume_from_emergency("admin").unwrap();

        // 7. Transfer debe funcionar
        let result = token.transfer(TransferRequest {
            from: "user1".to_string(),
            to: "user2".to_string(),
            amount: 1000,
            content_id: None,
        });
        assert!(result.is_ok());

        println!("✅ INTEGRATION TEST PASSED: Complete lifecycle works");
    }
}
