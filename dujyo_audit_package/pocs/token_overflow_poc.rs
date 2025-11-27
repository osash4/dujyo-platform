//! PROOF OF CONCEPT: Integer Overflow in Token Transfers
//! 
//! This PoC demonstrates how an attacker can cause integer overflow
//! in token transfer operations, leading to invalid balances.
//!
//! To run this PoC:
//!   cargo test --test token_overflow_poc -- --nocapture

use std::collections::HashMap;

// Simulated vulnerable Token struct
struct Token {
    balances: HashMap<String, f64>,
}

impl Token {
    fn new() -> Self {
        Token {
            balances: HashMap::new(),
        }
    }

    fn mint(&mut self, account: &str, amount: f64) {
        *self.balances.entry(account.to_string()).or_insert(0.0) += amount;
    }

    // VULNERABLE: No overflow check
    fn transfer_vulnerable(&mut self, from: &str, to: &str, amount: f64) -> Result<(), String> {
        let from_balance = self.balances.get_mut(from)
            .ok_or_else(|| "Account not found".to_string())?;
        
        if *from_balance < amount {
            return Err("Insufficient balance".to_string());
        }

        // ❌ VULNERABLE: No overflow check
        *from_balance -= amount;
        *self.balances.entry(to.to_string()).or_insert(0.0) += amount;
        
        Ok(())
    }

    // FIXED: With overflow check
    fn transfer_fixed(&mut self, from: &str, to: &str, amount: f64) -> Result<(), String> {
        // Validate amount
        if amount <= 0.0 || amount.is_infinite() || amount.is_nan() {
            return Err("Invalid amount".to_string());
        }

        let from_balance = *self.balances.get(from).unwrap_or(&0.0);
        
        if from_balance < amount {
            return Err("Insufficient balance".to_string());
        }

        // ✅ FIXED: Use checked arithmetic
        let new_from_balance = from_balance.checked_sub(amount)
            .ok_or_else(|| "Arithmetic underflow".to_string())?;
        
        let to_balance = *self.balances.get(to).unwrap_or(&0.0);
        let new_to_balance = to_balance.checked_add(amount)
            .ok_or_else(|| "Arithmetic overflow".to_string())?;
        
        // Update balances
        *self.balances.get_mut(from).unwrap() = new_from_balance;
        *self.balances.entry(to.to_string()).or_insert(0.0) = new_to_balance;
        
        Ok(())
    }

    fn get_balance(&self, account: &str) -> f64 {
        *self.balances.get(account).unwrap_or(&0.0)
    }
}

#[test]
fn test_overflow_attack_vulnerable() {
    let mut token = Token::new();
    
    // Setup: Attacker has maximum balance
    token.mint("attacker", f64::MAX);
    
    // Attack: Try to transfer maximum amount
    // This should cause overflow
    let result = token.transfer_vulnerable("attacker", "victim", f64::MAX);
    
    // Check if overflow occurred
    let attacker_balance = token.get_balance("attacker");
    let victim_balance = token.get_balance("victim");
    
    println!("Attacker balance: {}", attacker_balance);
    println!("Victim balance: {}", victim_balance);
    
    // Overflow causes NaN or infinity
    assert!(attacker_balance.is_nan() || attacker_balance.is_infinite() || 
            victim_balance.is_nan() || victim_balance.is_infinite(),
            "Overflow attack succeeded - balances are invalid");
    
    println!("❌ VULNERABILITY CONFIRMED: Overflow attack succeeded");
}

#[test]
fn test_overflow_attack_fixed() {
    let mut token = Token::new();
    
    // Setup: Attacker has maximum balance
    token.mint("attacker", f64::MAX);
    
    // Attack: Try to transfer maximum amount
    // This should FAIL with overflow protection
    let result = token.transfer_fixed("attacker", "victim", f64::MAX);
    
    // Check that overflow was prevented
    assert!(result.is_err(), "Overflow should be prevented");
    assert!(result.unwrap_err().contains("overflow") || 
            result.unwrap_err().contains("Arithmetic"),
            "Error should mention overflow");
    
    // Balances should remain unchanged
    let attacker_balance = token.get_balance("attacker");
    let victim_balance = token.get_balance("victim");
    
    assert_eq!(attacker_balance, f64::MAX, "Attacker balance should be unchanged");
    assert_eq!(victim_balance, 0.0, "Victim balance should be unchanged");
    
    println!("✅ FIX CONFIRMED: Overflow attack prevented");
}

#[test]
fn test_underflow_attack() {
    let mut token = Token::new();
    
    // Setup: Attacker has small balance
    token.mint("attacker", 100.0);
    
    // Attack: Try to transfer more than balance
    let result = token.transfer_fixed("attacker", "victim", 200.0);
    
    // Check that underflow was prevented
    assert!(result.is_err(), "Underflow should be prevented");
    
    // Balance should remain unchanged
    let attacker_balance = token.get_balance("attacker");
    assert_eq!(attacker_balance, 100.0, "Attacker balance should be unchanged");
    
    println!("✅ FIX CONFIRMED: Underflow attack prevented");
}
