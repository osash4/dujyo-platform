//! Circuit Breaker Pattern Implementation for Dujyo
//!
//! This module provides circuit breaker functionality to protect services:
//! - Database operations
//! - Blockchain operations
//! - DEX swaps
//! - External API calls
//!
//! States: CLOSED, OPEN, HALF_OPEN
//! Configurable thresholds and timeouts

use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use tracing::{info, warn};

/// Circuit breaker states
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CircuitState {
    Closed,   // Normal operation
    Open,     // Circuit is open, requests are rejected
    HalfOpen, // Testing if service is back
}

/// Circuit breaker configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitBreakerConfig {
    pub failure_threshold: u32,      // Number of failures before opening
    pub success_threshold: u32,      // Number of successes to close from half-open
    pub timeout: Duration,           // Timeout for requests
    pub reset_timeout: Duration,     // Time to wait before trying half-open
    pub max_requests_half_open: u32, // Max requests allowed in half-open state
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_threshold: 5,
            success_threshold: 3,
            timeout: Duration::from_secs(30),
            reset_timeout: Duration::from_secs(60),
            max_requests_half_open: 3,
        }
    }
}

/// Circuit breaker statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitBreakerStats {
    pub state: CircuitState,
    pub failure_count: u32,
    pub success_count: u32,
    pub request_count: u32,
    #[serde(skip)]
    pub last_failure_time: Option<Instant>,
    #[serde(skip)]
    pub last_success_time: Option<Instant>,
    pub state_changes: u32,
}

/// Circuit breaker implementation
pub struct CircuitBreaker {
    config: CircuitBreakerConfig,
    state: Arc<RwLock<CircuitState>>,
    stats: Arc<RwLock<CircuitBreakerStats>>,
    last_failure_time: Arc<RwLock<Option<Instant>>>,
    half_open_requests: Arc<RwLock<u32>>,
}

impl CircuitBreaker {
    pub fn new(config: CircuitBreakerConfig) -> Self {
        Self {
            config,
            state: Arc::new(RwLock::new(CircuitState::Closed)),
            stats: Arc::new(RwLock::new(CircuitBreakerStats {
                state: CircuitState::Closed,
                failure_count: 0,
                success_count: 0,
                request_count: 0,
                last_failure_time: None,
                last_success_time: None,
                state_changes: 0,
            })),
            last_failure_time: Arc::new(RwLock::new(None)),
            half_open_requests: Arc::new(RwLock::new(0)),
        }
    }

    /// Execute a function with circuit breaker protection
    pub async fn execute<F, T, E>(&self, operation: F) -> Result<T, CircuitBreakerError>
    where
        F: FnOnce() -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<T, E>> + Send>>,
        E: std::fmt::Debug + Send + Sync + 'static,
    {
        // Check if circuit is open
        if self.is_open().await {
            return Err(CircuitBreakerError::CircuitOpen);
        }

        // Check if we're in half-open state and have reached max requests
        if self.is_half_open().await {
            let mut half_open_requests = self.half_open_requests.write().await;
            if *half_open_requests >= self.config.max_requests_half_open {
                return Err(CircuitBreakerError::CircuitHalfOpen);
            }
            *half_open_requests += 1;
        }

        // Increment request count
        {
            let mut stats = self.stats.write().await;
            stats.request_count += 1;
        }

        // Execute the operation with timeout
        let _start_time = Instant::now();
        let result = tokio::time::timeout(self.config.timeout, operation()).await;

        match result {
            Ok(Ok(value)) => {
                // Success
                self.on_success().await;
                Ok(value)
            }
            Ok(Err(e)) => {
                // Operation failed
                self.on_failure().await;
                Err(CircuitBreakerError::OperationFailed(format!("{:?}", e)))
            }
            Err(_) => {
                // Timeout
                self.on_failure().await;
                Err(CircuitBreakerError::Timeout)
            }
        }
    }

