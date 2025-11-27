use axum::{
    extract::{Query, State, Extension},
    http::StatusCode,
    response::Json,
};
use serde::Serialize;
use sqlx::Row;
use std::collections::HashMap;
use crate::server::AppState;
use crate::auth::Claims;

#[derive(Serialize)]
pub struct TrendingItem {
    pub id: String,
    pub title: String,
    pub r#type: String,
    pub thumbnail_url: Option<String>,
    pub artist_name: Option<String>,
    pub trend_score: f64,
    pub trend_direction: String, // 'up', 'down', 'stable'
    pub play_count: i64,
    pub like_count: i64,
    pub comment_count: i64,
}

#[derive(Serialize)]
pub struct TrendingResponse {
    pub success: bool,
    pub items: Vec<TrendingItem>,
    pub period: String, // '24h', '7d', '30d'
}

/// GET /api/v1/trending
pub async fn get_trending(
    Extension(_claims): Extension<Claims>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<TrendingResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let period = params.get("period").map(|s| s.as_str()).unwrap_or("24h");
    let limit: i64 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(20);
    
    let time_window = match period {
        "7d" => 7,
        "30d" => 30,
        _ => 1, // 24h default
    };
    
    // Advanced trending algorithm: combines plays, likes, comments, and recent activity
    let rows = sqlx::query(
        r#"
        WITH content_stats AS (
            SELECT 
                c.content_id,
                c.title,
                c.content_type,
                c.thumbnail_url,
                c.artist_name,
                COUNT(DISTINCT lh.history_id) as play_count,
                COUNT(DISTINCT cl.like_id) as like_count,
                COUNT(DISTINCT cc.comment_id) as comment_count,
                MAX(lh.listened_at) as last_played
            FROM content c
            LEFT JOIN listening_history lh ON lh.content_id = c.content_id 
                AND lh.listened_at > NOW() - INTERVAL '1 day' * $1
            LEFT JOIN comment_likes cl ON cl.comment_id IN (
                SELECT comment_id FROM content_comments WHERE content_id = c.content_id
            ) AND EXISTS(
                SELECT 1 FROM content_comments cc2 
                WHERE cc2.comment_id = cl.comment_id 
                AND cc2.created_at > NOW() - INTERVAL '1 day' * $1
            )
            LEFT JOIN content_comments cc ON cc.content_id = c.content_id 
                AND cc.created_at > NOW() - INTERVAL '1 day' * $1
            GROUP BY c.content_id, c.title, c.content_type, c.thumbnail_url, c.artist_name
        ),
        trending_scores AS (
            SELECT 
                *,
                (play_count * 1.0 + like_count * 2.0 + comment_count * 3.0) as trend_score,
                CASE 
                    WHEN play_count > (SELECT AVG(play_count) FROM content_stats) * 1.5 THEN 'up'
                    WHEN play_count < (SELECT AVG(play_count) FROM content_stats) * 0.5 THEN 'down'
                    ELSE 'stable'
                END as trend_direction
            FROM content_stats
            WHERE play_count > 0 OR like_count > 0 OR comment_count > 0
        )
        SELECT 
            content_id as id,
            title,
            CASE content_type
                WHEN 'audio' THEN 'music'
                WHEN 'video' THEN 'video'
                WHEN 'gaming' THEN 'gaming'
                ELSE 'music'
            END as type,
            thumbnail_url,
            artist_name,
            trend_score,
            trend_direction,
            play_count,
            like_count,
            comment_count
        FROM trending_scores
        ORDER BY trend_score DESC, last_played DESC
        LIMIT $2
        "#
    )
    .bind(time_window)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error fetching trending: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let items: Vec<TrendingItem> = rows.into_iter().map(|row| TrendingItem {
        id: row.get("id"),
        title: row.get("title"),
        r#type: row.get("type"),
        thumbnail_url: row.get("thumbnail_url"),
        artist_name: row.get("artist_name"),
        trend_score: row.get::<f64, _>("trend_score"),
        trend_direction: row.get("trend_direction"),
        play_count: row.get("play_count"),
        like_count: row.get("like_count"),
        comment_count: row.get("comment_count"),
    }).collect();
    
    Ok(Json(TrendingResponse {
        success: true,
        items,
        period: period.to_string(),
    }))
}

pub fn trending_routes() -> axum::Router<AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route("/", get(get_trending))
}

