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

#[derive(Serialize, Deserialize)]
pub struct Comment {
    pub comment_id: String,
    pub content_id: String,
    pub user_id: String,
    pub username: Option<String>,
    pub comment_text: String,
    pub parent_comment_id: Option<String>,
    pub likes_count: i32,
    pub is_liked: bool,
    pub created_at: String,
    pub updated_at: String,
    pub is_edited: bool,
    pub replies: Vec<Comment>,
}

#[derive(Serialize)]
pub struct CommentListResponse {
    pub success: bool,
    pub comments: Vec<Comment>,
    pub total: i64,
}

#[derive(Deserialize)]
pub struct CreateCommentRequest {
    pub comment_text: String,
    pub parent_comment_id: Option<String>,
}

#[derive(Serialize)]
pub struct CommentResponse {
    pub success: bool,
    pub comment: Option<Comment>,
    pub message: String,
}

/// POST /api/v1/content/:content_id/comments
/// Create a comment
pub async fn create_comment(
    Extension(claims): Extension<Claims>,
    PathExtractor(content_id): PathExtractor<String>,
    State(state): State<AppState>,
    Json(request): Json<CreateCommentRequest>,
) -> Result<Json<CommentResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    if request.comment_text.trim().is_empty() {
        return Ok(Json(CommentResponse {
            success: false,
            comment: None,
            message: "Comment text cannot be empty".to_string(),
        }));
    }
    
    let comment_id = uuid::Uuid::new_v4().to_string();
    
    sqlx::query(
        r#"
        INSERT INTO content_comments (comment_id, content_id, user_id, comment_text, parent_comment_id)
        VALUES ($1, $2, $3, $4, $5)
        "#
    )
    .bind(&comment_id)
    .bind(&content_id)
    .bind(user_id)
    .bind(&request.comment_text)
    .bind(&request.parent_comment_id)
    .execute(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error creating comment: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Get the created comment
    let row = sqlx::query(
        r#"
        SELECT 
            cc.comment_id,
            cc.content_id,
            cc.user_id,
            u.username,
            cc.comment_text,
            cc.parent_comment_id,
            cc.likes_count,
            cc.created_at,
            cc.updated_at,
            cc.is_edited
        FROM content_comments cc
        LEFT JOIN users u ON u.wallet_address = cc.user_id
        WHERE cc.comment_id = $1
        "#
    )
    .bind(&comment_id)
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let comment = Comment {
        comment_id: row.get("comment_id"),
        content_id: row.get("content_id"),
        user_id: row.get("user_id"),
        username: row.get("username"),
        comment_text: row.get("comment_text"),
        parent_comment_id: row.get("parent_comment_id"),
        likes_count: row.get("likes_count"),
        is_liked: false,
        created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
        updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
        is_edited: row.get("is_edited"),
        replies: Vec::new(),
    };
    
    // Create notification for content owner
    let _ = create_notification(
        pool,
        &get_content_owner(pool, &content_id).await.unwrap_or_default(),
        "comment",
        "New Comment",
        &format!("{} commented on your content", user_id),
        Some(content_id),
        Some(user_id.clone()),
    ).await;
    
    Ok(Json(CommentResponse {
        success: true,
        comment: Some(comment),
        message: "Comment created successfully".to_string(),
    }))
}