    /// Check if circuit is open
    async fn is_open(&self) -> bool {
        let state = self.state.read().await;
        *state == CircuitState::Open
    }

    /// Check if circuit is half-open
    async fn is_half_open(&self) -> bool {
        let state = self.state.read().await;
        *state == CircuitState::HalfOpen
    }

    /// Handle successful operation
    async fn on_success(&self) {
        let mut state = self.state.write().await;
        let mut stats = self.stats.write().await;
        let mut half_open_requests = self.half_open_requests.write().await;

        stats.success_count += 1;
        stats.last_success_time = Some(Instant::now());

        match *state {
            CircuitState::Closed => {
                // Reset failure count on success
                stats.failure_count = 0;
            }
            CircuitState::HalfOpen => {
                // Check if we have enough successes to close
                if stats.success_count >= self.config.success_threshold {
                    *state = CircuitState::Closed;
                    stats.state = CircuitState::Closed;
                    stats.state_changes += 1;
                    stats.failure_count = 0;
                    stats.success_count = 0;
                    *half_open_requests = 0;
                    info!(
                        "Circuit breaker closed after {} successes",
                        self.config.success_threshold
                    );
                }
            }
            CircuitState::Open => {
                // This shouldn't happen, but handle it gracefully
                warn!("Success received while circuit is open");
            }
        }
    }

    /// Handle failed operation
    async fn on_failure(&self) {
        let mut state = self.state.write().await;
        let mut stats = self.stats.write().await;
        let mut last_failure_time = self.last_failure_time.write().await;

        stats.failure_count += 1;
        stats.last_failure_time = Some(Instant::now());
        *last_failure_time = Some(Instant::now());

        match *state {
            CircuitState::Closed => {
                // Check if we should open the circuit
                if stats.failure_count >= self.config.failure_threshold {
                    *state = CircuitState::Open;
                    stats.state = CircuitState::Open;
                    stats.state_changes += 1;
                    warn!(
                        "Circuit breaker opened after {} failures",
                        self.config.failure_threshold
                    );
                }
            }
            CircuitState::HalfOpen => {
                // Go back to open state
                *state = CircuitState::Open;
                stats.state = CircuitState::Open;
                stats.state_changes += 1;
                stats.success_count = 0;
                warn!("Circuit breaker opened from half-open state after failure");
            }
            CircuitState::Open => {
                // Already open, just update stats
            }
        }
    }

    /// Check if circuit should transition from open to half-open
    pub async fn should_attempt_reset(&self) -> bool {
        let state = self.state.read().await;
        if *state != CircuitState::Open {
            return false;
        }

        let last_failure_time = self.last_failure_time.read().await;
        if let Some(last_failure) = *last_failure_time {
            return last_failure.elapsed() >= self.config.reset_timeout;
        }

        false
    }

    /// Attempt to reset circuit to half-open state
    pub async fn attempt_reset(&self) -> bool {
        let mut state = self.state.write().await;
        let mut stats = self.stats.write().await;

        if *state == CircuitState::Open && self.should_attempt_reset().await {
            *state = CircuitState::HalfOpen;
            stats.state = CircuitState::HalfOpen;
            stats.state_changes += 1;
            stats.success_count = 0;
            stats.failure_count = 0;
            info!("Circuit breaker reset to half-open state");
            return true;
        }

        false
    }

    /// Get current circuit breaker state
    pub async fn get_state(&self) -> CircuitState {
        let state = self.state.read().await;
        *state
    }

    /// Get circuit breaker statistics
    pub async fn get_stats(&self) -> CircuitBreakerStats {
        let stats = self.stats.read().await;
        stats.clone()
    }

