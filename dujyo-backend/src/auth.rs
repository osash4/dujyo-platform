use axum::{
    extract::{Request, State},
    http::{header::AUTHORIZATION, StatusCode, HeaderValue},
    middleware::Next,
    response::{Response, Json},
    body::Body,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::env;
use bcrypt;

// JWT Claims structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,    // Subject (user address)
    pub exp: usize,     // Expiration time
    pub iat: usize,     // Issued at
    pub iss: String,    // Issuer
}

// JWT Configuration
#[derive(Clone)]
pub struct JwtConfig {
    pub secret: String,
    pub encoding_key: EncodingKey,
    pub decoding_key: DecodingKey,
}

impl JwtConfig {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let secret = env::var("JWT_SECRET")
            .map_err(|_| {
                tracing::error!("CRITICAL: JWT_SECRET environment variable must be set. This is a security requirement.");
                std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    "JWT_SECRET environment variable must be set"
                )
            })?;
        
        // Validate secret strength
        if secret.len() < 32 {
            return Err("JWT_SECRET must be at least 32 characters long".into());
        }
        
        let encoding_key = EncodingKey::from_secret(secret.as_ref());
        let decoding_key = DecodingKey::from_secret(secret.as_ref());
        
        Ok(Self {
            secret,
            encoding_key,
            decoding_key,
        })
    }
    
    pub fn generate_token(&self, address: &str) -> Result<String, jsonwebtoken::errors::Error> {
        let now = chrono::Utc::now().timestamp() as usize;
        let exp = now + (24 * 60 * 60); // 24 hours
        
        let claims = Claims {
            sub: address.to_string(),
            exp,
            iat: now,
            iss: "dujyo-blockchain".to_string(),
        };
        
        encode(&Header::default(), &claims, &self.encoding_key)
    }
    
    pub fn verify_token(&self, token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        let validation = Validation::default();
        let token_data = decode::<Claims>(token, &self.decoding_key, &validation)?;
        Ok(token_data.claims)
    }
}

