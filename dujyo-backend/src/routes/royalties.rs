use axum::{
    extract::{Path, State, Extension},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::Serialize;
use crate::server::AppState;
use crate::auth::Claims;

#[derive(Serialize)]
pub struct ArtistRoyaltiesResponse {
    pub artist_id: String,
    pub total_earned: f64,
    pub pending_payout: f64,
    pub last_payout_date: Option<String>,
    pub payment_history: Vec<PaymentHistoryItem>,
    pub cross_platform_earnings: CrossPlatformEarnings,
    pub revenue_streams: Vec<RevenueStream>,
}

#[derive(Serialize)]
pub struct PaymentHistoryItem {
    pub payment_id: String,
    pub amount: f64,
    pub currency: String,
    pub status: String,
    pub date: String,
    pub source: String,
    pub transaction_hash: Option<String>,
}

#[derive(Serialize)]
pub struct CrossPlatformEarnings {
    pub spotify: PlatformEarning,
    pub apple_music: PlatformEarning,
    pub youtube: PlatformEarning,
    pub dujyo: PlatformEarning,
    pub total: f64,
}

#[derive(Serialize)]
pub struct PlatformEarning {
    pub platform_name: String,
    pub amount: f64,
    pub transactions: i64,
}

#[derive(Serialize)]
pub struct RevenueStream {
    pub stream_type: String,
    pub amount: f64,
    pub percentage: f64,
    pub transactions: i64,
}

/// GET /api/v1/royalties/artist/:id
pub async fn get_artist_royalties(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(artist_id): Path<String>,
) -> Result<Json<ArtistRoyaltiesResponse>, StatusCode> {
    // Verify the artist_id matches the authenticated user
    if claims.sub != artist_id {
        return Err(StatusCode::FORBIDDEN);
    }

    // Get royalty data from database
    // For now, return default/empty data (royalties table may not exist yet)
    // TODO: Create royalties table migration when needed
    let total_earned = 0.0;
    let pending_payout = 0.0;
    let payment_history: Vec<PaymentHistoryItem> = vec![];
    let payment_count = payment_history.len() as i64;

    Ok(Json(ArtistRoyaltiesResponse {
        artist_id,
        total_earned,
        pending_payout,
        last_payout_date: payment_history.first().map(|p| p.date.clone()),
        payment_history,
        cross_platform_earnings: CrossPlatformEarnings {
            spotify: PlatformEarning {
                platform_name: "Spotify".to_string(),
                amount: 0.0,
                transactions: 0,
            },
            apple_music: PlatformEarning {
                platform_name: "Apple Music".to_string(),
                amount: 0.0,
                transactions: 0,
            },
            youtube: PlatformEarning {
                platform_name: "YouTube".to_string(),
                amount: 0.0,
                transactions: 0,
            },
            dujyo: PlatformEarning {
                platform_name: "Dujyo".to_string(),
                amount: total_earned,
                transactions: payment_count,
            },
            total: total_earned,
        },
        revenue_streams: vec![
            RevenueStream {
                stream_type: "streaming".to_string(),
                amount: total_earned * 0.8,
                percentage: 80.0,
                transactions: payment_count,
            },
            RevenueStream {
                stream_type: "purchase".to_string(),
                amount: total_earned * 0.2,
                percentage: 20.0,
                transactions: 0,
            },
        ],
    }))
}

pub fn royalties_routes() -> Router<AppState> {
    Router::new()
        .route("/artist/{id}", get(get_artist_royalties))
}

