//! Content Verification System for Dujyo
//! 
//! This module provides comprehensive content verification and anti-farming:
//! - Stream duration verification (minimum 30 seconds)
//! - Fake farming detection using ML patterns
//! - Daily limits per user (1000 streams/day)
//! - Anomaly detection for suspicious behavior
//! - Integration with streaming service

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error, debug};
use sqlx::{PgPool, Row};
use chrono::{DateTime, Utc, Timelike};

/// Content verification configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentVerificationConfig {
    pub min_stream_duration: Duration,
    pub max_streams_per_day: u32,
    pub max_streams_per_hour: u32,
    pub max_streams_per_minute: u32,
    pub anomaly_threshold: f64,
    pub farming_detection_enabled: bool,
    pub ml_model_path: Option<String>,
}

impl Default for ContentVerificationConfig {
    fn default() -> Self {
        Self {
            min_stream_duration: Duration::from_secs(30), // 30 seconds minimum
            max_streams_per_day: 1000,
            max_streams_per_hour: 100,
            max_streams_per_minute: 10,
            anomaly_threshold: 0.8, // 80% confidence threshold
            farming_detection_enabled: true,
            ml_model_path: None,
        }
    }
}

/// Stream verification result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamVerificationResult {
    pub is_valid: bool,
    pub confidence_score: f64,
    pub violations: Vec<ViolationType>,
    pub recommendations: Vec<String>,
    pub metadata: StreamMetadata,
}

/// Types of violations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ViolationType {
    DurationTooShort,
    TooManyStreams,
    SuspiciousPattern,
    FakeContent,
    DuplicateContent,
    BotBehavior,
    UnusualTiming,
    GeographicAnomaly,
}

/// Stream metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamMetadata {
    pub user_id: String,
    pub content_id: String,
    pub duration: Duration,
    pub timestamp: DateTime<Utc>,
    pub ip_address: String,
    pub user_agent: String,
    pub geographic_location: Option<String>,
    pub device_fingerprint: Option<String>,
    pub content_type: ContentType,
    pub quality_metrics: QualityMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ContentType {
    Music,
    Video,
    Gaming,
    Education,
    Live,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityMetrics {
    pub bitrate: Option<u32>,
    pub resolution: Option<String>,
    pub audio_quality: Option<f64>,
    pub video_quality: Option<f64>,
    pub engagement_score: Option<f64>,
}

/// User streaming statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserStreamStats {
    pub user_id: String,
    pub streams_today: u32,
    pub streams_this_hour: u32,
    pub streams_this_minute: u32,
    pub total_duration_today: Duration,
    pub average_duration: Duration,
    pub last_stream_time: Option<DateTime<Utc>>,
    pub suspicious_activity_count: u32,
    pub is_flagged: bool,
}

/// Content verification service
pub struct ContentVerifier {
    db_pool: PgPool,
    config: ContentVerificationConfig,
    user_stats: Arc<RwLock<HashMap<String, UserStreamStats>>>,
    ml_model: Option<MLModel>,
}

/// Simple ML model for anomaly detection
struct MLModel {
    weights: Vec<f64>,
    bias: f64,
    features: Vec<String>,
}

impl MLModel {
    fn new() -> Self {
        // Simple linear model for demonstration
        // In production, this would load a trained model
        Self {
            weights: vec![0.1, 0.2, 0.15, 0.25, 0.3], // 5 features
            bias: 0.5,
            features: vec![
                "duration_score".to_string(),
                "frequency_score".to_string(),
                "pattern_score".to_string(),
                "quality_score".to_string(),
                "engagement_score".to_string(),
            ],
        }
    }

    fn predict(&self, features: &[f64]) -> f64 {
        if features.len() != self.weights.len() {
            return 0.5; // Default neutral score
        }

        let mut score = self.bias;
        for (weight, feature) in self.weights.iter().zip(features.iter()) {
            score += weight * feature;
        }

        // Sigmoid activation
        1.0 / (1.0 + (-score).exp())
    }
}

impl ContentVerifier {
    /// Create new content verifier
    pub async fn new(db_pool: PgPool, config: ContentVerificationConfig) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        info!("🔍 Initializing content verification system");

        let ml_model = if config.farming_detection_enabled {
            Some(MLModel::new())
        } else {
            None
        };

