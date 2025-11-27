//! Consensus Protection and Security Hardening for Dujyo
//! 
//! This module provides comprehensive security for the CPV consensus:
//! - Validator power limits (max 10% per validator)
//! - Automatic validator rotation
//! - Anti-sybil mechanisms
//! - Slashing conditions for misbehavior
//! - Governance voting for parameters

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error, debug};
use sqlx::{PgPool, Row};
use chrono::{DateTime, Utc};

/// Consensus security configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsensusSecurityConfig {
    pub max_validator_power: f64,           // Maximum 10% per validator
    pub min_validator_stake: u64,           // Minimum stake to become validator
    pub max_validator_count: usize,         // Maximum number of validators
    pub rotation_interval: Duration,        // How often to rotate validators
    pub slashing_threshold: f64,            // Threshold for slashing (0.1 = 10%)
    pub governance_threshold: f64,          // Threshold for governance votes (0.67 = 67%)
    pub anti_sybil_enabled: bool,
    pub reputation_system_enabled: bool,
    pub penalty_multiplier: f64,            // Multiplier for penalties
}

impl Default for ConsensusSecurityConfig {
    fn default() -> Self {
        Self {
            max_validator_power: 0.10,      // 10% maximum power per validator
            min_validator_stake: 1_000_000, // 1M DYO minimum stake
            max_validator_count: 100,       // Maximum 100 validators
            rotation_interval: Duration::from_secs(86400), // 24 hours
            slashing_threshold: 0.1,        // 10% threshold for slashing
            governance_threshold: 0.67,     // 67% threshold for governance
            anti_sybil_enabled: true,
            reputation_system_enabled: true,
            penalty_multiplier: 2.0,        // 2x penalty for repeat offenses
        }
    }
}

/// Validator information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidatorInfo {
    pub address: String,
    pub stake: u64,
    pub power: f64,
    pub reputation_score: f64,
    pub is_active: bool,
    pub last_rotation: DateTime<Utc>,
    pub violations: Vec<Violation>,
    pub total_rewards: u64,
    pub total_penalties: u64,
    pub validator_type: ValidatorType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidatorType {
    Economic,   // Traditional stake-based validator
    Creative,   // Content creator validator
    Community,  // Community-elected validator
}

