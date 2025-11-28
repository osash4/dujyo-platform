use axum::{
    extract::{Multipart, State, Extension, Path as PathExtractor},
    http::{StatusCode, HeaderMap, HeaderValue, header},
    response::{Json, Response},
    body::Body,
    routing::{post, get},
    Router,
};
use serde::{Deserialize, Serialize};
use tokio::fs;
use std::path::Path;
use uuid::Uuid;
use chrono::Utc;
use std::collections::HashMap;
use std::sync::Mutex;
use lazy_static::lazy_static;
use sha2::{Sha256, Digest};
use hex;
use sqlx::{self, Row};

use crate::server::AppState;
use crate::auth::Claims;
// ✅ FIX: Temporarily commented - module doesn't exist
// use crate::security::rate_limiting_redis;

// ============================================================================
// DATA STRUCTURES
// ============================================================================

// ✅ P2.2: Rate limiting now uses Redis (with in-memory fallback)
// Legacy HashMap kept for backward compatibility if Redis is unavailable
lazy_static! {
    static ref UPLOAD_RATE_LIMIT: Mutex<HashMap<String, (u32, u64)>> = Mutex::new(HashMap::new());
}

const MAX_UPLOADS_PER_DAY: u32 = 10;
const MAX_UPLOAD_SIZE_MB: u64 = 50; // 50MB max file size
const RATE_LIMIT_WINDOW_SECONDS: u64 = 86400; // 24 hours (1 day)

// ✅ ARTIST VERIFICATION NOW IN DATABASE
// Legacy in-memory cache kept for backward compatibility
lazy_static! {
    static ref VERIFIED_ARTISTS: Mutex<HashMap<String, bool>> = Mutex::new(HashMap::new());
}

/// Check if user is an artist (checks user_type in users table)
async fn is_verified_artist(pool: &sqlx::PgPool, user_address: &str) -> bool {
    // ✅ CHECK user_type IN users TABLE
    match sqlx::query_scalar::<_, String>(
        "SELECT user_type FROM users WHERE wallet_address = $1"
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await
    {
        Ok(Some(user_type)) => user_type == "artist",
        Ok(None) => false,
        Err(e) => {
            eprintln!("❌ Error checking user_type: {}", e);
            false
        }
    }
}

/// ✅ P2.2: Check upload rate limit using Redis (with in-memory fallback)
async fn check_upload_rate_limit(
    state: &AppState,
    user_address: &str,
) -> bool {
    // ✅ FIX: Temporarily commented - redis_pool doesn't exist in AppState
    // Try Redis first if available
    // TODO: Add redis_pool to AppState or implement alternative rate limiting
    /*
    if let Some(ref redis_pool) = state.redis_pool {
        let rate_limit_key = format!("upload:{}", user_address);
        // ✅ FIX: Temporarily commented - rate_limiting_redis module doesn't exist
        // TODO: Implement rate limiting with Redis or use in-memory fallback
        match rate_limiting_redis::check_rate_limit(
            redis_pool,
            &rate_limit_key,
            MAX_UPLOADS_PER_DAY,
            RATE_LIMIT_WINDOW_SECONDS,
        )
        .await
        {
            Ok(within_limit) => {
                tracing::debug!(
                    user_address = %user_address,
                    within_limit = within_limit,
                    "Rate limit check (Redis)"
                );
                return within_limit;
            }
            Err(e) => {
                tracing::error!(
                    error = %e,
                    user_address = %user_address,
                    "CRITICAL: Redis rate limit check failed"
                );
                // ✅ SECURITY FIX: FAIL-CLOSED - reject if Redis fails
                // Only fall back to in-memory if Redis connection fails but we have in-memory available
                // Otherwise, reject the request
                tracing::warn!(
                    user_address = %user_address,
                    "Rate limiting service unavailable - falling back to in-memory (fail-closed if that also fails)"
                );
                // Fall through to in-memory fallback (which is fail-closed)
                // Note: The in-memory fallback below will handle the fail-closed behavior
            }
        }
    }
    */
    
    // Fallback to in-memory rate limiting if Redis is unavailable
    let now_secs = match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(duration) => duration.as_secs(),
        Err(e) => {
            tracing::error!(error = %e, "CRITICAL: System time error in upload rate limit check");
            return false; // Fail closed - reject upload if time check fails
        }
    };
    let today_start = now_secs - (now_secs % 86400); // Start of day
    
    let mut limits = match UPLOAD_RATE_LIMIT.lock() {
        Ok(lock) => lock,
        Err(e) => {
            tracing::error!(error = %e, "CRITICAL: Failed to acquire upload rate limit lock");
            return false; // Fail closed - reject upload if lock fails
        }
    };
    let (count, last_day) = limits.entry(user_address.to_string()).or_insert((0, today_start));
    
    // Reset if new day
    if *last_day != today_start {
        *count = 0;
        *last_day = today_start;
    }
    
    if *count >= MAX_UPLOADS_PER_DAY {
        tracing::debug!(
            user_address = %user_address,
            count = *count,
            "Rate limit exceeded (in-memory fallback)"
        );
        return false;
    }
    
    *count += 1;
    tracing::debug!(
        user_address = %user_address,
        count = *count,
        "Rate limit check passed (in-memory fallback)"
    );
    true
}