    /// Force circuit to closed state (for testing or manual intervention)
    pub async fn force_close(&self) {
        let mut state = self.state.write().await;
        let mut stats = self.stats.write().await;
        let mut half_open_requests = self.half_open_requests.write().await;

        *state = CircuitState::Closed;
        stats.state = CircuitState::Closed;
        stats.state_changes += 1;
        stats.failure_count = 0;
        stats.success_count = 0;
        *half_open_requests = 0;

        info!("Circuit breaker manually closed");
    }

    /// Force circuit to open state (for testing or manual intervention)
    pub async fn force_open(&self) {
        let mut state = self.state.write().await;
        let mut stats = self.stats.write().await;

        *state = CircuitState::Open;
        stats.state = CircuitState::Open;
        stats.state_changes += 1;

        info!("Circuit breaker manually opened");
    }
}

/// Circuit breaker error types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CircuitBreakerError {
    CircuitOpen,
    CircuitHalfOpen,
    Timeout,
    OperationFailed(String),
}

impl std::fmt::Display for CircuitBreakerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CircuitBreakerError::CircuitOpen => write!(f, "Circuit breaker is open"),
            CircuitBreakerError::CircuitHalfOpen => write!(f, "Circuit breaker is half-open"),
            CircuitBreakerError::Timeout => write!(f, "Operation timed out"),
            CircuitBreakerError::OperationFailed(msg) => write!(f, "Operation failed: {}", msg),
        }
    }
}

impl std::error::Error for CircuitBreakerError {}

/// Circuit breaker manager for multiple services
pub struct CircuitBreakerManager {
    breakers: Arc<RwLock<HashMap<String, Arc<CircuitBreaker>>>>,
}

