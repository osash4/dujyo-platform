use axum::{
    extract::{Query, State, Extension},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;
use crate::server::AppState;
use crate::auth::Claims;

#[derive(Serialize)]
pub struct Notification {
    pub notification_id: String,
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub related_content_id: Option<String>,
    pub related_user_id: Option<String>,
    pub is_read: bool,
    pub created_at: String,
    pub metadata: serde_json::Value,
}

#[derive(Serialize)]
pub struct NotificationListResponse {
    pub success: bool,
    pub notifications: Vec<Notification>,
    pub total: i64,
    pub unread_count: i64,
}

#[derive(Deserialize)]
pub struct NotificationPreferences {
    pub notification_type: String,
    pub enabled: bool,
    pub email_enabled: bool,
    pub push_enabled: bool,
}

/// GET /api/v1/notifications
pub async fn get_notifications(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<NotificationListResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let limit: i64 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(50);
    let offset: i64 = params.get("offset").and_then(|v| v.parse().ok()).unwrap_or(0);
    let unread_only: bool = params.get("unread_only")
        .and_then(|v| v.parse().ok())
        .unwrap_or(false);
    
    let query = if unread_only {
        "SELECT * FROM notifications WHERE user_id = $1 AND is_read = false ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    } else {
        "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    };
    
    let rows = sqlx::query(query)
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            eprintln!("❌ Error fetching notifications: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    let notifications: Vec<Notification> = rows.into_iter().map(|row| Notification {
        notification_id: row.get("notification_id"),
        notification_type: row.get("notification_type"),
        title: row.get("title"),
        message: row.get("message"),
        related_content_id: row.get("related_content_id"),
        related_user_id: row.get("related_user_id"),
        is_read: row.get("is_read"),
        created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
        metadata: row.get::<serde_json::Value, _>("metadata"),
    }).collect();
    
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM notifications WHERE user_id = $1"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let unread_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(NotificationListResponse {
        success: true,
        notifications,
        total,
        unread_count,
    }))
}

/// PUT /api/v1/notifications/:notification_id/read
pub async fn mark_notification_read(
    Extension(claims): Extension<Claims>,
    axum::extract::Path(notification_id): axum::extract::Path<String>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    sqlx::query(
        "UPDATE notifications SET is_read = true, read_at = NOW() WHERE notification_id = $1 AND user_id = $2"
    )
    .bind(&notification_id)
    .bind(user_id)
    .execute(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Notification marked as read"
    })))
}

/// PUT /api/v1/notifications/read-all
pub async fn mark_all_notifications_read(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    sqlx::query(
        "UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false"
    )
    .bind(user_id)
    .execute(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "All notifications marked as read"
    })))
}

/// GET /api/v1/notifications/preferences
pub async fn get_notification_preferences(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let rows = sqlx::query(
        "SELECT notification_type, enabled, email_enabled, push_enabled FROM notification_preferences WHERE user_id = $1"
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let mut preferences = serde_json::Map::new();
    for row in rows {
        let pref_type: String = row.get("notification_type");
        preferences.insert(pref_type.clone(), serde_json::json!({
            "enabled": row.get::<bool, _>("enabled"),
            "email_enabled": row.get::<bool, _>("email_enabled"),
            "push_enabled": row.get::<bool, _>("push_enabled"),
        }));
    }
    
    Ok(Json(serde_json::json!({
        "success": true,
        "preferences": preferences
    })))
}

/// PUT /api/v1/notifications/preferences
pub async fn update_notification_preferences(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Json(request): Json<NotificationPreferences>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    sqlx::query(
        r#"
        INSERT INTO notification_preferences (user_id, notification_type, enabled, email_enabled, push_enabled)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, notification_type) 
        DO UPDATE SET enabled = $3, email_enabled = $4, push_enabled = $5, updated_at = NOW()
        "#
    )
    .bind(user_id)
    .bind(&request.notification_type)
    .bind(request.enabled)
    .bind(request.email_enabled)
    .bind(request.push_enabled)
    .execute(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Preferences updated"
    })))
}

pub fn notification_routes() -> axum::Router<AppState> {
    use axum::routing::{get, put};
    use axum::extract::Path;
    axum::Router::new()
        .route("/", get(get_notifications))
        .route("/:notification_id/read", put(mark_notification_read))
        .route("/read-all", put(mark_all_notifications_read))
        .route("/preferences", get(get_notification_preferences))
        .route("/preferences", put(update_notification_preferences))
}

