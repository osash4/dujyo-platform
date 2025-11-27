//! Conservative arithmetic helpers for Dujyo
//!
//! This module provides fail-safe arithmetic operations that prevent overflow/underflow
//! and return controlled errors instead of panicking.
//!
//! These are minimal wrappers around SafeMath for conservative fixes.

use crate::utils::safe_math::{SafeMath, SafeMathError};
// ✅ SECURITY FIX: Removed unused import (SafeMathResult) to fix clippy warnings
use std::fmt;

/// Arithmetic error type for conservative error handling
#[derive(Debug, Clone)]
pub enum ArithmeticError {
    Overflow,
    Underflow,
    DivisionByZero,
    InvalidInput(String),
}

impl fmt::Display for ArithmeticError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ArithmeticError::Overflow => write!(f, "Arithmetic overflow detected"),
            ArithmeticError::Underflow => write!(f, "Arithmetic underflow detected"),
            ArithmeticError::DivisionByZero => write!(f, "Division by zero attempted"),
            ArithmeticError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
        }
    }
}

impl std::error::Error for ArithmeticError {}

impl From<SafeMathError> for ArithmeticError {
    fn from(err: SafeMathError) -> Self {
        match err {
            SafeMathError::Overflow => ArithmeticError::Overflow,
            SafeMathError::Underflow => ArithmeticError::Underflow,
            SafeMathError::DivisionByZero => ArithmeticError::DivisionByZero,
            SafeMathError::InvalidInput(msg) => ArithmeticError::InvalidInput(msg),
            SafeMathError::PrecisionLoss => ArithmeticError::InvalidInput("Precision loss".to_string()),
        }
    }
}

/// Conservative arithmetic operations
pub struct Arithmetic;

impl Arithmetic {
    /// Safe addition with overflow protection (u64)
    pub fn checked_add(a: u64, b: u64, context: &str) -> Result<u64, ArithmeticError> {
        SafeMath::add(a, b, context).map_err(Into::into)
    }

    /// Safe subtraction with underflow protection (u64)
    pub fn checked_sub(a: u64, b: u64, context: &str) -> Result<u64, ArithmeticError> {
        SafeMath::sub(a, b, context).map_err(Into::into)
    }

    /// Safe multiplication with overflow protection (u64)
    pub fn checked_mul(a: u64, b: u64, context: &str) -> Result<u64, ArithmeticError> {
        SafeMath::mul(a, b, context).map_err(Into::into)
    }

    /// Safe division with zero-division protection (u64)
    pub fn checked_div(a: u64, b: u64, context: &str) -> Result<u64, ArithmeticError> {
        SafeMath::div(a, b, context).map_err(Into::into)
    }

    /// Safe addition with overflow protection (f64)
    pub fn checked_add_f64(a: f64, b: f64, context: &str) -> Result<f64, ArithmeticError> {
        SafeMath::f64_add(a, b, context).map_err(Into::into)
    }

    /// Safe subtraction with underflow protection (f64)
    pub fn checked_sub_f64(a: f64, b: f64, context: &str) -> Result<f64, ArithmeticError> {
        SafeMath::f64_sub(a, b, context).map_err(Into::into)
    }

    /// Safe multiplication with overflow protection (f64)
    pub fn checked_mul_f64(a: f64, b: f64, context: &str) -> Result<f64, ArithmeticError> {
        SafeMath::f64_mul(a, b, context).map_err(Into::into)
    }

    /// Safe division with zero-division protection (f64)
    pub fn checked_div_f64(a: f64, b: f64, context: &str) -> Result<f64, ArithmeticError> {
        SafeMath::f64_div(a, b, context).map_err(Into::into)
    }
}

