//! Comprehensive Integration Tests for Dujyo Backend
//!
//! This module provides end-to-end testing for:
//! - Blockchain operations
//! - DEX functionality
//! - Staking system
//! - Rate limiting
//! - Content verification
//! - Security systems

use serde_json::json;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use std::time::Duration;
use tokio::time::sleep;

use xwavve_backend::{
    blockchain::blockchain::Blockchain,
    blockchain::native_token::NativeToken,
    blockchain::real_blockchain::RealBlockchain,
    blockchain::token::Token,
    cache::{CacheConfig, CacheService},
    database::{DatabaseConfig, DatabaseManager},
    dex::DEX,
    security::consensus_protection::{ConsensusProtection, ConsensusSecurityConfig},
    security::content_verifier::{
        ContentType, ContentVerificationConfig, ContentVerifier, QualityMetrics, StreamMetadata,
    },
    security::rate_limiter::{RateLimitConfig, RateLimiter},
    storage_optimized::OptimizedBlockchainStorage,
};

/// Test configuration
struct TestConfig {
    database_url: String,
    redis_url: String,
    test_user_id: String,
    test_content_id: String,
}

impl TestConfig {
    fn new() -> Self {
        Self {
            database_url: std::env::var("TEST_DATABASE_URL").unwrap_or_else(|_| {
                "postgresql://dujyo:dujyo_password@localhost:5432/dujyo_test".to_string()
            }),
            redis_url: std::env::var("TEST_REDIS_URL")
                .unwrap_or_else(|_| "redis://:dujyo_redis_2024@localhost:6379".to_string()),
            test_user_id: "test_user_123".to_string(),
            test_content_id: "test_content_456".to_string(),
        }
    }
}

/// Setup test database
async fn setup_test_database(
    pool: &PgPool,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Create test tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS test_balances (
            id SERIAL PRIMARY KEY,
            address VARCHAR(255) NOT NULL,
            dyo_balance BIGINT NOT NULL DEFAULT 0,
            dys_balance BIGINT NOT NULL DEFAULT 0,
            staked_balance BIGINT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS test_transactions (
            id SERIAL PRIMARY KEY,
            from_address VARCHAR(255) NOT NULL,
            to_address VARCHAR(255) NOT NULL,
            amount BIGINT NOT NULL,
            token_type VARCHAR(10) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS test_stream_verifications (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            content_id VARCHAR(255) NOT NULL,
            duration_seconds INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45),
            user_agent TEXT,
            content_type VARCHAR(20),
            is_verified BOOLEAN DEFAULT false,
            is_suspicious BOOLEAN DEFAULT false
        )
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// Cleanup test database
async fn cleanup_test_database(
    pool: &PgPool,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    sqlx::query("DROP TABLE IF EXISTS test_balances CASCADE")
        .execute(pool)
        .await?;
    sqlx::query("DROP TABLE IF EXISTS test_transactions CASCADE")
        .execute(pool)
        .await?;
    sqlx::query("DROP TABLE IF EXISTS test_stream_verifications CASCADE")
        .execute(pool)
        .await?;
    Ok(())
}

/// Test blockchain operations
#[tokio::test]
async fn test_blockchain_operations() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = TestConfig::new();
    let pool = PgPool::connect(&config.database_url).await?;

    setup_test_database(&pool).await?;

    // Initialize blockchain
    let blockchain = Arc::new(Blockchain::new());
    let real_blockchain = Arc::new(RealBlockchain::new(blockchain.clone(), pool.clone()));

    // Test block creation
    let initial_blocks = real_blockchain.get_blocks().await?.len();

    // Create a transaction
    let transaction = real_blockchain
        .create_transaction(
            "test_sender".to_string(),
            "test_receiver".to_string(),
            1000,
            "DYO".to_string(),
        )
        .await?;

    // Add transaction to blockchain
    real_blockchain.add_transaction(transaction).await?;

    // Wait for block production
    sleep(Duration::from_secs(2)).await;

    let final_blocks = real_blockchain.get_blocks().await?.len();
    assert!(
        final_blocks > initial_blocks,
        "Block should have been created"
    );

    cleanup_test_database(&pool).await?;
    Ok(())
}

/// Test DEX operations
#[tokio::test]
async fn test_dex_operations() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = TestConfig::new();
    let pool = PgPool::connect(&config.database_url).await?;

    setup_test_database(&pool).await?;

    // Initialize DEX
    let dex = DEX::new(pool.clone());

    // Create liquidity pool
    let pool_id = dex
        .create_pool("DYO".to_string(), "DYS".to_string())
        .await?;
    assert!(!pool_id.is_empty(), "Pool ID should not be empty");

    // Add liquidity
    let liquidity_result = dex
        .add_liquidity(
            pool_id.clone(),
            "test_user".to_string(),
            1000000, // 1M DYO
            100000,  // 100K DYS
        )
        .await?;

    assert!(
        liquidity_result.success,
        "Liquidity addition should succeed"
    );

    // Test swap
    let swap_result = dex
        .swap(
            pool_id.clone(),
            "test_user".to_string(),
            "DYO".to_string(),
            "DYS".to_string(),
            10000, // 10K DYO
            0.01,  // 1% slippage
        )
        .await?;

    assert!(swap_result.success, "Swap should succeed");
    assert!(
        swap_result.amount_out > 0,
        "Output amount should be positive"
    );

    cleanup_test_database(&pool).await?;
    Ok(())
}

