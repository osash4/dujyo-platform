//! ✅ MVP-CRITICAL: Métricas Simples para Monitoreo
//! 
//! Endpoints para métricas de:
//! - Transacciones exitosas/fallidas
//! - Hits de rate limiting
//! - Tiempos de respuesta Redis

use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};
use bb8_redis::{bb8::Pool, RedisConnectionManager};

// AppState is defined in server.rs (binary only)
// We need to use a trait or re-export, but for now we'll make functions that work with AppState
// This will be used only in the binary context

// Métricas globales (thread-safe)
// Made public for use in server.rs
pub static TRANSACTION_SUCCESS: AtomicU64 = AtomicU64::new(0);
pub static TRANSACTION_FAILED: AtomicU64 = AtomicU64::new(0);
pub static RATE_LIMIT_HITS: AtomicU64 = AtomicU64::new(0);
pub static REDIS_QUERIES: AtomicU64 = AtomicU64::new(0);
pub static REDIS_QUERY_TIME_MS: AtomicU64 = AtomicU64::new(0);

#[derive(Serialize)]
pub struct MetricsResponse {
    pub transactions: TransactionMetrics,
    pub rate_limiting: RateLimitMetrics,
    pub redis: RedisMetrics,
}

#[derive(Serialize)]
pub struct TransactionMetrics {
    pub successful: u64,
    pub failed: u64,
    pub total: u64,
    pub success_rate: f64,
}

#[derive(Serialize)]
pub struct RateLimitMetrics {
    pub hits: u64,
}

#[derive(Serialize)]
pub struct RedisMetrics {
    pub queries: u64,
    pub avg_response_time_ms: f64,
    pub available: bool,
}

/// GET /api/v1/metrics
/// Obtener métricas del sistema (versión simple sin Redis check)
pub async fn get_metrics_simple() -> Result<Json<MetricsResponse>, StatusCode> {
    let successful = TRANSACTION_SUCCESS.load(Ordering::Relaxed);
    let failed = TRANSACTION_FAILED.load(Ordering::Relaxed);
    let total = successful + failed;
    let success_rate = if total > 0 {
        (successful as f64 / total as f64) * 100.0
    } else {
        0.0
    };
    
    let rate_limit_hits = RATE_LIMIT_HITS.load(Ordering::Relaxed);
    
    // Redis metrics (without AppState, we can't check connection)
    let redis_queries = REDIS_QUERIES.load(Ordering::Relaxed);
        let total_time = REDIS_QUERY_TIME_MS.load(Ordering::Relaxed);
    let avg_response_time_ms = if redis_queries > 0 {
        total_time as f64 / redis_queries as f64
    } else {
        0.0
    };
    let redis_available = false; // Can't check without AppState
    
    Ok(Json(MetricsResponse {
        transactions: TransactionMetrics {
            successful,
            failed,
            total,
            success_rate,
        },
        rate_limiting: RateLimitMetrics {
            hits: rate_limit_hits,
        },
        redis: RedisMetrics {
            queries: redis_queries,
            avg_response_time_ms,
            available: redis_available,
        },
    }))
}

/// Incrementar contador de transacciones exitosas
pub fn increment_transaction_success() {
    TRANSACTION_SUCCESS.fetch_add(1, Ordering::Relaxed);
}

/// Incrementar contador de transacciones fallidas
pub fn increment_transaction_failed() {
    TRANSACTION_FAILED.fetch_add(1, Ordering::Relaxed);
}

/// Incrementar contador de rate limit hits
pub fn increment_rate_limit_hit() {
    RATE_LIMIT_HITS.fetch_add(1, Ordering::Relaxed);
}

/// Registrar tiempo de query Redis
pub fn record_redis_query_time(ms: u64) {
    REDIS_QUERIES.fetch_add(1, Ordering::Relaxed);
    REDIS_QUERY_TIME_MS.fetch_add(ms, Ordering::Relaxed);
}

// Note: get_metrics() and metrics_routes() that require AppState are defined in server.rs
// This module provides the metrics functions that don't require AppState

