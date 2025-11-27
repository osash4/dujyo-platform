use axum::{
    extract::{Query, State, Extension},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{self, Row};
use std::collections::HashMap;

use crate::server::AppState;
use crate::auth::Claims;

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct Recommendation {
    pub id: String,
    pub title: String,
    pub r#type: String, // 'music', 'video', 'gaming', 'playlist'
    pub description: Option<String>,
    pub image: Option<String>,
    pub artist: Option<String>,
    pub reason: String,
    pub score: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecommendationsResponse {
    pub success: bool,
    pub recommendations: Vec<Recommendation>,
    pub based_on: String, // 'history', 'genre', 'similar_artists', 'trending', 'mixed'
}

// ============================================================================
// ROUTES
// ============================================================================

pub fn recommendations_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(get_recommendations))
        .route("/history", get(get_history_based))
        .route("/genre", get(get_genre_based))
        .route("/similar", get(get_similar_artists))
}

// ============================================================================
// HANDLERS
// ============================================================================

/// GET /api/v1/recommendations?limit=20&type=mixed
/// Get mixed recommendations
async fn get_recommendations(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<RecommendationsResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let limit: i64 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(20);
    let default_type = "mixed";
    let rec_type_str = params.get("type").map(|s| s.as_str()).unwrap_or(default_type);
    
    let mut recommendations: Vec<Recommendation> = Vec::new();
    
    // Get user's listening history
    let history_rows = sqlx::query(
        r#"
        SELECT content_id, COUNT(*) as play_count, MAX(listened_at) as last_played
        FROM listening_history
        WHERE user_id = $1
        GROUP BY content_id
        ORDER BY play_count DESC, last_played DESC
        LIMIT 10
        "#
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error fetching listening history: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Get genres from history
    let mut favorite_genres: Vec<String> = Vec::new();
    for row in &history_rows {
        let content_id: String = row.get("content_id");
        let genre: Option<String> = sqlx::query_scalar(
            "SELECT genre FROM content WHERE content_id = $1"
        )
        .bind(&content_id)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();
        
        if let Some(g) = genre {
            if !favorite_genres.contains(&g) {
                favorite_genres.push(g);
            }
        }
    }
    
    // Strategy 1: Based on favorite genres
    if !favorite_genres.is_empty() {
        // Get recommendations for first favorite genre (simplified for MVP)
        let first_genre = &favorite_genres[0];
        let genre_rows = sqlx::query(
            r#"
            SELECT content_id, title, content_type, description, thumbnail_url, artist_name, genre
            FROM content
            WHERE genre = $1
            AND content_id NOT IN (
                SELECT content_id FROM listening_history WHERE user_id = $2
            )
            ORDER BY created_at DESC
            LIMIT $3
            "#
        )
        .bind(first_genre)
        .bind(user_id)
        .bind(limit / 2)
        .fetch_all(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        
        for row in genre_rows {
            let content_type_str: String = row.get("content_type");
            let result_type = match content_type_str.as_str() {
                "audio" => "music",
                "video" => "video",
                "gaming" => "gaming",
                _ => "music",
            };
            
            recommendations.push(Recommendation {
                id: row.get("content_id"),
                title: row.get("title"),
                r#type: result_type.to_string(),
                description: row.get("description"),
                image: row.get("thumbnail_url"),
                artist: row.get("artist_name"),
                reason: format!("Similar to your {} preferences", row.get::<Option<String>, _>("genre").unwrap_or("favorite".to_string())),
                score: Some(0.85),
            });
        }
    }
    
    // Strategy 2: Trending content (if we need more recommendations)
    if recommendations.len() < limit as usize {
        let trending_rows = sqlx::query(
            r#"
            SELECT content_id, title, content_type, description, thumbnail_url, artist_name, genre
            FROM content
            WHERE content_id NOT IN (
                SELECT content_id FROM listening_history WHERE user_id = $1
            )
            ORDER BY created_at DESC
            LIMIT $2
            "#
        )
        .bind(user_id)
        .bind(limit - recommendations.len() as i64)
        .fetch_all(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        
        for row in trending_rows {
            let content_type_str: String = row.get("content_type");
            let result_type = match content_type_str.as_str() {
                "audio" => "music",
                "video" => "video",
                "gaming" => "gaming",
                _ => "music",
            };
            
            recommendations.push(Recommendation {
                id: row.get("content_id"),
                title: row.get("title"),
                r#type: result_type.to_string(),
                description: row.get("description"),
                image: row.get("thumbnail_url"),
                artist: row.get("artist_name"),
                reason: "Trending on DUJYO".to_string(),
                score: Some(0.75),
            });
        }
    }
    
    Ok(Json(RecommendationsResponse {
        success: true,
        recommendations,
        based_on: rec_type_str.to_string(),
    }))
}

/// GET /api/v1/recommendations/history?limit=20
/// Get recommendations based on listening history
async fn get_history_based(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<RecommendationsResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let limit: i64 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(20);
    
    // Get most played genres
    let genre_rows = sqlx::query(
        r#"
        SELECT c.genre, COUNT(*) as play_count
        FROM listening_history lh
        JOIN content c ON lh.content_id = c.content_id
        WHERE lh.user_id = $1 AND c.genre IS NOT NULL
        GROUP BY c.genre
        ORDER BY play_count DESC
        LIMIT 3
        "#
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let mut recommendations: Vec<Recommendation> = Vec::new();
    
    for row in genre_rows {
        let genre: String = row.get("genre");
        let content_rows = sqlx::query(
            r#"
            SELECT content_id, title, content_type, description, thumbnail_url, artist_name
            FROM content
            WHERE genre = $1
            AND content_id NOT IN (
                SELECT content_id FROM listening_history WHERE user_id = $2
            )
            ORDER BY created_at DESC
            LIMIT $3
            "#
        )
        .bind(&genre)
        .bind(user_id)
        .bind(limit / 3)
        .fetch_all(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        
        for content_row in content_rows {
            let content_type_str: String = content_row.get("content_type");
            let result_type = match content_type_str.as_str() {
                "audio" => "music",
                "video" => "video",
                "gaming" => "gaming",
                _ => "music",
            };
            
            recommendations.push(Recommendation {
                id: content_row.get("content_id"),
                title: content_row.get("title"),
                r#type: result_type.to_string(),
                description: content_row.get("description"),
                image: content_row.get("thumbnail_url"),
                artist: content_row.get("artist_name"),
                reason: format!("Based on your {} listening history", genre),
                score: Some(0.9),
            });
        }
    }
    
    Ok(Json(RecommendationsResponse {
        success: true,
        recommendations,
        based_on: "history".to_string(),
    }))
}

/// GET /api/v1/recommendations/genre?genre=electronic&limit=20
/// Get recommendations based on genre
async fn get_genre_based(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<RecommendationsResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let genre = params.get("genre").ok_or(StatusCode::BAD_REQUEST)?;
    let limit: i64 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(20);
    
    let rows = sqlx::query(
        r#"
        SELECT content_id, title, content_type, description, thumbnail_url, artist_name
        FROM content
        WHERE genre = $1
        AND content_id NOT IN (
            SELECT content_id FROM listening_history WHERE user_id = $2
        )
        ORDER BY created_at DESC
        LIMIT $3
        "#
    )
    .bind(genre)
    .bind(user_id)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let recommendations: Vec<Recommendation> = rows.into_iter().map(|row| {
        let content_type_str: String = row.get("content_type");
        let result_type = match content_type_str.as_str() {
            "audio" => "music",
            "video" => "video",
            "gaming" => "gaming",
            _ => "music",
        };
        
        Recommendation {
            id: row.get("content_id"),
            title: row.get("title"),
            r#type: result_type.to_string(),
            description: row.get("description"),
            image: row.get("thumbnail_url"),
            artist: row.get("artist_name"),
            reason: format!("Similar {} content", genre),
            score: Some(0.85),
        }
    }).collect();
    
    Ok(Json(RecommendationsResponse {
        success: true,
        recommendations,
        based_on: format!("genre:{}", genre),
    }))
}

/// GET /api/v1/recommendations/similar?artist_id=xxx&limit=20
/// Get recommendations based on similar artists
async fn get_similar_artists(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<RecommendationsResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let artist_id = params.get("artist_id").ok_or(StatusCode::BAD_REQUEST)?;
    let limit: i64 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(20);
    
    // Get genre of the artist's content
    let genre: Option<String> = sqlx::query_scalar(
        "SELECT genre FROM content WHERE artist_id = $1 LIMIT 1"
    )
    .bind(artist_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let rows = if let Some(genre_val) = genre {
        sqlx::query(
            r#"
            SELECT content_id, title, content_type, description, thumbnail_url, artist_name
            FROM content
            WHERE genre = $1
            AND artist_id != $2
            AND content_id NOT IN (
                SELECT content_id FROM listening_history WHERE user_id = $3
            )
            ORDER BY created_at DESC
            LIMIT $4
            "#
        )
        .bind(&genre_val)
        .bind(artist_id)
        .bind(user_id)
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    } else {
        Vec::new()
    };
    
    let recommendations: Vec<Recommendation> = rows.into_iter().map(|row| {
        let content_type_str: String = row.get("content_type");
        let result_type = match content_type_str.as_str() {
            "audio" => "music",
            "video" => "video",
            "gaming" => "gaming",
            _ => "music",
        };
        
        Recommendation {
            id: row.get("content_id"),
            title: row.get("title"),
            r#type: result_type.to_string(),
            description: row.get("description"),
            image: row.get("thumbnail_url"),
            artist: row.get("artist_name"),
            reason: "From similar artists".to_string(),
            score: Some(0.9),
        }
    }).collect();
    
    Ok(Json(RecommendationsResponse {
        success: true,
        recommendations,
        based_on: format!("similar_artists:{}", artist_id),
    }))
}

