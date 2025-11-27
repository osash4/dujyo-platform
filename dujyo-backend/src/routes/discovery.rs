use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::error;

/// ✅ SECURITY FIX: Safe timestamp helper
fn get_current_timestamp() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .map_err(|e| {
            error!(error = %e, "CRITICAL: System time error in discovery");
            format!("System time error: {}", e)
        })
}

use crate::storage::BlockchainStorage;
use crate::server::AppState;

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Serialize, Deserialize, Clone)]
pub struct ListeningRecord {
    pub user_id: String,
    pub artist_id: String,
    pub track_id: String,
    pub timestamp: u64,
    pub artist_followers_at_time: u64, // Followers cuando el usuario descubrió
    pub track_streams_at_time: u64,    // Streams cuando el usuario descubrió
}

#[derive(Serialize, Clone)]
pub struct DiscoveryLeaderboard {
    pub top_discoverers: Vec<DiscovererProfile>,
    pub time_period: String,
    pub total_participants: u32,
    pub timestamp: u64,
}

#[derive(Serialize, Clone)]
pub struct DiscovererProfile {
    pub user_id: String,
    pub username: String,
    pub discovery_score: u64,
    pub total_discoveries: u32,
    pub successful_predictions: u32, // Artistas que se volvieron populares
    pub taste_maker_score: f64,       // 0-100 score de accuracy
    pub rank: u32,
    pub badges: Vec<Badge>,
    pub avatar_url: Option<String>,
    pub level: u32,
    pub xp: u64,
}

#[derive(Serialize, Clone)]
pub struct Badge {
    pub badge_id: String,
    pub name: String,
    pub description: String,
    pub rarity: String, // "common", "rare", "epic", "legendary"
    pub icon_url: String,
    pub earned_at: String,
    pub is_soulbound: bool, // NFT no transferible
}

#[derive(Serialize, Clone)]
pub struct UserDiscoveryStats {
    pub user_id: String,
    pub username: String,
    pub total_discoveries: u32,
    pub early_adopter_discoveries: u32, // Descubiertos antes de 1K followers
    pub successful_predictions: u32,     // Se volvieron populares (>100K streams)
    pub taste_maker_score: f64,
    pub discovery_streak: u32,           // Días consecutivos descubriendo
    pub longest_streak: u32,
    pub total_xp: u64,
    pub level: u32,
    pub xp_to_next_level: u64,
    pub badges: Vec<Badge>,
    pub recent_discoveries: Vec<RecentDiscovery>,
    pub top_genres_discovered: Vec<GenreStats>,
    pub rewards: RewardsSummary,
}

#[derive(Serialize, Clone)]
pub struct RecentDiscovery {
    pub artist_id: String,
    pub artist_name: String,
    pub track_id: String,
    pub track_name: String,
    pub discovered_at: String,
    pub followers_then: u64,
    pub followers_now: u64,
    pub streams_then: u64,
    pub streams_now: u64,
    pub growth_multiplier: f64,
    pub xp_earned: u64,
    pub tokens_earned: f64,
}

#[derive(Serialize, Clone)]
pub struct GenreStats {
    pub genre: String,
    pub discoveries: u32,
    pub accuracy: f64,
}

#[derive(Serialize, Clone)]
pub struct RewardsSummary {
    pub total_dyo_earned: f64,
    pub pending_dyo: f64,
    pub total_nfts_earned: u32,
    pub claimable_rewards: Vec<ClaimableReward>,
}

#[derive(Serialize, Clone)]
pub struct ClaimableReward {
    pub reward_id: String,
    pub reward_type: String, // "dyo_tokens", "nft_badge", "early_adopter_bonus"
    pub amount: f64,
    pub description: String,
    pub expires_at: Option<String>,
}

#[derive(Deserialize)]
pub struct RecordListeningRequest {
    pub user_id: String,
    pub artist_id: String,
    pub track_id: String,
}

#[derive(Serialize)]
pub struct RecordListeningResponse {
    pub success: bool,
    pub message: String,
    pub xp_earned: u64,
    pub tokens_earned: f64,
    pub new_badges: Vec<Badge>,
    pub is_early_discovery: bool,
    pub early_adopter_multiplier: f64,
}

#[derive(Deserialize)]
pub struct ClaimRewardsRequest {
    pub user_id: String,
    pub reward_ids: Vec<String>,
}

#[derive(Serialize)]
pub struct ClaimRewardsResponse {
    pub success: bool,
    pub message: String,
    pub dyo_claimed: f64,
    pub nfts_claimed: Vec<String>,
    pub transaction_hash: Option<String>,
}

// ============================================================================
// HANDLERS
// ============================================================================

