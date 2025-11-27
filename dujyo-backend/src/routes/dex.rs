use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::Serialize;
use sqlx::Row;
use crate::server::AppState;

#[derive(Serialize)]
struct TopTrader {
    address: String,
    volume: f64,
    xp: i64,
    trades_count: i64,
}

#[derive(Serialize)]
struct TopTradersResponse {
    traders: Vec<TopTrader>,
}

/// Get top traders by volume
async fn get_top_traders(
    State(state): State<AppState>,
) -> Result<Json<TopTradersResponse>, StatusCode> {
    let pool = &state.storage.pool;
    
    // Query top traders from transactions table with DEX transaction types
    // Calculate volume and XP based on transaction history
    let traders_result = sqlx::query(
        r#"
        SELECT 
            from_address,
            COALESCE(SUM(COALESCE(amount_in, amount, 0)), 0)::float8 as volume,
            COUNT(*)::bigint as trades_count,
            (COUNT(*) * 10)::bigint as xp
        FROM transactions
        WHERE transaction_type IN ('swap', 'liquidity_add', 'liquidity_remove')
           OR pool_id IS NOT NULL
        GROUP BY from_address
        ORDER BY volume DESC
        LIMIT 10
        "#
    )
    .fetch_all(pool)
    .await;

    match traders_result {
        Ok(rows) => {
            let mut top_traders: Vec<TopTrader> = Vec::new();
            
            for row in rows {
                match (
                    row.try_get::<String, _>(0),
                    row.try_get::<f64, _>(1),
                    row.try_get::<i64, _>(2),
                    row.try_get::<i64, _>(3),
                ) {
                    (Ok(address), Ok(volume), Ok(trades_count), Ok(xp)) => {
                        top_traders.push(TopTrader {
                            address,
                            volume,
                            xp,
                            trades_count,
                        });
                    }
                    _ => {
                        eprintln!("⚠️ Warning: Failed to parse trader row, skipping");
                        continue;
                    }
                }
            }

            Ok(Json(TopTradersResponse {
                traders: top_traders,
            }))
        }
        Err(e) => {
            eprintln!("❌ Error fetching top traders: {}", e);
            // Return empty list instead of error for better UX
            Ok(Json(TopTradersResponse {
                traders: vec![],
            }))
        }
    }
}

pub fn dex_routes() -> Router<AppState> {
    Router::new()
        .route("/top-traders", get(get_top_traders))
}