/// Test staking system
#[tokio::test]
async fn test_staking_system() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = TestConfig::new();
    let pool = PgPool::connect(&config.database_url).await?;

    setup_test_database(&pool).await?;

    // Initialize native token
    let native_token = NativeToken::new(pool.clone());

    // Test staking
    let stake_result = native_token
        .stake(
            "test_user".to_string(),
            100000, // 100K DYO
            30,     // 30 days
        )
        .await?;

    assert!(stake_result.success, "Staking should succeed");
    assert!(
        stake_result.position_id > 0,
        "Position ID should be positive"
    );

    // Test unstaking
    let unstake_result = native_token
        .unstake("test_user".to_string(), stake_result.position_id)
        .await?;

    assert!(unstake_result.success, "Unstaking should succeed");
    assert!(
        unstake_result.amount > 0,
        "Unstaked amount should be positive"
    );

    cleanup_test_database(&pool).await?;
    Ok(())
}

/// Test rate limiting system
#[tokio::test]
async fn test_rate_limiting() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = TestConfig::new();

    // Initialize rate limiter
    let rate_config = RateLimitConfig {
        redis_url: config.redis_url,
        max_requests_per_window: 5, // Very low for testing
        ..Default::default()
    };

    let rate_limiter = RateLimiter::new(rate_config).await?;

    // Test normal requests (should pass)
    for i in 0..5 {
        let result = rate_limiter
            .check_ip_rate_limit("127.0.0.1", "test_endpoint")
            .await?;
        assert!(result.allowed, "Request {} should be allowed", i + 1);
    }

    // Test rate limit exceeded (should fail)
    let result = rate_limiter
        .check_ip_rate_limit("127.0.0.1", "test_endpoint")
        .await?;
    assert!(!result.allowed, "Request should be rate limited");
    assert!(result.retry_after.is_some(), "Retry after should be set");

    Ok(())
}

/// Test content verification system
#[tokio::test]
async fn test_content_verification() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = TestConfig::new();
    let pool = PgPool::connect(&config.database_url).await?;

    setup_test_database(&pool).await?;

    // Initialize content verifier
    let verifier_config = ContentVerificationConfig {
        min_stream_duration: Duration::from_secs(30),
        max_streams_per_day: 1000,
        farming_detection_enabled: true,
        ..Default::default()
    };

    let content_verifier = ContentVerifier::new(pool.clone(), verifier_config).await?;

    // Test valid stream
    let valid_metadata = StreamMetadata {
        user_id: config.test_user_id.clone(),
        content_id: config.test_content_id.clone(),
        duration: Duration::from_secs(60), // Valid duration
        timestamp: chrono::Utc::now(),
        ip_address: "127.0.0.1".to_string(),
        user_agent: "Mozilla/5.0 (Test Browser)".to_string(),
        geographic_location: Some("US".to_string()),
        device_fingerprint: Some("test_fingerprint".to_string()),
        content_type: ContentType::Music,
        quality_metrics: QualityMetrics {
            bitrate: Some(320),
            resolution: Some("1080p".to_string()),
            audio_quality: Some(0.9),
            video_quality: Some(0.8),
            engagement_score: Some(0.7),
        },
    };

    let result = content_verifier.verify_stream(valid_metadata).await?;
    assert!(result.is_valid, "Valid stream should be verified");
    assert!(
        result.confidence_score > 0.5,
        "Confidence score should be high"
    );

    // Test invalid stream (too short)
    let invalid_metadata = StreamMetadata {
        duration: Duration::from_secs(10), // Too short
        ..valid_metadata
    };

    let result = content_verifier.verify_stream(invalid_metadata).await?;
    assert!(!result.is_valid, "Invalid stream should be rejected");
    assert!(result
        .violations
        .contains(&crate::security::content_verifier::ViolationType::DurationTooShort));

    cleanup_test_database(&pool).await?;
    Ok(())
}