/// GET /api/v1/content/:content_id/comments
/// Get comments for content
pub async fn get_comments(
    Extension(claims): Extension<Claims>,
    PathExtractor(content_id): PathExtractor<String>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<CommentListResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let limit: i64 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(50);
    let offset: i64 = params.get("offset").and_then(|v| v.parse().ok()).unwrap_or(0);
    
    // Get top-level comments
    let rows = sqlx::query(
        r#"
        SELECT 
            cc.comment_id,
            cc.content_id,
            cc.user_id,
            u.username,
            cc.comment_text,
            cc.parent_comment_id,
            cc.likes_count,
            cc.created_at,
            cc.updated_at,
            cc.is_edited,
            EXISTS(
                SELECT 1 FROM comment_likes cl 
                WHERE cl.comment_id = cc.comment_id AND cl.user_id = $2
            ) as is_liked
        FROM content_comments cc
        LEFT JOIN users u ON u.wallet_address = cc.user_id
        WHERE cc.content_id = $1 AND cc.parent_comment_id IS NULL AND cc.is_deleted = false
        ORDER BY cc.created_at DESC
        LIMIT $3 OFFSET $4
        "#
    )
    .bind(&content_id)
    .bind(user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error fetching comments: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let mut comments: Vec<Comment> = rows.into_iter().map(|row| {
        let comment_id: String = row.get("comment_id");
        Comment {
            comment_id: comment_id.clone(),
            content_id: row.get("content_id"),
            user_id: row.get("user_id"),
            username: row.get("username"),
            comment_text: row.get("comment_text"),
            parent_comment_id: row.get("parent_comment_id"),
            likes_count: row.get("likes_count"),
            is_liked: row.get("is_liked"),
            created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
            is_edited: row.get("is_edited"),
            replies: Vec::new(), // Will be populated separately
        }
    }).collect();
    
    // Get replies for each comment
    for comment in &mut comments {
        let reply_rows = sqlx::query(
            r#"
            SELECT 
                cc.comment_id,
                cc.content_id,
                cc.user_id,
                u.username,
                cc.comment_text,
                cc.parent_comment_id,
                cc.likes_count,
                cc.created_at,
                cc.updated_at,
                cc.is_edited,
                EXISTS(
                    SELECT 1 FROM comment_likes cl 
                    WHERE cl.comment_id = cc.comment_id AND cl.user_id = $2
                ) as is_liked
            FROM content_comments cc
            LEFT JOIN users u ON u.wallet_address = cc.user_id
            WHERE cc.parent_comment_id = $1 AND cc.is_deleted = false
            ORDER BY cc.created_at ASC
            "#
        )
        .bind(&comment.comment_id)
        .bind(user_id)
        .fetch_all(pool)
        .await
        .ok();
        
        if let Some(replies) = reply_rows {
            comment.replies = replies.into_iter().map(|row| Comment {
                comment_id: row.get("comment_id"),
                content_id: row.get("content_id"),
                user_id: row.get("user_id"),
                username: row.get("username"),
                comment_text: row.get("comment_text"),
                parent_comment_id: row.get("parent_comment_id"),
                likes_count: row.get("likes_count"),
                is_liked: row.get("is_liked"),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
                is_edited: row.get("is_edited"),
                replies: Vec::new(),
            }).collect();
        }
    }
    
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM content_comments WHERE content_id = $1 AND parent_comment_id IS NULL AND is_deleted = false"
    )
    .bind(&content_id)
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(CommentListResponse {
        success: true,
        comments,
        total,
    }))
}

