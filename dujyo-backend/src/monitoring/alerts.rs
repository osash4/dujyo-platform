//! Alert System for Dujyo
//! 
//! Provides alerting capabilities with Discord and Telegram webhooks

use crate::monitoring::metrics_collector::MetricsCollector;
use std::sync::Arc;
use std::collections::HashMap;
use serde_json::json;
use serde::{Serialize, Deserialize};
use tracing::{warn, error};
use tokio::sync::RwLock;
use uuid::Uuid;

// ===========================================
// ALERT TYPES
// ===========================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AlertType {
    Error,
    Performance,
    Security,
    Business,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AlertSeverity {
    Critical,
    High,
    Medium,
    Low,
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: String,
    pub alert_type: AlertType,
    pub title: String,
    pub message: String,
    pub severity: AlertSeverity,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub acknowledged: bool,
    pub resolved: bool,
    pub service: String,
    pub metadata: HashMap<String, serde_json::Value>,
}

pub struct AlertManager {
    alerts: Arc<RwLock<Vec<Alert>>>,
    config: InternalAlertConfig,
}

#[derive(Debug, Clone)]
struct InternalAlertConfig {
    pub enable_email_alerts: bool,
    pub enable_slack_alerts: bool,
    pub enable_webhook_alerts: bool,
    pub email_recipients: Vec<String>,
    pub slack_webhook_url: Option<String>,
    pub webhook_urls: Vec<String>,
    pub critical_threshold: u64,
    pub high_threshold: u64,
}

impl Default for InternalAlertConfig {
    fn default() -> Self {
        Self {
            enable_email_alerts: true,
            enable_slack_alerts: false,
            enable_webhook_alerts: false,
            email_recipients: vec![],
            slack_webhook_url: None,
            webhook_urls: vec![],
            critical_threshold: 10,
            high_threshold: 50,
        }
    }
}

impl AlertManager {
    pub fn new() -> Self {
        Self {
            alerts: Arc::new(RwLock::new(Vec::new())),
            config: InternalAlertConfig::default(),
        }
    }

    pub async fn create_alert(
        &self,
        alert_type: AlertType,
        title: String,
        message: String,
        severity: AlertSeverity,
        service: String,
        metadata: HashMap<String, serde_json::Value>,
    ) -> String {
        let alert_id = Uuid::new_v4().to_string();
        
        let alert = Alert {
            id: alert_id.clone(),
            alert_type,
            title,
            message,
            severity,
            timestamp: chrono::Utc::now(),
            acknowledged: false,
            resolved: false,
            service,
            metadata,
        };

        let mut alerts = self.alerts.write().await;
        alerts.push(alert);

        alert_id
    }
}

// ===========================================
// ALERT CONFIGURATION
// ===========================================

#[derive(Debug, Clone)]
pub struct AlertConfig {
    pub discord_webhook: Option<String>,
    pub telegram_bot_token: Option<String>,
    pub telegram_chat_id: Option<String>,
    pub enable_discord: bool,
    pub enable_telegram: bool,
    pub error_rate_threshold: f64,      // Default: 5.0%
    pub db_connection_threshold: f64,   // Default: 80.0%
    pub memory_threshold: f64,           // Default: 90.0%
    pub health_check_failures: u32,      // Default: 3
}

impl Default for AlertConfig {
    fn default() -> Self {
        Self {
            discord_webhook: std::env::var("ALERT_WEBHOOK_DISCORD").ok(),
            telegram_bot_token: std::env::var("TELEGRAM_BOT_TOKEN").ok(),
            telegram_chat_id: std::env::var("TELEGRAM_CHAT_ID").ok(),
            enable_discord: std::env::var("ENABLE_DISCORD_ALERTS")
                .unwrap_or_else(|_| "false".to_string())
                .parse()
                .unwrap_or(false),
            enable_telegram: std::env::var("ENABLE_TELEGRAM_ALERTS")
                .unwrap_or_else(|_| "false".to_string())
                .parse()
                .unwrap_or(false),
            error_rate_threshold: std::env::var("ALERT_ERROR_RATE_THRESHOLD")
                .unwrap_or_else(|_| "5.0".to_string())
                .parse()
                .unwrap_or(5.0),
            db_connection_threshold: std::env::var("ALERT_DB_CONNECTION_THRESHOLD")
                .unwrap_or_else(|_| "80.0".to_string())
                .parse()
                .unwrap_or(80.0),
            memory_threshold: std::env::var("ALERT_MEMORY_THRESHOLD")
                .unwrap_or_else(|_| "90.0".to_string())
                .parse()
                .unwrap_or(90.0),
            health_check_failures: std::env::var("ALERT_HEALTH_CHECK_FAILURES")
                .unwrap_or_else(|_| "3".to_string())
                .parse()
                .unwrap_or(3),
        }
    }
}

