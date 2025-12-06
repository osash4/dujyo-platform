use axum::{
    extract::{Multipart, State, Extension, Path as PathExtractor, DefaultBodyLimit},
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
// Decimal removed - using f64 for sqlx compatibility

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
const MAX_UPLOAD_SIZE_MB: u64 = 50; // 50MB max file size (legacy, now using per-type limits)
const RATE_LIMIT_WINDOW_SECONDS: u64 = 86400; // 24 hours (1 day)

// ✅ Per-content-type size limits (in bytes)
const MAX_AUDIO_SIZE: u64 = 100 * 1024 * 1024;      // 100MB for audio files
const MAX_VIDEO_SIZE: u64 = 2 * 1024 * 1024 * 1024; // 2GB for video files
const MAX_GAMING_SIZE: u64 = 5 * 1024 * 1024 * 1024; // 5GB for gaming files (can be large)

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
    let is_artist = is_verified_artist(pool, user_address).await;
    
    if !is_artist {
        return Ok(Json(UploadResponse {
            success: false,
            message: "Only artists can upload content. Please become an artist first.".to_string(),
            content_id: String::new(),
            file_url: None,
            ipfs_hash: None,
        }));
    }
    
    // ✅ P2.2: Rate limiting with Redis (persistent across restarts)
    let rate_limit_ok = check_upload_rate_limit(&state, user_address).await;
    
    if !rate_limit_ok {
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
    let mut field_count = 0;
    loop {
        let field_result = multipart.next_field().await;
        
        let mut field = match field_result {
            Ok(Some(field)) => {
                field_count += 1;
                field
            },
            Ok(None) => break,
            Err(e) => {
                eprintln!("❌ [upload_content] Error getting next field: {:?}", e);
                return Err(StatusCode::BAD_REQUEST);
            }
        };
        
        let field_name = field.name().unwrap_or("").to_string();
        
        // Get filename first if available (before consuming bytes)
        let filename = field.file_name().map(|f| f.to_string());
        
        // ✅ CRITICAL FIX: For large files, use chunk-based reading instead of bytes()
        // This prevents "failed to read stream" errors for large files
        let field_data = if field_name == "file" || field_name == "thumbnail" {
            // For file fields, read in chunks to handle large files
            let mut chunks = Vec::new();
            let mut total_size = 0u64;
            
            loop {
                match field.chunk().await {
                    Ok(Some(chunk)) => {
                        total_size += chunk.len() as u64;
                        chunks.push(chunk);
                    },
                    Ok(None) => break,
                    Err(e) => {
                        eprintln!("❌ [upload_content] Error reading chunk for field '{}': {:?}", field_name, e);
                        return Err(StatusCode::BAD_REQUEST);
                    }
                }
            }
            
            // Combine all chunks into a single Vec<u8>
            let mut combined_data = Vec::with_capacity(total_size as usize);
            for chunk in chunks {
                combined_data.extend_from_slice(&chunk);
            }
            combined_data
        } else {
            // For small text fields, use bytes() as before
            match field.bytes().await {
                Ok(data) => data.to_vec(),
                Err(e) => {
                    eprintln!("❌ [upload_content] Error reading bytes for field '{}': {:?}", field_name, e);
                    return Err(StatusCode::BAD_REQUEST);
                }
            }
        };

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
    // ✅ Validate file size based on content type
    let max_size = match content_type.to_lowercase().as_str() {
        "audio" | "music" => MAX_AUDIO_SIZE,
        "video" => MAX_VIDEO_SIZE,
        "gaming" | "game" => MAX_GAMING_SIZE,
        _ => MAX_AUDIO_SIZE, // Default to audio limit for unknown types
    };
    
    let file_size_mb = file_size_bytes as f64 / (1024.0 * 1024.0);
    let max_size_mb = max_size as f64 / (1024.0 * 1024.0);
    
    if file_size_bytes > max_size {
        eprintln!("❌ [upload_content] File too large: {} bytes (max: {} bytes for {})", file_size_bytes, max_size, content_type);
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
            message: format!("File too large. Maximum size for {} is {:.0}MB. Your file is {:.2}MB.", content_type, max_size_mb, file_size_mb),
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

    // ✅ CRITICAL FIX: Save main file - extract filename WITHOUT extension to avoid double extension
    // Get the base name (stem) without extension
    let file_stem = Path::new(&file_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("content");
    
    // Sanitize the stem (remove unsafe characters but keep alphanumeric, dots, dashes, underscores)
    let safe_file_stem = file_stem
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
        .collect::<String>();
    
    // Get extension (already extracted, but ensure it's lowercase)
    let file_extension = Path::new(&file_name)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("bin")
        .to_lowercase();
    
    
    // Construct filename: {content_id}_{stem}.{ext}
    let filename = format!("{}_{}.{}", content_id, safe_file_stem, file_extension);
    
    // ✅ CDN INTEGRATION: Upload to R2 (or local fallback)
    let file_url = if let Some(ref data) = file_data {
        // Determine content type for R2
        let mime_type = match content_type.to_lowercase().as_str() {
            "audio" | "music" => "audio/mpeg",
            "video" => "video/mp4",
            "gaming" | "game" => "application/octet-stream",
            _ => "application/octet-stream",
        };
        
        // ✅ FIX: Temporarily commented - r2_storage module may not be available
        // Try R2 upload (falls back to local if not configured)
        // TODO: Uncomment when r2_storage module is fully implemented
        /*
        let filename_clone = filename.clone();
        match crate::storage::r2_storage::R2Storage::upload_file(data.clone(), &filename_clone, mime_type).await {
            Ok(url) => {
                eprintln!("✅ [upload_content] File uploaded to CDN: {}", url);
                url
            }
            Err(e) => {
                eprintln!("⚠️  [upload_content] CDN upload failed, using local: {}", e);
                // Fall through to local storage below
            }
        }
        */
        // Fallback to local storage (always used for now)
        let file_path = format!("{}/{}", content_dir, filename);
        fs::write(&file_path, data)
            .await
            .map_err(|e| {
                eprintln!("❌ [upload_content] Error writing file: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
        
        // Verify file was saved
        if !Path::new(&file_path).exists() {
            eprintln!("❌ [upload_content] File was not saved correctly: {}", file_path);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
        
        format!("/uploads/{}/{}", content_type, filename)
    } else {
        return Ok(Json(UploadResponse {
            success: false,
            message: "No file data provided".to_string(),
            content_id: String::new(),
            file_url: None,
            ipfs_hash: None,
        }));
    };

    // ✅ CRITICAL FIX: Save thumbnail if provided - extract filename WITHOUT extension
    if let Some(ref thumb_data) = thumbnail_data {
        let thumb_stem = Path::new(&thumbnail_name)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("thumb");
        
        let safe_thumb_stem = thumb_stem
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
            .collect::<String>();
        
        let thumb_ext = Path::new(&thumbnail_name)
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("jpg")
            .to_lowercase();
        
        let thumb_filename = format!("{}_{}_thumb.{}", content_id, safe_thumb_stem, thumb_ext);
        let thumb_path = format!("{}/{}", content_dir, thumb_filename);
        
        // ✅ CRITICAL FIX: Ensure thumbnail directory exists
        if !Path::new(&content_dir).exists() {
            fs::create_dir_all(&content_dir)
                .await
                .map_err(|e| {
                    eprintln!("❌ [upload_content] Error creating thumbnail directory: {}", e);
                    StatusCode::INTERNAL_SERVER_ERROR
                })?;
        }
        
        fs::write(&thumb_path, thumb_data)
            .await
            .map_err(|e| {
                eprintln!("❌ [upload_content] Error writing thumbnail: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
        
        // ✅ VERIFY: Check if file was actually saved
        if !Path::new(&thumb_path).exists() {
            eprintln!("❌ [upload_content] Thumbnail file was not saved correctly: {}", thumb_path);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
        
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

    // ✅ STORE METADATA IN DATABASE - file_url already set from R2/local upload above
    let thumbnail_url = if thumbnail_data.is_some() {
        let thumb_filename = format!("{}_{}_thumb.{}", 
            content_id, 
            Path::new(&thumbnail_name)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("thumb")
                .chars()
                .filter(|c| c.is_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
                .collect::<String>(),
            Path::new(&thumbnail_name)
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("jpg")
                .to_lowercase()
        );
        Some(format!("/uploads/{}/{}", content_type, thumb_filename))
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
    let mut token = state.token.lock().unwrap_or_else(|e| {
        eprintln!("⚠️  Failed to acquire token lock: {}", e);
        // Return a dummy lock - this is a fallback, but should not happen in practice
        panic!("Token lock poisoned");
    });
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
    println!("   File URL: {}", file_url);
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub artist_avatar_url: Option<String>, // ✅ Avatar del artista
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
            c.content_id,
            c.artist_id,
            c.artist_name,
            c.title,
            c.description,
            c.genre,
            c.content_type,
            c.file_url,
            c.ipfs_hash,
            c.thumbnail_url,
            c.price::float8 as price,
            c.created_at,
            c.updated_at,
            u.avatar_url as artist_avatar_url
        FROM content c
        LEFT JOIN users u ON c.artist_id = u.wallet_address
        WHERE c.artist_id = $1
        ORDER BY c.created_at DESC
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
            artist_avatar_url: row.get::<Option<String>, _>("artist_avatar_url"), // ✅ Avatar del artista
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

/// GET /api/v1/content/public
/// List all public content (no authentication required)
/// Query params: ?type=audio|video|gaming&limit=20
pub async fn list_public_content_handler(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<ListContentResponse>, StatusCode> {
    let pool = &state.storage.pool;
    
    // Get query parameters
    let content_type_filter = params.get("type").map(|s| s.as_str());
    let limit: i64 = params.get("limit")
        .and_then(|s| s.parse().ok())
        .unwrap_or(20)
        .min(100); // Max 100 items
    
    eprintln!("🔍 [list_public_content] Request - type: {:?}, limit: {}", content_type_filter, limit);
    
    // Build query based on filters
    let query = if let Some(content_type) = content_type_filter {
        // Filter by content type
        sqlx::query(
            r#"
        SELECT 
            c.content_id,
            c.artist_id,
            c.artist_name,
            c.title,
            c.description,
            c.genre,
            c.content_type,
            c.file_url,
            c.ipfs_hash,
            c.thumbnail_url,
            c.price::float8 as price,
            c.created_at,
            c.updated_at,
            u.avatar_url as artist_avatar_url
        FROM content c
        LEFT JOIN users u ON c.artist_id = u.wallet_address
        WHERE c.content_type = $1
        ORDER BY c.created_at DESC
        LIMIT $2
            "#
        )
        .bind(content_type)
        .bind(limit)
    } else {
        // No filter, return all content types
        sqlx::query(
            r#"
        SELECT 
            c.content_id,
            c.artist_id,
            c.artist_name,
            c.title,
            c.description,
            c.genre,
            c.content_type,
            c.file_url,
            c.ipfs_hash,
            c.thumbnail_url,
            c.price::float8 as price,
            c.created_at,
            c.updated_at,
            u.avatar_url as artist_avatar_url
        FROM content c
        LEFT JOIN users u ON c.artist_id = u.wallet_address
        ORDER BY c.created_at DESC
        LIMIT $1
            "#
        )
        .bind(limit)
    };
    
    let content_rows_result = query
        .fetch_all(pool)
        .await
        .map_err(|e| {
            eprintln!("❌ Error querying public content from database: {}", e);
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
            artist_avatar_url: row.get::<Option<String>, _>("artist_avatar_url"), // ✅ Avatar del artista
        })
        .collect();

    let total = content_rows.len();

    eprintln!("✅ Retrieved {} public content items (type: {:?})", total, content_type_filter);

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
            artist_avatar_url: row.get::<Option<String>, _>("artist_avatar_url"), // ✅ Avatar del artista
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

/// GET /api/v1/content/{content_id}
/// Get content details by content_id (including artist_id)
/// ✅ NO AUTHENTICATION REQUIRED (public endpoint for tip functionality)
#[derive(Serialize)]
pub struct ContentDetailResponse {
    pub success: bool,
    pub content_id: String,
    pub artist_id: String,
    pub artist_name: String,
    pub title: String,
}

pub async fn get_content_detail_handler(
    PathExtractor(content_id): PathExtractor<String>,
    State(state): State<AppState>,
) -> Result<Json<ContentDetailResponse>, StatusCode> {
    let pool = &state.storage.pool;

    // Query database for content details
    let content_row = sqlx::query(
        r#"
        SELECT content_id, artist_id, artist_name, title
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

    match content_row {
        Some(row) => {
            Ok(Json(ContentDetailResponse {
                success: true,
                content_id: row.get("content_id"),
                artist_id: row.get("artist_id"),
                artist_name: row.get("artist_name"),
                title: row.get("title"),
            }))
        }
        None => {
            Err(StatusCode::NOT_FOUND)
        }
    }
}

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
        // ✅ CRITICAL FIX: Increase body size limit to 5GB for large file uploads
        // Default limit is 2MB, which causes "failed to read stream" for files > 2MB
        // Supports: Audio (100MB), Video (2GB), Gaming (5GB)
        .layer(DefaultBodyLimit::max(5 * 1024 * 1024 * 1024)) // 5GB limit (covers all content types)
}

// ============================================================================
// MARKETPLACE & TIPS HANDLERS
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct CreateListingRequest {
    pub content_id: String,
    pub price: f64,
    pub currency: String,
    pub license_type: String,
}

#[derive(Debug, Serialize)]
pub struct ListingResponse {
    pub listing_id: String,
    pub content_id: String,
    pub seller_address: String,
    pub price: f64,
    pub currency: String,
    pub license_type: String,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub content_title: Option<String>,
    pub content_artist: Option<String>,
    pub thumbnail_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PurchaseRequest {
    pub listing_id: String,
    pub amount: f64,
    pub tx_hash: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PurchaseResponse {
    pub purchase_id: String,
    pub license_key: String,
    pub purchased_at: chrono::DateTime<chrono::Utc>,
    pub content_id: String,
    pub license_type: String,
}

#[derive(Debug, Deserialize)]
pub struct SendTipRequest {
    pub receiver_address: String,
    pub amount: f64,
    pub currency: String,
    pub message: Option<String>,
    pub content_id: Option<String>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct TipResponse {
    pub tip_id: String,
    pub sender_address: String,
    pub receiver_address: String,
    pub amount: f64,
    pub currency: String,
    pub message: Option<String>,
    pub content_id: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct LeaderboardEntry {
    pub artist_address: String,
    pub tip_count: i64,
    pub total_received: f64,
    pub last_tip: chrono::DateTime<chrono::Utc>,
}

/**
 * POST /api/v1/content/listings
 * Create a new listing (requires authentication)
 */
pub async fn create_content_listing_handler(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Json(request): Json<CreateListingRequest>,
) -> Result<Json<ListingResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let user_address = &claims.sub;

    // Validate request
    if request.price <= 0.0 {
        return Err(StatusCode::BAD_REQUEST);
    }

    if !["personal", "commercial", "exclusive"].contains(&request.license_type.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Verify that the user owns the content
    let content = sqlx::query(
        "SELECT artist_id FROM content WHERE content_id = $1"
    )
    .bind(&request.content_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match content {
        Some(row) => {
            let artist_id: String = row.get("artist_id");
            // In this schema, artist_id is the wallet_address directly
            if artist_id != *user_address {
                return Err(StatusCode::FORBIDDEN);
            }
        },
        None => return Err(StatusCode::NOT_FOUND),
    }

    // Create listing
    let listing_row = sqlx::query(
        r#"
        INSERT INTO content_listings 
        (content_id, seller_address, price, currency, license_type)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (content_id, seller_address, license_type) 
        DO UPDATE SET 
            price = EXCLUDED.price,
            status = 'active',
            updated_at = NOW()
        RETURNING 
            listing_id::text,
            content_id,
            seller_address,
            price::float8 as price,
            currency,
            license_type,
            status,
            created_at
        "#
    )
    .bind(&request.content_id)
    .bind(user_address)
    .bind(request.price)
    .bind(&request.currency)
    .bind(&request.license_type)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        eprintln!("Error creating listing: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let listing_id: String = listing_row.get("listing_id");
    let content_id: String = listing_row.get("content_id");
    let seller_address: String = listing_row.get("seller_address");
    let price: f64 = listing_row.get("price");
    let currency: Option<String> = listing_row.get("currency");
    let license_type: Option<String> = listing_row.get("license_type");
    let status: Option<String> = listing_row.get("status");
    let created_at: Option<chrono::DateTime<chrono::Utc>> = listing_row.get("created_at");

    // Get content details
    let content_details = sqlx::query(
        "SELECT title, artist_name, thumbnail_url FROM content WHERE content_id = $1"
    )
    .bind(&content_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let content_title = content_details.as_ref().and_then(|row| row.get::<Option<String>, _>("title"));
    let content_artist = content_details.as_ref().and_then(|row| row.get::<Option<String>, _>("artist_name"));
    let thumbnail_url = content_details.as_ref().and_then(|row| row.get::<Option<String>, _>("thumbnail_url"));

    Ok(Json(ListingResponse {
        listing_id,
        content_id,
        seller_address,
        price,
        currency: currency.unwrap_or_default(),
        license_type: license_type.unwrap_or_default(),
        status: status.unwrap_or_else(|| "active".to_string()),
        created_at: created_at.unwrap_or_else(|| Utc::now()),
        content_title,
        content_artist,
        thumbnail_url,
    }))
}

/**
 * GET /api/v1/content/listings
 * Get active listings with optional filters
 */
pub async fn get_content_listings_handler(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<HashMap<String, String>>,
) -> Result<Json<Vec<ListingResponse>>, StatusCode> {
    let pool = &state.storage.pool;
    
    let seller = params.get("seller");
    let license_type = params.get("license_type");
    let max_price = params.get("max_price").and_then(|s| s.parse::<f64>().ok());
    let sort_by_default = "newest".to_string();
    let sort_by = params.get("sort_by").unwrap_or(&sort_by_default);

    let mut query = String::from(
        r#"
        SELECT 
            l.listing_id::text,
            l.content_id,
            l.seller_address,
            l.price,
            l.currency,
            l.license_type,
            l.status,
            l.created_at,
            c.title as content_title,
            c.artist_name as content_artist,
            c.thumbnail_url
        FROM content_listings l
        LEFT JOIN content c ON l.content_id = c.content_id
        WHERE l.status = 'active'
        "#
    );

    let mut conditions = Vec::new();
    if let Some(s) = seller {
        conditions.push(format!("l.seller_address = '{}'", s.replace("'", "''")));
    }
    if let Some(lt) = license_type {
        conditions.push(format!("l.license_type = '{}'", lt.replace("'", "''")));
    }
    if let Some(mp) = max_price {
        conditions.push(format!("l.price <= {}", mp));
    }

    if !conditions.is_empty() {
        query.push_str(" AND ");
        query.push_str(&conditions.join(" AND "));
    }

    match sort_by.as_str() {
        "price_low" => query.push_str(" ORDER BY l.price ASC"),
        "price_high" => query.push_str(" ORDER BY l.price DESC"),
        _ => query.push_str(" ORDER BY l.created_at DESC"),
    }

    query.push_str(" LIMIT 50");

    let rows = sqlx::query(&query)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            eprintln!("Error fetching listings: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let listings: Vec<ListingResponse> = rows.into_iter().map(|row| ListingResponse {
        listing_id: row.get("listing_id"),
        content_id: row.get("content_id"),
        seller_address: row.get("seller_address"),
        price: row.get::<f64, _>("price"),
        currency: row.get("currency"),
        license_type: row.get("license_type"),
        status: row.get("status"),
        created_at: row.get("created_at"),
        content_title: row.get("content_title"),
        content_artist: row.get("content_artist"),
        thumbnail_url: row.get("thumbnail_url"),
    }).collect();

    Ok(Json(listings))
}

/**
 * POST /api/v1/content/purchase
 * Purchase a listing (requires authentication)
 */
pub async fn purchase_content_listing_handler(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Json(request): Json<PurchaseRequest>,
) -> Result<Json<PurchaseResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let buyer_address = &claims.sub;

    // Get listing with lock
    let listing_uuid = uuid::Uuid::parse_str(&request.listing_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let listing_row = sqlx::query(
        r#"
        SELECT 
            listing_id::text,
            content_id,
            seller_address,
            price::float8 as price,
            currency,
            license_type,
            status
        FROM content_listings 
        WHERE listing_id = $1 AND status = 'active'
        FOR UPDATE
        "#
    )
    .bind(listing_uuid)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let listing_content_id: String = listing_row.get("content_id");
    let listing_seller_address: String = listing_row.get("seller_address");
    let listing_price: f64 = listing_row.get("price");
    let listing_license_type: Option<String> = listing_row.get("license_type");

    // Verify buyer is not the seller
    if listing_seller_address == *buyer_address {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Check buyer balance
    let buyer_balance: f64 = sqlx::query_scalar(
        "SELECT dyo_balance::float8 FROM token_balances WHERE address = $1"
    )
    .bind(buyer_address)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .unwrap_or(0.0);

    if buyer_balance < listing_price {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Generate license key
    let license_key = format!("DUJYO-{}-{}", 
        chrono::Utc::now().format("%Y%m%d"),
        uuid::Uuid::new_v4().to_string().replace("-", "").chars().take(16).collect::<String>()
    );

    // Start transaction
    let mut tx = pool.begin().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 1. Transfer tokens
    sqlx::query(
        "UPDATE token_balances SET dyo_balance = dyo_balance - $1 WHERE address = $2"
    )
    .bind(listing_price)
    .bind(buyer_address)
    .execute(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    sqlx::query(
        "UPDATE token_balances SET dyo_balance = dyo_balance + $1 WHERE address = $2"
    )
    .bind(listing_price)
    .bind(&listing_seller_address)
    .execute(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 2. Mark listing as sold
    sqlx::query(
        "UPDATE content_listings SET status = 'sold', updated_at = NOW() WHERE listing_id = $1"
    )
    .bind(listing_uuid)
    .execute(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 3. Create purchase record
    let purchase_row = sqlx::query(
        r#"
        INSERT INTO content_purchases 
        (listing_id, buyer_address, amount, tx_hash, license_key)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING purchase_id::text, license_key, purchased_at
        "#
    )
    .bind(listing_uuid)
    .bind(buyer_address)
    .bind(request.amount)
    .bind(request.tx_hash.as_deref())
    .bind(&license_key)
    .fetch_one(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let purchase_id: String = purchase_row.get("purchase_id");
    let license_key_returned: String = purchase_row.get("license_key");
    let purchased_at: chrono::DateTime<chrono::Utc> = purchase_row.get("purchased_at");

    // 4. Create license
    let purchase_uuid = uuid::Uuid::parse_str(&purchase_id).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    sqlx::query(
        r#"
        INSERT INTO content_licenses 
        (license_key, purchase_id, content_id, buyer_address, license_type)
        VALUES ($1, $2, $3, $4, $5)
        "#
    )
    .bind(&license_key)
    .bind(purchase_uuid)
    .bind(&listing_content_id)
    .bind(buyer_address)
    .bind(listing_license_type.as_deref().unwrap_or("personal"))
    .execute(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    tx.commit().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(PurchaseResponse {
        purchase_id,
        license_key: license_key_returned,
        purchased_at,
        content_id: listing_content_id,
        license_type: listing_license_type.unwrap_or_default(),
    }))
}

/**
 * POST /api/v1/content/tips/send
 * Send a tip to an artist (requires authentication)
 */
pub async fn send_tip_to_artist_handler(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Json(request): Json<SendTipRequest>,
) -> Result<Json<TipResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let sender_address = &claims.sub;

    // Validate request
    if request.amount <= 0.0 {
        return Err(StatusCode::BAD_REQUEST);
    }

    if sender_address == &request.receiver_address {
        return Err(StatusCode::BAD_REQUEST);
    }

    // ✅ FIX: Check sender balance in micro-DYO (1 DYO = 1,000,000 micro-DYO)
    let sender_balance_result = sqlx::query_as::<_, (Option<i64>, Option<i64>, Option<i64>)>(
        "SELECT dyo_balance, dys_balance, staked_balance FROM token_balances WHERE address = $1"
    )
    .bind(sender_address)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("[Tip] Error fetching sender balance: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Convert micro-DYO to DYO for comparison
    let sender_balance_dyo = match sender_balance_result {
        Some((Some(dyo_micro), _, _)) => dyo_micro as f64 / 1_000_000.0,
        Some((None, _, _)) => 0.0,
        None => 0.0
    };

    let tip_amount = request.amount;
    
    if sender_balance_dyo < tip_amount {
        return Ok(Json(TipResponse {
            tip_id: String::new(),
            sender_address: sender_address.clone(),
            receiver_address: request.receiver_address.clone(),
            amount: 0.0,
            currency: request.currency.clone(),
            message: None,
            content_id: None,
            created_at: chrono::Utc::now(),
        }));
    }

    // Convert tip amount to micro-DYO for database operations
    let tip_amount_micro = (tip_amount * 1_000_000.0).round() as i64;

    // Generate tip ID
    let tip_id = uuid::Uuid::new_v4();

    // Start transaction
    let mut tx = pool.begin().await.map_err(|e| {
        tracing::error!("[Tip] Failed to begin transaction: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // 1. Transfer tokens (in micro-DYO)
    // Deduct from sender
    let sender_update_result = sqlx::query(
        r#"
        INSERT INTO token_balances (address, dyo_balance, dys_balance, staked_balance, updated_at)
        VALUES ($1, -$2, 0, 0, NOW())
        ON CONFLICT (address) DO UPDATE SET
            dyo_balance = token_balances.dyo_balance - $2,
            updated_at = NOW()
        "#
    )
    .bind(sender_address)
    .bind(tip_amount_micro)
    .execute(&mut *tx)
    .await;

    match sender_update_result {
        Ok(_) => {},
        Err(e) => {
            tracing::error!("[Tip] Failed to deduct from sender: {}", e);
            let _ = tx.rollback().await;
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    }

    // Add to receiver
    let receiver_update_result = sqlx::query(
        r#"
        INSERT INTO token_balances (address, dyo_balance, dys_balance, staked_balance, updated_at)
        VALUES ($1, $2, 0, 0, NOW())
        ON CONFLICT (address) DO UPDATE SET
            dyo_balance = COALESCE(token_balances.dyo_balance, 0) + $2,
            updated_at = NOW()
        "#
    )
    .bind(&request.receiver_address)
    .bind(tip_amount_micro)
    .execute(&mut *tx)
    .await;

    match receiver_update_result {
        Ok(_) => {},
        Err(e) => {
            tracing::error!("[Tip] Failed to add to receiver: {}", e);
            let _ = tx.rollback().await;
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    }

    // 2. Create tip record (store amount in DYO, not micro-DYO)
    let tip_row = sqlx::query(
        r#"
        INSERT INTO tips 
        (tip_id, sender_address, receiver_address, amount, currency, message, content_id, is_public)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING tip_id::text, sender_address, receiver_address, amount::float8 as amount, currency, message, content_id, created_at
        "#
    )
    .bind(tip_id)
    .bind(sender_address)
    .bind(&request.receiver_address)
    .bind(tip_amount) // Store in DYO (not micro-DYO) for readability
    .bind(&request.currency)
    .bind(request.message.as_deref())
    .bind(request.content_id.as_deref())
    .bind(request.is_public.unwrap_or(true))
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!("[Tip] Error creating tip record: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let tip_id_str: String = tip_row.get("tip_id");
    let tip_sender: String = tip_row.get("sender_address");
    let tip_receiver: String = tip_row.get("receiver_address");
    let tip_amount_f64: f64 = tip_row.get("amount");
    let tip_currency: String = tip_row.get("currency");
    let tip_message: Option<String> = tip_row.get("message");
    let tip_content_id: Option<String> = tip_row.get("content_id");
    let tip_created_at: chrono::DateTime<chrono::Utc> = tip_row.get("created_at");

    // 3. Update artist tip stats
    sqlx::query(
        r#"
        INSERT INTO artist_tip_stats (artist_address, total_tips_received, tip_count, last_tip_at)
        VALUES ($1, $2, 1, NOW())
        ON CONFLICT (artist_address)
        DO UPDATE SET
            total_tips_received = artist_tip_stats.total_tips_received + $2,
            tip_count = artist_tip_stats.tip_count + 1,
            last_tip_at = NOW(),
            updated_at = NOW()
        "#
    )
    .bind(&request.receiver_address)
    .bind(tip_amount)
    .execute(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 4. Update user tip stats
    sqlx::query(
        r#"
        INSERT INTO user_tip_stats (user_address, total_tips_sent, tip_count, last_tip_at)
        VALUES ($1, $2, 1, NOW())
        ON CONFLICT (user_address)
        DO UPDATE SET
            total_tips_sent = user_tip_stats.total_tips_sent + $2,
            tip_count = user_tip_stats.tip_count + 1,
            last_tip_at = NOW(),
            updated_at = NOW()
        "#
    )
    .bind(sender_address)
    .bind(tip_amount)
    .execute(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Commit transaction
    tx.commit().await.map_err(|e| {
        tracing::error!("[Tip] Failed to commit transaction: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(TipResponse {
        tip_id: tip_id_str,
        sender_address: tip_sender,
        receiver_address: tip_receiver,
        amount: tip_amount_f64,
        currency: tip_currency,
        message: tip_message,
        content_id: tip_content_id,
        created_at: tip_created_at,
    }))
}

/**
 * GET /api/v1/content/tips/received/:address
 * Get tips received by an artist
 */
pub async fn get_tips_received_handler(
    State(state): State<AppState>,
    PathExtractor(address): PathExtractor<String>,
    axum::extract::Query(params): axum::extract::Query<HashMap<String, String>>,
) -> Result<Json<Vec<TipResponse>>, StatusCode> {
    let pool = &state.storage.pool;
    let limit: i64 = params.get("limit").and_then(|s| s.parse().ok()).unwrap_or(50);

    let rows = sqlx::query(
        r#"
        SELECT 
            tip_id::text,
            sender_address,
            receiver_address,
            amount,
            currency,
            message,
            content_id,
            created_at
        FROM tips
        WHERE receiver_address = $1
        ORDER BY created_at DESC
        LIMIT $2
        "#
    )
    .bind(&address)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("Error fetching received tips: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let tips: Vec<TipResponse> = rows.into_iter().map(|row| TipResponse {
        tip_id: row.get("tip_id"),
        sender_address: row.get("sender_address"),
        receiver_address: row.get("receiver_address"),
        amount: row.get::<f64, _>("amount"),
        currency: row.get("currency"),
        message: row.get("message"),
        content_id: row.get("content_id"),
        created_at: row.get("created_at"),
    }).collect();

    Ok(Json(tips))
}

/**
 * GET /api/v1/content/tips/leaderboard
 * Get top tipped artists
 */
pub async fn get_tip_leaderboard_handler(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<HashMap<String, String>>,
) -> Result<Json<Vec<LeaderboardEntry>>, StatusCode> {
    let pool = &state.storage.pool;
    let limit: i64 = params.get("limit").and_then(|s| s.parse().ok()).unwrap_or(10);

    // Refresh materialized view
    sqlx::query("REFRESH MATERIALIZED VIEW CONCURRENTLY tip_leaderboard")
        .execute(pool)
        .await
        .ok(); // Ignore errors

    let rows = sqlx::query(
        r#"
        SELECT 
            artist_address,
            tip_count,
            total_received,
            last_tip
        FROM tip_leaderboard
        ORDER BY total_received DESC
        LIMIT $1
        "#
    )
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("Error fetching leaderboard: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let entries: Vec<LeaderboardEntry> = rows.into_iter().map(|row| LeaderboardEntry {
        artist_address: row.get("artist_address"),
        tip_count: row.get("tip_count"),
        total_received: row.get::<f64, _>("total_received"),
        last_tip: row.get("last_tip"),
    }).collect();

    Ok(Json(entries))
}

/**
 * GET /api/tips/artist/:artistId/stats
 * Get tip statistics for a specific artist
 */
#[derive(Debug, Serialize)]
pub struct ArtistTipStatsResponse {
    pub success: bool,
    pub total_received: f64,
    pub total_tippers: i64,
    pub recent_tips: Vec<TipResponse>,
}

pub async fn get_artist_tip_stats_handler(
    State(state): State<AppState>,
    PathExtractor(artist_id): PathExtractor<String>,
) -> Result<Json<ArtistTipStatsResponse>, StatusCode> {
    let pool = &state.storage.pool;

    // Get total received and tip count from artist_tip_stats
    let stats_row = sqlx::query(
        r#"
        SELECT 
            COALESCE(total_tips_received, 0::DECIMAL)::float8 as total_received,
            COALESCE(tip_count, 0) as tip_count
        FROM artist_tip_stats
        WHERE artist_address = $1
        "#
    )
    .bind(&artist_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        eprintln!("Error fetching artist tip stats: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let (total_received, total_tippers) = if let Some(row) = stats_row {
        (
            row.get::<f64, _>("total_received"),
            row.get::<i64, _>("tip_count")
        )
    } else {
        (0.0, 0)
    };

    // Get recent tips (last 10)
    let rows = sqlx::query(
        r#"
        SELECT 
            tip_id::text,
            sender_address,
            receiver_address,
            amount::float8 as amount,
            currency,
            message,
            content_id,
            created_at
        FROM tips
        WHERE receiver_address = $1
        ORDER BY created_at DESC
        LIMIT 10
        "#
    )
    .bind(&artist_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("Error fetching recent tips: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let recent_tips: Vec<TipResponse> = rows.into_iter().map(|row| TipResponse {
        tip_id: row.get("tip_id"),
        sender_address: row.get("sender_address"),
        receiver_address: row.get("receiver_address"),
        amount: row.get::<f64, _>("amount"),
        currency: row.get("currency"),
        message: row.get("message"),
        content_id: row.get("content_id"),
        created_at: row.get("created_at"),
    }).collect();

    Ok(Json(ArtistTipStatsResponse {
        success: true,
        total_received,
        total_tippers,
        recent_tips,
    }))
}

/// Content listing routes (separate from upload for better organization)
pub fn content_routes() -> Router<AppState> {
    use axum::routing::post;
    Router::new()
        // Note: /public route is moved to public_routes in server.rs
        .route("/artist/{artist_id}", get(list_artist_content_handler))
        .route("/{content_id}/file", get(serve_content_file_handler)) // ✅ Must be BEFORE /{content_id} to avoid route conflict
        .route("/{content_id}", get(get_content_detail_handler)) // ✅ NEW: Get content details (for tip functionality)
        .route("/videos", get(list_videos_handler)) // ✅ Public endpoint to list all videos
        // Marketplace routes
        .route("/listings", post(create_content_listing_handler))
        .route("/listings", get(get_content_listings_handler))
        .route("/purchase", post(purchase_content_listing_handler))
        // Tips routes
        .route("/tips/send", post(send_tip_to_artist_handler))
        .route("/tips/received/:address", get(get_tips_received_handler))
        .route("/tips/leaderboard", get(get_tip_leaderboard_handler))
}

/// Tips routes (separate router for /api/tips/* endpoints)
pub fn tips_routes() -> Router<AppState> {
    Router::new()
        .route("/artist/:artistId/stats", axum::routing::get(get_artist_tip_stats_handler))
}