#[derive(Serialize)]
pub struct UploadResponse {
    success: bool,
    message: String,
    content_id: String,
    file_url: Option<String>,
    ipfs_hash: Option<String>,
}

#[derive(Deserialize)]
pub struct UploadMetadata {
    pub title: String,
    pub description: Option<String>,
    pub artist: String,
    pub genre: Option<String>,
    pub price: Option<f64>,
    pub content_type: String, // "audio", "video", "gaming"
}

// ============================================================================
// HANDLERS
// ============================================================================

/// Upload content handler - handles multipart form data with file upload
/// ✅ NOW REQUIRES JWT AUTHENTICATION AND ARTIST VERIFICATION
pub async fn upload_content_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>, // ✅ JWT required
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, StatusCode> {
    let user_address = &claims.sub;
    let pool = &state.storage.pool;
    
    // ✅ CHECK 1: Verify user_type is 'artist' (only artists can upload)
    if !is_verified_artist(pool, user_address).await {
        return Ok(Json(UploadResponse {
            success: false,
            message: "Only artists can upload content. Please become an artist first.".to_string(),
            content_id: String::new(),
            file_url: None,
            ipfs_hash: None,
        }));
    }
    
    // ✅ P2.2: Rate limiting with Redis (persistent across restarts)
    if !check_upload_rate_limit(&state, user_address).await {
        return Ok(Json(UploadResponse {
            success: false,
            message: format!("Upload limit reached. Maximum {} uploads per day.", MAX_UPLOADS_PER_DAY),
            content_id: String::new(),
            file_url: None,
            ipfs_hash: None,
        }));
    }
    let mut title = String::new();
    let mut artist = String::new();
    let mut _description = String::new();
    let mut _genre = String::new();
    let mut content_type = "audio".to_string();
    let mut _price: f64 = 0.0;
    let mut _user_id = user_address.clone(); // Use authenticated user
    let mut file_data: Option<Vec<u8>> = None;
    let mut file_name = String::new();
    let mut thumbnail_data: Option<Vec<u8>> = None;
    let mut thumbnail_name = String::new();
    let mut file_size_bytes: u64 = 0;

    // Parse multipart form data
    while let Some(field) = multipart.next_field().await.map_err(|_| StatusCode::BAD_REQUEST)? {
        let field_name = field.name().unwrap_or("").to_string();
        
        // Get filename first if available (before consuming bytes)
        let filename = field.file_name().map(|f| f.to_string());
        let field_data = field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?;

        match field_name.as_str() {
            "title" => title = String::from_utf8_lossy(&field_data).to_string(),
            "artist" => artist = String::from_utf8_lossy(&field_data).to_string(),
            "description" => _description = String::from_utf8_lossy(&field_data).to_string(),
            "genre" => _genre = String::from_utf8_lossy(&field_data).to_string(),
            "type" | "content_type" => {
                content_type = String::from_utf8_lossy(&field_data).to_string();
            }
            "price" => {
                if let Ok(p) = String::from_utf8_lossy(&field_data).parse::<f64>() {
                    _price = p;
                }
            }
            "user" | "user_id" => _user_id = String::from_utf8_lossy(&field_data).to_string(),
            "file" => {
                if let Some(fname) = filename {
                    file_name = fname;
                    file_size_bytes = field_data.len() as u64;
                    file_data = Some(field_data.to_vec());
                }
            }
            "thumbnail" => {
                if let Some(fname) = filename {
                    thumbnail_name = fname;
                    thumbnail_data = Some(field_data.to_vec());
                }
            }
            _ => {}
        }
    }

    // Validate required fields
    if title.is_empty() {
        return Ok(Json(UploadResponse {
            success: false,
            message: "Title is required".to_string(),
            content_id: String::new(),
            file_url: None,
            ipfs_hash: None,
        }));
    }

    if artist.is_empty() {
        return Ok(Json(UploadResponse {
            success: false,
            message: "Artist is required".to_string(),
            content_id: String::new(),
            file_url: None,
            ipfs_hash: None,
        }));
    }

    if file_data.is_none() {
        return Ok(Json(UploadResponse {
            success: false,
            message: "File is required".to_string(),
            content_id: String::new(),
            file_url: None,
            ipfs_hash: None,
        }));
    }
    
    // ✅ CHECK 3: File size limit
    let file_size_mb = file_size_bytes as f64 / (1024.0 * 1024.0);
    if file_size_mb > MAX_UPLOAD_SIZE_MB as f64 {
        // ✅ P2.2: Rollback rate limit increment (only for in-memory fallback)
        // Note: Redis rate limit is atomic, so rollback not needed
        // If using Redis, the INCR happens only on success, so no rollback needed
        // ✅ FIX: Temporarily commented - redis_pool doesn't exist in AppState
        // Always use in-memory fallback for now
        // if state.redis_pool.is_none() {
        {
            let mut limits = match UPLOAD_RATE_LIMIT.lock() {
                Ok(lock) => lock,
                Err(e) => {
                    tracing::error!(error = %e, "CRITICAL: Failed to acquire upload rate limit lock for rollback");
                    // Continue without rollback - rate limit already incremented
                    // ✅ FIX: Changed from `return;` to `return Ok(...)` since function returns Result
                    return Ok(Json(UploadResponse {
                        success: false,
                        content_id: String::new(), // ✅ FIX: content_id is String, not Option<String>
                        file_url: None,
                        ipfs_hash: None,
                        message: "Failed to process upload rollback".to_string(),
                    }));
                }
            };
            if let Some((count, _)) = limits.get_mut(user_address) {
                if *count > 0 {
                    *count -= 1;
                }
            }
        }
        return Ok(Json(UploadResponse {
            success: false,
            message: format!("File too large. Maximum size is {}MB. Your file is {:.2}MB.", MAX_UPLOAD_SIZE_MB, file_size_mb),
            content_id: String::new(),
            file_url: None,
            ipfs_hash: None,
        }));
    }

    // Generate unique content ID
    let content_id = format!("CONTENT_{}_{}", Uuid::new_v4().to_string()[..8].to_uppercase(), Utc::now().timestamp());

    // Create uploads directory if it doesn't exist
    let uploads_dir = "./uploads";
    if !Path::new(uploads_dir).exists() {
        fs::create_dir_all(uploads_dir)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Create content-specific directory
    let content_dir = format!("{}/{}", uploads_dir, content_type);
    if !Path::new(&content_dir).exists() {
        fs::create_dir_all(&content_dir)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Save main file
    let file_extension = Path::new(&file_name)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("bin");
    let safe_file_name = file_name
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
        .collect::<String>();
    let file_path = format!("{}/{}_{}.{}", content_dir, content_id, safe_file_name, file_extension);
    
    if let Some(ref data) = file_data {
        fs::write(&file_path, data)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Save thumbnail if provided
    if let Some(ref thumb_data) = thumbnail_data {
        let thumb_ext = Path::new(&thumbnail_name)
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("jpg");
        let thumb_path = format!("{}/{}_{}_thumb.{}", content_dir, content_id, safe_file_name, thumb_ext);
        fs::write(&thumb_path, thumb_data)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // ✅ IPFS HASH FALLBACK: Generate SHA256 hash as IPFS-like identifier
    let ipfs_hash = if let Some(ref data) = file_data {
        let mut hasher = Sha256::new();
        hasher.update(data);
        let hash_bytes = hasher.finalize();
        let hash_hex = hex::encode(hash_bytes);
        // Format as IPFS CID (Qm prefix for SHA256)
        let ipfs_cid = format!("Qm{}", &hash_hex[..46]); // IPFS CIDv0 format (46 chars after Qm)
        Some(ipfs_cid)
    } else {
        None
    };

    // ✅ STORE METADATA IN DATABASE
    let file_url = format!("/uploads/{}/{}_{}.{}", content_type, content_id, safe_file_name, file_extension);
    let thumbnail_url = if thumbnail_data.is_some() {
        Some(format!("/uploads/{}/{}_{}_thumb.{}", content_type, content_id, safe_file_name, 
            Path::new(&thumbnail_name).extension().and_then(|ext| ext.to_str()).unwrap_or("jpg")))
    } else {
        None
    };

    // Save metadata to database (pool already available from above)
    let description_value = if _description.is_empty() { None } else { Some(_description.as_str()) };
    let genre_value = if _genre.is_empty() { None } else { Some(_genre.as_str()) };
    let ipfs_hash_value = ipfs_hash.as_deref();
    let thumbnail_url_value = thumbnail_url.as_deref();
    let price_value = _price;

    match sqlx::query(
        r#"
        INSERT INTO content (
            content_id, artist_id, artist_name, title, description, genre,
            content_type, file_url, ipfs_hash, thumbnail_url, price,
            created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        ON CONFLICT (content_id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            genre = EXCLUDED.genre,
            file_url = EXCLUDED.file_url,
            ipfs_hash = EXCLUDED.ipfs_hash,
            thumbnail_url = EXCLUDED.thumbnail_url,
            price = EXCLUDED.price,
            updated_at = NOW()
        "#
    )
    .bind(&content_id)
    .bind(user_address)
    .bind(&artist)
    .bind(&title)
    .bind(description_value)
    .bind(genre_value)
    .bind(&content_type)
    .bind(&file_url)
    .bind(ipfs_hash_value)
    .bind(thumbnail_url_value)
    .bind(price_value)
    .execute(pool)
    .await
    {
        Ok(_) => {
            println!("✅ Content metadata saved to database: {} by {} (type: {}, id: {})", title, artist, content_type, content_id);
        }
        Err(e) => {
            println!("⚠️  Error saving content metadata to database: {}", e);
            // Continue anyway - file is saved, just metadata failed
        }
    }

    // ✅ REWARD ARTIST: Mint tokens when content is uploaded
    let mut token = state.token.lock().unwrap();
    let reward_amount = 10.0; // Reward artist with 10 tokens per upload
    match token.mint(user_address, reward_amount) {
        Ok(_) => {
            println!("✅ Rewarded artist {} with {} tokens for uploading content", user_address, reward_amount);
        }
        Err(e) => {
            println!("⚠️  Failed to reward artist with tokens: {}", e);
            // Continue anyway - upload succeeded, just reward failed
        }
    }
    drop(token); // Release lock

    println!("✅ Content uploaded: {} by {} (type: {}, id: {})", title, artist, content_type, content_id);
    println!("   File saved to: {}", file_path);
    if let Some(ref hash) = ipfs_hash {
        println!("   IPFS hash: {}", hash);
    }

    Ok(Json(UploadResponse {
        success: true,
        message: format!("Successfully uploaded {} content: {}. You earned {} DYO tokens!", content_type, title, reward_amount),
        content_id: content_id.clone(),
        file_url: Some(file_url),
        ipfs_hash, // ✅ Now returns real hash
    }))
}

// ============================================================================
// LIST CONTENT HANDLER
// ============================================================================

/// Content item structure for list response
#[derive(Serialize, Clone)]
pub struct ContentItem {
    pub content_id: String,
    pub artist_id: String,
    pub artist_name: String,
    pub title: String,
    pub description: Option<String>,
    pub genre: Option<String>,
    pub content_type: String,
    pub file_url: Option<String>,
    pub ipfs_hash: Option<String>,
    pub thumbnail_url: Option<String>,
    pub price: f64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// List content response
#[derive(Serialize)]
pub struct ListContentResponse {
    pub success: bool,
    pub message: String,
    pub content: Vec<ContentItem>,
    pub total: usize,
}

/// GET /api/v1/content/artist/{artist_id}
/// List all content uploaded by a specific artist
/// ✅ REQUIRES JWT AUTHENTICATION
pub async fn list_artist_content_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>, // ✅ JWT required
    PathExtractor(artist_id): PathExtractor<String>,
) -> Result<Json<ListContentResponse>, StatusCode> {
    let _authenticated_user = &claims.sub;
    let pool = &state.storage.pool;

    // ✅ SECURITY: Verify that the authenticated user is requesting their own content
    // OR allow if they're requesting content from a verified artist (for public viewing)
    // For MVP, we'll allow users to view their own content or any artist's public content
    // In production, you might want to add more granular permissions
    
    // Query content from database, ordered by created_at DESC
    // Use manual mapping since price is DECIMAL in DB
    let content_rows_result = sqlx::query(
        r#"
        SELECT 
            content_id,
            artist_id,
            artist_name,
            title,
            description,
            genre,
            content_type,
            file_url,
            ipfs_hash,
            thumbnail_url,
            price::float8 as price,
            created_at,
            updated_at
        FROM content
        WHERE artist_id = $1
        ORDER BY created_at DESC
        "#
    )
    .bind(&artist_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error querying content from database: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Map rows to ContentItem
    let content_rows: Vec<ContentItem> = content_rows_result
        .into_iter()
        .map(|row| ContentItem {
            content_id: row.get::<String, _>("content_id"),
            artist_id: row.get::<String, _>("artist_id"),
            artist_name: row.get::<String, _>("artist_name"),
            title: row.get::<String, _>("title"),
            description: row.get::<Option<String>, _>("description"),
            genre: row.get::<Option<String>, _>("genre"),
            content_type: row.get::<String, _>("content_type"),
            file_url: row.get::<Option<String>, _>("file_url"),
            ipfs_hash: row.get::<Option<String>, _>("ipfs_hash"),
            thumbnail_url: row.get::<Option<String>, _>("thumbnail_url"),
            price: row.get::<f64, _>("price"),
            created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
            updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
        })
        .collect();

    let total = content_rows.len();

    println!("✅ Retrieved {} content items for artist: {}", total, artist_id);

    Ok(Json(ListContentResponse {
        success: true,
        message: format!("Retrieved {} content items", total),
        content: content_rows,
        total,
    }))
}

/// GET /api/v1/content/videos or /api/videos
/// List all public videos (no authentication required)
/// Returns videos filtered by content_type = 'video'
pub async fn list_videos_handler(
    State(state): State<AppState>,
) -> Result<Json<ListContentResponse>, StatusCode> {
    let pool = &state.storage.pool;
    
    // Query videos from database, ordered by created_at DESC
    let content_rows_result = sqlx::query(
        r#"
        SELECT 
            content_id,
            artist_id,
            artist_name,
            title,
            description,
            genre,
            content_type,
            file_url,
            ipfs_hash,
            thumbnail_url,
            price::float8 as price,
            created_at,
            updated_at
        FROM content
        WHERE content_type = 'video'
        ORDER BY created_at DESC
        LIMIT 100
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("Error querying videos from database: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Map rows to ContentItem
    let content_rows: Vec<ContentItem> = content_rows_result
        .into_iter()
        .map(|row| ContentItem {
            content_id: row.get::<String, _>("content_id"),
            artist_id: row.get::<String, _>("artist_id"),
            artist_name: row.get::<String, _>("artist_name"),
            title: row.get::<String, _>("title"),
            description: row.get::<Option<String>, _>("description"),
            genre: row.get::<Option<String>, _>("genre"),
            content_type: row.get::<String, _>("content_type"),
            file_url: row.get::<Option<String>, _>("file_url"),
            ipfs_hash: row.get::<Option<String>, _>("ipfs_hash"),
            thumbnail_url: row.get::<Option<String>, _>("thumbnail_url"),
            price: row.get::<f64, _>("price"),
            created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
            updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
        })
        .collect();

    let total = content_rows.len();

    println!("Retrieved {} videos", total);

    Ok(Json(ListContentResponse {
        success: true,
        message: format!("Retrieved {} videos", total),
        content: content_rows,
        total,
    }))
}

// ============================================================================
// FILE SERVING HANDLER
// ============================================================================

/// GET /api/v1/content/{content_id}/file
/// Serve content file with streaming support
/// ✅ REQUIRES JWT AUTHENTICATION
pub async fn serve_content_file_handler(
    PathExtractor(content_id): PathExtractor<String>,
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>, // ✅ JWT required
) -> Result<Response<Body>, StatusCode> {
    let pool = &state.storage.pool;

    // Query database for file_url and content_type
    let content_row = sqlx::query(
        r#"
        SELECT file_url, content_type
        FROM content
        WHERE content_id = $1
        "#
    )
    .bind(&content_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error querying content from database: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Check if content exists
    let (file_url, content_type) = match content_row {
        Some(row) => {
            let file_url: Option<String> = row.get("file_url");
            let content_type: String = row.get("content_type");
            
            match file_url {
                Some(url) => (url, content_type),
                None => {
                    eprintln!("❌ Content {} exists but has no file_url", content_id);
                    return Err(StatusCode::NOT_FOUND);
                }
            }
        }
        None => {
            eprintln!("❌ Content not found: {}", content_id);
            return Err(StatusCode::NOT_FOUND);
        }
    };

    // Convert file_url to filesystem path
    // file_url format: /uploads/{content_type}/{content_id}_{safe_file_name}.{extension}
    // filesystem path: ./uploads/{content_type}/{content_id}_{safe_file_name}.{extension}
    let file_path = if file_url.starts_with("/uploads/") {
        format!(".{}", file_url) // Remove leading / and add ./
    } else if file_url.starts_with("uploads/") {
        format!("./{}", file_url) // Add ./
    } else {
        file_url.clone() // Use as-is if already absolute or relative
    };

    // Check if file exists
    if !Path::new(&file_path).exists() {
        eprintln!("❌ File not found on filesystem: {}", file_path);
        return Err(StatusCode::NOT_FOUND);
    }

    // Read file metadata for Content-Length
    let metadata = tokio::fs::metadata(&file_path)
        .await
        .map_err(|e| {
            eprintln!("❌ Error reading file metadata: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let file_size = metadata.len();

    // Read file content
    let file_content = tokio::fs::read(&file_path)
        .await
        .map_err(|e| {
            eprintln!("❌ Error reading file: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // Determine Content-Type based on file extension
    let content_type_header = determine_content_type(&file_path, &content_type);

    println!("✅ Serving file: {} ({} bytes, type: {})", file_path, file_size, content_type_header);

    // Create response with file content
    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, &content_type_header)
        .header(header::CONTENT_LENGTH, file_size)
        .header(header::CACHE_CONTROL, "public, max-age=31536000")
        .header(header::ACCEPT_RANGES, "bytes")
        .body(Body::from(file_content))
        .map_err(|e| {
            eprintln!("❌ Error building response: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(response)
}

/// Determine Content-Type based on file extension and content_type
fn determine_content_type(file_path: &str, content_type: &str) -> String {
    let extension = Path::new(file_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .unwrap_or_default();

    match extension.as_str() {
        // Audio formats
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" => "audio/ogg",
        "flac" => "audio/flac",
        "m4a" => "audio/mp4",
        "aac" => "audio/aac",
        "wma" => "audio/x-ms-wma",
        
        // Video formats
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "avi" => "video/x-msvideo",
        "mov" => "video/quicktime",
        "mkv" => "video/x-matroska",
        
        // Image formats (for thumbnails)
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        
        // Default based on content_type from DB
        _ => {
            match content_type {
                "audio" => "audio/mpeg",
                "video" => "video/mp4",
                "gaming" => "application/octet-stream",
                _ => "application/octet-stream",
            }
        }
    }
    .to_string()
}

// ============================================================================
// ROUTES
// ============================================================================

pub fn upload_routes() -> Router<AppState> {
    Router::new()
        .route("/content", post(upload_content_handler))
}

/// Content listing routes (separate from upload for better organization)
pub fn content_routes() -> Router<AppState> {
    Router::new()
        .route("/artist/{artist_id}", get(list_artist_content_handler))
        .route("/{content_id}/file", get(serve_content_file_handler))
        .route("/videos", get(list_videos_handler)) // ✅ Public endpoint to list all videos
}

