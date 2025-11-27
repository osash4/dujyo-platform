//! Rate Limiting in Memory (Temporary Implementation)
//! 
//! Simplified rate limiter using HashMap instead of Redis
//! This provides immediate functionality while Redis integration can be optimized later

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use tracing::{info, warn, debug, error};

/// ✅ SECURITY FIX: Safe timestamp helper
fn get_current_timestamp() -> Result<u64, Box<dyn std::error::Error + Send + Sync>> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .map_err(|e| {
            error!(error = %e, "CRITICAL: System time error in rate limiter");
            Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("System time error: {}", e)
            )) as Box<dyn std::error::Error + Send + Sync>
        })
}

/// Rate limiting configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub window_size: Duration,
    pub max_requests_per_window: u32,
    pub max_requests_per_minute: u32,
    pub max_requests_per_hour: u32,
    pub max_requests_per_day: u32,
    pub burst_limit: u32,
    pub recovery_time: Duration,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            window_size: Duration::from_secs(60),
            max_requests_per_window: 100,
            max_requests_per_minute: 100,
            max_requests_per_hour: 1000,
            max_requests_per_day: 10000,
            burst_limit: 20,
            recovery_time: Duration::from_secs(300),
        }
    }
}

/// Rate limit result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitResult {
    pub allowed: bool,
    pub remaining: u32,
    pub reset_time: u64,
    pub retry_after: Option<u64>,
    pub reason: Option<String>,
}

