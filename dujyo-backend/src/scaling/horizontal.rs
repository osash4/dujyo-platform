//! Horizontal Scaling Preparation for Dujyo
//! 
//! This module provides horizontal scaling capabilities:
//! - Stateless handlers for load balancing
//! - Session management in database
//! - Shared nothing architecture
//! - Event-driven communication
//! - Database sharding preparation
//! - Load balancer configuration

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

// ===========================================
// TYPES & STRUCTS
// ===========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScalingConfig {
    pub enable_horizontal_scaling: bool,
    pub max_instances: u32,
    pub auto_scaling_enabled: bool,
    pub cpu_threshold: f64,
    pub memory_threshold: f64,
    pub response_time_threshold: f64,
    pub scale_up_cooldown: u64,
    pub scale_down_cooldown: u64,
    pub min_instances: u32,
    pub max_instances_per_service: u32,
}

impl Default for ScalingConfig {
    fn default() -> Self {
        Self {
            enable_horizontal_scaling: true,
            max_instances: 10,
            auto_scaling_enabled: true,
            cpu_threshold: 70.0,
            memory_threshold: 80.0,
            response_time_threshold: 1000.0,
            scale_up_cooldown: 300, // 5 minutes
            scale_down_cooldown: 600, // 10 minutes
            min_instances: 1,
            max_instances_per_service: 5,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceInfo {
    pub id: String,
    pub service_name: String,
    pub host: String,
    pub port: u16,
    pub status: InstanceStatus,
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub response_time: f64,
    pub active_connections: u32,
    pub total_requests: u64,
    pub error_rate: f64,
    pub last_health_check: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum InstanceStatus {
    Starting,
    Running,
    Stopping,
    Stopped,
    Error,
    Maintenance,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionData {
    pub session_id: String,
    pub user_id: String,
    pub data: HashMap<String, serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub last_accessed: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub instance_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShardConfig {
    pub shard_id: String,
    pub database_url: String,
    pub user_id_range: (u64, u64),
    pub is_active: bool,
    pub replica_count: u32,
    pub read_replicas: Vec<String>,
}

// ===========================================
// HORIZONTAL SCALING MANAGER
// ===========================================

pub struct HorizontalScalingManager {
    instances: Arc<RwLock<HashMap<String, InstanceInfo>>>,
    sessions: Arc<RwLock<HashMap<String, SessionData>>>,
    shards: Arc<RwLock<Vec<ShardConfig>>>,
    pub config: ScalingConfig,
    event_sender: mpsc::UnboundedSender<ScalingEvent>,
    event_receiver: Arc<RwLock<mpsc::UnboundedReceiver<ScalingEvent>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScalingEvent {
    pub id: String,
    pub event_type: ScalingEventType,
    pub service_name: String,
    pub instance_id: Option<String>,
    pub payload: serde_json::Value,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ScalingEventType {
    InstanceStarted,
    InstanceStopped,
    InstanceError,
    ScaleUp,
    ScaleDown,
    LoadBalancerUpdate,
    HealthCheck,
    SessionCreated,
    SessionDestroyed,
    ShardAdded,
    ShardRemoved,
}

impl HorizontalScalingManager {
    pub fn new(config: ScalingConfig) -> Self {
        let (event_sender, event_receiver) = mpsc::unbounded_channel();
        
        Self {
            instances: Arc::new(RwLock::new(HashMap::new())),
            sessions: Arc::new(RwLock::new(HashMap::new())),
            shards: Arc::new(RwLock::new(Vec::new())),
            config,
            event_sender,
            event_receiver: Arc::new(RwLock::new(event_receiver)),
        }
    }

    // ===========================================
    // INSTANCE MANAGEMENT
    // ===========================================

    pub async fn register_instance(&self, instance: InstanceInfo) -> Result<(), String> {
        let instance_id = instance.id.clone();
        
        {
            let mut instances = self.instances.write().await;
            instances.insert(instance_id.clone(), instance.clone());
        }

        // Send event
        let event = ScalingEvent {
            id: Uuid::new_v4().to_string(),
            event_type: ScalingEventType::InstanceStarted,
            service_name: instance.service_name.clone(),
            instance_id: Some(instance_id),
            payload: serde_json::json!({"status": "registered"}),
            timestamp: Utc::now(),
        };
        
        self.send_event(event).await;

        Ok(())
    }

    pub async fn unregister_instance(&self, instance_id: &str) -> Result<(), String> {
        let instance_info = {
            let mut instances = self.instances.write().await;
            instances.remove(instance_id)
        };

        if let Some(instance) = instance_info {
            // Send event
            let event = ScalingEvent {
                id: Uuid::new_v4().to_string(),
                event_type: ScalingEventType::InstanceStopped,
                service_name: instance.service_name,
                instance_id: Some(instance_id.to_string()),
                payload: serde_json::json!({"status": "unregistered"}),
                timestamp: Utc::now(),
            };
            
            self.send_event(event).await;
        }

        Ok(())
    }

    pub async fn update_instance_metrics(&self, instance_id: &str, metrics: InstanceMetrics) -> Result<(), String> {
        {
            let mut instances = self.instances.write().await;
            if let Some(instance) = instances.get_mut(instance_id) {
                instance.cpu_usage = metrics.cpu_usage;
                instance.memory_usage = metrics.memory_usage;
                instance.response_time = metrics.response_time;
                instance.active_connections = metrics.active_connections;
                instance.total_requests = metrics.total_requests;
                instance.error_rate = metrics.error_rate;
                instance.last_health_check = Utc::now();
            } else {
                return Err("Instance not found".to_string());
            }
        }

        // Check if scaling is needed
        self.check_scaling_requirements().await;

        Ok(())
    }

    pub async fn get_instances_for_service(&self, service_name: &str) -> Vec<InstanceInfo> {
        let instances = self.instances.read().await;
        instances
            .values()
            .filter(|i| i.service_name == service_name && i.status == InstanceStatus::Running)
            .cloned()
            .collect()
    }

    pub async fn get_least_loaded_instance(&self, service_name: &str) -> Option<InstanceInfo> {
        let instances = self.get_instances_for_service(service_name).await;
        
        instances
            .into_iter()
            .min_by(|a, b| {
                let a_load = a.cpu_usage + a.memory_usage + (a.response_time / 1000.0);
                let b_load = b.cpu_usage + b.memory_usage + (b.response_time / 1000.0);
                a_load.partial_cmp(&b_load).unwrap_or(std::cmp::Ordering::Equal)
            })
    }

    // ===========================================
    // SESSION MANAGEMENT
    // ===========================================

    pub async fn create_session(&self, user_id: String, data: HashMap<String, serde_json::Value>) -> String {
        let session_id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        let session = SessionData {
            session_id: session_id.clone(),
            user_id,
            data,
            created_at: now,
            last_accessed: now,
            expires_at: now + chrono::Duration::hours(24),
            instance_id: None,
        };

        {
            let mut sessions = self.sessions.write().await;
            sessions.insert(session_id.clone(), session);
        }

        // Send event
        let event = ScalingEvent {
            id: Uuid::new_v4().to_string(),
            event_type: ScalingEventType::SessionCreated,
            service_name: "session".to_string(),
            instance_id: None,
            payload: serde_json::json!({"session_id": session_id}),
            timestamp: now,
        };
        
        self.send_event(event).await;

        session_id
    }

    pub async fn get_session(&self, session_id: &str) -> Option<SessionData> {
        let mut sessions = self.sessions.write().await;
        if let Some(session) = sessions.get_mut(session_id) {
            session.last_accessed = Utc::now();
            Some(session.clone())
        } else {
            None
        }
    }

    pub async fn update_session(&self, session_id: &str, data: HashMap<String, serde_json::Value>) -> Result<(), String> {
        let mut sessions = self.sessions.write().await;
        if let Some(session) = sessions.get_mut(session_id) {
            session.data = data;
            session.last_accessed = Utc::now();
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub async fn destroy_session(&self, session_id: &str) -> Result<(), String> {
        let session_info = {
            let mut sessions = self.sessions.write().await;
            sessions.remove(session_id)
        };

        if session_info.is_some() {
            // Send event
            let event = ScalingEvent {
                id: Uuid::new_v4().to_string(),
                event_type: ScalingEventType::SessionDestroyed,
                service_name: "session".to_string(),
                instance_id: None,
                payload: serde_json::json!({"session_id": session_id}),
                timestamp: Utc::now(),
            };
            
            self.send_event(event).await;
        }

        Ok(())
    }

    pub async fn cleanup_expired_sessions(&self) -> u64 {
        let now = Utc::now();
        let mut expired_sessions = Vec::new();
        
        {
            let sessions = self.sessions.read().await;
            for (session_id, session) in sessions.iter() {
                if session.expires_at < now {
                    expired_sessions.push(session_id.clone());
                }
            }
        }

        let count = expired_sessions.len() as u64;
        
        for session_id in expired_sessions {
            let _ = self.destroy_session(&session_id).await;
        }

        count
    }

    // ===========================================
    // DATABASE SHARDING
    // ===========================================

    pub async fn add_shard(&self, shard_config: ShardConfig) -> Result<(), String> {
        {
            let mut shards = self.shards.write().await;
            shards.push(shard_config.clone());
        }

        // Send event
        let event = ScalingEvent {
            id: Uuid::new_v4().to_string(),
            event_type: ScalingEventType::ShardAdded,
            service_name: "database".to_string(),
            instance_id: None,
            payload: serde_json::json!({"shard_id": shard_config.shard_id}),
            timestamp: Utc::now(),
        };
        
        self.send_event(event).await;

        Ok(())
    }

    pub async fn get_shard_for_user(&self, user_id: &str) -> Option<ShardConfig> {
        let shards = self.shards.read().await;
        let user_hash = self.hash_user_id(user_id);
        
        shards
            .iter()
            .find(|shard| {
                shard.is_active && 
                user_hash >= shard.user_id_range.0 && 
                user_hash <= shard.user_id_range.1
            })
            .cloned()
    }

    pub async fn get_read_replica_for_shard(&self, shard_id: &str) -> Option<String> {
        let shards = self.shards.read().await;
        shards
            .iter()
            .find(|shard| shard.shard_id == shard_id)
            .and_then(|shard| shard.read_replicas.first())
            .cloned()
    }

    // ===========================================
    // AUTO SCALING
    // ===========================================

    async fn check_scaling_requirements(&self) {
        if !self.config.auto_scaling_enabled {
            return;
        }

        let instances = self.instances.read().await;
        let service_instances: HashMap<String, Vec<&InstanceInfo>> = instances
            .values()
            .filter(|i| i.status == InstanceStatus::Running)
            .fold(HashMap::new(), |mut acc, instance| {
                acc.entry(instance.service_name.clone()).or_insert_with(Vec::new).push(instance);
                acc
            });

        for (service_name, service_instances) in service_instances {
            let avg_cpu = service_instances.iter().map(|i| i.cpu_usage).sum::<f64>() / service_instances.len() as f64;
            let avg_memory = service_instances.iter().map(|i| i.memory_usage).sum::<f64>() / service_instances.len() as f64;
            let avg_response_time = service_instances.iter().map(|i| i.response_time).sum::<f64>() / service_instances.len() as f64;

            // Check if scale up is needed
            if (avg_cpu > self.config.cpu_threshold || 
                avg_memory > self.config.memory_threshold || 
                avg_response_time > self.config.response_time_threshold) &&
                service_instances.len() < self.config.max_instances_per_service as usize {
                
                self.scale_up_service(&service_name).await;
            }
            
            // Check if scale down is needed
            else if avg_cpu < self.config.cpu_threshold * 0.5 && 
                    avg_memory < self.config.memory_threshold * 0.5 && 
                    avg_response_time < self.config.response_time_threshold * 0.5 &&
                    service_instances.len() > self.config.min_instances as usize {
                
                self.scale_down_service(&service_name).await;
            }
        }
    }

    async fn scale_up_service(&self, service_name: &str) {
        // In a real implementation, this would start a new instance
        // For now, we'll just send an event
        let event = ScalingEvent {
            id: Uuid::new_v4().to_string(),
            event_type: ScalingEventType::ScaleUp,
            service_name: service_name.to_string(),
            instance_id: None,
            payload: serde_json::json!({"reason": "high_load"}),
            timestamp: Utc::now(),
        };
        
        self.send_event(event).await;
    }

    async fn scale_down_service(&self, service_name: &str) {
        // In a real implementation, this would stop an instance
        // For now, we'll just send an event
        let event = ScalingEvent {
            id: Uuid::new_v4().to_string(),
            event_type: ScalingEventType::ScaleDown,
            service_name: service_name.to_string(),
            instance_id: None,
            payload: serde_json::json!({"reason": "low_load"}),
            timestamp: Utc::now(),
        };
        
        self.send_event(event).await;
    }

    // ===========================================
    // EVENT HANDLING
    // ===========================================

    async fn send_event(&self, event: ScalingEvent) {
        let _ = self.event_sender.send(event);
    }

    pub async fn get_events(&self, limit: Option<usize>) -> Vec<ScalingEvent> {
        // In a real implementation, this would return events from a queue
        // For now, return empty vector
        vec![]
    }

    // ===========================================
    // UTILITY FUNCTIONS
    // ===========================================

    fn hash_user_id(&self, user_id: &str) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        user_id.hash(&mut hasher);
        hasher.finish()
    }

    pub async fn get_scaling_stats(&self) -> ScalingStats {
        let instances = self.instances.read().await;
        let sessions = self.sessions.read().await;
        let shards = self.shards.read().await;

        let total_instances = instances.len();
        let running_instances = instances.values().filter(|i| i.status == InstanceStatus::Running).count();
        let total_sessions = sessions.len();
        let active_shards = shards.iter().filter(|s| s.is_active).count();

        ScalingStats {
            total_instances,
            running_instances,
            total_sessions,
            active_shards,
            config: self.config.clone(),
        }
    }
}

// ===========================================
// SUPPORTING STRUCTS
// ===========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceMetrics {
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub response_time: f64,
    pub active_connections: u32,
    pub total_requests: u64,
    pub error_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScalingStats {
    pub total_instances: usize,
    pub running_instances: usize,
    pub total_sessions: usize,
    pub active_shards: usize,
    pub config: ScalingConfig,
}

// ===========================================
// LOAD BALANCER
// ===========================================

pub struct LoadBalancer {
    instances: Arc<RwLock<HashMap<String, Vec<InstanceInfo>>>>,
    strategy: LoadBalancingStrategy,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum LoadBalancingStrategy {
    RoundRobin,
    LeastConnections,
    LeastResponseTime,
    WeightedRoundRobin,
    IPHash,
}

impl LoadBalancer {
    pub fn new(strategy: LoadBalancingStrategy) -> Self {
        Self {
            instances: Arc::new(RwLock::new(HashMap::new())),
            strategy,
        }
    }

    pub async fn add_instance(&self, instance: InstanceInfo) {
        let mut instances = self.instances.write().await;
        instances
            .entry(instance.service_name.clone())
            .or_insert_with(Vec::new)
            .push(instance);
    }

    pub async fn remove_instance(&self, instance_id: &str) {
        let mut instances = self.instances.write().await;
        for service_instances in instances.values_mut() {
            service_instances.retain(|i| i.id != instance_id);
        }
    }

    pub async fn get_instance(&self, service_name: &str, client_ip: Option<&str>) -> Option<InstanceInfo> {
        let instances = self.instances.read().await;
        let service_instances = instances.get(service_name)?;
        
        if service_instances.is_empty() {
            return None;
        }

        match self.strategy {
            LoadBalancingStrategy::RoundRobin => {
                // Simple round robin (in real implementation, you'd use atomic counters)
                Some(service_instances[0].clone())
            }
            LoadBalancingStrategy::LeastConnections => {
                service_instances
                    .iter()
                    .min_by_key(|i| i.active_connections)
                    .cloned()
            }
            LoadBalancingStrategy::LeastResponseTime => {
                service_instances
                    .iter()
                    .min_by(|a, b| a.response_time.partial_cmp(&b.response_time).unwrap_or(std::cmp::Ordering::Equal))
                    .cloned()
            }
            LoadBalancingStrategy::WeightedRoundRobin => {
                // Weighted round robin (simplified)
                Some(service_instances[0].clone())
            }
            LoadBalancingStrategy::IPHash => {
                if let Some(ip) = client_ip {
                    let hash = self.hash_ip(ip);
                    let index = hash % service_instances.len() as u64;
                    Some(service_instances[index as usize].clone())
                } else {
                    Some(service_instances[0].clone())
                }
            }
        }
    }

    fn hash_ip(&self, ip: &str) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        ip.hash(&mut hasher);
        hasher.finish()
    }
}

// ===========================================
// TESTS
// ===========================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_horizontal_scaling_manager() {
        let config = ScalingConfig::default();
        let manager = HorizontalScalingManager::new(config);
        
        // Test instance registration
        let instance = InstanceInfo {
            id: "instance_1".to_string(),
            service_name: "test_service".to_string(),
            host: "localhost".to_string(),
            port: 8080,
            status: InstanceStatus::Running,
            cpu_usage: 50.0,
            memory_usage: 60.0,
            response_time: 100.0,
            active_connections: 10,
            total_requests: 1000,
            error_rate: 0.1,
            last_health_check: Utc::now(),
            created_at: Utc::now(),
        };
        
        assert!(manager.register_instance(instance).await.is_ok());
        
        // Test getting instances
        let instances = manager.get_instances_for_service("test_service").await;
        assert_eq!(instances.len(), 1);
    }

    #[tokio::test]
    async fn test_session_management() {
        let config = ScalingConfig::default();
        let manager = HorizontalScalingManager::new(config);
        
        // Test session creation
        let mut data = HashMap::new();
        data.insert("key".to_string(), serde_json::json!("value"));
        
        let session_id = manager.create_session("user_123".to_string(), data).await;
        assert!(!session_id.is_empty());
        
        // Test session retrieval
        let session = manager.get_session(&session_id).await;
        assert!(session.is_some());
        assert_eq!(session.unwrap().user_id, "user_123");
    }

    #[tokio::test]
    async fn test_load_balancer() {
        let load_balancer = LoadBalancer::new(LoadBalancingStrategy::RoundRobin);
        
        let instance = InstanceInfo {
            id: "instance_1".to_string(),
            service_name: "test_service".to_string(),
            host: "localhost".to_string(),
            port: 8080,
            status: InstanceStatus::Running,
            cpu_usage: 50.0,
            memory_usage: 60.0,
            response_time: 100.0,
            active_connections: 10,
            total_requests: 1000,
            error_rate: 0.1,
            last_health_check: Utc::now(),
            created_at: Utc::now(),
        };
        
        load_balancer.add_instance(instance).await;
        
        let selected_instance = load_balancer.get_instance("test_service", None).await;
        assert!(selected_instance.is_some());
    }
}