/// PUT /api/v1/comments/:comment_id
/// Update a comment
pub async fn update_comment(
    Extension(claims): Extension<Claims>,
    PathExtractor(comment_id): PathExtractor<String>,
    State(state): State<AppState>,
    Json(request): Json<CreateCommentRequest>,
) -> Result<Json<CommentResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    // Verify ownership
    let owner: Option<String> = sqlx::query_scalar(
        "SELECT user_id FROM content_comments WHERE comment_id = $1 AND user_id = $2"
    )
    .bind(&comment_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    if owner.is_none() {
        return Ok(Json(CommentResponse {
            success: false,
            comment: None,
            message: "Comment not found or you don't have permission".to_string(),
        }));
    }
    
    sqlx::query(
        "UPDATE content_comments SET comment_text = $1 WHERE comment_id = $2"
    )
    .bind(&request.comment_text)
    .bind(&comment_id)
    .execute(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Get updated comment
    let row = sqlx::query(
        r#"
        SELECT 
            cc.comment_id,
            cc.content_id,
            cc.user_id,
            u.username,
            cc.comment_text,
            cc.parent_comment_id,
            cc.likes_count,
            cc.created_at,
            cc.updated_at,
            cc.is_edited
        FROM content_comments cc
        LEFT JOIN users u ON u.wallet_address = cc.user_id
        WHERE cc.comment_id = $1
        "#
    )
    .bind(&comment_id)
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let comment = Comment {
        comment_id: row.get("comment_id"),
        content_id: row.get("content_id"),
        user_id: row.get("user_id"),
        username: row.get("username"),
        comment_text: row.get("comment_text"),
        parent_comment_id: row.get("parent_comment_id"),
        likes_count: row.get("likes_count"),
        is_liked: false,
        created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
        updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
        is_edited: row.get("is_edited"),
        replies: Vec::new(),
    };
    
    Ok(Json(CommentResponse {
        success: true,
        comment: Some(comment),
        message: "Comment updated successfully".to_string(),
    }))
}

/// DELETE /api/v1/comments/:comment_id
/// Delete a comment (soft delete)
pub async fn delete_comment(
    Extension(claims): Extension<Claims>,
    PathExtractor(comment_id): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<CommentResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    // Verify ownership
    let owner: Option<String> = sqlx::query_scalar(
        "SELECT user_id FROM content_comments WHERE comment_id = $1 AND user_id = $2"
    )
    .bind(&comment_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    if owner.is_none() {
        return Ok(Json(CommentResponse {
            success: false,
            comment: None,
            message: "Comment not found or you don't have permission".to_string(),
        }));
    }
    
    sqlx::query(
        "UPDATE content_comments SET is_deleted = true, comment_text = '[deleted]' WHERE comment_id = $1"
    )
    .bind(&comment_id)
    .execute(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(CommentResponse {
        success: true,
        comment: None,
        message: "Comment deleted successfully".to_string(),
    }))
}

/// POST /api/v1/comments/:comment_id/like
/// Like/unlike a comment
pub async fn toggle_comment_like(
    Extension(claims): Extension<Claims>,
    PathExtractor(comment_id): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    // Check if already liked
    let existing: Option<String> = sqlx::query_scalar(
        "SELECT like_id FROM comment_likes WHERE comment_id = $1 AND user_id = $2"
    )
    .bind(&comment_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    if existing.is_some() {
        // Unlike
        sqlx::query(
            "DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2"
        )
        .bind(&comment_id)
        .bind(user_id)
        .execute(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        
        Ok(Json(serde_json::json!({
            "success": true,
            "is_liked": false,
            "message": "Comment unliked"
        })))
    } else {
        // Like
        let like_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO comment_likes (like_id, comment_id, user_id) VALUES ($1, $2, $3)"
        )
        .bind(&like_id)
        .bind(&comment_id)
        .bind(user_id)
        .execute(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        
        // Create notification for comment owner
        let comment_owner: Option<String> = sqlx::query_scalar::<_, String>(
            "SELECT user_id FROM content_comments WHERE comment_id = $1"
        )
        .bind(&comment_id)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();
        
        if let Some(owner) = comment_owner {
            if owner != *user_id {
                let _ = create_notification(
                    pool,
                    &owner,
                    "like",
                    "Comment Liked",
                    &format!("{} liked your comment", user_id),
                    None,
                    Some(user_id.clone()),
                ).await;
            }
        }
        
        Ok(Json(serde_json::json!({
            "success": true,
            "is_liked": true,
            "message": "Comment liked"
        })))
    }
}

// Helper functions
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

async fn get_content_owner(pool: &sqlx::PgPool, content_id: &str) -> Option<String> {
    sqlx::query_scalar("SELECT artist_id FROM content WHERE content_id = $1")
        .bind(content_id)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
}

pub fn comment_routes() -> axum::Router<AppState> {
    use axum::routing::{get, post, put, delete};
    axum::Router::new()
        .route("/:content_id/comments", post(create_comment))
        .route("/:content_id/comments", get(get_comments))
        .route("/comments/:comment_id", put(update_comment))
        .route("/comments/:comment_id", delete(delete_comment))
        .route("/comments/:comment_id/like", post(toggle_comment_like))
}