// Authentication middleware for Axum
pub async fn jwt_middleware(
    State(jwt_config): State<JwtConfig>,
    mut request: Request,
    next: Next,
) -> Response {
    // Extract Authorization header
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|header| header.to_str().ok());
    
    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => {
            &header[7..] // Remove "Bearer " prefix
        }
        Some(header) => {
            eprintln!("Invalid Authorization header format: {}", header.chars().take(50).collect::<String>());
            return Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .header("Content-Type", "application/json")
                .body(Body::from(r#"{"error":"Unauthorized","message":"Invalid Authorization header format"}"#))
                .unwrap();
        }
        None => {
            eprintln!("Missing Authorization header for path: {}", request.uri().path());
            return Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .header("Content-Type", "application/json")
                .body(Body::from(r#"{"error":"Unauthorized","message":"Missing Authorization header"}"#))
                .unwrap();
        }
    };
    
    // Verify JWT token
    match jwt_config.verify_token(token) {
        Ok(claims) => {
            // Add claims to request extensions for use in handlers
            request.extensions_mut().insert(claims);
            next.run(request).await
        }
        Err(e) => {
            eprintln!("JWT verification failed: {}", e);
            eprintln!("   Token (first 20 chars): {}", &token.chars().take(20).collect::<String>());
            eprintln!("   Path: {}", request.uri().path());
            Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .header("Content-Type", "application/json")
                .body(Body::from(format!(r#"{{"error":"Unauthorized","message":"JWT verification failed"}}"#)))
                .unwrap()
        }
    }
}

// Helper function to extract claims from request
pub fn get_authenticated_address(request: &Request) -> Option<String> {
    request
        .extensions()
        .get::<Claims>()
        .map(|claims| claims.sub.clone())
}

// Login endpoint handler
pub async fn login_handler(
    State(state): State<crate::server::AppState>,
    axum::Json(payload): axum::Json<LoginRequest>,
) -> Result<axum::Json<LoginResponse>, StatusCode> {
    use bcrypt::verify;
    
    let pool = &state.storage.pool;
    
    // If email/password provided, authenticate with database
    if let (Some(email), Some(password)) = (&payload.email, &payload.password) {
        // Find user by email
        let user_result: Option<(String, String)> = sqlx::query_as(
            "SELECT wallet_address, password_hash FROM users WHERE email = $1"
        )
        .bind(email)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            eprintln!("❌ Database error during login: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        
        match user_result {
            Some((wallet_address, password_hash)) => {
                // Verify password
                if verify(password, &password_hash).unwrap_or(false) {
                    // Generate JWT token
                    let token = state.jwt_config
                        .generate_token(&wallet_address)
                        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
                    
                    return Ok(axum::Json(LoginResponse {
                        success: true,
                        token,
                        message: "Login successful".to_string(),
                        wallet_address: Some(wallet_address.clone()),
                    }));
                } else {
                    return Ok(axum::Json(LoginResponse {
                        success: false,
                        token: String::new(),
                        message: "Invalid email or password".to_string(),
                        wallet_address: None,
                    }));
                }
            }
            None => {
                return Ok(axum::Json(LoginResponse {
                    success: false,
                    token: String::new(),
                    message: "Invalid email or password".to_string(),
                    wallet_address: None,
                }));
            }
        }
    }
    
    // Fallback to wallet address authentication (original behavior)
    if let Some(ref address) = payload.address {
        // If signature provided, verify it
        if let Some(ref signature) = payload.signature {
            if !verify_signature(address, "Dujyo Authentication", signature) {
                return Ok(axum::Json(LoginResponse {
                    success: false,
                    token: String::new(),
                    message: "Invalid signature".to_string(),
                    wallet_address: None,
                }));
            }
        }
        
        // Verify wallet address exists in database
        let wallet_exists: Option<String> = sqlx::query_scalar(
            "SELECT wallet_address FROM users WHERE wallet_address = $1"
        )
        .bind(address)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            eprintln!("❌ Database error checking wallet: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        
        if wallet_exists.is_none() {
            return Ok(axum::Json(LoginResponse {
                success: false,
                token: String::new(),
                message: "Wallet address not found. Please register first.".to_string(),
                wallet_address: None,
            }));
        }
        
        // Generate JWT token for the address
        let token = state.jwt_config
            .generate_token(address)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        
        return Ok(axum::Json(LoginResponse {
            success: true,
            token,
            message: "Login successful".to_string(),
            wallet_address: Some(address.clone()),
        }));
    }
    
    // If neither email/password nor wallet address provided
    Ok(axum::Json(LoginResponse {
        success: false,
        token: String::new(),
        message: "Please provide either email/password or wallet address".to_string(),
        wallet_address: None,
    }))
}

// Request/Response types for login
#[derive(Deserialize)]
pub struct LoginRequest {
    #[serde(default)]
    pub address: Option<String>,  // Wallet address (optional)
    pub signature: Option<String>, // Optional signature for verification
    pub email: Option<String>,    // Email for email/password login
    pub password: Option<String>,  // Password for email/password login
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub token: String,
    pub message: String,
    pub wallet_address: Option<String>,
}

// Signature verification (optional - for enhanced security)
pub fn verify_signature(address: &str, message: &str, signature: &str) -> bool {
    // This is a simplified verification
    // In production, you'd use proper cryptographic signature verification
    // For now, we'll check if the signature is valid hex and address format is correct
    !signature.is_empty() && 
    !address.is_empty() && 
    !message.is_empty() &&
    signature.len() == 64 && // HMAC-SHA256 produces 64 hex characters
    address.starts_with("XW") && 
    address.len() == 42
}

// Generate a message for signing
pub fn generate_auth_message(address: &str) -> String {
    let timestamp = chrono::Utc::now().timestamp();
    format!("Dujyo Authentication: {} at {}", address, timestamp)
}

// Register endpoint handler
#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub username: Option<String>,
    pub wallet_address: Option<String>,
}

#[derive(Serialize)]
pub struct RegisterResponse {
    pub success: bool,
    pub token: String,
    pub message: String,
    pub user_id: Option<String>,
    pub wallet_address: Option<String>,
}

pub async fn register_handler(
    State(state): State<crate::server::AppState>,
    axum::Json(payload): axum::Json<RegisterRequest>,
) -> Result<axum::Json<RegisterResponse>, StatusCode> {
    use sqlx::PgPool;
    use bcrypt::{hash, DEFAULT_COST};
    
    let pool = &state.storage.pool;
    
    // Validate email
    if payload.email.is_empty() || !payload.email.contains('@') {
        return Ok(axum::Json(RegisterResponse {
            success: false,
            token: String::new(),
            message: "Invalid email address".to_string(),
            user_id: None,
            wallet_address: None,
        }));
    }
    
    // Validate password
    if payload.password.len() < 6 {
        return Ok(axum::Json(RegisterResponse {
            success: false,
            token: String::new(),
            message: "Password must be at least 6 characters".to_string(),
            user_id: None,
            wallet_address: None,
        }));
    }
    
    // Generate wallet address if not provided (DU prefix for Dujyo)
    let wallet_address = payload.wallet_address.unwrap_or_else(|| {
        format!("DU{}", uuid::Uuid::new_v4().to_string().replace("-", "").chars().take(40).collect::<String>())
    });
    
    // Hash password
    let password_hash = hash(&payload.password, DEFAULT_COST)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Check if email already exists
    let email_exists: Option<String> = sqlx::query_scalar(
        "SELECT email FROM users WHERE email = $1"
    )
    .bind(&payload.email)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Database error checking email: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    if email_exists.is_some() {
        return Ok(axum::Json(RegisterResponse {
            success: false,
            token: String::new(),
            message: "Email already registered".to_string(),
            user_id: None,
            wallet_address: None,
        }));
    }
    
    // Check if username already exists (if provided)
    if let Some(ref username) = payload.username {
        let username_exists: Option<String> = sqlx::query_scalar(
            "SELECT username FROM users WHERE username = $1"
        )
        .bind(username)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            eprintln!("❌ Database error checking username: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        
        if username_exists.is_some() {
            return Ok(axum::Json(RegisterResponse {
                success: false,
                token: String::new(),
                message: "Username already taken".to_string(),
                user_id: None,
                wallet_address: None,
            }));
        }
    }
    
    // Insert user into database
    // user_id is the PRIMARY KEY, generate a UUID for it
    let user_id = uuid::Uuid::new_v4().to_string();
    let username_value = payload.username.as_ref().unwrap_or(&wallet_address);
    
    // Try to insert with user_type first, fallback to without it if column doesn't exist
    let result: Result<Option<String>, sqlx::Error> = {
        // First try with user_type
        let result_with_type = sqlx::query_scalar(
            r#"
            INSERT INTO users (user_id, wallet_address, email, password_hash, username, user_type, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 'listener', NOW(), NOW())
            RETURNING wallet_address
            "#
        )
        .bind(&user_id)
        .bind(&wallet_address)
        .bind(&payload.email)
        .bind(&password_hash)
        .bind(username_value)
        .fetch_optional(pool)
        .await;
        
        // If that fails with column error, try without user_type
        match result_with_type {
            Ok(val) => Ok(val),
            Err(e) => {
                let error_msg = e.to_string();
                if error_msg.contains("user_type") || error_msg.contains("column") || error_msg.contains("does not exist") {
                // Column doesn't exist, insert without it
                sqlx::query_scalar(
                    r#"
                    INSERT INTO users (user_id, wallet_address, email, password_hash, username, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                    RETURNING wallet_address
                    "#
                )
                .bind(&user_id)
                .bind(&wallet_address)
                .bind(&payload.email)
                .bind(&password_hash)
                .bind(username_value)
                .fetch_optional(pool)
                .await
                } else {
                    // Some other error, return it
                    Err(e)
                }
            }
        }
    };
    
    match result {
        Ok(Some(user_id)) => {
            // Initialize token balance for new user (with 0 balance)
            let init_balance_result = sqlx::query(
                r#"
                INSERT INTO token_balances (address, dyo_balance, dys_balance, staked_balance, updated_at)
                VALUES ($1, 0, 0, 0, NOW())
                ON CONFLICT (address) DO NOTHING
                "#
            )
            .bind(&wallet_address)
            .execute(pool)
            .await;
            
            match init_balance_result {
                Ok(_) => {
                    eprintln!("✅ Initialized token balance for wallet: {}", wallet_address);
                }
                Err(e) => {
                    eprintln!("⚠️ Warning: Failed to initialize token balance for {}: {}", wallet_address, e);
                    // Continue registration even if balance initialization fails
                }
            }
            
            // Generate JWT token
            let token = state.jwt_config
                .generate_token(&wallet_address)
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            
            Ok(axum::Json(RegisterResponse {
                success: true,
                token,
                message: "Registration successful".to_string(),
                user_id: Some(wallet_address.clone()),
                wallet_address: Some(wallet_address),
            }))
        }
        Ok(None) => {
            // This shouldn't happen, but handle it
            Ok(axum::Json(RegisterResponse {
                success: false,
                token: String::new(),
                message: "Failed to create user".to_string(),
                user_id: None,
                wallet_address: None,
            }))
        }
        Err(e) => {
            eprintln!("❌ Database error during registration: {}", e);
            // Return a more descriptive error
            let error_msg = if e.to_string().contains("duplicate key") {
                if e.to_string().contains("email") {
                    "Email already registered".to_string()
                } else if e.to_string().contains("username") {
                    "Username already taken".to_string()
                } else {
                    "User already exists".to_string()
                }
            } else {
                format!("Database error: {}", e)
            };
            
            Ok(axum::Json(RegisterResponse {
                success: false,
                token: String::new(),
                message: error_msg,
                user_id: None,
                wallet_address: None,
            }))
        }
    }
}