// ===========================================
// ALERT CHECKER
// ===========================================

pub struct AlertChecker {
    config: AlertConfig,
    alert_manager: Arc<AlertManager>,
    health_check_failure_count: Arc<tokio::sync::RwLock<u32>>,
}

impl AlertChecker {
    pub fn new(config: AlertConfig) -> Self {
        Self {
            config,
            alert_manager: Arc::new(AlertManager::new()),
            health_check_failure_count: Arc::new(tokio::sync::RwLock::new(0)),
        }
    }

    /// Check critical alerts based on current metrics
    pub async fn check_critical_alerts(&self, metrics: &MetricsCollector) -> Vec<String> {
        let current_metrics = metrics.get_current_metrics().await;
        let mut alert_ids = Vec::new();

        // Check error rate
        if current_metrics.error_rate > self.config.error_rate_threshold {
            let alert_id = self.alert_manager.create_alert(
                AlertType::Error,
                format!("High Error Rate: {:.2}%", current_metrics.error_rate),
                format!(
                    "Error rate ({:.2}%) exceeds threshold ({:.2}%). System may be experiencing issues.",
                    current_metrics.error_rate,
                    self.config.error_rate_threshold
                ),
                AlertSeverity::Critical,
                "dujyo-backend".to_string(),
                {
                    let mut meta = HashMap::new();
                    meta.insert("error_rate".to_string(), json!(current_metrics.error_rate));
                    meta.insert("threshold".to_string(), json!(self.config.error_rate_threshold));
                    meta
                },
            ).await;
            alert_ids.push(alert_id.clone());
            self.send_discord_alert(&format!(
                "🚨 **CRITICAL ALERT**: High Error Rate\n\nError Rate: {:.2}%\nThreshold: {:.2}%\n\nSystem may be experiencing issues.",
                current_metrics.error_rate,
                self.config.error_rate_threshold
            )).await;
            self.send_telegram_alert(&format!(
                "🚨 CRITICAL ALERT: High Error Rate\n\nError Rate: {:.2}%\nThreshold: {:.2}%\n\nSystem may be experiencing issues.",
                current_metrics.error_rate,
                self.config.error_rate_threshold
            )).await;
        }

        // Check database connection pool
        // Assuming max connections is 100 (adjust based on your config)
        let db_usage_percent = (current_metrics.database_connections as f64 / 100.0) * 100.0;
        if db_usage_percent > self.config.db_connection_threshold {
            let alert_id = self.alert_manager.create_alert(
                AlertType::Performance,
                format!("High Database Connection Usage: {:.2}%", db_usage_percent),
                format!(
                    "Database connection pool usage ({:.2}%) exceeds threshold ({:.2}%). Consider scaling database connections.",
                    db_usage_percent,
                    self.config.db_connection_threshold
                ),
                AlertSeverity::High,
                "dujyo-backend".to_string(),
                {
                    let mut meta = HashMap::new();
                    meta.insert("db_usage".to_string(), json!(db_usage_percent));
                    meta.insert("connections".to_string(), json!(current_metrics.database_connections));
                    meta.insert("threshold".to_string(), json!(self.config.db_connection_threshold));
                    meta
                },
            ).await;
            alert_ids.push(alert_id.clone());
            self.send_discord_alert(&format!(
                "⚠️ **HIGH ALERT**: Database Connection Pool High\n\nUsage: {:.2}%\nConnections: {}\nThreshold: {:.2}%\n\nConsider scaling database connections.",
                db_usage_percent,
                current_metrics.database_connections,
                self.config.db_connection_threshold
            )).await;
        }

        // Check memory usage
        if current_metrics.memory_usage > self.config.memory_threshold {
            let alert_id = self.alert_manager.create_alert(
                AlertType::System,
                format!("High Memory Usage: {:.2}%", current_metrics.memory_usage),
                format!(
                    "Memory usage ({:.2}%) exceeds threshold ({:.2}%). System may need more resources.",
                    current_metrics.memory_usage,
                    self.config.memory_threshold
                ),
                AlertSeverity::High,
                "dujyo-backend".to_string(),
                {
                    let mut meta = HashMap::new();
                    meta.insert("memory_usage".to_string(), json!(current_metrics.memory_usage));
                    meta.insert("threshold".to_string(), json!(self.config.memory_threshold));
                    meta
                },
            ).await;
            alert_ids.push(alert_id.clone());
            self.send_discord_alert(&format!(
                "⚠️ **HIGH ALERT**: High Memory Usage\n\nMemory: {:.2}%\nThreshold: {:.2}%\n\nSystem may need more resources.",
                current_metrics.memory_usage,
                self.config.memory_threshold
            )).await;
        }

        alert_ids
    }

