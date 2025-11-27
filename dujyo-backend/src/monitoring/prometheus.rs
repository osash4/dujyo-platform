//! Prometheus Metrics Export
//! 
//! Exports metrics in Prometheus format for scraping

use crate::monitoring::metrics_collector::MetricsCollector;
use axum::{
    extract::Extension,
    http::StatusCode,
    response::Response,
};
use std::sync::Arc;

/// Export metrics in Prometheus format
pub async fn prometheus_metrics_handler(
    Extension(metrics_collector): Extension<Arc<MetricsCollector>>,
) -> Result<Response<String>, StatusCode> {
    let metrics = metrics_collector.get_current_metrics().await;
    
    // Format metrics in Prometheus text format
    let mut prometheus_output = String::new();
    
    // System metrics
    prometheus_output.push_str(&format!(
        "# HELP dujyo_tps Transactions per second\n# TYPE dujyo_tps gauge\ndujyo_tps {}\n\n",
        metrics.tps
    ));
    
    prometheus_output.push_str(&format!(
        "# HELP dujyo_active_users Active users count\n# TYPE dujyo_active_users gauge\ndujyo_active_users {}\n\n",
        metrics.active_users
    ));
    
    prometheus_output.push_str(&format!(
        "# HELP dujyo_error_rate Error rate percentage\n# TYPE dujyo_error_rate gauge\ndujyo_error_rate {}\n\n",
        metrics.error_rate
    ));
    
    prometheus_output.push_str(&format!(
        "# HELP dujyo_response_time_avg Average response time in milliseconds\n# TYPE dujyo_response_time_avg gauge\ndujyo_response_time_avg {}\n\n",
        metrics.response_time
    ));
    
    // Resource metrics
    prometheus_output.push_str(&format!(
        "# HELP dujyo_memory_usage Memory usage percentage\n# TYPE dujyo_memory_usage gauge\ndujyo_memory_usage {}\n\n",
        metrics.memory_usage
    ));
    
    prometheus_output.push_str(&format!(
        "# HELP dujyo_cpu_usage CPU usage percentage\n# TYPE dujyo_cpu_usage gauge\ndujyo_cpu_usage {}\n\n",
        metrics.cpu_usage
    ));
    
    prometheus_output.push_str(&format!(
        "# HELP dujyo_disk_usage Disk usage percentage\n# TYPE dujyo_disk_usage gauge\ndujyo_disk_usage {}\n\n",
        metrics.disk_usage
    ));
    
    // Network metrics
    prometheus_output.push_str(&format!(
        "# HELP dujyo_network_in Network input in bytes\n# TYPE dujyo_network_in gauge\ndujyo_network_in {}\n\n",
        metrics.network_in
    ));
    
    prometheus_output.push_str(&format!(
        "# HELP dujyo_network_out Network output in bytes\n# TYPE dujyo_network_out gauge\ndujyo_network_out {}\n\n",
        metrics.network_out
    ));
    
    // Blockchain metrics
    prometheus_output.push_str(&format!(
        "# HELP dujyo_blockchain_height Current blockchain height\n# TYPE dujyo_blockchain_height gauge\ndujyo_blockchain_height {}\n\n",
        metrics.blockchain_height
    ));
    
    prometheus_output.push_str(&format!(
        "# HELP dujyo_pending_transactions Pending transactions count\n# TYPE dujyo_pending_transactions gauge\ndujyo_pending_transactions {}\n\n",
        metrics.pending_transactions
    ));
    
    // Database metrics
    prometheus_output.push_str(&format!(
        "# HELP dujyo_database_connections Active database connections\n# TYPE dujyo_database_connections gauge\ndujyo_database_connections {}\n\n",
        metrics.database_connections
    ));
    
    prometheus_output.push_str(&format!(
        "# HELP dujyo_database_query_time_avg Average database query time in milliseconds\n# TYPE dujyo_database_query_time_avg gauge\ndujyo_database_query_time_avg {}\n\n",
        metrics.database_query_time
    ));
    
    prometheus_output.push_str(&format!(
        "# HELP dujyo_cache_hit_rate Cache hit rate percentage\n# TYPE dujyo_cache_hit_rate gauge\ndujyo_cache_hit_rate {}\n\n",
        metrics.cache_hit_rate
    ));
    
    // Gas metrics
    prometheus_output.push_str(&format!(
        "# HELP dujyo_gas_price Current gas price\n# TYPE dujyo_gas_price gauge\ndujyo_gas_price {}\n\n",
        metrics.gas_price
    ));
    
    prometheus_output.push_str(&format!(
        "# HELP dujyo_gas_used Gas used\n# TYPE dujyo_gas_used gauge\ndujyo_gas_used {}\n\n",
        metrics.gas_used
    ));
    
    // Consensus metrics
    prometheus_output.push_str(&format!(
        "# HELP dujyo_validator_count Active validators count\n# TYPE dujyo_validator_count gauge\ndujyo_validator_count {}\n\n",
        metrics.validator_count
    ));
    
    prometheus_output.push_str(&format!(
        "# HELP dujyo_staking_ratio Staking ratio percentage\n# TYPE dujyo_staking_ratio gauge\ndujyo_staking_ratio {}\n\n",
        metrics.staking_ratio
    ));
    
    // Token metrics
    prometheus_output.push_str(&format!(
        "# HELP dujyo_total_supply Total token supply\n# TYPE dujyo_total_supply gauge\ndujyo_total_supply {}\n\n",
        metrics.total_supply
    ));
    
    prometheus_output.push_str(&format!(
        "# HELP dujyo_circulating_supply Circulating token supply\n# TYPE dujyo_circulating_supply gauge\ndujyo_circulating_supply {}\n",
        metrics.circulating_supply
    ));
    
    let response = Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
        .body(prometheus_output)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(response)
}

