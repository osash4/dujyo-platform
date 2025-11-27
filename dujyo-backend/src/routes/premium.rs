use axum::{
    extract::{Path as PathExtractor, State, Extension},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use crate::server::AppState;
use crate::auth::Claims;

#[derive(Serialize, Deserialize)]
pub struct PremiumSubscription {
    pub subscription_id: String,
    pub plan_type: String,
    pub status: String,
    pub started_at: String,
    pub expires_at: Option<String>,
    pub cancelled_at: Option<String>,
}

#[derive(Serialize)]
pub struct SubscriptionResponse {
    pub success: bool,
    pub subscription: Option<PremiumSubscription>,
    pub message: String,
}

#[derive(Deserialize)]
pub struct CreateSubscriptionRequest {
    pub plan_type: String, // 'monthly', 'yearly', 'lifetime'
    pub payment_method: Option<String>,
}

/// POST /api/v1/premium/subscribe
pub async fn create_subscription(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Json(request): Json<CreateSubscriptionRequest>,
) -> Result<Json<SubscriptionResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    // Check for existing active subscription
    let existing: Option<String> = sqlx::query_scalar(
        "SELECT subscription_id FROM premium_subscriptions WHERE user_id = $1 AND status = 'active'"
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    if existing.is_some() {
        return Ok(Json(SubscriptionResponse {
            success: false,
            subscription: None,
            message: "User already has an active subscription".to_string(),
        }));
    }
    
    let subscription_id = uuid::Uuid::new_v4().to_string();
    let expires_at = match request.plan_type.as_str() {
        "monthly" => Some(chrono::Utc::now() + chrono::Duration::days(30)),
        "yearly" => Some(chrono::Utc::now() + chrono::Duration::days(365)),
        "lifetime" => None,
        _ => return Ok(Json(SubscriptionResponse {
            success: false,
            subscription: None,
            message: "Invalid plan type".to_string(),
        })),
    };
    
    sqlx::query(
        r#"
        INSERT INTO premium_subscriptions 
        (subscription_id, user_id, plan_type, status, expires_at, payment_method)
        VALUES ($1, $2, $3, 'active', $4, $5)
        "#
    )
    .bind(&subscription_id)
    .bind(user_id)
    .bind(&request.plan_type)
    .bind(expires_at)
    .bind(&request.payment_method)
    .execute(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let row = sqlx::query(
        "SELECT subscription_id, plan_type, status, started_at, expires_at, cancelled_at FROM premium_subscriptions WHERE subscription_id = $1"
    )
    .bind(&subscription_id)
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let subscription = PremiumSubscription {
        subscription_id: row.get("subscription_id"),
        plan_type: row.get("plan_type"),
        status: row.get("status"),
        started_at: row.get::<chrono::DateTime<chrono::Utc>, _>("started_at").to_rfc3339(),
        expires_at: row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("expires_at")
            .map(|dt| dt.to_rfc3339()),
        cancelled_at: row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("cancelled_at")
            .map(|dt| dt.to_rfc3339()),
    };
    
    Ok(Json(SubscriptionResponse {
        success: true,
        subscription: Some(subscription),
        message: "Subscription created successfully".to_string(),
    }))
}

/// GET /api/v1/premium/subscription
pub async fn get_subscription(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
) -> Result<Json<SubscriptionResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let row = sqlx::query(
        "SELECT subscription_id, plan_type, status, started_at, expires_at, cancelled_at FROM premium_subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1"
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    if let Some(row) = row {
        let subscription = PremiumSubscription {
            subscription_id: row.get("subscription_id"),
            plan_type: row.get("plan_type"),
            status: row.get("status"),
            started_at: row.get::<chrono::DateTime<chrono::Utc>, _>("started_at").to_rfc3339(),
            expires_at: row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("expires_at")
                .map(|dt| dt.to_rfc3339()),
            cancelled_at: row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("cancelled_at")
                .map(|dt| dt.to_rfc3339()),
        };
        
        Ok(Json(SubscriptionResponse {
            success: true,
            subscription: Some(subscription),
            message: "Subscription found".to_string(),
        }))
    } else {
        Ok(Json(SubscriptionResponse {
            success: false,
            subscription: None,
            message: "No active subscription found".to_string(),
        }))
    }
}

/// DELETE /api/v1/premium/subscription
pub async fn cancel_subscription(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
) -> Result<Json<SubscriptionResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    sqlx::query(
        "UPDATE premium_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE user_id = $1 AND status = 'active'"
    )
    .bind(user_id)
    .execute(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(SubscriptionResponse {
        success: true,
        subscription: None,
        message: "Subscription cancelled successfully".to_string(),
    }))
}

/// GET /api/v1/content/:content_id/access
pub async fn check_content_access(
    Extension(claims): Extension<Claims>,
    PathExtractor(content_id): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    // Check if content is exclusive
    let content_row = sqlx::query(
        "SELECT is_exclusive, requires_premium, exclusive_price FROM content WHERE content_id = $1"
    )
    .bind(&content_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    if let Some(row) = content_row {
        let is_exclusive: bool = row.get("is_exclusive");
        let requires_premium: bool = row.get("requires_premium");
        
        if !is_exclusive && !requires_premium {
            return Ok(Json(serde_json::json!({
                "success": true,
                "has_access": true,
                "reason": "Content is public"
            })));
        }
        
        // Check premium subscription
        if requires_premium {
            let has_premium: bool = sqlx::query_scalar(
                "SELECT EXISTS(SELECT 1 FROM premium_subscriptions WHERE user_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW()))"
            )
            .bind(user_id)
            .fetch_one(pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            
            if has_premium {
                return Ok(Json(serde_json::json!({
                    "success": true,
                    "has_access": true,
                    "reason": "Premium subscription"
                })));
            }
        }
        
        // Check exclusive access
        let has_access: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM exclusive_content_access WHERE content_id = $1 AND user_id = $2 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW()))"
        )
        .bind(&content_id)
        .bind(user_id)
        .fetch_one(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        
        Ok(Json(serde_json::json!({
            "success": true,
            "has_access": has_access,
            "reason": if has_access { "Exclusive access granted" } else { "Access required" }
        })))
    } else {
        Ok(Json(serde_json::json!({
            "success": false,
            "has_access": false,
            "reason": "Content not found"
        })))
    }
}

pub fn premium_routes() -> axum::Router<AppState> {
    use axum::routing::{get, post, delete};
    axum::Router::new()
        .route("/subscribe", post(create_subscription))
        .route("/subscription", get(get_subscription))
        .route("/subscription", delete(cancel_subscription))
        .route("/content/:content_id/access", get(check_content_access))
}

