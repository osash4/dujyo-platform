//! User Session Tracking and Analytics
//! 
//! Tracks user sessions, behavior, and provides analytics for user testing

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, FromRow};
use std::collections::HashMap;
use uuid::Uuid;

/// User session data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSession {
    pub id: Uuid,
    pub user_id: Option<String>,
    pub session_id: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub duration_seconds: Option<i64>,
    pub page_views: i32,
    pub events: i32,
    pub device_type: Option<String>,
    pub browser: Option<String>,
    pub os: Option<String>,
    pub referrer: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// Analytics event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsEvent {
    pub id: Uuid,
    pub session_id: String,
    pub user_id: Option<String>,
    pub event_type: String,
    pub event_name: String,
    pub page: String,
    pub timestamp: DateTime<Utc>,
    pub properties: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
}

/// Onboarding tracking data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnboardingTracking {
    pub id: Uuid,
    pub user_id: String,
    pub session_id: String,
    pub step: i32,
    pub step_name: String,
    pub completed: bool,
    pub time_spent_seconds: Option<i32>,
    pub timestamp: DateTime<Utc>,
    pub abandonment_point: Option<String>,
}

/// Feature usage tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureUsage {
    pub id: Uuid,
    pub user_id: String,
    pub feature_name: String,
    pub action: String,
    pub timestamp: DateTime<Utc>,
    pub metadata: Option<serde_json::Value>,
}

/// Abandonment point
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AbandonmentPoint {
    pub id: Uuid,
    pub user_id: Option<String>,
    pub session_id: String,
    pub page: String,
    pub reason: Option<String>,
    pub time_spent_seconds: Option<i32>,
    pub timestamp: DateTime<Utc>,
}

/// Frustration point
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FrustrationPoint {
    pub id: Uuid,
    pub user_id: Option<String>,
    pub session_id: String,
    pub page: String,
    pub element: Option<String>,
    pub action: Option<String>,
    pub timestamp: DateTime<Utc>,
}

/// User session service
pub struct UserSessionService {
    pool: PgPool,
}

