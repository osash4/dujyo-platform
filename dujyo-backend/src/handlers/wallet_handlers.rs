use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WalletSession {
    pub session_id: String,
    pub address: String,
    pub connected_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectWalletRequest {
    pub wallet_type: String, // "metamask", "polkadot", "substrate", etc.
    pub address: Option<String>,
    pub signature: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectWalletResponse {
    pub session_id: String,
    pub address: String,
    pub message: String,
    pub connected_at: DateTime<Utc>,
}

// In-memory session storage (in a real app, this would be a database like leveldb)
lazy_static::lazy_static! {
    static ref ACTIVE_SESSIONS: Arc<Mutex<std::collections::HashMap<String, WalletSession>>> = 
        Arc::new(Mutex::new(std::collections::HashMap::new()));
}

// Handler to get the connected account
pub async fn get_wallet_session(session_id: String) -> Result<WalletSession, String> {
    let sessions = ACTIVE_SESSIONS.lock().map_err(|_| "Failed to acquire sessions lock")?;
    
    match sessions.get(&session_id) {
        Some(session) => {
            if session.is_active {
                Ok(session.clone())
            } else {
                Err("Session is not active".to_string())
            }
        }
        None => Err("Session not found".to_string())
    }
}

// Handler wallet connection
pub async fn connect_wallet(request: ConnectWalletRequest) -> Result<ConnectWalletResponse, String> {
    // Validate wallet type
    let supported_wallets = ["metamask", "polkadot", "substrate", "polkadot-js"];
    if !supported_wallets.contains(&request.wallet_type.as_str()) {
        return Err(format!("Unsupported wallet type: {}", request.wallet_type));
    }
    
    // Generate session ID
    let session_id = Uuid::new_v4().to_string();
    
    // For demo purposes, generate a mock address if not provided
    let address = request.address.unwrap_or_else(|| {
        match request.wallet_type.as_str() {
            "metamask" => "0x1234567890abcdef1234567890abcdef12345678".to_string(),
            "polkadot" | "substrate" | "polkadot-js" => "5DkUgD5gkUdKbsLNLZJpV5MknTTsPmWkzA6UQ3p2FXUk9Ckd".to_string(),
            _ => "unknown_address".to_string(),
        }
    });
    
    // Create session
    let session = WalletSession {
        session_id: session_id.clone(),
        address: address.clone(),
        connected_at: Utc::now(),
        last_activity: Utc::now(),
        is_active: true,
    };
    
    // Store session
    let mut sessions = ACTIVE_SESSIONS.lock().map_err(|_| "Failed to acquire sessions lock")?;
    sessions.insert(session_id.clone(), session);
    
    Ok(ConnectWalletResponse {
        session_id,
        address,
        message: format!("Wallet connected successfully using {}", request.wallet_type),
        connected_at: Utc::now(),
    })
}

// Handler to disconnect wallet
pub async fn disconnect_wallet(session_id: String) -> Result<String, String> {
    let mut sessions = ACTIVE_SESSIONS.lock().map_err(|_| "Failed to acquire sessions lock")?;
    
    match sessions.get_mut(&session_id) {
        Some(session) => {
            session.is_active = false;
            session.last_activity = Utc::now();
    Ok("Wallet disconnected successfully".to_string())
        }
        None => Err("Session not found".to_string())
    }
}

// Handler to get all active sessions
pub async fn get_active_sessions() -> Result<Vec<WalletSession>, String> {
    let sessions = ACTIVE_SESSIONS.lock().map_err(|_| "Failed to acquire sessions lock")?;
    
    let active_sessions: Vec<WalletSession> = sessions
        .values()
        .filter(|session| session.is_active)
        .cloned()
        .collect();
    
    Ok(active_sessions)
}

// Handler to update session activity
pub async fn update_session_activity(session_id: String) -> Result<(), String> {
    let mut sessions = ACTIVE_SESSIONS.lock().map_err(|_| "Failed to acquire sessions lock")?;
    
    match sessions.get_mut(&session_id) {
        Some(session) => {
            session.last_activity = Utc::now();
            Ok(())
        }
        None => Err("Session not found".to_string())
    }
}

// Handler to validate session
pub async fn validate_session(session_id: String) -> Result<bool, String> {
    let sessions = ACTIVE_SESSIONS.lock().map_err(|_| "Failed to acquire sessions lock")?;
    
    match sessions.get(&session_id) {
        Some(session) => {
            // Check if session is active and not expired (24 hours)
            let now = Utc::now();
            let session_age = now.signed_duration_since(session.connected_at);
            
            if session.is_active && session_age.num_hours() < 24 {
                Ok(true)
            } else {
                Ok(false)
            }
        }
        None => Ok(false)
    }
}

// Handler para limpiar sesiones expiradas
pub async fn cleanup_expired_sessions() -> Result<usize, String> {
    let mut sessions = ACTIVE_SESSIONS.lock().map_err(|_| "Failed to acquire sessions lock")?;
    let now = Utc::now();
    let mut expired_count = 0;
    
    sessions.retain(|_, session| {
        let session_age = now.signed_duration_since(session.connected_at);
        let is_expired = session_age.num_hours() >= 24;
        
        if is_expired {
            expired_count += 1;
        }
        
        !is_expired
    });
    
    Ok(expired_count)
}