/// Test consensus protection system
#[tokio::test]
async fn test_consensus_protection() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = TestConfig::new();
    let pool = PgPool::connect(&config.database_url).await?;

    setup_test_database(&pool).await?;

    // Initialize consensus protection
    let consensus_config = ConsensusSecurityConfig {
        max_validator_power: 0.10,    // 10%
        min_validator_stake: 1000000, // 1M DYO
        max_validator_count: 10,
        ..Default::default()
    };

    let consensus_protection = ConsensusProtection::new(pool.clone(), consensus_config).await?;

    // Test power distribution validation
    let is_valid = consensus_protection.validate_power_distribution().await?;
    assert!(is_valid, "Power distribution should be valid initially");

    // Test validator rotation
    let rotated_validators = consensus_protection.rotate_validators().await?;
    assert!(
        !rotated_validators.is_empty(),
        "Should have rotated validators"
    );

    // Test sybil attack detection
    let is_sybil = consensus_protection
        .detect_sybil_attack("test_validator")
        .await?;
    assert!(
        !is_sybil,
        "Should not detect sybil attack for normal validator"
    );

    cleanup_test_database(&pool).await?;
    Ok(())
}

/// Test database optimization
#[tokio::test]
async fn test_database_optimization() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = TestConfig::new();

    // Initialize database manager
    let db_config = DatabaseConfig {
        primary_url: config.database_url.clone(),
        read_replica_urls: vec![config.database_url.clone()],
        max_connections: 10,
        min_connections: 2,
        ..Default::default()
    };

    let db_manager = DatabaseManager::new(db_config).await?;

    // Test connection health
    let health = db_manager.check_health().await?;
    assert!(health.is_healthy, "Database should be healthy");

    // Test read replica routing
    let pool = db_manager.get_read_pool().await?;
    let result: i64 = sqlx::query_scalar("SELECT 1").fetch_one(pool).await?;
    assert_eq!(result, 1, "Read replica should work");

    Ok(())
}

/// Test cache system
#[tokio::test]
async fn test_cache_system() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = TestConfig::new();

    // Initialize cache service
    let cache_config = CacheConfig {
        redis_url: config.redis_url,
        ..Default::default()
    };

    let cache_service = CacheService::new(cache_config).await?;

    // Test cache operations
    let key = "test_key";
    let value = "test_value";

    // Set value
    cache_service
        .set(key, value, Duration::from_secs(60))
        .await?;

    // Get value
    let retrieved_value: Option<String> = cache_service.get(key).await?;
    assert_eq!(
        retrieved_value,
        Some(value.to_string()),
        "Retrieved value should match"
    );

    // Test expiration
    cache_service
        .set("expire_key", "expire_value", Duration::from_millis(100))
        .await?;
    sleep(Duration::from_millis(150)).await;

    let expired_value: Option<String> = cache_service.get("expire_key").await?;
    assert_eq!(expired_value, None, "Expired value should be None");

    Ok(())
}

/// Test end-to-end user flow
#[tokio::test]
async fn test_end_to_end_user_flow() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = TestConfig::new();
    let pool = PgPool::connect(&config.database_url).await?;

    setup_test_database(&pool).await?;

    // Initialize all systems
    let blockchain = Arc::new(Blockchain::new());
    let real_blockchain = Arc::new(RealBlockchain::new(blockchain.clone(), pool.clone()));
    let native_token = NativeToken::new(pool.clone());
    let dex = DEX::new(pool.clone());

    let user_id = "e2e_test_user";

    // 1. User creates account and gets initial tokens
    let mint_result = native_token.mint(user_id.to_string(), 1000000).await?; // 1M DYO
    assert!(mint_result.success, "Initial mint should succeed");

    // 2. User stakes tokens
    let stake_result = native_token.stake(user_id.to_string(), 500000, 30).await?; // 500K DYO for 30 days
    assert!(stake_result.success, "Staking should succeed");

    // 3. User creates liquidity pool
    let pool_id = dex
        .create_pool("DYO".to_string(), "DYS".to_string())
        .await?;
    let liquidity_result = dex
        .add_liquidity(
            pool_id.clone(),
            user_id.to_string(),
            200000, // 200K DYO
            20000,  // 20K DYS
        )
        .await?;
    assert!(
        liquidity_result.success,
        "Liquidity addition should succeed"
    );

    // 4. User performs swap
    let swap_result = dex
        .swap(
            pool_id.clone(),
            user_id.to_string(),
            "DYO".to_string(),
            "DYS".to_string(),
            10000, // 10K DYO
            0.01,  // 1% slippage
        )
        .await?;
    assert!(swap_result.success, "Swap should succeed");

    // 5. User streams content and earns tokens
    let stream_metadata = StreamMetadata {
        user_id: user_id.to_string(),
        content_id: "test_content".to_string(),
        duration: Duration::from_secs(120), // 2 minutes
        timestamp: chrono::Utc::now(),
        ip_address: "127.0.0.1".to_string(),
        user_agent: "Mozilla/5.0 (Test Browser)".to_string(),
        geographic_location: Some("US".to_string()),
        device_fingerprint: Some("test_fingerprint".to_string()),
        content_type: ContentType::Music,
        quality_metrics: QualityMetrics {
            bitrate: Some(320),
            resolution: Some("1080p".to_string()),
            audio_quality: Some(0.9),
            video_quality: Some(0.8),
            engagement_score: Some(0.8),
        },
    };

    let content_verifier =
        ContentVerifier::new(pool.clone(), ContentVerificationConfig::default()).await?;
    let verification_result = content_verifier.verify_stream(stream_metadata).await?;
    assert!(verification_result.is_valid, "Stream should be verified");

    // 6. Check final balance
    let balance = real_blockchain.get_token_balance(user_id).await?;
    assert!(balance.dyo > 0, "User should have DYO balance");

    cleanup_test_database(&pool).await?;
    Ok(())
}

