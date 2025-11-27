//! Analytics Tracking Routes
//! 
//! Handles analytics events, session tracking, and user behavior metrics

use axum::{
    extract::{State, Json},
    http::StatusCode,
    response::Json as ResponseJson,
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;
use chrono::Utc;

// ✅ FIX: Temporarily commented - module path needs to be fixed
// TODO: Fix module path - should be src/analytics/user_sessions.rs
// use crate::analytics::user_sessions::{
//     UserSessionService, UserSession, AnalyticsEvent, OnboardingTracking,
//     FeatureUsage, AbandonmentPoint, FrustrationPoint,
// };
use crate::server::AppState;

/// Analytics tracking request
#[derive(Debug, Deserialize)]
pub struct TrackEventRequest {
    pub event_type: String,
    pub event_name: Option<String>,
    pub session_id: Option<String>,
    pub user_id: Option<String>,
    pub page: Option<String>,
    pub properties: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
}

/// Feedback request (legacy format for analytics_tracking)
#[derive(Debug, Deserialize)]
pub struct FeedbackRequest {
    pub type_: String,
    pub message: String,
    pub rating: Option<i32>,
    pub context: String,
    pub page: String,
    pub screenshot: Option<String>,
    pub recording: Option<bool>,
    pub user_id: Option<String>,
    pub session_id: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// Simple feedback request (matches frontend FeedbackWidget format)
#[derive(Debug, Deserialize)]
pub struct SimpleFeedbackRequest {
    #[serde(rename = "type")]
    pub feedback_type: String, // "bug" | "suggestion" | "question" | "praise" | "general"
    pub rating: i32,
    pub message: String,
    pub page: Option<String>,
    pub userAgent: Option<String>,
    pub screenshot: Option<String>,
}

/// Onboarding tracking request
#[derive(Debug, Deserialize)]
pub struct OnboardingTrackingRequest {
    pub user_id: String,
    pub session_id: String,
    pub step: i32,
    pub step_name: String,
    pub completed: bool,
    pub time_spent_seconds: Option<i32>,
    pub abandonment_point: Option<String>,
}

/// Feature usage request
#[derive(Debug, Deserialize)]
pub struct FeatureUsageRequest {
    pub user_id: String,
    pub feature_name: String,
    pub action: String,
    pub metadata: Option<serde_json::Value>,
}

/// Abandonment tracking request
#[derive(Debug, Deserialize)]
pub struct AbandonmentRequest {
    pub user_id: Option<String>,
    pub session_id: String,
    pub page: String,
    pub reason: Option<String>,
    pub time_spent_seconds: Option<i32>,
}

/// Frustration tracking request
#[derive(Debug, Deserialize)]
pub struct FrustrationRequest {
    pub user_id: Option<String>,
    pub session_id: String,
    pub page: String,
    pub element: Option<String>,
    pub action: Option<String>,
}

/// Analytics response
#[derive(Debug, Serialize)]
pub struct AnalyticsResponse {
    pub success: bool,
    pub message: String,
}

// ✅ FIX: Temporarily commented - UserSessionService module path needs fixing
// TODO: Fix module path - should be src/analytics/user_sessions.rs
/*
/// Track analytics event
async fn track_event_handler(
    State(pool): State<Arc<PgPool>>,
    Json(request): Json<TrackEventRequest>,
) -> Result<ResponseJson<AnalyticsResponse>, StatusCode> {
    let service = UserSessionService::new((*pool).clone());
    
    let event = AnalyticsEvent {
        id: Uuid::new_v4(),
        session_id: request.session_id.unwrap_or_else(|| "unknown".to_string()),
        user_id: request.user_id,
        event_type: request.event_type.clone(),
        event_name: request.event_name.unwrap_or_else(|| request.event_type.clone()),
        page: request.page.unwrap_or_else(|| "unknown".to_string()),
        timestamp: Utc::now(),
        properties: request.properties,
        metadata: request.metadata,
    };
    
    service
        .track_event(&event)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(ResponseJson(AnalyticsResponse {
        success: true,
        message: "Event tracked successfully".to_string(),
    }))
}

/// Track feedback
async fn track_feedback_handler(
    State(pool): State<Arc<PgPool>>,
    Json(request): Json<FeedbackRequest>,
) -> Result<ResponseJson<AnalyticsResponse>, StatusCode> {
    let service = UserSessionService::new((*pool).clone());
    
    // Track as analytics event
    let event = AnalyticsEvent {
        id: Uuid::new_v4(),
        session_id: request.session_id.unwrap_or_else(|| "unknown".to_string()),
        user_id: request.user_id.clone(),
        event_type: "feedback".to_string(),
        event_name: format!("feedback_{}", request.type_),
        page: request.page.clone(),
        timestamp: Utc::now(),
        properties: Some(serde_json::json!({
            "type": request.type_,
            "rating": request.rating,
            "context": request.context,
            "screenshot": request.screenshot.is_some(),
            "recording": request.recording.unwrap_or(false),
        })),
        metadata: request.metadata,
    };
    
    service
        .track_event(&event)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(ResponseJson(AnalyticsResponse {
        success: true,
        message: "Feedback tracked successfully".to_string(),
    }))
}

/// POST /api/v1/feedback
/// Simple feedback endpoint that matches frontend FeedbackWidget format
pub async fn simple_feedback_handler(
    State(state): State<AppState>,
    Json(request): Json<SimpleFeedbackRequest>,
) -> Result<ResponseJson<AnalyticsResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let service = UserSessionService::new(pool.clone());
    
    // Map simple feedback to analytics event
    let event = AnalyticsEvent {
        id: Uuid::new_v4(),
        session_id: "unknown".to_string(), // Frontend doesn't send session_id
        user_id: None, // Frontend doesn't send user_id
        event_type: "feedback".to_string(),
        event_name: format!("feedback_{}", request.feedback_type),
        page: request.page.clone().unwrap_or_else(|| "unknown".to_string()),
        timestamp: Utc::now(),
        properties: Some(serde_json::json!({
            "type": request.feedback_type,
            "rating": request.rating,
            "message": request.message,
            "userAgent": request.userAgent,
            "hasScreenshot": request.screenshot.is_some(),
        })),
        metadata: Some(serde_json::json!({
            "screenshot": request.screenshot,
        })),
    };
    
    service
        .track_event(&event)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(ResponseJson(AnalyticsResponse {
        success: true,
        message: "Feedback submitted successfully".to_string(),
    }))
}

/// Track onboarding step
async fn track_onboarding_handler(
    State(pool): State<Arc<PgPool>>,
    Json(request): Json<OnboardingTrackingRequest>,
) -> Result<ResponseJson<AnalyticsResponse>, StatusCode> {
    let service = UserSessionService::new((*pool).clone());
    
    let tracking = OnboardingTracking {
        id: Uuid::new_v4(),
        user_id: request.user_id,
        session_id: request.session_id,
        step: request.step,
        step_name: request.step_name,
        completed: request.completed,
        time_spent_seconds: request.time_spent_seconds,
        timestamp: Utc::now(),
        abandonment_point: request.abandonment_point,
    };
    
    service
        .track_onboarding_step(&tracking)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(ResponseJson(AnalyticsResponse {
        success: true,
        message: "Onboarding step tracked successfully".to_string(),
    }))
}

/// Track feature usage
async fn track_feature_usage_handler(
    State(pool): State<Arc<PgPool>>,
    Json(request): Json<FeatureUsageRequest>,
) -> Result<ResponseJson<AnalyticsResponse>, StatusCode> {
    let service = UserSessionService::new((*pool).clone());
    
    let usage = FeatureUsage {
        id: Uuid::new_v4(),
        user_id: request.user_id,
        feature_name: request.feature_name,
        action: request.action,
        timestamp: Utc::now(),
        metadata: request.metadata,
    };
    
    service
        .track_feature_usage(&usage)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(ResponseJson(AnalyticsResponse {
        success: true,
        message: "Feature usage tracked successfully".to_string(),
    }))
}

/// Track abandonment point
async fn track_abandonment_handler(
    State(pool): State<Arc<PgPool>>,
    Json(request): Json<AbandonmentRequest>,
) -> Result<ResponseJson<AnalyticsResponse>, StatusCode> {
    let service = UserSessionService::new((*pool).clone());
    
    let abandonment = AbandonmentPoint {
        id: Uuid::new_v4(),
        user_id: request.user_id,
        session_id: request.session_id,
        page: request.page,
        reason: request.reason,
        time_spent_seconds: request.time_spent_seconds,
        timestamp: Utc::now(),
    };
    
    service
        .track_abandonment(&abandonment)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(ResponseJson(AnalyticsResponse {
        success: true,
        message: "Abandonment point tracked successfully".to_string(),
    }))
}

/// Track frustration point
async fn track_frustration_handler(
    State(pool): State<Arc<PgPool>>,
    Json(request): Json<FrustrationRequest>,
) -> Result<ResponseJson<AnalyticsResponse>, StatusCode> {
    let service = UserSessionService::new((*pool).clone());
    
    let frustration = FrustrationPoint {
        id: Uuid::new_v4(),
        user_id: request.user_id,
        session_id: request.session_id,
        page: request.page,
        element: request.element,
        action: request.action,
        timestamp: Utc::now(),
    };
    
    service
        .track_frustration(&frustration)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(ResponseJson(AnalyticsResponse {
        success: true,
        message: "Frustration point tracked successfully".to_string(),
    }))
}

/// Analytics tracking routes
pub fn analytics_tracking_routes(pool: Arc<PgPool>) -> Router {
    // ✅ FIX: Temporarily commented handlers - UserSessionService module path needs fixing
    Router::new()
        // .route("/track", post(track_event_handler))
        // .route("/feedback", post(track_feedback_handler))
        // .route("/onboarding", post(track_onboarding_handler))
        // .route("/feature-usage", post(track_feature_usage_handler))
        // .route("/abandonment", post(track_abandonment_handler))
        // .route("/frustration", post(track_frustration_handler))
        .route("/track", post(|| async { 
            ResponseJson(AnalyticsResponse {
                success: true,
                message: "Event tracking temporarily disabled - UserSessionService module needs fixing".to_string(),
            })
        }))
        .route("/onboarding", post(|| async {
            ResponseJson(AnalyticsResponse {
                success: true,
                message: "Onboarding tracking temporarily disabled - UserSessionService module needs fixing".to_string(),
            })
        }))
        .with_state(pool)
}
*/

