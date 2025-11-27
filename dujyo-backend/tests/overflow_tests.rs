//! Conservative overflow tests for VULN-005
//!
//! These tests verify that arithmetic operations are protected against overflow/underflow
//! Run with: cargo test --test overflow_tests -- --nocapture

use xwavve_backend::utils::arithmetic::Arithmetic;

#[test]
fn test_overflow_protection_u64() {
    // Test: SafeMath should prevent overflow in u64 addition
    let result = Arithmetic::checked_add(u64::MAX, 1, "test_overflow");
    assert!(result.is_err(), "SafeMath should detect overflow in u64 addition");
    
    // Test: SafeMath should prevent underflow in u64 subtraction
    let result = Arithmetic::checked_sub(0, 1, "test_underflow");
    assert!(result.is_err(), "SafeMath should detect underflow in u64 subtraction");
    
    // Test: SafeMath should allow valid operations
    let result = Arithmetic::checked_add(100, 200, "test_valid");
    assert_eq!(result.unwrap(), 300, "SafeMath should allow valid u64 operations");
}

#[test]
fn test_overflow_protection_f64() {
    // Test: SafeMath should prevent overflow in f64 addition (using values that would overflow)
    // Note: f64::MAX + 1.0 doesn't overflow in Rust (becomes infinity), so we test with large values
    let result = Arithmetic::checked_add_f64(1e308, 1e308, "test_f64_overflow");
    assert!(result.is_err(), "SafeMath should detect overflow in f64 addition");
    
    // Test: SafeMath should prevent overflow in f64 multiplication
    let result = Arithmetic::checked_mul_f64(1e308, 2.0, "test_f64_mul_overflow");
    assert!(result.is_err(), "SafeMath should detect overflow in f64 multiplication");
    
    // Test: SafeMath should prevent division by zero
    let result = Arithmetic::checked_div_f64(100.0, 0.0, "test_f64_div_zero");
    assert!(result.is_err(), "SafeMath should detect division by zero");
    
    // Test: SafeMath should allow valid operations
    let result = Arithmetic::checked_add_f64(100.0, 200.0, "test_f64_valid");
    assert_eq!(result.unwrap(), 300.0, "SafeMath should allow valid f64 operations");
}

#[test]
fn test_arithmetic_edge_cases() {
    // Test: Maximum values
    let result = Arithmetic::checked_add(u64::MAX, 0, "test_max");
    assert!(result.is_ok(), "SafeMath should allow adding zero to max");
    
    // Test: Zero values
    let result = Arithmetic::checked_add(0, 0, "test_zero");
    assert_eq!(result.unwrap(), 0, "SafeMath should handle zero addition");
    
    // Test: Valid subtraction
    let result = Arithmetic::checked_sub(100, 50, "test_sub");
    assert_eq!(result.unwrap(), 50, "SafeMath should allow valid subtraction");
}