        let verifier = Self {
            db_pool,
            config,
            user_stats: Arc::new(RwLock::new(HashMap::new())),
            ml_model,
        };

        // Initialize user stats from database
        verifier.load_user_stats().await?;

        Ok(verifier)
    }

    /// Verify a stream
    pub async fn verify_stream(&self, metadata: StreamMetadata) -> Result<StreamVerificationResult, Box<dyn std::error::Error + Send + Sync>> {
        debug!("🔍 Verifying stream for user {}: duration={:?}", metadata.user_id, metadata.duration);

        let mut violations = Vec::new();
        let mut recommendations = Vec::new();
        let mut confidence_score = 1.0;

        // Check minimum duration
        if metadata.duration < self.config.min_stream_duration {
            violations.push(ViolationType::DurationTooShort);
            confidence_score -= 0.3;
            recommendations.push(format!(
                "Stream duration {}s is below minimum {}s",
                metadata.duration.as_secs(),
                self.config.min_stream_duration.as_secs()
            ));
        }

        // Check user limits
        let user_stats = self.get_user_stats(&metadata.user_id).await?;
        
        if user_stats.streams_today >= self.config.max_streams_per_day {
            violations.push(ViolationType::TooManyStreams);
            confidence_score -= 0.4;
            recommendations.push(format!(
                "Daily limit exceeded: {}/{} streams",
                user_stats.streams_today,
                self.config.max_streams_per_day
            ));
        }

        if user_stats.streams_this_hour >= self.config.max_streams_per_hour {
            violations.push(ViolationType::TooManyStreams);
            confidence_score -= 0.2;
            recommendations.push(format!(
                "Hourly limit exceeded: {}/{} streams",
                user_stats.streams_this_hour,
                self.config.max_streams_per_hour
            ));
        }

        if user_stats.streams_this_minute >= self.config.max_streams_per_minute {
            violations.push(ViolationType::TooManyStreams);
            confidence_score -= 0.1;
            recommendations.push(format!(
                "Minute limit exceeded: {}/{} streams",
                user_stats.streams_this_minute,
                self.config.max_streams_per_minute
            ));
        }

        // Check for suspicious patterns
        if let Some(suspicious_score) = self.detect_suspicious_patterns(&metadata, &user_stats).await? {
            if suspicious_score > self.config.anomaly_threshold {
                violations.push(ViolationType::SuspiciousPattern);
                confidence_score -= suspicious_score * 0.5;
                recommendations.push("Suspicious streaming pattern detected".to_string());
            }
        }

        // Check for bot behavior
        if self.detect_bot_behavior(&metadata).await? {
            violations.push(ViolationType::BotBehavior);
            confidence_score -= 0.6;
            recommendations.push("Bot-like behavior detected".to_string());
        }

        // Check for duplicate content
        if self.detect_duplicate_content(&metadata).await? {
            violations.push(ViolationType::DuplicateContent);
            confidence_score -= 0.3;
            recommendations.push("Duplicate content detected".to_string());
        }

        // Check geographic anomalies
        if self.detect_geographic_anomaly(&metadata).await? {
            violations.push(ViolationType::GeographicAnomaly);
            confidence_score -= 0.2;
            recommendations.push("Unusual geographic location detected".to_string());
        }

        // ML-based farming detection
        if let Some(ml_score) = self.detect_farming_with_ml(&metadata, &user_stats).await? {
            if ml_score > self.config.anomaly_threshold {
                violations.push(ViolationType::FakeContent);
                confidence_score -= ml_score * 0.4;
                recommendations.push("ML model detected potential farming".to_string());
            }
        }

        // Ensure confidence score is between 0 and 1
        confidence_score = confidence_score.max(0.0).min(1.0);

        let is_valid = violations.is_empty() && confidence_score > 0.5;

        let result = StreamVerificationResult {
            is_valid,
            confidence_score,
            violations,
            recommendations,
            metadata: metadata.clone(),
        };

        // Update user stats if stream is valid
        if is_valid {
            self.update_user_stats(&metadata).await?;
            self.record_stream(&metadata).await?;
        }

        info!("✅ Stream verification completed: valid={}, confidence={:.2}", is_valid, confidence_score);
        Ok(result)
    }

    /// Get user streaming statistics
    async fn get_user_stats(&self, user_id: &str) -> Result<UserStreamStats, Box<dyn std::error::Error + Send + Sync>> {
        // Check cache first
        {
            let stats = self.user_stats.read().await;
            if let Some(cached_stats) = stats.get(user_id) {
                return Ok(cached_stats.clone());
            }
        }

        // Load from database
        let now = Utc::now();
        let today_start = now.date_naive().and_hms_opt(0, 0, 0)
            .ok_or_else(|| {
                tracing::error!("CRITICAL: Invalid date/time in content verifier");
                Box::new(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "Invalid date/time"
                )) as Box<dyn std::error::Error + Send + Sync>
            })?;
        let time = now.time();
        // Use chrono's Timelike trait methods
        let current_hour = time.hour();
        let current_minute = time.minute();
        let hour_start = now.date_naive().and_hms_opt(current_hour, 0, 0)
            .ok_or_else(|| {
                tracing::error!("CRITICAL: Invalid hour start time in content verifier");
                Box::new(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "Invalid hour start time"
                )) as Box<dyn std::error::Error + Send + Sync>
            })?;
        let minute_start = now.date_naive().and_hms_opt(current_hour, current_minute, 0)
            .ok_or_else(|| {
                tracing::error!("CRITICAL: Invalid minute start time in content verifier");
                Box::new(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "Invalid minute start time"
                )) as Box<dyn std::error::Error + Send + Sync>
            })?;

        // Try to load from database, fallback to default stats if table doesn't exist
        // Use query() with unchecked to avoid compile-time verification
        let stats = match sqlx::query(
            r#"
            SELECT 
                $1::text as user_id,
                COALESCE(COUNT(CASE WHEN created_at >= $2 THEN 1 END), 0)::integer as streams_today,
                COALESCE(COUNT(CASE WHEN created_at >= $3 THEN 1 END), 0)::integer as streams_this_hour,
                COALESCE(COUNT(CASE WHEN created_at >= $4 THEN 1 END), 0)::integer as streams_this_minute,
                COALESCE(SUM(CASE WHEN created_at >= $2 THEN duration_seconds END), 0)::bigint as total_duration_today,
                COALESCE(AVG(duration_seconds), 0)::bigint as average_duration,
                MAX(created_at) as last_stream_time,
                COALESCE(SUM(CASE WHEN is_suspicious THEN 1 ELSE 0 END), 0)::integer as suspicious_activity_count,
                COALESCE(MAX(is_flagged), false)::boolean as is_flagged
            FROM stream_verifications 
            WHERE user_id = $1
            "#
        )
        .bind(user_id)
        .bind(today_start)
        .bind(hour_start)
        .bind(minute_start)
        .map(|row: sqlx::postgres::PgRow| {
            UserStreamStats {
                user_id: row.get::<String, _>("user_id"),
                streams_today: row.get::<i32, _>("streams_today") as u32,
                streams_this_hour: row.get::<i32, _>("streams_this_hour") as u32,
                streams_this_minute: row.get::<i32, _>("streams_this_minute") as u32,
                total_duration_today: Duration::from_secs(row.get::<i64, _>("total_duration_today") as u64),
                average_duration: Duration::from_secs(row.get::<i64, _>("average_duration") as u64),
                last_stream_time: row.get::<Option<DateTime<Utc>>, _>("last_stream_time"),
                suspicious_activity_count: row.get::<i32, _>("suspicious_activity_count") as u32,
                is_flagged: row.get::<bool, _>("is_flagged"),
            }
        })
        .fetch_optional(&self.db_pool)
        .await
        {
            Ok(Some(stats)) => stats,
            Ok(None) | Err(_) => {
                // Table doesn't exist or query failed - return default stats
                debug!("stream_verifications table not available, using default stats");
                UserStreamStats {
                    user_id: user_id.to_string(),
                    streams_today: 0,
                    streams_this_hour: 0,
                    streams_this_minute: 0,
                    total_duration_today: Duration::from_secs(0),
                    average_duration: Duration::from_secs(0),
                    last_stream_time: None,
                    suspicious_activity_count: 0,
                    is_flagged: false,
                }
            }
        };

        // Cache the stats
        {
            let mut user_stats = self.user_stats.write().await;
            user_stats.insert(user_id.to_string(), stats.clone());
        }

        Ok(stats)
    }

    /// Update user statistics
    async fn update_user_stats(&self, metadata: &StreamMetadata) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut user_stats = self.user_stats.write().await;
        
        if let Some(stats) = user_stats.get_mut(&metadata.user_id) {
            stats.streams_today += 1;
            stats.streams_this_hour += 1;
            stats.streams_this_minute += 1;
            stats.total_duration_today += metadata.duration;
            stats.last_stream_time = Some(metadata.timestamp);
            
            // Update average duration
            let total_streams = stats.streams_today;
            let total_duration = stats.total_duration_today.as_secs() as f64;
            stats.average_duration = Duration::from_secs((total_duration / total_streams as f64) as u64);
        }

        Ok(())
    }

    /// Record verified stream in database
    async fn record_stream(&self, metadata: &StreamMetadata) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Try to insert, but don't fail if table doesn't exist
        // Use query() instead of query! to avoid compile-time verification
        if let Err(e) = sqlx::query(
            r#"
            INSERT INTO stream_verifications (
                user_id, content_id, duration_seconds, created_at, 
                ip_address, user_agent, content_type, is_verified
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#
        )
        .bind(&metadata.user_id)
        .bind(&metadata.content_id)
        .bind(metadata.duration.as_secs() as i64)
        .bind(metadata.timestamp)
        .bind(&metadata.ip_address)
        .bind(&metadata.user_agent)
        .bind(format!("{:?}", metadata.content_type))
        .bind(true)
        .execute(&self.db_pool)
        .await
        {
            // Table doesn't exist - log and continue
            debug!("Failed to record stream in database (table may not exist): {}", e);
        }

        Ok(())
    }

    /// Detect suspicious patterns
    async fn detect_suspicious_patterns(&self, metadata: &StreamMetadata, user_stats: &UserStreamStats) -> Result<Option<f64>, Box<dyn std::error::Error + Send + Sync>> {
        let mut suspicious_score = 0.0;

        // Check for rapid successive streams
        if let Some(last_stream) = user_stats.last_stream_time {
            let time_diff = metadata.timestamp.signed_duration_since(last_stream);
            if time_diff.num_seconds() < 5 {
                suspicious_score += 0.3; // Very rapid streams
            } else if time_diff.num_seconds() < 30 {
                suspicious_score += 0.1; // Rapid streams
            }
        }

        // Check for unusual timing patterns
        let hour = metadata.timestamp.time().hour();
        if hour >= 2 && hour <= 6 {
            suspicious_score += 0.2; // Late night streaming
        }

        // Check for consistent duration patterns (potential bot)
        if user_stats.streams_today > 10 {
            let duration_diff = (metadata.duration.as_secs() as f64 - user_stats.average_duration.as_secs() as f64).abs();
            let avg_duration = user_stats.average_duration.as_secs() as f64;
            if avg_duration > 0.0 && duration_diff / avg_duration < 0.05 {
                suspicious_score += 0.4; // Very consistent durations
            }
        }

        // Check for high frequency streaming
        if user_stats.streams_this_hour > 50 {
            suspicious_score += 0.3;
        }

        Ok(if suspicious_score > 0.0 { Some(suspicious_score) } else { None })
    }

    /// Detect bot behavior
    async fn detect_bot_behavior(&self, metadata: &StreamMetadata) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        // Check for suspicious user agent
        let user_agent = metadata.user_agent.to_lowercase();
        let bot_indicators = vec![
            "bot", "crawler", "spider", "scraper", "automated", "headless",
            "phantom", "selenium", "puppeteer", "playwright"
        ];

        for indicator in bot_indicators {
            if user_agent.contains(indicator) {
                return Ok(true);
            }
        }

        // Check for missing or suspicious device fingerprint
        if metadata.device_fingerprint.is_none() {
            return Ok(true);
        }

        // Check for suspicious IP patterns (same IP, many users)
        let ip_count: i64 = match sqlx::query(
            "SELECT COUNT(DISTINCT user_id)::bigint as count FROM stream_verifications WHERE ip_address = $1 AND created_at > NOW() - INTERVAL '1 hour'"
        )
        .bind(&metadata.ip_address)
        .map(|row: sqlx::postgres::PgRow| row.get::<i64, _>("count"))
        .fetch_optional(&self.db_pool)
        .await
        {
            Ok(Some(count)) => count,
            Ok(None) | Err(_) => {
                // Table doesn't exist - return false (no bot detected)
                debug!("stream_verifications table not available for IP check");
                0
            }
        };

        if ip_count > 10 {
            return Ok(true);
        }

        Ok(false)
    }

    /// Detect duplicate content
    async fn detect_duplicate_content(&self, metadata: &StreamMetadata) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        // Check for same content streamed multiple times by same user
        let duplicate_count: i64 = match sqlx::query(
            "SELECT COUNT(*)::bigint as count FROM stream_verifications WHERE user_id = $1 AND content_id = $2 AND created_at > NOW() - INTERVAL '1 hour'"
        )
        .bind(&metadata.user_id)
        .bind(&metadata.content_id)
        .map(|row: sqlx::postgres::PgRow| row.get::<i64, _>("count"))
        .fetch_optional(&self.db_pool)
        .await
        {
            Ok(Some(count)) => count,
            Ok(None) | Err(_) => {
                // Table doesn't exist - return false (no duplicates detected)
                debug!("stream_verifications table not available for duplicate check");
                0
            }
        };

        Ok(duplicate_count > 5)
    }

    /// Detect geographic anomalies
    async fn detect_geographic_anomaly(&self, metadata: &StreamMetadata) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        // Check for rapid geographic changes
        if let Some(_location) = &metadata.geographic_location {
            let recent_locations: Vec<String> = match sqlx::query(
                "SELECT DISTINCT geographic_location FROM stream_verifications WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour' AND geographic_location IS NOT NULL"
            )
            .bind(&metadata.user_id)
            .map(|row: sqlx::postgres::PgRow| row.get::<String, _>("geographic_location"))
            .fetch_all(&self.db_pool)
            .await
            {
                Ok(locations) => locations,
                Err(_) => {
                    // Table doesn't exist - return false (no anomaly detected)
                    debug!("stream_verifications table not available for geographic check");
                    Vec::new()
                }
            };

            if recent_locations.len() > 3 {
                return Ok(true); // Too many different locations in short time
            }
        }

        Ok(false)
    }

    /// Detect farming using ML model
    async fn detect_farming_with_ml(&self, metadata: &StreamMetadata, user_stats: &UserStreamStats) -> Result<Option<f64>, Box<dyn std::error::Error + Send + Sync>> {
        if let Some(ref model) = self.ml_model {
            // Extract features
            let duration_score = (metadata.duration.as_secs() as f64 / 3600.0).min(1.0); // Normalize to 0-1
            let frequency_score = (user_stats.streams_this_hour as f64 / 100.0).min(1.0); // Normalize to 0-1
            let pattern_score = if user_stats.suspicious_activity_count > 0 { 0.8 } else { 0.2 };
            let quality_score = metadata.quality_metrics.audio_quality.unwrap_or(0.5);
            let engagement_score = metadata.quality_metrics.engagement_score.unwrap_or(0.5);

            let features = vec![duration_score, frequency_score, pattern_score, quality_score, engagement_score];
            let ml_score = model.predict(&features);

            Ok(Some(ml_score))
        } else {
            Ok(None)
        }
    }

    /// Load user statistics from database (optional - doesn't fail if table doesn't exist)
    async fn load_user_stats(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Try to load from database, but don't fail if table doesn't exist
        // Use query() instead of query_as! to avoid compile-time verification
        match sqlx::query(
            r#"
            SELECT 
                user_id,
                COUNT(*)::integer as streams_today,
                0::integer as streams_this_hour,
                0::integer as streams_this_minute,
                COALESCE(SUM(duration_seconds), 0)::bigint as total_duration_today,
                COALESCE(AVG(duration_seconds), 0)::bigint as average_duration,
                MAX(created_at) as last_stream_time,
                COALESCE(SUM(CASE WHEN is_suspicious THEN 1 ELSE 0 END), 0)::integer as suspicious_activity_count,
                COALESCE(MAX(is_flagged), false)::boolean as is_flagged
            FROM stream_verifications 
            WHERE created_at >= CURRENT_DATE
            GROUP BY user_id
            "#
        )
        .map(|row: sqlx::postgres::PgRow| {
            UserStreamStats {
                user_id: row.get::<String, _>("user_id"),
                streams_today: row.get::<i32, _>("streams_today") as u32,
                streams_this_hour: row.get::<i32, _>("streams_this_hour") as u32,
                streams_this_minute: row.get::<i32, _>("streams_this_minute") as u32,
                total_duration_today: Duration::from_secs(row.get::<i64, _>("total_duration_today") as u64),
                average_duration: Duration::from_secs(row.get::<i64, _>("average_duration") as u64),
                last_stream_time: row.get::<Option<DateTime<Utc>>, _>("last_stream_time"),
                suspicious_activity_count: row.get::<i32, _>("suspicious_activity_count") as u32,
                is_flagged: row.get::<bool, _>("is_flagged"),
            }
        })
        .fetch_all(&self.db_pool)
        .await
        {
            Ok(stats) => {
                let mut user_stats = self.user_stats.write().await;
                for stat in stats {
                    user_stats.insert(stat.user_id.clone(), stat);
                }
                info!("✅ Loaded {} user statistics from database", user_stats.len());
            }
            Err(e) => {
                debug!("stream_verifications table not available, starting with empty stats: {}", e);
                // Continue with empty stats - this is fine for MVP
            }
        }
        Ok(())
    }

    /// Get verification statistics
    pub async fn get_stats(&self) -> Result<ContentVerificationStats, Box<dyn std::error::Error + Send + Sync>> {
        // Try to get stats from DB, use defaults if table doesn't exist
        let total_streams: i64 = match sqlx::query(
            "SELECT COUNT(*)::bigint as count FROM stream_verifications WHERE created_at >= CURRENT_DATE"
        )
        .map(|row: sqlx::postgres::PgRow| row.get::<i64, _>("count"))
        .fetch_optional(&self.db_pool)
        .await
        {
            Ok(Some(count)) => count,
            Ok(None) | Err(_) => 0,
        };

        let verified_streams: i64 = match sqlx::query(
            "SELECT COUNT(*)::bigint as count FROM stream_verifications WHERE created_at >= CURRENT_DATE AND is_verified = true"
        )
        .map(|row: sqlx::postgres::PgRow| row.get::<i64, _>("count"))
        .fetch_optional(&self.db_pool)
        .await
        {
            Ok(Some(count)) => count,
            Ok(None) | Err(_) => 0,
        };

        let suspicious_streams: i64 = match sqlx::query(
            "SELECT COUNT(*)::bigint as count FROM stream_verifications WHERE created_at >= CURRENT_DATE AND is_suspicious = true"
        )
        .map(|row: sqlx::postgres::PgRow| row.get::<i64, _>("count"))
        .fetch_optional(&self.db_pool)
        .await
        {
            Ok(Some(count)) => count,
            Ok(None) | Err(_) => 0,
        };

        let flagged_users: i64 = match sqlx::query(
            "SELECT COUNT(DISTINCT user_id)::bigint as count FROM stream_verifications WHERE created_at >= CURRENT_DATE AND is_flagged = true"
        )
        .map(|row: sqlx::postgres::PgRow| row.get::<i64, _>("count"))
        .fetch_optional(&self.db_pool)
        .await
        {
            Ok(Some(count)) => count,
            Ok(None) | Err(_) => 0,
        };

        Ok(ContentVerificationStats {
            total_streams: total_streams as u32,
            verified_streams: verified_streams as u32,
            suspicious_streams: suspicious_streams as u32,
            flagged_users: flagged_users as u32,
            verification_rate: if total_streams > 0 { verified_streams as f64 / total_streams as f64 } else { 0.0 },
        })
    }
}

/// Content verification statistics
#[derive(Debug, Serialize, Deserialize)]
pub struct ContentVerificationStats {
    pub total_streams: u32,
    pub verified_streams: u32,
    pub suspicious_streams: u32,
    pub flagged_users: u32,
    pub verification_rate: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_verification_config_default() {
        let config = ContentVerificationConfig::default();
        assert_eq!(config.min_stream_duration.as_secs(), 30);
        assert_eq!(config.max_streams_per_day, 1000);
    }

    #[test]
    fn test_ml_model_prediction() {
        let model = MLModel::new();
        let features = vec![0.5, 0.3, 0.8, 0.6, 0.4];
        let prediction = model.predict(&features);
        assert!(prediction >= 0.0 && prediction <= 1.0);
    }
}