impl UserSessionService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create or update user session
    pub async fn track_session(&self, session: &UserSession) -> Result<(), sqlx::Error> {
        let query = r#"
            INSERT INTO user_sessions (
                id, user_id, session_id, started_at, ended_at,
                duration_seconds, page_views, events, device_type,
                browser, os, referrer, ip_address, user_agent, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (session_id) DO UPDATE SET
                ended_at = EXCLUDED.ended_at,
                duration_seconds = EXCLUDED.duration_seconds,
                page_views = EXCLUDED.page_views,
                events = EXCLUDED.events,
                metadata = EXCLUDED.metadata
        "#;

        sqlx::query(query)
            .bind(session.id)
            .bind(&session.user_id)
            .bind(&session.session_id)
            .bind(session.started_at)
            .bind(&session.ended_at)
            .bind(&session.duration_seconds)
            .bind(session.page_views)
            .bind(session.events)
            .bind(&session.device_type)
            .bind(&session.browser)
            .bind(&session.os)
            .bind(&session.referrer)
            .bind(&session.ip_address)
            .bind(&session.user_agent)
            .bind(&session.metadata)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Track analytics event
    pub async fn track_event(&self, event: &AnalyticsEvent) -> Result<(), sqlx::Error> {
        let query = r#"
            INSERT INTO analytics_events (
                id, session_id, user_id, event_type, event_name,
                page, timestamp, properties, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#;

        sqlx::query(query)
            .bind(event.id)
            .bind(&event.session_id)
            .bind(&event.user_id)
            .bind(&event.event_type)
            .bind(&event.event_name)
            .bind(&event.page)
            .bind(event.timestamp)
            .bind(&event.properties)
            .bind(&event.metadata)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Track onboarding step
    pub async fn track_onboarding_step(
        &self,
        tracking: &OnboardingTracking,
    ) -> Result<(), sqlx::Error> {
        let query = r#"
            INSERT INTO onboarding_tracking (
                id, user_id, session_id, step, step_name,
                completed, time_spent_seconds, timestamp, abandonment_point
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#;

        sqlx::query(query)
            .bind(tracking.id)
            .bind(&tracking.user_id)
            .bind(&tracking.session_id)
            .bind(tracking.step)
            .bind(&tracking.step_name)
            .bind(tracking.completed)
            .bind(&tracking.time_spent_seconds)
            .bind(tracking.timestamp)
            .bind(&tracking.abandonment_point)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Track feature usage
    pub async fn track_feature_usage(&self, usage: &FeatureUsage) -> Result<(), sqlx::Error> {
        let query = r#"
            INSERT INTO feature_usage (
                id, user_id, feature_name, action, timestamp, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6)
        "#;

        sqlx::query(query)
            .bind(usage.id)
            .bind(&usage.user_id)
            .bind(&usage.feature_name)
            .bind(&usage.action)
            .bind(usage.timestamp)
            .bind(&usage.metadata)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Track abandonment point
    pub async fn track_abandonment(&self, abandonment: &AbandonmentPoint) -> Result<(), sqlx::Error> {
        let query = r#"
            INSERT INTO abandonment_points (
                id, user_id, session_id, page, reason, time_spent_seconds, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#;

        sqlx::query(query)
            .bind(abandonment.id)
            .bind(&abandonment.user_id)
            .bind(&abandonment.session_id)
            .bind(&abandonment.page)
            .bind(&abandonment.reason)
            .bind(&abandonment.time_spent_seconds)
            .bind(abandonment.timestamp)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Track frustration point
    pub async fn track_frustration(&self, frustration: &FrustrationPoint) -> Result<(), sqlx::Error> {
        let query = r#"
            INSERT INTO frustration_points (
                id, user_id, session_id, page, element, action, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#;

        sqlx::query(query)
            .bind(frustration.id)
            .bind(&frustration.user_id)
            .bind(&frustration.session_id)
            .bind(&frustration.page)
            .bind(&frustration.element)
            .bind(&frustration.action)
            .bind(frustration.timestamp)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Get onboarding completion rate
    pub async fn get_onboarding_completion_rate(
        &self,
        days: i32,
    ) -> Result<f64, sqlx::Error> {
        let query = r#"
            SELECT 
                COUNT(DISTINCT user_id) as total_users,
                COUNT(DISTINCT CASE WHEN completed = true THEN user_id END) as completed_users
            FROM onboarding_tracking
            WHERE timestamp > NOW() - INTERVAL '1 day' * $1
        "#;

        let row = sqlx::query_as::<_, (i64, i64)>(query)
            .bind(days)
            .fetch_one(&self.pool)
            .await?;

        let (total, completed) = row;
        if total == 0 {
            return Ok(0.0);
        }

        Ok((completed as f64 / total as f64) * 100.0)
    }

    /// Get average onboarding time
    pub async fn get_average_onboarding_time(&self) -> Result<i32, sqlx::Error> {
        let query = r#"
            SELECT AVG(time_spent_seconds)::INTEGER
            FROM onboarding_tracking
            WHERE completed = true AND time_spent_seconds IS NOT NULL
        "#;

        let result: Option<i32> = sqlx::query_scalar(query)
            .fetch_optional(&self.pool)
            .await?;

        Ok(result.unwrap_or(0))
    }

    /// Get abandonment points
    pub async fn get_abandonment_points(
        &self,
        limit: i64,
    ) -> Result<Vec<AbandonmentPoint>, sqlx::Error> {
        let query = r#"
            SELECT id, user_id, session_id, page, reason, time_spent_seconds, timestamp
            FROM abandonment_points
            ORDER BY timestamp DESC
            LIMIT $1
        "#;

        let rows = sqlx::query_as::<_, AbandonmentPoint>(query)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;

        Ok(rows)
    }

    /// Get feature usage statistics
    pub async fn get_feature_usage_stats(
        &self,
        feature_name: Option<&str>,
    ) -> Result<HashMap<String, i64>, sqlx::Error> {
        let query = if let Some(feature) = feature_name {
            r#"
                SELECT action, COUNT(*) as count
                FROM feature_usage
                WHERE feature_name = $1
                GROUP BY action
            "#
        } else {
            r#"
                SELECT feature_name, COUNT(*) as count
                FROM feature_usage
                GROUP BY feature_name
            "#
        };

        let rows: Vec<(String, i64)> = if let Some(feature) = feature_name {
            sqlx::query_as(query)
                .bind(feature)
                .fetch_all(&self.pool)
                .await?
        } else {
            sqlx::query_as(query)
                .fetch_all(&self.pool)
                .await?
        };

        Ok(rows.into_iter().collect())
    }
}