/// Test load testing simulation
#[tokio::test]
async fn test_load_simulation() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = TestConfig::new();
    let pool = PgPool::connect(&config.database_url).await?;

    setup_test_database(&pool).await?;

    let real_blockchain = Arc::new(RealBlockchain::new(
        Arc::new(Blockchain::new()),
        pool.clone(),
    ));

    // Simulate 100 concurrent users
    let mut handles = vec![];

    for i in 0..100 {
        let blockchain = real_blockchain.clone();
        let user_id = format!("load_test_user_{}", i);

        let handle = tokio::spawn(async move {
            // Each user performs 10 operations
            for j in 0..10 {
                let transaction = blockchain
                    .create_transaction(
                        user_id.clone(),
                        format!("recipient_{}", j),
                        1000,
                        "DYO".to_string(),
                    )
                    .await?;

                blockchain.add_transaction(transaction).await?;

                // Small delay to simulate real usage
                sleep(Duration::from_millis(10)).await;
            }

            Ok::<(), Box<dyn std::error::Error + Send + Sync>>(())
        });

        handles.push(handle);
    }

    // Wait for all users to complete
    for handle in handles {
        handle.await??;
    }

    // Verify system is still responsive
    let blocks = real_blockchain.get_blocks().await?;
    assert!(
        blocks.len() > 0,
        "System should have processed transactions"
    );

    cleanup_test_database(&pool).await?;
    Ok(())
}

/// Test security scenarios
#[tokio::test]
async fn test_security_scenarios() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = TestConfig::new();

    // Test rate limiting under attack
    let rate_config = RateLimitConfig {
        redis_url: config.redis_url,
        max_requests_per_window: 10,
        ..Default::default()
    };

    let rate_limiter = RateLimiter::new(rate_config).await?;

    // Simulate attack (rapid requests)
    let mut blocked_requests = 0;
    for i in 0..20 {
        let result = rate_limiter
            .check_ip_rate_limit("attacker_ip", "api_endpoint")
            .await?;
        if !result.allowed {
            blocked_requests += 1;
        }
    }

    assert!(
        blocked_requests > 0,
        "Rate limiter should block some requests"
    );

    // Test abuse detection
    let abuse_result = rate_limiter
        .detect_abuse("suspicious_user", "suspicious_ip", "rapid_requests", None)
        .await?;

    // Should detect abuse pattern
    assert!(abuse_result.is_some(), "Should detect abuse pattern");

    Ok(())
}

/// Performance benchmarks
#[tokio::test]
async fn test_performance_benchmarks() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = TestConfig::new();
    let pool = PgPool::connect(&config.database_url).await?;

    setup_test_database(&pool).await?;

    let real_blockchain = Arc::new(RealBlockchain::new(
        Arc::new(Blockchain::new()),
        pool.clone(),
    ));

    // Benchmark transaction creation
    let start = std::time::Instant::now();
    let mut transactions = vec![];

    for i in 0..1000 {
        let transaction = real_blockchain
            .create_transaction(
                format!("sender_{}", i),
                format!("receiver_{}", i),
                1000,
                "DYO".to_string(),
            )
            .await?;
        transactions.push(transaction);
    }

    let transaction_creation_time = start.elapsed();
    println!(
        "Created 1000 transactions in {:?}",
        transaction_creation_time
    );
    assert!(
        transaction_creation_time < Duration::from_secs(5),
        "Transaction creation should be fast"
    );

    // Benchmark balance queries
    let start = std::time::Instant::now();

    for i in 0..100 {
        let _balance = real_blockchain
            .get_token_balance(&format!("user_{}", i))
            .await?;
    }

    let balance_query_time = start.elapsed();
    println!("Queried 100 balances in {:?}", balance_query_time);
    assert!(
        balance_query_time < Duration::from_secs(2),
        "Balance queries should be fast"
    );

    cleanup_test_database(&pool).await?;
    Ok(())
}