    /// Record health check failure
    pub async fn record_health_check_failure(&self) {
        let mut count = self.health_check_failure_count.write().await;
        *count += 1;

        if *count >= self.config.health_check_failures {
            let alert_id = self.alert_manager.create_alert(
                AlertType::System,
                format!("Health Check Failures: {} consecutive", *count),
                format!(
                    "Health check has failed {} consecutive times. System may be down or experiencing critical issues.",
                    *count
                ),
                AlertSeverity::Critical,
                "dujyo-backend".to_string(),
                {
                    let mut meta = HashMap::new();
                    meta.insert("failure_count".to_string(), json!(*count));
                    meta
                },
            ).await;
            
            self.send_discord_alert(&format!(
                "🚨 **CRITICAL ALERT**: Health Check Failures\n\nConsecutive failures: {}\nThreshold: {}\n\nSystem may be down or experiencing critical issues.",
                *count,
                self.config.health_check_failures
            )).await;
            
            self.send_telegram_alert(&format!(
                "🚨 CRITICAL ALERT: Health Check Failures\n\nConsecutive failures: {}\nThreshold: {}\n\nSystem may be down or experiencing critical issues.",
                *count,
                self.config.health_check_failures
            )).await;
        }
    }

    /// Reset health check failure count
    pub async fn reset_health_check_failures(&self) {
        let mut count = self.health_check_failure_count.write().await;
        *count = 0;
    }

    // ===========================================
    // NOTIFICATION METHODS
    // ===========================================

    async fn send_discord_alert(&self, message: &str) {
        if !self.config.enable_discord {
            return;
        }

        if let Some(webhook_url) = &self.config.discord_webhook {
            let client = reqwest::Client::new();
            let payload = json!({
                "content": message,
                "username": "Dujyo Alerts"
            });

            match client.post(webhook_url).json(&payload).send().await {
                Ok(response) => {
                    if response.status().is_success() {
                        tracing::info!("Discord alert sent successfully");
                    } else {
                        warn!("Failed to send Discord alert: {}", response.status());
                    }
                }
                Err(e) => {
                    error!("Error sending Discord alert: {}", e);
                }
            }
        }
    }

    async fn send_telegram_alert(&self, message: &str) {
        if !self.config.enable_telegram {
            return;
        }

        if let (Some(bot_token), Some(chat_id)) = (&self.config.telegram_bot_token, &self.config.telegram_chat_id) {
            let client = reqwest::Client::new();
            let url = format!("https://api.telegram.org/bot{}/sendMessage", bot_token);
            let payload = json!({
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "Markdown"
            });

            match client.post(&url).json(&payload).send().await {
                Ok(response) => {
                    if response.status().is_success() {
                        tracing::info!("Telegram alert sent successfully");
                    } else {
                        warn!("Failed to send Telegram alert: {}", response.status());
                    }
                }
                Err(e) => {
                    error!("Error sending Telegram alert: {}", e);
                }
            }
        }
    }
}

