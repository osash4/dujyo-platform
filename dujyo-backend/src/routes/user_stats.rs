use axum::{
    extract::{Path as PathExtractor, State, Extension},
    http::StatusCode,
    response::Json,
};
use serde::Serialize;
use sqlx::Row;
use crate::server::AppState;
use crate::auth::Claims;

#[derive(Serialize)]
pub struct UserStatsResponse {
    pub success: bool,
    pub stats: UserStats,
}

#[derive(Serialize)]
pub struct UserStats {
    pub total_listening_minutes: i64,
    pub total_content_played: i32,
    pub total_likes_given: i32,
    pub total_comments_made: i32,
    pub total_reviews_written: i32,
    pub total_followers: i32,
    pub total_following: i32,
    pub favorite_genres: Vec<String>,
    pub longest_streak_days: i32,
    pub current_streak_days: i32,
    pub last_active_at: Option<String>,
}

/// GET /api/v1/users/:user_id/stats
pub async fn get_user_stats(
    Extension(_claims): Extension<Claims>,
    PathExtractor(user_id): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<UserStatsResponse>, StatusCode> {
    let pool = &state.storage.pool;
    
    // Get or create user statistics
    let row = sqlx::query(
        r#"
        SELECT 
            COALESCE(us.total_listening_minutes, 0) as total_listening_minutes,
            COALESCE(us.total_content_played, 0) as total_content_played,
            COALESCE(us.total_likes_given, 0) as total_likes_given,
            COALESCE(us.total_comments_made, 0) as total_comments_made,
            COALESCE(us.total_reviews_written, 0) as total_reviews_written,
            COALESCE(us.total_followers, 0) as total_followers,
            COALESCE(us.total_following, 0) as total_following,
            COALESCE(us.favorite_genres, '[]'::jsonb) as favorite_genres,
            COALESCE(us.longest_streak_days, 0) as longest_streak_days,
            COALESCE(us.current_streak_days, 0) as current_streak_days,
            us.last_active_at
        FROM user_statistics us
        WHERE us.user_id = $1
        "#
    )
    .bind(&user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error fetching user stats: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let stats = if let Some(row) = row {
        let genres_json: serde_json::Value = row.get("favorite_genres");
        let favorite_genres: Vec<String> = genres_json.as_array()
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
            .unwrap_or_default();
        
        UserStats {
            total_listening_minutes: row.get("total_listening_minutes"),
            total_content_played: row.get("total_content_played"),
            total_likes_given: row.get("total_likes_given"),
            total_comments_made: row.get("total_comments_made"),
            total_reviews_written: row.get("total_reviews_written"),
            total_followers: row.get("total_followers"),
            total_following: row.get("total_following"),
            favorite_genres,
            longest_streak_days: row.get("longest_streak_days"),
            current_streak_days: row.get("current_streak_days"),
            last_active_at: row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_active_at")
                .map(|dt| dt.to_rfc3339()),
        }
    } else {
        // Create default stats
        let stat_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO user_statistics (stat_id, user_id) VALUES ($1, $2)"
        )
        .bind(&stat_id)
        .bind(&user_id)
        .execute(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        
        UserStats {
            total_listening_minutes: 0,
            total_content_played: 0,
            total_likes_given: 0,
            total_comments_made: 0,
            total_reviews_written: 0,
            total_followers: 0,
            total_following: 0,
            favorite_genres: Vec::new(),
            longest_streak_days: 0,
            current_streak_days: 0,
            last_active_at: None,
        }
    };
    
    Ok(Json(UserStatsResponse {
        success: true,
        stats,
    }))
}

pub fn user_stats_routes() -> axum::Router<AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route("/:user_id/stats", get(get_user_stats))
}

