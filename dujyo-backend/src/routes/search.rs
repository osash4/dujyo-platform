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
use crate::auth::{Claims, jwt_middleware};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub r#type: String, // 'music', 'video', 'gaming', 'user', 'playlist'
    pub description: Option<String>,
    pub image: Option<String>,
    pub artist: Option<String>,
    pub duration: Option<String>,
    pub rating: Option<f64>,
    pub url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResponse {
    pub success: bool,
    pub results: Vec<SearchResult>,
    pub total: i64,
    pub query: String,
}

// ============================================================================
// ROUTES
// ============================================================================

pub fn search_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(search_content))
}

// ============================================================================
// HANDLERS
// ============================================================================

/// GET /api/v1/search?q=query&type=music&limit=20
/// Search for content, users, and playlists
async fn search_content(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<SearchResponse>, StatusCode> {
    let _user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let query = params.get("q").unwrap_or(&String::new()).clone();
    let content_type = params.get("type");
    let limit: i64 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(20);
    
    if query.is_empty() {
        return Ok(Json(SearchResponse {
            success: true,
            results: vec![],
            total: 0,
            query: String::new(),
        }));
    }
    
    let mut results: Vec<SearchResult> = Vec::new();
    
    // Search in content
    let content_query = if let Some(_ct) = content_type {
        format!(
            r#"
            SELECT 
                content_id as id,
                title,
                content_type as type,
                description,
                thumbnail_url as image,
                artist_name as artist,
                genre,
                price,
                created_at
            FROM content
            WHERE (LOWER(title) LIKE LOWER($1) OR LOWER(description) LIKE LOWER($1) OR LOWER(artist_name) LIKE LOWER($1))
            AND content_type = $2
            ORDER BY created_at DESC
            LIMIT $3
            "#,
        )
    } else {
        format!(
            r#"
            SELECT 
                content_id as id,
                title,
                content_type as type,
                description,
                thumbnail_url as image,
                artist_name as artist,
                genre,
                price,
                created_at
            FROM content
            WHERE LOWER(title) LIKE LOWER($1) OR LOWER(description) LIKE LOWER($1) OR LOWER(artist_name) LIKE LOWER($1)
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
    };
    
    let search_pattern = format!("%{}%", query);
    
    let content_rows = if let Some(ct) = content_type {
        sqlx::query(&content_query)
            .bind(&search_pattern)
            .bind(ct)
            .bind(limit)
            .fetch_all(pool)
            .await
            .map_err(|e| {
                eprintln!("❌ Error searching content: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?
    } else {
        sqlx::query(&content_query)
            .bind(&search_pattern)
            .bind(limit)
            .fetch_all(pool)
            .await
            .map_err(|e| {
                eprintln!("❌ Error searching content: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?
    };
    
    for row in content_rows {
        let content_type_str: String = row.get("type");
        let result_type = match content_type_str.as_str() {
            "audio" => "music",
            "video" => "video",
            "gaming" => "gaming",
            _ => "music",
        };
        
        results.push(SearchResult {
            id: row.get("id"),
            title: row.get("title"),
            r#type: result_type.to_string(),
            description: row.get("description"),
            image: row.get("image"),
            artist: row.get("artist"),
            duration: None, // TODO: Add duration to content table
            rating: None, // TODO: Add rating system
            url: Some(format!("/content/{}", row.get::<String, _>("id"))),
        });
    }
    
    // Search in playlists (if query is long enough)
    if query.len() >= 3 {
        let playlist_query = format!(
            r#"
            SELECT 
                playlist_id as id,
                title,
                'playlist' as type,
                description,
                cover_image_url as image,
                user_id,
                is_public,
                track_count,
                created_at
            FROM playlists
            WHERE (LOWER(title) LIKE LOWER($1) OR LOWER(description) LIKE LOWER($1))
            AND (is_public = true OR user_id = $2)
            ORDER BY track_count DESC, created_at DESC
            LIMIT $3
            "#,
        );
        
        let playlist_rows = sqlx::query(&playlist_query)
            .bind(&search_pattern)
            .bind(_user_id)
            .bind(limit / 2) // Limit playlists to half of total
            .fetch_all(pool)
            .await
            .map_err(|e| {
                eprintln!("❌ Error searching playlists: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
        
        for row in playlist_rows {
            results.push(SearchResult {
                id: row.get("id"),
                title: row.get("title"),
                r#type: "playlist".to_string(),
                description: row.get("description"),
                image: row.get("image"),
                artist: None,
                duration: None,
                rating: None,
                url: Some(format!("/playlist/{}", row.get::<String, _>("id"))),
            });
        }
    }
    
    // Search in users (if query is long enough)
    if query.len() >= 3 {
        let user_query = format!(
            r#"
            SELECT 
                wallet_address as id,
                COALESCE(username, wallet_address) as title,
                'user' as type,
                NULL as description,
                avatar_url as image,
                user_type,
                created_at
            FROM users
            WHERE LOWER(COALESCE(username, wallet_address)) LIKE LOWER($1)
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        );
        
        let user_rows = sqlx::query(&user_query)
            .bind(&search_pattern)
            .bind(limit / 3) // Limit users to third of total
            .fetch_all(pool)
            .await
            .map_err(|e| {
                eprintln!("❌ Error searching users: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
        
        for row in user_rows {
            results.push(SearchResult {
                id: row.get("id"),
                title: row.get("title"),
                r#type: "user".to_string(),
                description: Some(format!("User on DUJYO")),
                image: row.get("image"),
                artist: None,
                duration: None,
                rating: None,
                url: Some(format!("/user/{}", row.get::<String, _>("id"))),
            });
        }
    }
    
    let total = results.len() as i64;
    
    Ok(Json(SearchResponse {
        success: true,
        results,
        total,
        query,
    }))
}