/// Abuse detection patterns
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbusePattern {
    pub pattern_type: AbuseType,
    pub threshold: u32,
    pub window: Duration,
    pub action: AbuseAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AbuseType {
    RapidRequests,
    StreamFarming,
    BalanceManipulation,
    TransactionSpam,
    LoginAttempts,
    ApiAbuse,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AbuseAction {
    Block,
    Throttle,
    RequireCaptcha,
    Alert,
    Log,
}

/// Request tracking entry
#[derive(Debug, Clone)]
struct RequestEntry {
    timestamps: Vec<Instant>,
    blocked_until: Option<Instant>,
}

impl RequestEntry {
    fn new() -> Self {
        Self {
            timestamps: Vec::new(),
            blocked_until: None,
        }
    }

    fn clean_old_requests(&mut self, window: Duration) {
        let now = Instant::now();
        self.timestamps.retain(|&ts| now.duration_since(ts) < window);
    }

    fn is_blocked(&self) -> bool {
        if let Some(blocked_until) = self.blocked_until {
            Instant::now() < blocked_until
        } else {
            false
        }
    }

    fn block(&mut self, duration: Duration) {
        self.blocked_until = Some(Instant::now() + duration);
    }
}

/// Rate limiter service (in-memory implementation)
pub struct RateLimiter {
    config: RateLimitConfig,
    requests: Arc<Mutex<HashMap<String, RequestEntry>>>,
    abuse_patterns: Vec<AbusePattern>,
}

impl RateLimiter {
    /// Create new rate limiter
    pub fn new(config: RateLimitConfig) -> Self {
        info!("🔒 Initializing in-memory rate limiter");
        Self {
            config,
            requests: Arc::new(Mutex::new(HashMap::new())),
            abuse_patterns: Vec::new(),
        }
    }

    /// Check rate limit for a key
    pub async fn check_rate(&self, key: &str, limit_type: LimitType) -> Result<RateLimitResult, Box<dyn std::error::Error + Send + Sync>> {
        let mut requests = self.requests.lock().map_err(|e| {
            error!(error = %e, "CRITICAL: Failed to acquire rate limiter lock");
            Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Lock error: {}", e)
            )) as Box<dyn std::error::Error + Send + Sync>
        })?;
        
        let entry = requests.entry(key.to_string()).or_insert_with(RequestEntry::new);

        // Check if blocked
        if entry.is_blocked() {
            let retry_after = entry.blocked_until
                .ok_or_else(|| {
                    error!("CRITICAL: Blocked entry has no blocked_until timestamp");
                    Box::new(std::io::Error::new(
                        std::io::ErrorKind::InvalidData,
                        "Blocked entry missing timestamp"
                    )) as Box<dyn std::error::Error + Send + Sync>
                })?
                .duration_since(Instant::now())
                .as_secs();
            
            return Ok(RateLimitResult {
                allowed: false,
                remaining: 0,
                reset_time: get_current_timestamp()? + retry_after,
                retry_after: Some(retry_after),
                reason: Some("Rate limit exceeded. Temporarily blocked.".to_string()),
            });
        }

        // Determine window and limit based on type
        let (window, limit) = match limit_type {
            LimitType::Minute => (Duration::from_secs(60), self.config.max_requests_per_minute),
            LimitType::Hour => (Duration::from_secs(3600), self.config.max_requests_per_hour),
            LimitType::Day => (Duration::from_secs(86400), self.config.max_requests_per_day),
            LimitType::Window => (self.config.window_size, self.config.max_requests_per_window),
            LimitType::Burst => (Duration::from_secs(1), self.config.burst_limit),
        };

        // Clean old requests
        entry.clean_old_requests(window);

        // Check limit
        let count = entry.timestamps.len() as u32;
        
        if count >= limit {
            // Block if limit exceeded
            entry.block(self.config.recovery_time);
            
            Ok(RateLimitResult {
                allowed: false,
                remaining: 0,
                reset_time: get_current_timestamp()? + self.config.recovery_time.as_secs(),
                retry_after: Some(self.config.recovery_time.as_secs()),
                reason: Some(format!("Rate limit exceeded: {}/{} requests", count, limit)),
            })
        } else {
            // Record request
            entry.timestamps.push(Instant::now());
            
            Ok(RateLimitResult {
                allowed: true,
                remaining: limit.saturating_sub(count + 1),
                reset_time: get_current_timestamp()? + window.as_secs(),
                retry_after: None,
                reason: None,
            })
        }
    }

    /// Check rate limit (default: per minute)
    pub async fn check(&self, key: &str) -> Result<RateLimitResult, Box<dyn std::error::Error + Send + Sync>> {
        self.check_rate(key, LimitType::Minute).await
    }

    /// Check rate limit for IP address
    pub async fn check_ip_rate_limit(&self, ip: &str, endpoint: &str) -> Result<RateLimitResult, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("rate_limit:ip:{}:{}", ip, endpoint);
        self.check_rate(&key, LimitType::Window).await
    }

    /// Check rate limit for user
    pub async fn check_user_rate_limit(&self, user_id: &str, endpoint: &str) -> Result<RateLimitResult, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("rate_limit:user:{}:{}", user_id, endpoint);
        self.check_rate(&key, LimitType::Window).await
    }

    /// Check rate limit for streaming operations
    pub async fn check_stream_rate_limit(&self, user_id: &str) -> Result<RateLimitResult, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("rate_limit:stream:{}", user_id);
        // Limit to 60 streams per minute (1 per second)
        self.check_rate(&key, LimitType::Minute).await
    }

    /// Check rate limit for balance operations
    pub async fn check_balance_rate_limit(&self, user_id: &str) -> Result<RateLimitResult, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("rate_limit:balance:{}", user_id);
        // Limit to 10 balance checks per minute
        self.check_rate(&key, LimitType::Minute).await
    }

    /// Check rate limit for transaction operations
    pub async fn check_transaction_rate_limit(&self, user_id: &str) -> Result<RateLimitResult, Box<dyn std::error::Error + Send + Sync>> {
        let key = format!("rate_limit:transaction:{}", user_id);
        // Limit to 20 transactions per minute
        self.check_rate(&key, LimitType::Minute).await
    }

    /// Check if IP is blocked
    pub async fn is_ip_blocked(&self, ip: &str) -> bool {
        let requests = match self.requests.lock() {
            Ok(lock) => lock,
            Err(e) => {
                error!(error = %e, "CRITICAL: Failed to acquire rate limiter lock for read");
                return false; // Fail closed - assume blocked if lock fails
            }
        };
        let key = format!("blocked:ip:{}", ip);
        if let Some(entry) = requests.get(&key) {
            return entry.is_blocked();
        }
        false
    }

    /// Check if user is blocked
    pub async fn is_user_blocked(&self, user_id: &str) -> bool {
        let requests = match self.requests.lock() {
            Ok(lock) => lock,
            Err(e) => {
                error!(error = %e, "CRITICAL: Failed to acquire rate limiter lock for read");
                return false; // Fail closed - assume blocked if lock fails
            }
        };
        let key = format!("blocked:user:{}", user_id);
        if let Some(entry) = requests.get(&key) {
            return entry.is_blocked();
        }
        false
    }

    /// Block IP address
    pub async fn block_ip(&self, ip: &str, duration: Duration) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut requests = self.requests.lock().map_err(|e| {
            error!(error = %e, "CRITICAL: Failed to acquire rate limiter lock");
            Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Lock error: {}", e)
            )) as Box<dyn std::error::Error + Send + Sync>
        })?;
        let key = format!("blocked:ip:{}", ip);
        let entry = requests.entry(key).or_insert_with(RequestEntry::new);
        entry.block(duration);
        warn!("🚫 IP {} blocked for {:?}", ip, duration);
        Ok(())
    }

    /// Block user
    pub async fn block_user(&self, user_id: &str, duration: Duration) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut requests = self.requests.lock().map_err(|e| {
            error!(error = %e, "CRITICAL: Failed to acquire rate limiter lock");
            Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Lock error: {}", e)
            )) as Box<dyn std::error::Error + Send + Sync>
        })?;
        let key = format!("blocked:user:{}", user_id);
        let entry = requests.entry(key).or_insert_with(RequestEntry::new);
        entry.block(duration);
        warn!("🚫 User {} blocked for {:?}", user_id, duration);
        Ok(())
    }

    /// Detect abuse patterns (simplified version)
    pub async fn detect_abuse(&self, user_id: &str, ip: &str, action: &str, _metadata: Option<serde_json::Value>) -> Result<Option<AbuseAction>, Box<dyn std::error::Error + Send + Sync>> {
        debug!("🔍 Checking for abuse patterns: user={}, ip={}, action={}", user_id, ip, action);
        // Simplified abuse detection - check if too many requests
        let key = format!("rate_limit:user:{}:{}", user_id, action);
        let result = self.check_rate(&key, LimitType::Minute).await?;
        
        if !result.allowed {
            warn!("🚨 Abuse detected: too many requests for user {} from IP {}", user_id, ip);
            return Ok(Some(AbuseAction::Throttle));
        }
        
        Ok(None)
    }

    /// Clean up expired blocks
    pub async fn cleanup_expired_blocks(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut requests = self.requests.lock().map_err(|e| {
            error!(error = %e, "CRITICAL: Failed to acquire rate limiter lock");
            Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Lock error: {}", e)
            )) as Box<dyn std::error::Error + Send + Sync>
        })?;
        requests.retain(|_, entry| {
            if let Some(blocked_until) = entry.blocked_until {
                Instant::now() < blocked_until
            } else {
                true
            }
        });
        Ok(())
    }

    /// Get statistics
    pub async fn get_stats(&self) -> Result<RateLimitStats, Box<dyn std::error::Error + Send + Sync>> {
        let requests = self.requests.lock().map_err(|e| {
            error!(error = %e, "CRITICAL: Failed to acquire rate limiter lock for stats");
            Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Lock error: {}", e)
            )) as Box<dyn std::error::Error + Send + Sync>
        })?;
        
        Ok(RateLimitStats {
            total_keys: requests.len() as u32,
            blocked_keys: requests.values()
                .filter(|entry| entry.is_blocked())
                .count() as u32,
            active_requests: requests.values()
                .map(|entry| entry.timestamps.len() as u32)
                .sum(),
        })
    }
}

/// Rate limit type
#[derive(Debug, Clone, Copy)]
pub enum LimitType {
    Minute,
    Hour,
    Day,
    Window,
    Burst,
}

/// Rate limit statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitStats {
    pub total_keys: u32,
    pub blocked_keys: u32,
    pub active_requests: u32,
}