/// POST /api/v1/discovery/record-listening
/// Records that a user listened to an artist/track for discovery tracking
pub async fn record_listening(
    State(state): State<AppState>,
    Json(request): Json<RecordListeningRequest>,
) -> Result<Json<RecordListeningResponse>, StatusCode> {
    let _storage = &state.storage;
    
    // TODO: Get actual follower/stream counts from database
    let followers_at_time = 842u64; // Mock: Artist has < 1K followers
    let streams_at_time = 3_250u64;
    
    // Calculate early adopter bonus
    let is_early_discovery = followers_at_time < 10_000;
    let early_adopter_multiplier = if followers_at_time < 1_000 {
        5.0 // 5x bonus for discovering artists with < 1K followers
    } else if followers_at_time < 10_000 {
        2.5 // 2.5x bonus for < 10K followers
    } else if followers_at_time < 100_000 {
        1.5 // 1.5x bonus for < 100K followers
    } else {
        1.0 // No bonus
    };
    
    // Calculate rewards
    let base_xp = 50u64;
    let xp_earned = (base_xp as f64 * early_adopter_multiplier) as u64;
    let tokens_earned = if is_early_discovery {
        xp_earned as f64 * 0.01 // 1 DYO per 100 XP
    } else {
        0.0
    };
    
    // Check for new badges
    let mut new_badges = Vec::new();
    if is_early_discovery && followers_at_time < 1_000 {
        new_badges.push(Badge {
            badge_id: "early_adopter_001".to_string(),
            name: "Early Adopter".to_string(),
            description: "Discovered an artist with < 1K followers".to_string(),
            rarity: "rare".to_string(),
            icon_url: "https://dujyo.io/badges/early_adopter.png".to_string(),
            earned_at: chrono::Utc::now().to_rfc3339(),
            is_soulbound: true,
        });
    }
    
    // Log discovery
    tracing::info!(
        "Discovery recorded: user={}, artist={}, track={}, early_discovery={}, multiplier={}x, xp={}, tokens={}",
        request.user_id,
        request.artist_id,
        request.track_id,
        is_early_discovery,
        early_adopter_multiplier,
        xp_earned,
        tokens_earned
    );
    
    // TODO: Save to database
    // TODO: Emit blockchain event for significant discoveries
    
    Ok(Json(RecordListeningResponse {
        success: true,
        message: format!(
            "Discovery recorded! {} XP earned ({:.1}x early adopter bonus)",
            xp_earned, early_adopter_multiplier
        ),
        xp_earned,
        tokens_earned,
        new_badges,
        is_early_discovery,
        early_adopter_multiplier,
    }))
}

