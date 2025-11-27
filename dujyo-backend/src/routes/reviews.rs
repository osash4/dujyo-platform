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
pub struct Review {
    pub review_id: String,
    pub content_id: String,
    pub user_id: String,
    pub username: Option<String>,
    pub rating: i32,
    pub review_text: Option<String>,
    pub helpful_count: i32,
    pub is_helpful: bool,
    pub created_at: String,
    pub updated_at: String,
    pub is_edited: bool,
}

#[derive(Serialize)]
pub struct ReviewListResponse {
    pub success: bool,
    pub reviews: Vec<Review>,
    pub total: i64,
    pub average_rating: f64,
}

#[derive(Deserialize)]
pub struct CreateReviewRequest {
    pub rating: i32,
    pub review_text: Option<String>,
}

#[derive(Serialize)]
pub struct ReviewResponse {
    pub success: bool,
    pub review: Option<Review>,
    pub message: String,
}

/// POST /api/v1/content/:content_id/reviews
pub async fn create_review(
    Extension(claims): Extension<Claims>,
    PathExtractor(content_id): PathExtractor<String>,
    State(state): State<AppState>,
    Json(request): Json<CreateReviewRequest>,
) -> Result<Json<ReviewResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    if request.rating < 1 || request.rating > 5 {
        return Ok(Json(ReviewResponse {
            success: false,
            review: None,
            message: "Rating must be between 1 and 5".to_string(),
        }));
    }
    
    // Check if review already exists
    let existing: Option<String> = sqlx::query_scalar(
        "SELECT review_id FROM content_reviews WHERE content_id = $1 AND user_id = $2"
    )
    .bind(&content_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let review_id = if let Some(existing_id) = existing {
        // Update existing review
        sqlx::query(
            "UPDATE content_reviews SET rating = $1, review_text = $2 WHERE review_id = $3"
        )
        .bind(request.rating)
        .bind(&request.review_text)
        .bind(&existing_id)
        .execute(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        existing_id
    } else {
        // Create new review
        let new_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO content_reviews (review_id, content_id, user_id, rating, review_text) VALUES ($1, $2, $3, $4, $5)"
        )
        .bind(&new_id)
        .bind(&content_id)
        .bind(user_id)
        .bind(request.rating)
        .bind(&request.review_text)
        .execute(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        new_id
    };
    
    // Get the review
    let row = sqlx::query(
        r#"
        SELECT 
            cr.review_id,
            cr.content_id,
            cr.user_id,
            u.username,
            cr.rating,
            cr.review_text,
            cr.helpful_count,
            cr.created_at,
            cr.updated_at,
            cr.is_edited
        FROM content_reviews cr
        LEFT JOIN users u ON u.wallet_address = cr.user_id
        WHERE cr.review_id = $1
        "#
    )
    .bind(&review_id)
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let review = Review {
        review_id: row.get("review_id"),
        content_id: row.get("content_id"),
        user_id: row.get("user_id"),
        username: row.get("username"),
        rating: row.get("rating"),
        review_text: row.get("review_text"),
        helpful_count: row.get("helpful_count"),
        is_helpful: false,
        created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
        updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
        is_edited: row.get("is_edited"),
    };
    
    Ok(Json(ReviewResponse {
        success: true,
        review: Some(review),
        message: "Review created successfully".to_string(),
    }))
}

/// GET /api/v1/content/:content_id/reviews
pub async fn get_reviews(
    Extension(claims): Extension<Claims>,
    PathExtractor(content_id): PathExtractor<String>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<ReviewListResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let limit: i64 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(20);
    let offset: i64 = params.get("offset").and_then(|v| v.parse().ok()).unwrap_or(0);
    
    let rows = sqlx::query(
        r#"
        SELECT 
            cr.review_id,
            cr.content_id,
            cr.user_id,
            u.username,
            cr.rating,
            cr.review_text,
            cr.helpful_count,
            cr.created_at,
            cr.updated_at,
            cr.is_edited,
            EXISTS(
                SELECT 1 FROM review_helpful_votes rhv 
                WHERE rhv.review_id = cr.review_id AND rhv.user_id = $2 AND rhv.is_helpful = true
            ) as is_helpful
        FROM content_reviews cr
        LEFT JOIN users u ON u.wallet_address = cr.user_id
        WHERE cr.content_id = $1
        ORDER BY cr.helpful_count DESC, cr.created_at DESC
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
        eprintln!("❌ Error fetching reviews: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let reviews: Vec<Review> = rows.into_iter().map(|row| Review {
        review_id: row.get("review_id"),
        content_id: row.get("content_id"),
        user_id: row.get("user_id"),
        username: row.get("username"),
        rating: row.get("rating"),
        review_text: row.get("review_text"),
        helpful_count: row.get("helpful_count"),
        is_helpful: row.get("is_helpful"),
        created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
        updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
        is_edited: row.get("is_edited"),
    }).collect();
    
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM content_reviews WHERE content_id = $1"
    )
    .bind(&content_id)
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let avg_rating: Option<f64> = sqlx::query_scalar(
        "SELECT AVG(rating)::float FROM content_reviews WHERE content_id = $1"
    )
    .bind(&content_id)
    .fetch_one(pool)
    .await
    .ok()
    .flatten();
    
    Ok(Json(ReviewListResponse {
        success: true,
        reviews,
        total,
        average_rating: avg_rating.unwrap_or(0.0),
    }))
}

/// POST /api/v1/reviews/:review_id/helpful
pub async fn toggle_review_helpful(
    Extension(claims): Extension<Claims>,
    PathExtractor(review_id): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let existing_row = sqlx::query(
        "SELECT vote_id, is_helpful FROM review_helpful_votes WHERE review_id = $1 AND user_id = $2"
    )
    .bind(&review_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let existing: Option<(String, bool)> = existing_row.map(|row| (
        row.get::<String, _>("vote_id"),
        row.get::<bool, _>("is_helpful")
    ));
    
    if let Some((vote_id, current_helpful)) = existing {
        if current_helpful {
            // Remove helpful vote
            sqlx::query("DELETE FROM review_helpful_votes WHERE vote_id = $1")
                .bind(&vote_id)
                .execute(pool)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            
            Ok(Json(serde_json::json!({
                "success": true,
                "is_helpful": false,
                "message": "Helpful vote removed"
            })))
        } else {
            // Update to helpful
            sqlx::query("UPDATE review_helpful_votes SET is_helpful = true WHERE vote_id = $1")
                .bind(&vote_id)
                .execute(pool)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            
            Ok(Json(serde_json::json!({
                "success": true,
                "is_helpful": true,
                "message": "Marked as helpful"
            })))
        }
    } else {
        // Create new helpful vote
        let vote_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO review_helpful_votes (vote_id, review_id, user_id, is_helpful) VALUES ($1, $2, $3, true)"
        )
        .bind(&vote_id)
        .bind(&review_id)
        .bind(user_id)
        .execute(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        
        Ok(Json(serde_json::json!({
            "success": true,
            "is_helpful": true,
            "message": "Marked as helpful"
        })))
    }
}

pub fn review_routes() -> axum::Router<AppState> {
    use axum::routing::{get, post};
    axum::Router::new()
        .route("/:content_id/reviews", post(create_review))
        .route("/:content_id/reviews", get(get_reviews))
        .route("/reviews/:review_id/helpful", post(toggle_review_helpful))
}