impl CircuitBreakerManager {
    pub fn new() -> Self {
        Self {
            breakers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Get or create a circuit breaker for a service
    pub async fn get_breaker(&self, service_name: &str) -> Arc<CircuitBreaker> {
        let mut breakers = self.breakers.write().await;

        if let Some(breaker) = breakers.get(service_name) {
            return breaker.clone();
        }

        // Create new circuit breaker with default config
        let breaker = Arc::new(CircuitBreaker::new(CircuitBreakerConfig::default()));
        breakers.insert(service_name.to_string(), breaker.clone());
        breaker
    }

    /// Get or create a circuit breaker with custom config
    pub async fn get_breaker_with_config(
        &self,
        service_name: &str,
        config: CircuitBreakerConfig,
    ) -> Arc<CircuitBreaker> {
        let mut breakers = self.breakers.write().await;

        if let Some(breaker) = breakers.get(service_name) {
            return breaker.clone();
        }

        // Create new circuit breaker with custom config
        let breaker = Arc::new(CircuitBreaker::new(config));
        breakers.insert(service_name.to_string(), breaker.clone());
        breaker
    }

    /// Get all circuit breaker statistics
    pub async fn get_all_stats(&self) -> HashMap<String, CircuitBreakerStats> {
        let breakers = self.breakers.read().await;
        let mut stats = HashMap::new();

        for (name, breaker) in breakers.iter() {
            stats.insert(name.clone(), breaker.get_stats().await);
        }

        stats
    }

    /// Reset all circuit breakers
    pub async fn reset_all(&self) {
        let breakers = self.breakers.read().await;
        for breaker in breakers.values() {
            breaker.force_close().await;
        }
        info!("All circuit breakers reset");
    }

    /// Check and reset circuit breakers that should be reset
    pub async fn check_and_reset(&self) {
        let breakers = self.breakers.read().await;
        for (name, breaker) in breakers.iter() {
            if breaker.should_attempt_reset().await {
                if breaker.attempt_reset().await {
                    info!("Circuit breaker for service '{}' reset to half-open", name);
                }
            }
        }
    }
}

/// Circuit breaker middleware for Axum
pub async fn circuit_breaker_middleware(
    State(manager): State<Arc<CircuitBreakerManager>>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let path = request.uri().path();
    let method = request.method().clone();

    // Determine service name from path
    let service_name = determine_service_name(&path, &method);
    let breaker = manager.get_breaker(&service_name).await;

    // Execute request with circuit breaker protection
    let result = breaker
        .execute(|| Box::pin(async { Ok::<Response, String>(next.run(request).await) }))
        .await;

    match result {
        Ok(response) => Ok(response),
        Err(CircuitBreakerError::CircuitOpen) => {
            warn!("Circuit breaker open for service: {}", service_name);
            Err(StatusCode::SERVICE_UNAVAILABLE)
        }
        Err(CircuitBreakerError::CircuitHalfOpen) => {
            warn!("Circuit breaker half-open for service: {}", service_name);
            Err(StatusCode::SERVICE_UNAVAILABLE)
        }
        Err(CircuitBreakerError::Timeout) => {
            warn!("Request timeout for service: {}", service_name);
            Err(StatusCode::REQUEST_TIMEOUT)
        }
        Err(CircuitBreakerError::OperationFailed(_)) => {
            warn!("Operation failed for service: {}", service_name);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Determine service name from request path and method
fn determine_service_name(path: &str, _method: &axum::http::Method) -> String {
    if path.starts_with("/api/database") {
        "database".to_string()
    } else if path.starts_with("/api/blockchain") {
        "blockchain".to_string()
    } else if path.starts_with("/api/dex") {
        "dex".to_string()
    } else if path.starts_with("/api/nft") {
        "nft".to_string()
    } else if path.starts_with("/api/staking") {
        "staking".to_string()
    } else if path.starts_with("/api/external") {
        "external_api".to_string()
    } else {
        "default".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[tokio::test]
    async fn test_circuit_breaker_success() {
        let breaker = CircuitBreaker::new(CircuitBreakerConfig::default());

        let result = breaker
            .execute(|| Box::pin(async { Ok::<String, String>("success".to_string()) }))
            .await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "success");
        assert_eq!(breaker.get_state().await, CircuitState::Closed);
    }

    #[tokio::test]
    async fn test_circuit_breaker_failure() {
        let config = CircuitBreakerConfig {
            failure_threshold: 2,
            success_threshold: 1,
            timeout: Duration::from_secs(1),
            reset_timeout: Duration::from_secs(1),
            max_requests_half_open: 1,
        };
        let breaker = CircuitBreaker::new(config);

        // First failure
        let result = breaker
            .execute(|| Box::pin(async { Err::<String, String>("error".to_string()) }))
            .await;
        assert!(result.is_err());
        assert_eq!(breaker.get_state().await, CircuitState::Closed);

        // Second failure - should open circuit
        let result = breaker
            .execute(|| Box::pin(async { Err::<String, String>("error".to_string()) }))
            .await;
        assert!(result.is_err());
        assert_eq!(breaker.get_state().await, CircuitState::Open);
    }

    #[tokio::test]
    async fn test_circuit_breaker_timeout() {
        let config = CircuitBreakerConfig {
            failure_threshold: 1,
            success_threshold: 1,
            timeout: Duration::from_millis(100),
            reset_timeout: Duration::from_secs(1),
            max_requests_half_open: 1,
        };
        let breaker = CircuitBreaker::new(config);

        let result = breaker
            .execute(|| {
                Box::pin(async {
                    tokio::time::sleep(Duration::from_millis(200)).await;
                    Ok::<String, String>("success".to_string())
                })
            })
            .await;

        assert!(result.is_err());
        assert_eq!(breaker.get_state().await, CircuitState::Open);
    }

    #[tokio::test]
    async fn test_circuit_breaker_manager() {
        let manager = CircuitBreakerManager::new();

        let breaker1 = manager.get_breaker("service1").await;
        let breaker2 = manager.get_breaker("service2").await;

        assert!(Arc::ptr_eq(
            &breaker1,
            &manager.get_breaker("service1").await
        ));
        assert!(!Arc::ptr_eq(&breaker1, &breaker2));
    }
}
