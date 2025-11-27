//! SECURITY TEST: VULN-005 Integer Overflow Protection
//! 
//! This test verifies that integer overflow attacks are prevented
//! in token transfer operations.

use xwavve_backend::blockchain::token::Token;

#[test]
fn test_token_overflow_attack_fails() {
    let mut token = Token::new();
    
    // Setup: Attacker has maximum balance
    token.mint("attacker", f64::MAX).unwrap();
    
    // Attack: Try to transfer maximum amount
    // This should FAIL with overflow protection
    let result = token.transfer("attacker", "victim", f64::MAX, "content");
    
    // ✅ VERIFICATION: Overflow should be prevented
    assert!(result.is_err(), "Overflow attack should be prevented");
    assert!(result.unwrap_err().contains("overflow") || 
            result.unwrap_err().contains("exceeds"),
            "Error should mention overflow");
    
    // ✅ VERIFICATION: Balances should remain unchanged
    assert_eq!(token.balance_of("attacker"), f64::MAX, "Attacker balance should be unchanged");
    assert_eq!(token.balance_of("victim"), 0.0, "Victim balance should be unchanged");
    
    println!("✅ TEST PASSED: Overflow attack prevented");
}

#[test]
fn test_token_underflow_attack_fails() {
    let mut token = Token::new();
    
    // Setup: Attacker has small balance
    token.mint("attacker", 100.0).unwrap();
    
    // Attack: Try to transfer more than balance
    let result = token.transfer("attacker", "victim", 200.0, "content");
    
    // ✅ VERIFICATION: Underflow should be prevented
    assert!(result.is_err(), "Underflow attack should be prevented");
    
    // ✅ VERIFICATION: Balance should remain unchanged
    assert_eq!(token.balance_of("attacker"), 100.0, "Attacker balance should be unchanged");
    
    println!("✅ TEST PASSED: Underflow attack prevented");
}

#[test]
fn test_token_nan_infinity_attack_fails() {
    let mut token = Token::new();
    
    token.mint("attacker", 100.0).unwrap();
    
    // Attack: Try to transfer NaN
    let result_nan = token.transfer("attacker", "victim", f64::NAN, "content");
    assert!(result_nan.is_err(), "NaN transfer should be rejected");
    
    // Attack: Try to transfer infinity
    let result_inf = token.transfer("attacker", "victim", f64::INFINITY, "content");
    assert!(result_inf.is_err(), "Infinity transfer should be rejected");
    
    println!("✅ TEST PASSED: NaN/Infinity attacks prevented");
}

#[test]
fn test_mint_overflow_protection() {
    let mut token = Token::new();
    
    // Setup: Account has near-maximum balance
    token.mint("account", f64::MAX - 1.0).unwrap();
    
    // Attack: Try to mint amount that would cause overflow
    let result = token.mint("account", 2.0);
    
    // ✅ VERIFICATION: Overflow should be prevented
    assert!(result.is_err(), "Mint overflow should be prevented");
    
    println!("✅ TEST PASSED: Mint overflow protection works");
}

