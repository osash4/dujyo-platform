use axum::{
    extract::{Path, State, Extension},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use chrono::Utc;
use uuid::Uuid;
use crate::server::AppState;
use crate::auth::Claims;

#[derive(Serialize, Clone)]
pub struct NFT {
    pub nft_id: String,
    pub owner_address: String,
    pub token_uri: Option<String>,
    pub metadata: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
pub struct NFTsResponse {
    pub nfts: Vec<NFT>,
    pub total: usize,
}

#[derive(Deserialize)]
pub struct MintNFTRequest {
    pub token_uri: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub content_id: Option<String>, // Optional link to content
}

#[derive(Serialize)]
pub struct MintNFTResponse {
    pub success: bool,
    pub nft_id: String,
    pub message: String,
}

#[derive(Deserialize)]
pub struct TransferNFTRequest {
    pub to_address: String,
    pub nft_id: String,
}

#[derive(Serialize)]
pub struct TransferNFTResponse {
    pub success: bool,
    pub message: String,
    pub transaction_hash: Option<String>,
}

/// GET /api/v1/nfts/{address}
/// Get all NFTs owned by an address
pub async fn get_nfts_by_owner(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(address): Path<String>,
) -> Result<Json<NFTsResponse>, StatusCode> {
    let pool = &state.storage.pool;
    
    // Query NFTs from database
    let nfts_result = sqlx::query(
        r#"
        SELECT 
            nft_id,
            owner_address,
            token_uri,
            metadata,
            created_at::text,
            updated_at::text
        FROM nfts
        WHERE owner_address = $1
        ORDER BY created_at DESC
        "#
    )
    .bind(&address)
    .fetch_all(pool)
    .await;

    match nfts_result {
        Ok(rows) => {
            let nfts: Vec<NFT> = rows
                .into_iter()
                .map(|row| {
                    let nft_id: String = row.try_get(0).unwrap_or_else(|_| "".to_string());
                    let owner_address: String = row.try_get(1).unwrap_or_else(|_| "".to_string());
                    let token_uri: Option<String> = row.try_get(2).ok();
                    let metadata: serde_json::Value = row.try_get(3).unwrap_or_else(|_| serde_json::json!({}));
                    let created_at: String = row.try_get(4).unwrap_or_else(|_| Utc::now().to_rfc3339());
                    let updated_at: String = row.try_get(5).unwrap_or_else(|_| Utc::now().to_rfc3339());
                    
                    NFT {
                        nft_id,
                        owner_address,
                        token_uri,
                        metadata,
                        created_at,
                        updated_at,
                    }
                })
                .collect();

            Ok(Json(NFTsResponse {
                total: nfts.len(),
                nfts,
            }))
        }
        Err(e) => {
            eprintln!("❌ Error fetching NFTs: {}", e);
            // Return empty list if table doesn't exist yet
            Ok(Json(NFTsResponse {
                nfts: vec![],
                total: 0,
            }))
        }
    }
}

/// POST /api/v1/nfts/mint
/// Mint a new NFT
pub async fn mint_nft(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<MintNFTRequest>,
) -> Result<Json<MintNFTResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let owner_address = &claims.sub;
    let nft_id = Uuid::new_v4().to_string();
    
    // Default metadata if not provided
    let metadata = request.metadata.unwrap_or_else(|| {
        serde_json::json!({
            "name": "DUJYO NFT",
            "description": "NFT minted on DUJYO platform",
            "image": request.token_uri.clone().unwrap_or_else(|| "".to_string()),
            "attributes": []
        })
    });

    // Insert NFT into database
    let insert_result = sqlx::query(
        r#"
        INSERT INTO nfts (nft_id, owner_address, token_uri, metadata, content_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (nft_id) DO NOTHING
        RETURNING nft_id
        "#
    )
    .bind(&nft_id)
    .bind(owner_address)
    .bind(&request.token_uri)
    .bind(&metadata)
    .bind(&request.content_id)
    .fetch_optional(pool)
    .await;

    match insert_result {
        Ok(Some(_)) => {
            println!("✅ NFT minted successfully: {} for owner: {}", nft_id, owner_address);
            Ok(Json(MintNFTResponse {
                success: true,
                nft_id: nft_id.clone(),
                message: format!("NFT {} minted successfully", nft_id),
            }))
        }
        Ok(None) => {
            // NFT already exists (shouldn't happen with UUID, but handle it)
            Err(StatusCode::CONFLICT)
        }
        Err(e) => {
            eprintln!("❌ Error minting NFT: {}", e);
            // If table doesn't exist, return success anyway (for development)
            if e.to_string().contains("does not exist") {
                println!("⚠️ NFTs table doesn't exist yet, but returning success for development");
                Ok(Json(MintNFTResponse {
                    success: true,
                    nft_id: nft_id.clone(),
                    message: format!("NFT {} would be minted (table doesn't exist yet)", nft_id),
                }))
            } else {
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

/// POST /api/v1/nfts/transfer
/// Transfer an NFT to another address
pub async fn transfer_nft(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<TransferNFTRequest>,
) -> Result<Json<TransferNFTResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let from_address = &claims.sub;
    
    // Verify the NFT exists and is owned by the sender
    let ownership_check = sqlx::query(
        r#"
        SELECT owner_address FROM nfts WHERE nft_id = $1
        "#
    )
    .bind(&request.nft_id)
    .fetch_optional(pool)
    .await;

    match ownership_check {
        Ok(Some(row)) => {
            let current_owner: String = row.try_get(0).unwrap_or_else(|_| "".to_string());
            
            if current_owner != *from_address {
                return Err(StatusCode::FORBIDDEN);
            }

            // Update owner
            let update_result = sqlx::query(
                r#"
                UPDATE nfts 
                SET owner_address = $1, updated_at = NOW()
                WHERE nft_id = $2
                RETURNING nft_id
                "#
            )
            .bind(&request.to_address)
            .bind(&request.nft_id)
            .fetch_optional(pool)
            .await;

            match update_result {
                Ok(Some(_)) => {
                    println!("✅ NFT {} transferred from {} to {}", request.nft_id, from_address, request.to_address);
                    Ok(Json(TransferNFTResponse {
                        success: true,
                        message: format!("NFT {} transferred successfully", request.nft_id),
                        transaction_hash: None, // TODO: Add blockchain transaction hash
                    }))
                }
                Ok(None) => {
                    Err(StatusCode::NOT_FOUND)
                }
                Err(e) => {
                    eprintln!("❌ Error transferring NFT: {}", e);
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Ok(None) => {
            Err(StatusCode::NOT_FOUND)
        }
        Err(e) => {
            eprintln!("❌ Error checking NFT ownership: {}", e);
            // If table doesn't exist, return error
            if e.to_string().contains("does not exist") {
                Err(StatusCode::NOT_IMPLEMENTED)
            } else {
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

pub fn nft_routes() -> Router<AppState> {
    Router::new()
        .route("/:address", get(get_nfts_by_owner))
        .route("/mint", post(mint_nft))
        .route("/transfer", post(transfer_nft))
}

