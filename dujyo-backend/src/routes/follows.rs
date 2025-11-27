use axum::{
    extract::{Path as PathExtractor, Query, State, Extension},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;
use crate::server::AppState;
use crate::auth::Claims;

#[derive(Serialize)]
pub struct FollowResponse {
    pub success: bool,
    pub message: String,
    pub is_following: bool,
}

#[derive(Serialize)]
pub struct FollowListResponse {
    pub success: bool,
    pub users: Vec<FollowUser>,
    pub total: i64,
}

#[derive(Serialize)]
pub struct FollowUser {
    pub user_id: String,
    pub username: Option<String>,
    pub email: Option<String>,
    pub wallet_address: String,
    pub followed_at: Option<String>,
}

#[derive(Serialize)]
pub struct FollowStatsResponse {
    pub success: bool,
    pub followers_count: i64,
    pub following_count: i64,
    pub is_following: bool,
}

/// POST /api/v1/users/:user_id/follow
/// Follow a user
pub async fn follow_user(
    Extension(claims): Extension<Claims>,
    PathExtractor(target_user_id): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<FollowResponse>, StatusCode> {
    let follower_id = &claims.sub;
    let pool = &state.storage.pool;
    
    // Can't follow yourself
    if follower_id == &target_user_id {
        return Ok(Json(FollowResponse {
            success: false,
            message: "Cannot follow yourself".to_string(),
            is_following: false,
        }));
    }
    
    // Check if already following
    let existing: Option<String> = sqlx::query_scalar(
        "SELECT follow_id FROM user_follows WHERE follower_id = $1 AND following_id = $2"
    )
    .bind(follower_id)
    .bind(&target_user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error checking follow: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    if existing.is_some() {
        return Ok(Json(FollowResponse {
            success: false,
            message: "Already following this user".to_string(),
            is_following: true,
        }));
    }
    
    // Create follow relationship
    sqlx::query(
        "INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)"
    )
    .bind(follower_id)
    .bind(&target_user_id)
    .execute(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error creating follow: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Create notification for the followed user
    let _ = create_notification(
        pool,
        &target_user_id,
        "follow",
        "New Follower",
        &format!("{} started following you", follower_id),
        None,
        Some(follower_id.clone()),
    ).await;
    
    Ok(Json(FollowResponse {
        success: true,
        message: "Successfully followed user".to_string(),
        is_following: true,
    }))
}

/// DELETE /api/v1/users/:user_id/follow
/// Unfollow a user
pub async fn unfollow_user(
    Extension(claims): Extension<Claims>,
    PathExtractor(target_user_id): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<FollowResponse>, StatusCode> {
    let follower_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let deleted = sqlx::query(
        "DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2"
    )
    .bind(follower_id)
    .bind(&target_user_id)
    .execute(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error unfollowing: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    if deleted.rows_affected() == 0 {
        return Ok(Json(FollowResponse {
            success: false,
            message: "Not following this user".to_string(),
            is_following: false,
        }));
    }
    
    Ok(Json(FollowResponse {
        success: true,
        message: "Successfully unfollowed user".to_string(),
        is_following: false,
    }))
}

/// GET /api/v1/users/:user_id/followers
/// Get user's followers
pub async fn get_followers(
    Extension(claims): Extension<Claims>,
    PathExtractor(user_id): PathExtractor<String>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<FollowListResponse>, StatusCode> {
    let _current_user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let limit: i64 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(50);
    let offset: i64 = params.get("offset").and_then(|v| v.parse().ok()).unwrap_or(0);
    
    let rows = sqlx::query(
        r#"
        SELECT 
            u.wallet_address,
            u.username,
            u.email,
            uf.created_at as followed_at
        FROM user_follows uf
        JOIN users u ON u.wallet_address = uf.follower_id
        WHERE uf.following_id = $1
        ORDER BY uf.created_at DESC
        LIMIT $2 OFFSET $3
        "#
    )
    .bind(&user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error fetching followers: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let users: Vec<FollowUser> = rows.into_iter().map(|row| FollowUser {
        user_id: row.get("wallet_address"),
        username: row.get("username"),
        email: row.get("email"),
        wallet_address: row.get("wallet_address"),
        followed_at: row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("followed_at")
            .map(|dt| dt.to_rfc3339()),
    }).collect();
    
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM user_follows WHERE following_id = $1"
    )
    .bind(&user_id)
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(FollowListResponse {
        success: true,
        users,
        total,
    }))
}

/// GET /api/v1/users/:user_id/following
/// Get users that this user follows
pub async fn get_following(
    Extension(claims): Extension<Claims>,
    PathExtractor(user_id): PathExtractor<String>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<FollowListResponse>, StatusCode> {
    let _current_user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let limit: i64 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(50);
    let offset: i64 = params.get("offset").and_then(|v| v.parse().ok()).unwrap_or(0);
    
    let rows = sqlx::query(
        r#"
        SELECT 
            u.wallet_address,
            u.username,
            u.email,
            uf.created_at as followed_at
        FROM user_follows uf
        JOIN users u ON u.wallet_address = uf.following_id
        WHERE uf.follower_id = $1
        ORDER BY uf.created_at DESC
        LIMIT $2 OFFSET $3
        "#
    )
    .bind(&user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error fetching following: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let users: Vec<FollowUser> = rows.into_iter().map(|row| FollowUser {
        user_id: row.get("wallet_address"),
        username: row.get("username"),
        email: row.get("email"),
        wallet_address: row.get("wallet_address"),
        followed_at: row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("followed_at")
            .map(|dt| dt.to_rfc3339()),
    }).collect();
    
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM user_follows WHERE follower_id = $1"
    )
    .bind(&user_id)
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(FollowListResponse {
        success: true,
        users,
        total,
    }))
}

/// GET /api/v1/users/:user_id/follow-stats
/// Get follow statistics
pub async fn get_follow_stats(
    Extension(claims): Extension<Claims>,
    PathExtractor(user_id): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<FollowStatsResponse>, StatusCode> {
    let current_user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let followers_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM user_follows WHERE following_id = $1"
    )
    .bind(&user_id)
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let following_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM user_follows WHERE follower_id = $1"
    )
    .bind(&user_id)
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let is_following: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2)"
    )
    .bind(current_user_id)
    .bind(&user_id)
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(FollowStatsResponse {
        success: true,
        followers_count,
        following_count,
        is_following,
    }))
}

// Helper function to create notifications
async fn create_notification(
    pool: &sqlx::PgPool,
    user_id: &str,
    notification_type: &str,
    title: &str,
    message: &str,
    related_content_id: Option<String>,
    related_user_id: Option<String>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO notifications (user_id, notification_type, title, message, related_content_id, related_user_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#
    )
    .bind(user_id)
    .bind(notification_type)
    .bind(title)
    .bind(message)
    .bind(related_content_id)
    .bind(related_user_id)
    .execute(pool)
    .await?;
    
    Ok(())
}

pub fn follow_routes() -> axum::Router<AppState> {
    use axum::routing::{get, post, delete};
    axum::Router::new()
        .route("/:user_id/follow", post(follow_user))
        .route("/:user_id/follow", delete(unfollow_user))
        .route("/:user_id/followers", get(get_followers))
        .route("/:user_id/following", get(get_following))
        .route("/:user_id/follow-stats", get(get_follow_stats))
}

