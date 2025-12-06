use axum::{
    extract::{Path as PathExtractor, Query, State, Extension},
    http::StatusCode,
    response::Json,
    routing::{get, post, put, delete},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{self, Row};
use uuid::Uuid;
use chrono::Utc;
use std::collections::HashMap;

use crate::server::AppState;
use crate::auth::{Claims, jwt_middleware};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Playlist {
    pub playlist_id: String,
    pub user_id: String,
    pub title: String,
    pub description: Option<String>,
    pub cover_image_url: Option<String>,
    pub is_public: bool,
    pub is_collaborative: bool,
    pub track_count: i32,
    pub total_duration_seconds: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlaylistTrack {
    pub playlist_track_id: String,
    pub playlist_id: String,
    pub content_id: String,
    pub position: i32,
    pub added_at: chrono::DateTime<chrono::Utc>,
    pub added_by: Option<String>,
    // Content details (joined)
    pub title: Option<String>,
    pub artist_name: Option<String>,
    pub thumbnail_url: Option<String>,
    pub content_type: Option<String>,
    pub duration: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePlaylistRequest {
    pub title: String,
    pub description: Option<String>,
    pub cover_image_url: Option<String>,
    pub is_public: bool,
    pub is_collaborative: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePlaylistRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub cover_image_url: Option<String>,
    pub is_public: Option<bool>,
    pub is_collaborative: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddTrackRequest {
    pub content_id: String,
    pub position: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReorderTracksRequest {
    pub track_positions: Vec<(String, i32)>, // (playlist_track_id, new_position)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlaylistResponse {
    pub success: bool,
    pub message: String,
    pub playlist: Option<Playlist>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlaylistListResponse {
    pub success: bool,
    pub playlists: Vec<Playlist>,
    pub total: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlaylistTracksResponse {
    pub success: bool,
    pub tracks: Vec<PlaylistTrack>,
    pub total: i64,
}

// ============================================================================
// ROUTES
// ============================================================================

pub fn playlist_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_playlists).post(create_playlist))
        .route("/:playlist_id", get(get_playlist).put(update_playlist).delete(delete_playlist))
        .route("/:playlist_id/tracks", get(get_playlist_tracks).post(add_track_to_playlist))
        .route("/:playlist_id/tracks/:track_id", delete(remove_track_from_playlist))
        .route("/:playlist_id/reorder", put(reorder_tracks))
        .route("/:playlist_id/collaborators", get(get_collaborators).post(add_collaborator))
        .route("/:playlist_id/collaborators/:user_id", delete(remove_collaborator))
}

// ============================================================================
// HANDLERS
// ============================================================================

/// GET /api/v1/playlists
/// List user's playlists
async fn list_playlists(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<PlaylistListResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let include_public = params.get("include_public").and_then(|v| v.parse::<bool>().ok()).unwrap_or(false);
    
    let query = if include_public {
        "SELECT * FROM playlists WHERE user_id = $1 OR (is_public = true AND user_id != $1) ORDER BY updated_at DESC"
    } else {
        "SELECT * FROM playlists WHERE user_id = $1 ORDER BY updated_at DESC"
    };
    
    let rows = sqlx::query(query)
        .bind(user_id)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            eprintln!("❌ Error fetching playlists: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    let playlists: Vec<Playlist> = rows.into_iter().map(|row| Playlist {
        playlist_id: row.get("playlist_id"),
        user_id: row.get("user_id"),
        title: row.get("title"),
        description: row.get("description"),
        cover_image_url: row.get("cover_image_url"),
        is_public: row.get("is_public"),
        is_collaborative: row.get("is_collaborative"),
        track_count: row.get("track_count"),
        total_duration_seconds: row.get("total_duration_seconds"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }).collect();
    
    let total = playlists.len() as i64;
    
    Ok(Json(PlaylistListResponse {
        success: true,
        playlists,
        total,
    }))
}

/// POST /api/v1/playlists
/// Create a new playlist
async fn create_playlist(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Json(request): Json<CreatePlaylistRequest>,
) -> Result<Json<PlaylistResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let playlist_id = Uuid::new_v4().to_string();
    
    sqlx::query(
        r#"
        INSERT INTO playlists (playlist_id, user_id, title, description, cover_image_url, is_public, is_collaborative)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#
    )
    .bind(&playlist_id)
    .bind(user_id)
    .bind(&request.title)
    .bind(&request.description)
    .bind(&request.cover_image_url)
    .bind(request.is_public)
    .bind(request.is_collaborative)
    .execute(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error creating playlist: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Fetch the created playlist
    let row = sqlx::query("SELECT * FROM playlists WHERE playlist_id = $1")
        .bind(&playlist_id)
        .fetch_one(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let playlist = Playlist {
        playlist_id: row.get("playlist_id"),
        user_id: row.get("user_id"),
        title: row.get("title"),
        description: row.get("description"),
        cover_image_url: row.get("cover_image_url"),
        is_public: row.get("is_public"),
        is_collaborative: row.get("is_collaborative"),
        track_count: row.get("track_count"),
        total_duration_seconds: row.get("total_duration_seconds"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };
    
    Ok(Json(PlaylistResponse {
        success: true,
        message: "Playlist created successfully".to_string(),
        playlist: Some(playlist),
    }))
}

/// GET /api/v1/playlists/:playlist_id
/// Get a specific playlist
async fn get_playlist(
    Extension(claims): Extension<Claims>,
    PathExtractor(playlist_id): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<PlaylistResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    let row = sqlx::query("SELECT * FROM playlists WHERE playlist_id = $1")
        .bind(&playlist_id)
        .fetch_optional(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    
    // Check permissions
    let playlist_user_id: String = row.get("user_id");
    let is_public: bool = row.get("is_public");
    
    if playlist_user_id != *user_id && !is_public {
        return Err(StatusCode::FORBIDDEN);
    }
    
    let playlist = Playlist {
        playlist_id: row.get("playlist_id"),
        user_id: row.get("user_id"),
        title: row.get("title"),
        description: row.get("description"),
        cover_image_url: row.get("cover_image_url"),
        is_public: row.get("is_public"),
        is_collaborative: row.get("is_collaborative"),
        track_count: row.get("track_count"),
        total_duration_seconds: row.get("total_duration_seconds"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };
    
    Ok(Json(PlaylistResponse {
        success: true,
        message: "Playlist retrieved successfully".to_string(),
        playlist: Some(playlist),
    }))
}

/// PUT /api/v1/playlists/:playlist_id
/// Update a playlist
async fn update_playlist(
    Extension(claims): Extension<Claims>,
    PathExtractor(playlist_id): PathExtractor<String>,
    State(state): State<AppState>,
    Json(request): Json<UpdatePlaylistRequest>,
) -> Result<Json<PlaylistResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    // Check ownership
    let owner: String = sqlx::query_scalar("SELECT user_id FROM playlists WHERE playlist_id = $1")
        .bind(&playlist_id)
        .fetch_optional(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    
    if owner != *user_id {
        return Err(StatusCode::FORBIDDEN);
    }
    
    // Build update query dynamically
    let mut updates = Vec::new();
    if let Some(ref title) = request.title {
        updates.push(format!("title = '{}'", title.replace("'", "''")));
    }
    if let Some(ref description) = request.description {
        updates.push(format!("description = '{}'", description.replace("'", "''")));
    }
    if let Some(ref cover_image_url) = request.cover_image_url {
        updates.push(format!("cover_image_url = '{}'", cover_image_url.replace("'", "''")));
    }
    if let Some(is_public) = request.is_public {
        updates.push(format!("is_public = {}", is_public));
    }
    if let Some(is_collaborative) = request.is_collaborative {
        updates.push(format!("is_collaborative = {}", is_collaborative));
    }
    updates.push("updated_at = NOW()".to_string());
    
    if updates.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }
    
    let query = format!(
        "UPDATE playlists SET {} WHERE playlist_id = $1",
        updates.join(", ")
    );
    
    sqlx::query(&query)
        .bind(&playlist_id)
        .execute(pool)
        .await
        .map_err(|e| {
            eprintln!("❌ Error updating playlist: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    // Fetch updated playlist
    let row = sqlx::query("SELECT * FROM playlists WHERE playlist_id = $1")
        .bind(&playlist_id)
        .fetch_one(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let playlist = Playlist {
        playlist_id: row.get("playlist_id"),
        user_id: row.get("user_id"),
        title: row.get("title"),
        description: row.get("description"),
        cover_image_url: row.get("cover_image_url"),
        is_public: row.get("is_public"),
        is_collaborative: row.get("is_collaborative"),
        track_count: row.get("track_count"),
        total_duration_seconds: row.get("total_duration_seconds"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };
    
    Ok(Json(PlaylistResponse {
        success: true,
        message: "Playlist updated successfully".to_string(),
        playlist: Some(playlist),
    }))
}

/// DELETE /api/v1/playlists/:playlist_id
/// Delete a playlist
async fn delete_playlist(
    Extension(claims): Extension<Claims>,
    PathExtractor(playlist_id): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<PlaylistResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    // Check ownership
    let owner: String = sqlx::query_scalar("SELECT user_id FROM playlists WHERE playlist_id = $1")
        .bind(&playlist_id)
        .fetch_optional(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    
    if owner != *user_id {
        return Err(StatusCode::FORBIDDEN);
    }
    
    sqlx::query("DELETE FROM playlists WHERE playlist_id = $1")
        .bind(&playlist_id)
        .execute(pool)
        .await
        .map_err(|e| {
            eprintln!("❌ Error deleting playlist: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    Ok(Json(PlaylistResponse {
        success: true,
        message: "Playlist deleted successfully".to_string(),
        playlist: None,
    }))
}

/// GET /api/v1/playlists/:playlist_id/tracks
/// Get tracks in a playlist
async fn get_playlist_tracks(
    Extension(claims): Extension<Claims>,
    PathExtractor(playlist_id): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<PlaylistTracksResponse>, StatusCode> {
    let _user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    // Check if playlist exists and user has access
    let playlist_row = sqlx::query(
        "SELECT user_id, is_public FROM playlists WHERE playlist_id = $1"
    )
    .bind(&playlist_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    if let Some(row) = playlist_row {
        let owner_id: String = row.get("user_id");
        let is_public: bool = row.get("is_public");
        if owner_id != *_user_id && !is_public {
            return Err(StatusCode::FORBIDDEN);
        }
    } else {
        return Err(StatusCode::NOT_FOUND);
    }
    
    let rows = sqlx::query(
        r#"
        SELECT 
            pt.playlist_track_id,
            pt.playlist_id,
            pt.content_id,
            pt.position,
            pt.added_at,
            pt.added_by,
            c.title,
            c.artist_name,
            c.thumbnail_url,
            c.content_type,
            c.duration
        FROM playlist_tracks pt
        LEFT JOIN content c ON pt.content_id = c.content_id
        WHERE pt.playlist_id = $1
        ORDER BY pt.position ASC, pt.added_at ASC
        "#
    )
    .bind(&playlist_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error fetching playlist tracks: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let tracks: Vec<PlaylistTrack> = rows.into_iter().map(|row| PlaylistTrack {
        playlist_track_id: row.get("playlist_track_id"),
        playlist_id: row.get("playlist_id"),
        content_id: row.get("content_id"),
        position: row.get("position"),
        added_at: row.get("added_at"),
        added_by: row.get("added_by"),
        title: row.get("title"),
        artist_name: row.get("artist_name"),
        thumbnail_url: row.get("thumbnail_url"),
        content_type: row.get("content_type"),
        duration: row.get("duration"),
    }).collect();
    
    let total = tracks.len() as i64;
    
    Ok(Json(PlaylistTracksResponse {
        success: true,
        tracks,
        total,
    }))
}

/// POST /api/v1/playlists/:playlist_id/tracks
/// Add a track to a playlist
async fn add_track_to_playlist(
    Extension(claims): Extension<Claims>,
    PathExtractor(playlist_id): PathExtractor<String>,
    State(state): State<AppState>,
    Json(request): Json<AddTrackRequest>,
) -> Result<Json<PlaylistTracksResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    // Check permissions
    let playlist_row = sqlx::query(
        "SELECT user_id, is_collaborative FROM playlists WHERE playlist_id = $1"
    )
    .bind(&playlist_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;
    
    let owner_id: String = playlist_row.get("user_id");
    let is_collaborative: bool = playlist_row.get("is_collaborative");
    let can_edit = owner_id == *user_id || (is_collaborative && {
        let is_collab: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM playlist_collaborators WHERE playlist_id = $1 AND user_id = $2 AND can_add_tracks = true)"
        )
        .bind(&playlist_id)
        .bind(user_id)
        .fetch_one(pool)
        .await
        .unwrap_or(false);
        is_collab
    });
    
    if !can_edit {
        return Err(StatusCode::FORBIDDEN);
    }
    
    // Get max position
    let max_position: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(position), -1) FROM playlist_tracks WHERE playlist_id = $1"
    )
    .bind(&playlist_id)
    .fetch_one(pool)
    .await
    .unwrap_or(-1);
    
    let position = request.position.unwrap_or(max_position + 1);
    
    let playlist_track_id = Uuid::new_v4().to_string();
    
    sqlx::query(
        r#"
        INSERT INTO playlist_tracks (playlist_track_id, playlist_id, content_id, position, added_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (playlist_id, content_id) DO NOTHING
        "#
    )
    .bind(&playlist_track_id)
    .bind(&playlist_id)
    .bind(&request.content_id)
    .bind(position)
    .bind(user_id)
    .execute(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error adding track to playlist: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Return updated tracks
    get_playlist_tracks(Extension(claims), PathExtractor(playlist_id), State(state)).await
}

/// DELETE /api/v1/playlists/:playlist_id/tracks/:track_id
/// Remove a track from a playlist
async fn remove_track_from_playlist(
    Extension(claims): Extension<Claims>,
    PathExtractor((playlist_id, track_id)): PathExtractor<(String, String)>,
    State(state): State<AppState>,
) -> Result<Json<PlaylistTracksResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    // Check permissions (similar to add_track)
    let playlist_row = sqlx::query(
        "SELECT user_id, is_collaborative FROM playlists WHERE playlist_id = $1"
    )
    .bind(&playlist_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;
    
    let owner_id: String = playlist_row.get("user_id");
    let is_collaborative: bool = playlist_row.get("is_collaborative");
    let can_edit = owner_id == *user_id || (is_collaborative && {
        let is_collab: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM playlist_collaborators WHERE playlist_id = $1 AND user_id = $2 AND can_remove_tracks = true)"
        )
        .bind(&playlist_id)
        .bind(user_id)
        .fetch_one(pool)
        .await
        .unwrap_or(false);
        is_collab
    });
    
    if !can_edit {
        return Err(StatusCode::FORBIDDEN);
    }
    
    sqlx::query("DELETE FROM playlist_tracks WHERE playlist_track_id = $1 AND playlist_id = $2")
        .bind(&track_id)
        .bind(&playlist_id)
        .execute(pool)
        .await
        .map_err(|e| {
            eprintln!("❌ Error removing track from playlist: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    // Return updated tracks
    get_playlist_tracks(Extension(claims), PathExtractor(playlist_id), State(state)).await
}

/// PUT /api/v1/playlists/:playlist_id/reorder
/// Reorder tracks in a playlist
async fn reorder_tracks(
    Extension(claims): Extension<Claims>,
    PathExtractor(playlist_id): PathExtractor<String>,
    State(state): State<AppState>,
    Json(request): Json<ReorderTracksRequest>,
) -> Result<Json<PlaylistTracksResponse>, StatusCode> {
    let user_id = &claims.sub;
    let pool = &state.storage.pool;
    
    // Check permissions
    let owner: String = sqlx::query_scalar("SELECT user_id FROM playlists WHERE playlist_id = $1")
        .bind(&playlist_id)
        .fetch_optional(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    
    if owner != *user_id {
        return Err(StatusCode::FORBIDDEN);
    }
    
    // Update positions in a transaction
    for (track_id, position) in request.track_positions {
        sqlx::query("UPDATE playlist_tracks SET position = $1 WHERE playlist_track_id = $2 AND playlist_id = $3")
            .bind(position)
            .bind(&track_id)
            .bind(&playlist_id)
            .execute(pool)
            .await
            .map_err(|e| {
                eprintln!("❌ Error reordering tracks: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
    }
    
    // Return updated tracks
    get_playlist_tracks(Extension(claims), PathExtractor(playlist_id), State(state)).await
}

/// GET /api/v1/playlists/:playlist_id/collaborators
/// Get playlist collaborators
async fn get_collaborators(
    Extension(_claims): Extension<Claims>,
    PathExtractor(_playlist_id): PathExtractor<String>,
    State(_state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // TODO: Implement
    Ok(Json(serde_json::json!({"success": true, "collaborators": []})))
}

/// POST /api/v1/playlists/:playlist_id/collaborators
/// Add a collaborator
async fn add_collaborator(
    Extension(_claims): Extension<Claims>,
    PathExtractor(_playlist_id): PathExtractor<String>,
    State(_state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // TODO: Implement
    Ok(Json(serde_json::json!({"success": true})))
}

/// DELETE /api/v1/playlists/:playlist_id/collaborators/:user_id
/// Remove a collaborator
async fn remove_collaborator(
    Extension(_claims): Extension<Claims>,
    PathExtractor((_playlist_id, _user_id)): PathExtractor<(String, String)>,
    State(_state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // TODO: Implement
    Ok(Json(serde_json::json!({"success": true})))
}