/// Violation types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Violation {
    pub violation_type: ViolationType,
    pub severity: ViolationSeverity,
    pub timestamp: DateTime<Utc>,
    pub evidence: String,
    pub penalty_applied: u64,
    pub is_appealed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ViolationType {
    DoubleSign,           // Signing conflicting blocks
    Unavailability,       // Not participating in consensus
    MaliciousBehavior,    // Deliberate harmful actions
    SybilAttack,          // Multiple identities
    GovernanceViolation,  // Violating governance decisions
    SlashingCondition,    // Triggering slashing conditions
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ViolationSeverity {
    Low,      // Warning, no penalty
    Medium,   // Small penalty
    High,     // Significant penalty
    Critical, // Slashing
}

/// Governance proposal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceProposal {
    pub id: String,
    pub proposer: String,
    pub title: String,
    pub description: String,
    pub proposal_type: ProposalType,
    pub parameters: serde_json::Value,
    pub voting_power_required: f64,
    pub votes_for: u64,
    pub votes_against: u64,
    pub total_voting_power: u64,
    pub status: ProposalStatus,
    pub created_at: DateTime<Utc>,
    pub voting_end: DateTime<Utc>,
    pub executed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProposalType {
    ParameterChange,    // Change consensus parameters
    ValidatorAddition,  // Add new validator
    ValidatorRemoval,   // Remove validator
    Slashing,          // Slash validator
    Emergency,         // Emergency action
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
    Expired,
}

/// Consensus protection service
pub struct ConsensusProtection {
    db_pool: PgPool,
    config: ConsensusSecurityConfig,
    validators: Arc<RwLock<HashMap<String, ValidatorInfo>>>,
    last_rotation: Arc<RwLock<DateTime<Utc>>>,
    governance_proposals: Arc<RwLock<HashMap<String, GovernanceProposal>>>,
}

impl ConsensusProtection {
    /// Create new consensus protection service
    pub async fn new(db_pool: PgPool, config: ConsensusSecurityConfig) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        info!("🛡️ Initializing consensus protection system");

        let protection = Self {
            db_pool,
            config,
            validators: Arc::new(RwLock::new(HashMap::new())),
            last_rotation: Arc::new(RwLock::new(Utc::now())),
            governance_proposals: Arc::new(RwLock::new(HashMap::new())),
        };

        // Load validators from database
        protection.load_validators().await?;
        
        // Load governance proposals
        protection.load_governance_proposals().await?;

        // Start background tasks
        protection.start_background_tasks().await;

        Ok(protection)
    }

    /// Validate validator power distribution
    pub async fn validate_power_distribution(&self) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        let validators = self.validators.read().await;
        let total_stake: u64 = validators.values().map(|v| v.stake).sum();
        
        if total_stake == 0 {
            return Ok(true);
        }

        for validator in validators.values() {
            let power = validator.stake as f64 / total_stake as f64;
            if power > self.config.max_validator_power {
                warn!("🚨 Validator {} exceeds max power: {:.2}% > {:.2}%", 
                      validator.address, power * 100.0, self.config.max_validator_power * 100.0);
                return Ok(false);
            }
        }

        Ok(true)
    }

    /// Rotate validators based on performance and stake
    pub async fn rotate_validators(&self) -> Result<Vec<String>, Box<dyn std::error::Error + Send + Sync>> {
        info!("🔄 Starting validator rotation");

        let mut validators = self.validators.write().await;
        let mut validator_list: Vec<(String, ValidatorInfo)> = validators.drain().collect();

        // Sort by combined score (stake + reputation)
        validator_list.sort_by(|a, b| {
            let score_a = self.calculate_validator_score(&a.1);
            let score_b = self.calculate_validator_score(&b.1);
            score_b.partial_cmp(&score_a).unwrap_or(std::cmp::Ordering::Equal)
        });

        // Select top validators up to max count
        let selected_count = validator_list.len().min(self.config.max_validator_count);
        let selected_validators: Vec<String> = validator_list[..selected_count]
            .iter()
            .map(|(address, _)| address.clone())
            .collect();

        // Update validator status
        for (address, mut validator) in validator_list {
            validator.is_active = selected_validators.contains(&address);
            validator.last_rotation = Utc::now();
            validators.insert(address, validator);
        }

        // Update last rotation time
        {
            let mut last_rotation = self.last_rotation.write().await;
            *last_rotation = Utc::now();
        }

        info!("✅ Validator rotation completed: {} active validators", selected_validators.len());
        Ok(selected_validators)
    }

    /// Calculate validator score for selection
    fn calculate_validator_score(&self, validator: &ValidatorInfo) -> f64 {
        let stake_score = validator.stake as f64 / 1_000_000.0; // Normalize to millions
        let reputation_score = validator.reputation_score;
        let penalty_score = if validator.total_penalties > 0 {
            1.0 / (1.0 + validator.total_penalties as f64 / 1_000_000.0)
        } else {
            1.0
        };

        // Weighted combination
        stake_score * 0.4 + reputation_score * 0.4 + penalty_score * 0.2
    }

    /// Detect and prevent sybil attacks
    pub async fn detect_sybil_attack(&self, validator_address: &str) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        if !self.config.anti_sybil_enabled {
            return Ok(false);
        }

        // Check for multiple validators with similar patterns
        let suspicious_validators: Vec<String> = sqlx::query_scalar!(
            r#"
            SELECT DISTINCT v1.address
            FROM validators v1
            JOIN validators v2 ON v1.address != v2.address
            WHERE v1.created_at = v2.created_at
            AND v1.validator_type = v2.validator_type
            AND v1.stake = v2.stake
            AND v1.address = $1
            "#
        )
        .bind(validator_address)
        .fetch_all(&self.db_pool)
        .await?;

        if !suspicious_validators.is_empty() {
            warn!("🚨 Potential sybil attack detected for validator {}", validator_address);
            
            // Record violation
            self.record_violation(validator_address, ViolationType::SybilAttack, ViolationSeverity::High).await?;
            
            return Ok(true);
        }

        Ok(false)
    }

    /// Apply slashing for violations
    pub async fn apply_slashing(&self, validator_address: &str, violation: &Violation) -> Result<u64, Box<dyn std::error::Error + Send + Sync>> {
        let mut validators = self.validators.write().await;
        
        if let Some(validator) = validators.get_mut(validator_address) {
            let penalty = self.calculate_penalty(validator, violation);
            
            // Apply penalty
            validator.stake = validator.stake.saturating_sub(penalty);
            validator.total_penalties += penalty;
            
            // Update reputation score
            validator.reputation_score = self.update_reputation_score(validator, violation);
            
            // Record violation
            validator.violations.push(violation.clone());
            
            // Save to database
            self.save_validator_to_db(validator).await?;
            
            info!("⚡ Applied slashing to validator {}: {} DYO penalty", validator_address, penalty);
            Ok(penalty)
        } else {
            Err("Validator not found".into())
        }
    }

    /// Calculate penalty amount
    fn calculate_penalty(&self, validator: &ValidatorInfo, violation: &Violation) -> u64 {
        let base_penalty = match violation.severity {
            ViolationSeverity::Low => 0,
            ViolationSeverity::Medium => validator.stake / 100,      // 1%
            ViolationSeverity::High => validator.stake / 20,         // 5%
            ViolationSeverity::Critical => validator.stake / 10,     // 10%
        };

        // Apply multiplier for repeat offenses
        let violation_count = validator.violations.len() as f64;
        let multiplier = if violation_count > 1.0 {
            self.config.penalty_multiplier.powi(violation_count as i32)
        } else {
            1.0
        };

        (base_penalty as f64 * multiplier) as u64
    }

    /// Update reputation score
    fn update_reputation_score(&self, validator: &mut ValidatorInfo, violation: &Violation) -> f64 {
        let penalty = match violation.severity {
            ViolationSeverity::Low => 0.01,
            ViolationSeverity::Medium => 0.05,
            ViolationSeverity::High => 0.15,
            ViolationSeverity::Critical => 0.30,
        };

        // Decay reputation over time
        let time_decay = 0.99; // 1% decay per day
        let new_score = validator.reputation_score * time_decay - penalty;
        
        new_score.max(0.0).min(1.0)
    }

    /// Record violation
    async fn record_violation(&self, validator_address: &str, violation_type: ViolationType, severity: ViolationSeverity) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let violation = Violation {
            violation_type,
            severity,
            timestamp: Utc::now(),
            evidence: format!("Automated detection for validator {}", validator_address),
            penalty_applied: 0, // Will be calculated when slashing is applied
            is_appealed: false,
        };

        sqlx::query!(
            r#"
            INSERT INTO validator_violations (
                validator_address, violation_type, severity, timestamp, 
                evidence, penalty_applied, is_appealed
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
            validator_address,
            format!("{:?}", violation.violation_type),
            format!("{:?}", violation.severity),
            violation.timestamp,
            violation.evidence,
            violation.penalty_applied as i64,
            violation.is_appealed
        )
        .execute(&self.db_pool)
        .await?;

        Ok(())
    }

    /// Create governance proposal
    pub async fn create_governance_proposal(&self, proposer: &str, proposal: GovernanceProposal) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let proposal_id = uuid::Uuid::new_v4().to_string();
        
        let mut proposals = self.governance_proposals.write().await;
        proposals.insert(proposal_id.clone(), proposal.clone());

        // Save to database
        sqlx::query!(
            r#"
            INSERT INTO governance_proposals (
                id, proposer, title, description, proposal_type,
                parameters, voting_power_required, votes_for, votes_against,
                total_voting_power, status, created_at, voting_end
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            "#,
            proposal_id,
            proposer,
            proposal.title,
            proposal.description,
            format!("{:?}", proposal.proposal_type),
            proposal.parameters,
            proposal.voting_power_required,
            proposal.votes_for as i64,
            proposal.votes_against as i64,
            proposal.total_voting_power as i64,
            format!("{:?}", proposal.status),
            proposal.created_at,
            proposal.voting_end
        )
        .execute(&self.db_pool)
        .await?;

        info!("📋 Created governance proposal: {}", proposal_id);
        Ok(proposal_id)
    }

    /// Vote on governance proposal
    pub async fn vote_on_proposal(&self, proposal_id: &str, voter: &str, vote: bool, voting_power: u64) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut proposals = self.governance_proposals.write().await;
        
        if let Some(proposal) = proposals.get_mut(proposal_id) {
            if proposal.status != ProposalStatus::Active {
                return Err("Proposal is not active".into());
            }

            if Utc::now() > proposal.voting_end {
                proposal.status = ProposalStatus::Expired;
                return Err("Voting period has ended".into());
            }

            // Update votes
            if vote {
                proposal.votes_for += voting_power;
            } else {
                proposal.votes_against += voting_power;
            }

            proposal.total_voting_power += voting_power;

            // Check if proposal has passed
            let total_votes = proposal.votes_for + proposal.votes_against;
            if total_votes > 0 {
                let approval_rate = proposal.votes_for as f64 / total_votes as f64;
                if approval_rate >= self.config.governance_threshold {
                    proposal.status = ProposalStatus::Passed;
                }
            }

            // Save vote to database
            sqlx::query!(
                r#"
                INSERT INTO governance_votes (proposal_id, voter, vote, voting_power, timestamp)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (proposal_id, voter) DO UPDATE SET
                vote = $3, voting_power = $4, timestamp = $5
                "#,
                proposal_id,
                voter,
                vote,
                voting_power as i64,
                Utc::now()
            )
            .execute(&self.db_pool)
            .await?;

            info!("🗳️ Vote recorded for proposal {}: {} ({})", proposal_id, if vote { "FOR" } else { "AGAINST" }, voting_power);
        } else {
            return Err("Proposal not found".into());
        }

        Ok(())
    }

    /// Execute governance proposal
    pub async fn execute_proposal(&self, proposal_id: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut proposals = self.governance_proposals.write().await;
        
        if let Some(proposal) = proposals.get_mut(proposal_id) {
            if proposal.status != ProposalStatus::Passed {
                return Err("Proposal has not passed".into());
            }

            // Execute based on proposal type
            match proposal.proposal_type {
                ProposalType::ParameterChange => {
                    self.execute_parameter_change(&proposal.parameters).await?;
                }
                ProposalType::ValidatorAddition => {
                    self.execute_validator_addition(&proposal.parameters).await?;
                }
                ProposalType::ValidatorRemoval => {
                    self.execute_validator_removal(&proposal.parameters).await?;
                }
                ProposalType::Slashing => {
                    self.execute_slashing(&proposal.parameters).await?;
                }
                ProposalType::Emergency => {
                    self.execute_emergency_action(&proposal.parameters).await?;
                }
            }

            proposal.status = ProposalStatus::Executed;
            proposal.executed_at = Some(Utc::now());

            info!("✅ Executed governance proposal: {}", proposal_id);
        } else {
            return Err("Proposal not found".into());
        }

        Ok(())
    }

    /// Execute parameter change
    async fn execute_parameter_change(&self, parameters: &serde_json::Value) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Update consensus parameters based on proposal
        info!("🔧 Executing parameter change: {:?}", parameters);
        // Implementation would update the consensus configuration
        Ok(())
    }

    /// Execute validator addition
    async fn execute_validator_addition(&self, parameters: &serde_json::Value) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(address) = parameters.get("address").and_then(|v| v.as_str()) {
            info!("➕ Adding validator: {}", address);
            // Implementation would add the validator to the active set
        }
        Ok(())
    }

    /// Execute validator removal
    async fn execute_validator_removal(&self, parameters: &serde_json::Value) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(address) = parameters.get("address").and_then(|v| v.as_str()) {
            info!("➖ Removing validator: {}", address);
            // Implementation would remove the validator from the active set
        }
        Ok(())
    }

    /// Execute slashing
    async fn execute_slashing(&self, parameters: &serde_json::Value) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(address) = parameters.get("address").and_then(|v| v.as_str()) {
            info!("⚡ Executing slashing for validator: {}", address);
            // Implementation would apply slashing to the validator
        }
        Ok(())
    }

    /// Execute emergency action
    async fn execute_emergency_action(&self, parameters: &serde_json::Value) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("🚨 Executing emergency action: {:?}", parameters);
        // Implementation would execute emergency measures
        Ok(())
    }

    /// Load validators from database
    async fn load_validators(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let validators: Vec<ValidatorInfo> = sqlx::query_as!(
            ValidatorInfo,
            r#"
            SELECT 
                address, stake, power, reputation_score, is_active,
                last_rotation, total_rewards, total_penalties, validator_type
            FROM validators
            "#
        )
        .fetch_all(&self.db_pool)
        .await?;

        let mut validator_map = self.validators.write().await;
        for validator in validators {
            validator_map.insert(validator.address.clone(), validator);
        }

        info!("✅ Loaded {} validators", validator_map.len());
        Ok(())
    }

    /// Load governance proposals from database
    async fn load_governance_proposals(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let proposals: Vec<GovernanceProposal> = sqlx::query_as!(
            GovernanceProposal,
            r#"
            SELECT 
                id, proposer, title, description, proposal_type,
                parameters, voting_power_required, votes_for, votes_against,
                total_voting_power, status, created_at, voting_end, executed_at
            FROM governance_proposals
            WHERE status IN ('Active', 'Passed')
            "#
        )
        .fetch_all(&self.db_pool)
        .await?;

        let mut proposal_map = self.governance_proposals.write().await;
        for proposal in proposals {
            proposal_map.insert(proposal.id.clone(), proposal);
        }

        info!("✅ Loaded {} governance proposals", proposal_map.len());
        Ok(())
    }

    /// Save validator to database
    async fn save_validator_to_db(&self, validator: &ValidatorInfo) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        sqlx::query!(
            r#"
            INSERT INTO validators (
                address, stake, power, reputation_score, is_active,
                last_rotation, total_rewards, total_penalties, validator_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (address) DO UPDATE SET
            stake = $2, power = $3, reputation_score = $4, is_active = $5,
            last_rotation = $6, total_rewards = $7, total_penalties = $8, validator_type = $9
            "#,
            validator.address,
            validator.stake as i64,
            validator.power,
            validator.reputation_score,
            validator.is_active,
            validator.last_rotation,
            validator.total_rewards as i64,
            validator.total_penalties as i64,
            format!("{:?}", validator.validator_type)
        )
        .execute(&self.db_pool)
        .await?;

        Ok(())
    }

    /// Start background tasks
    async fn start_background_tasks(&self) {
        let protection = self.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(3600)); // Check every hour
            
            loop {
                interval.tick().await;
                
                // Check if rotation is needed
                let last_rotation = protection.last_rotation.read().await;
                if Utc::now().signed_duration_since(*last_rotation) > protection.config.rotation_interval {
                    drop(last_rotation);
                    
                    if let Err(e) = protection.rotate_validators().await {
                        error!("❌ Validator rotation failed: {}", e);
                    }
                }
                
                // Validate power distribution
                if let Err(e) = protection.validate_power_distribution().await {
                    error!("❌ Power distribution validation failed: {}", e);
                }
            }
        });
    }

    /// Get consensus security statistics
    pub async fn get_security_stats(&self) -> Result<ConsensusSecurityStats, Box<dyn std::error::Error + Send + Sync>> {
        let validators = self.validators.read().await;
        let proposals = self.governance_proposals.read().await;

        let total_validators = validators.len();
        let active_validators = validators.values().filter(|v| v.is_active).count();
        let total_stake: u64 = validators.values().map(|v| v.stake).sum();
        let total_violations: usize = validators.values().map(|v| v.violations.len()).sum();
        let active_proposals = proposals.values().filter(|p| p.status == ProposalStatus::Active).count();

        Ok(ConsensusSecurityStats {
            total_validators,
            active_validators,
            total_stake,
            total_violations,
            active_proposals,
            max_validator_power: self.config.max_validator_power,
            governance_threshold: self.config.governance_threshold,
        })
    }
}

/// Consensus security statistics
#[derive(Debug, Serialize, Deserialize)]
pub struct ConsensusSecurityStats {
    pub total_validators: usize,
    pub active_validators: usize,
    pub total_stake: u64,
    pub total_violations: usize,
    pub active_proposals: usize,
    pub max_validator_power: f64,
    pub governance_threshold: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_consensus_security_config_default() {
        let config = ConsensusSecurityConfig::default();
        assert_eq!(config.max_validator_power, 0.10);
        assert_eq!(config.min_validator_stake, 1_000_000);
    }

    #[test]
    fn test_validator_score_calculation() {
        let validator = ValidatorInfo {
            address: "test".to_string(),
            stake: 1_000_000,
            power: 0.05,
            reputation_score: 0.8,
            is_active: true,
            last_rotation: Utc::now(),
            violations: vec![],
            total_rewards: 100_000,
            total_penalties: 0,
            validator_type: ValidatorType::Economic,
        };

        let protection = ConsensusProtection::new(
            // Mock database pool
            sqlx::PgPool::connect("postgresql://test").await.unwrap(),
            ConsensusSecurityConfig::default(),
        ).await.unwrap();

        let score = protection.calculate_validator_score(&validator);
        assert!(score > 0.0);
    }
}
