//! Database Migration Tool for Dujyo
//!
//! This tool applies database optimizations and migrations

use sqlx::PgPool;
use std::env;
use tracing::{error, info, warn};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("🔄 Starting Dujyo Database Migration");

    // Get database URL from environment
    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgresql://dujyo_user:dujyo_master_2024@localhost:5432/dujyo_blockchain".to_string()
    });

    // Connect to database
    let pool = PgPool::connect(&database_url).await?;
    info!("✅ Connected to database");

    // Run migration
    run_migration(&pool).await?;

    info!("🎉 Database migration completed successfully");
    Ok(())
}

async fn run_migration(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    info!("📋 Applying database optimization migration...");

    // Read migration file
    let migration_sql = include_str!("../../migrations/003_database_optimization.sql");

    // Split into individual statements
    let statements: Vec<&str> = migration_sql
        .split(';')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty() && !s.starts_with("--"))
        .collect();

    info!("📊 Found {} SQL statements to execute", statements.len());

    // Execute each statement
    for (index, statement) in statements.iter().enumerate() {
        if statement.trim().is_empty() {
            continue;
        }

        info!("🔄 Executing statement {}/{}", index + 1, statements.len());

        match sqlx::query(statement).execute(pool).await {
            Ok(result) => {
                info!(
                    "✅ Statement {} executed successfully (rows affected: {})",
                    index + 1,
                    result.rows_affected()
                );
            }
            Err(e) => {
                // Some statements might fail if they already exist (like indexes)
                if e.to_string().contains("already exists") {
                    warn!("⚠️ Statement {} skipped (already exists): {}", index + 1, e);
                } else {
                    error!("❌ Statement {} failed: {}", index + 1, e);
                    return Err(e.into());
                }
            }
        }
    }

    // Verify migration
    verify_migration(pool).await?;

    Ok(())
}

async fn verify_migration(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    info!("🔍 Verifying migration results...");

    // Check if indexes were created
    let index_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%'",
    )
    .fetch_one(pool)
    .await?;

    info!("📊 Created {} optimized indexes", index_count);

    // Check if views were created
    let view_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public'")
            .fetch_one(pool)
            .await?;

    info!("📊 Created {} performance views", view_count);

    // Check if functions were created
    let function_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')"
    )
    .fetch_one(pool)
    .await?;

    info!("📊 Created {} monitoring functions", function_count);

    // Test a few key indexes
    test_indexes(pool).await?;

    info!("✅ Migration verification completed");
    Ok(())
}

async fn test_indexes(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    info!("🧪 Testing key indexes...");

    // Test balance index
    let start = std::time::Instant::now();
    let _: Option<i64> =
        sqlx::query_scalar("SELECT balance FROM balances WHERE address = 'test_address'")
            .fetch_optional(pool)
            .await?;
    let balance_time = start.elapsed().as_millis();
    info!("📊 Balance query time: {}ms", balance_time);

    // Test transaction index
    let start = std::time::Instant::now();
    let _: Vec<(String, String, i64)> = sqlx::query_as(
        "SELECT from_address, to_address, amount FROM transactions WHERE from_address = 'test_address' LIMIT 10"
    )
    .fetch_all(pool)
    .await?;
    let transaction_time = start.elapsed().as_millis();
    info!("📊 Transaction query time: {}ms", transaction_time);

    // Test token balance index
    let start = std::time::Instant::now();
    let _: Option<(i64, i64, i64)> = sqlx::query_as(
        "SELECT dyo_balance, dys_balance, staked_balance FROM token_balances WHERE address = 'test_address'"
    )
    .fetch_optional(pool)
    .await?;
    let token_balance_time = start.elapsed().as_millis();
    info!("📊 Token balance query time: {}ms", token_balance_time);

    info!("✅ Index performance tests completed");
    Ok(())
}