/// GET /api/v1/discovery/leaderboard
/// Returns the discovery leaderboard
pub async fn get_leaderboard(
    State(state): State<AppState>,
) -> Result<Json<DiscoveryLeaderboard>, StatusCode> {
    let _storage = &state.storage;
    
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = get_current_timestamp().map_err(|e| {
        tracing::error!(error = %e, "CRITICAL: Failed to get timestamp in discovery");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Mock leaderboard data
    let leaderboard = DiscoveryLeaderboard {
        top_discoverers: vec![
            DiscovererProfile {
                user_id: "user_001".to_string(),
                username: "MusicScout92".to_string(),
                discovery_score: 12_450,
                total_discoveries: 247,
                successful_predictions: 89,
                taste_maker_score: 87.5,
                rank: 1,
                badges: vec![
                    Badge {
                        badge_id: "legendary_001".to_string(),
                        name: "Legendary Taste Maker".to_string(),
                        description: "Discovered 50+ artists that became popular".to_string(),
                        rarity: "legendary".to_string(),
                        icon_url: "https://dujyo.io/badges/legendary_taste_maker.png".to_string(),
                        earned_at: "2024-09-15T12:00:00Z".to_string(),
                        is_soulbound: true,
                    },
                ],
                avatar_url: Some("https://dujyo.io/avatars/user_001.jpg".to_string()),
                level: 42,
                xp: 125_000,
            },
            DiscovererProfile {
                user_id: "user_002".to_string(),
                username: "EarlyBirdMusic".to_string(),
                discovery_score: 10_892,
                total_discoveries: 198,
                successful_predictions: 72,
                taste_maker_score: 82.3,
                rank: 2,
                badges: vec![],
                avatar_url: Some("https://dujyo.io/avatars/user_002.jpg".to_string()),
                level: 38,
                xp: 98_500,
            },
            DiscovererProfile {
                user_id: "user_003".to_string(),
                username: "IndieHunter".to_string(),
                discovery_score: 9_234,
                total_discoveries: 156,
                successful_predictions: 61,
                taste_maker_score: 78.9,
                rank: 3,
                badges: vec![],
                avatar_url: None,
                level: 35,
                xp: 87_200,
            },
        ],
        time_period: "all_time".to_string(),
        total_participants: 1_524,
        timestamp,
    };
    
    Ok(Json(leaderboard))
}

/// GET /api/v1/discovery/user-stats/{user_id}
/// Returns discovery stats for a specific user
pub async fn get_user_stats(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<UserDiscoveryStats>, StatusCode> {
    let _storage = &state.storage;
    
    // Mock user stats
    let stats = UserDiscoveryStats {
        user_id: user_id.clone(),
        username: "MusicExplorer".to_string(),
        total_discoveries: 127,
        early_adopter_discoveries: 45,
        successful_predictions: 38,
        taste_maker_score: 75.4,
        discovery_streak: 7,
        longest_streak: 23,
        total_xp: 45_230,
        level: 28,
        xp_to_next_level: 4_770,
        badges: vec![
            Badge {
                badge_id: "early_adopter_001".to_string(),
                name: "Early Adopter".to_string(),
                description: "Discovered 10+ artists with < 1K followers".to_string(),
                rarity: "rare".to_string(),
                icon_url: "https://dujyo.io/badges/early_adopter.png".to_string(),
                earned_at: "2024-08-10T14:30:00Z".to_string(),
                is_soulbound: true,
            },
            Badge {
                badge_id: "streak_master_001".to_string(),
                name: "Streak Master".to_string(),
                description: "Maintained a 20+ day discovery streak".to_string(),
                rarity: "epic".to_string(),
                icon_url: "https://dujyo.io/badges/streak_master.png".to_string(),
                earned_at: "2024-09-05T09:15:00Z".to_string(),
                is_soulbound: true,
            },
        ],
        recent_discoveries: vec![
            RecentDiscovery {
                artist_id: "artist_042".to_string(),
                artist_name: "Luna Echo".to_string(),
                track_id: "track_523".to_string(),
                track_name: "Midnight Dreams".to_string(),
                discovered_at: "2024-10-20T18:30:00Z".to_string(),
                followers_then: 842,
                followers_now: 15_234,
                streams_then: 3_250,
                streams_now: 234_567,
                growth_multiplier: 18.1,
                xp_earned: 250,
                tokens_earned: 2.5,
            },
            RecentDiscovery {
                artist_id: "artist_087".to_string(),
                artist_name: "Neon Pulse".to_string(),
                track_id: "track_891".to_string(),
                track_name: "Electric Soul".to_string(),
                discovered_at: "2024-10-19T14:20:00Z".to_string(),
                followers_then: 1_234,
                followers_now: 8_456,
                streams_then: 5_678,
                streams_now: 67_890,
                growth_multiplier: 6.9,
                xp_earned: 175,
                tokens_earned: 1.75,
            },
        ],
        top_genres_discovered: vec![
            GenreStats {
                genre: "Indie Electronic".to_string(),
                discoveries: 34,
                accuracy: 82.3,
            },
            GenreStats {
                genre: "Alternative R&B".to_string(),
                discoveries: 28,
                accuracy: 78.6,
            },
            GenreStats {
                genre: "Dream Pop".to_string(),
                discoveries: 23,
                accuracy: 73.9,
            },
        ],
        rewards: RewardsSummary {
            total_dyo_earned: 127.5,
            pending_dyo: 15.25,
            total_nfts_earned: 7,
            claimable_rewards: vec![
                ClaimableReward {
                    reward_id: "reward_001".to_string(),
                    reward_type: "early_adopter_bonus".to_string(),
                    amount: 15.25,
                    description: "Early adopter bonus for discovering Luna Echo".to_string(),
                    expires_at: Some("2024-11-20T18:30:00Z".to_string()),
                },
            ],
        },
    };
    
    Ok(Json(stats))
}

/// POST /api/v1/discovery/claim-rewards
/// Allows user to claim pending rewards
pub async fn claim_rewards(
    State(state): State<AppState>,
    Json(request): Json<ClaimRewardsRequest>,
) -> Result<Json<ClaimRewardsResponse>, StatusCode> {
    let _storage = &state.storage;
    
    // Mock claiming rewards
    let dyo_claimed = 15.25;
    let nfts_claimed = vec!["badge_nft_001".to_string()];
    let transaction_hash = Some("0x1234567890abcdef".to_string());
    
    tracing::info!(
        "Rewards claimed: user={}, dyo={}, nfts={:?}, tx={}",
        request.user_id,
        dyo_claimed,
        nfts_claimed,
        transaction_hash.as_ref().ok_or_else(|| {
            tracing::error!("CRITICAL: Transaction hash missing in discovery claim");
            StatusCode::INTERNAL_SERVER_ERROR
        })?
    );
    
    // TODO: Process blockchain transaction
    // TODO: Update user balance
    // TODO: Mint NFTs if applicable
    
    Ok(Json(ClaimRewardsResponse {
        success: true,
        message: format!(
            "Successfully claimed {} DYO tokens and {} NFT badges!",
            dyo_claimed,
            nfts_claimed.len()
        ),
        dyo_claimed,
        nfts_claimed,
        transaction_hash,
    }))
}

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

pub fn discovery_routes() -> Router<AppState> {
    Router::new()
        .route("/record-listening", post(record_listening))
        .route("/leaderboard", get(get_leaderboard))
        .route("/user-stats/{user_id}", get(get_user_stats))
        .route("/claim-rewards", post(claim_rewards))
}

