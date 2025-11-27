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
pub struct Achievement {
    pub achievement_id: String,
    pub achievement_code: String,
    pub name: String,
    pub description: Option<String>,
    pub icon_url: Option<String>,
    pub category: Option<String>,
    pub rarity: String,
    pub points: i32,
    pub unlocked_at: Option<String>,
    pub progress: i32,
}

#[derive(Serialize)]
pub struct AchievementListResponse {
    pub success: bool,
    pub achievements: Vec<Achievement>,
    pub total: i64,
}

/// GET /api/v1/achievements
pub async fn get_available_achievements(
    Extension(_claims): Extension<Claims>,
    State(state): State<AppState>,
) -> Result<Json<AchievementListResponse>, StatusCode> {
    let pool = &state.storage.pool;
    
    let rows = sqlx::query(
        "SELECT achievement_id, achievement_code, name, description, icon_url, category, rarity, points FROM achievements ORDER BY points DESC"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error fetching achievements: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let achievements: Vec<Achievement> = rows.into_iter().map(|row| Achievement {
        achievement_id: row.get("achievement_id"),
        achievement_code: row.get("achievement_code"),
        name: row.get("name"),
        description: row.get("description"),
        icon_url: row.get("icon_url"),
        category: row.get("category"),
        rarity: row.get("rarity"),
        points: row.get("points"),
        unlocked_at: None,
        progress: 0,
    }).collect();
    
    let total = achievements.len() as i64;
    
    Ok(Json(AchievementListResponse {
        success: true,
        achievements,
        total,
    }))
}

/// GET /api/v1/users/:user_id/achievements
pub async fn get_user_achievements(
    Extension(_claims): Extension<Claims>,
    PathExtractor(user_id): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<AchievementListResponse>, StatusCode> {
    let pool = &state.storage.pool;
    
    let rows = sqlx::query(
        r#"
        SELECT 
            a.achievement_id,
            a.achievement_code,
            a.name,
            a.description,
            a.icon_url,
            a.category,
            a.rarity,
            a.points,
            ua.unlocked_at,
            ua.progress
        FROM user_achievements ua
        JOIN achievements a ON a.achievement_id = ua.achievement_id
        WHERE ua.user_id = $1
        ORDER BY ua.unlocked_at DESC
        "#
    )
    .bind(&user_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error fetching user achievements: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let achievements: Vec<Achievement> = rows.into_iter().map(|row| Achievement {
        achievement_id: row.get("achievement_id"),
        achievement_code: row.get("achievement_code"),
        name: row.get("name"),
        description: row.get("description"),
        icon_url: row.get("icon_url"),
        category: row.get("category"),
        rarity: row.get("rarity"),
        points: row.get("points"),
        unlocked_at: row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("unlocked_at")
            .map(|dt| dt.to_rfc3339()),
        progress: row.get("progress"),
    }).collect();
    
    let total = achievements.len() as i64;
    
    Ok(Json(AchievementListResponse {
        success: true,
        achievements,
        total,
    }))
}

/// POST /api/v1/achievements/:achievement_code/unlock
pub async fn unlock_achievement(
    Extension(claims): Extension<Claims>,
    PathExtractor(achievement_code): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    // Get achievement
    let achievement_id: Option<String> = sqlx::query_scalar::<_, String>(
        "SELECT achievement_id FROM achievements WHERE achievement_code = $1"
    )
    .bind(&achievement_code)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let achievement_id = if let Some(id) = achievement_id {
        id
    } else {
        return Ok(Json(serde_json::json!({
            "success": false,
            "message": "Achievement not found"
        })));
    };
    
    // Check if already unlocked
    let existing: Option<String> = sqlx::query_scalar(
        "SELECT user_achievement_id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2"
    )
    .bind(user_id)
    .bind(&achievement_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    if existing.is_some() {
        return Ok(Json(serde_json::json!({
            "success": false,
            "message": "Achievement already unlocked"
        })));
    }
    
    // Unlock achievement
    let user_achievement_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO user_achievements (user_achievement_id, user_id, achievement_id, progress) VALUES ($1, $2, $3, 100)"
    )
    .bind(&user_achievement_id)
    .bind(user_id)
    .bind(&achievement_id)
    .execute(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Create notification
    let achievement_name: Option<String> = sqlx::query_scalar(
        "SELECT name FROM achievements WHERE achievement_id = $1"
    )
    .bind(&achievement_id)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();
    
    let _ = create_notification(
        pool,
        user_id,
        "achievement",
        "Achievement Unlocked!",
        &format!("You unlocked: {}", achievement_name.unwrap_or("Achievement".to_string())),
        None,
        None,
    ).await;
    
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Achievement unlocked"
    })))
}

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

pub fn achievement_routes() -> axum::Router<AppState> {
    use axum::routing::{get, post};
    axum::Router::new()
        .route("/", get(get_available_achievements))
        .route("/:achievement_code/unlock", post(unlock_achievement))
        .route("/users/:user_id/achievements", get(get_user_achievements))
}

