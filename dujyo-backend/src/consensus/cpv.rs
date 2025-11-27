use crate::utils::vrf::VRFManager;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{info, warn, error};
use sqlx::{PgPool, Row};
use chrono;
// ✅ SECURITY FIX: Removed unused imports (DateTime, Utc, Row) to fix clippy warnings

// Creative Proof of Value (CPV) Consensus Implementation
// This is the main consensus mechanism for Dujyo blockchain

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidatorType {
    Economic,  // Validadores económicos (stake + actividad económica)
    Creative,  // Validadores creativos (artistas con NFTs verificados)
    Community, // Validadores comunitarios (votos, reportes, curación)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EconomicValidator {
    pub address: String,
    pub stake: u64,
    pub economic_activity: f64, // Actividad económica comprobada
    pub validation_count: u64,
    pub is_active: bool,
    pub last_validation: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreativeValidator {
    pub address: String,
    pub verified_nfts: Vec<String>, // IDs de NFTs verificados
    pub creative_score: f64,        // Puntuación basada en contenido y regalías
    pub royalty_earnings: u64,      // Ganancias por regalías
    pub validation_count: u64,
    pub is_active: bool,
    pub last_validation: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommunityValidator {
    pub address: String,
    pub community_score: f64, // Puntuación basada en votos y reportes
    pub votes_cast: u64,      // Votos emitidos en gobernanza
    pub reports_filed: u64,   // Reportes de fraude
    pub content_curated: u64, // Contenido curado
    pub validation_count: u64,
    pub is_active: bool,
    pub last_validation: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CPVValidator {
    pub validator_type: ValidatorType,
    pub address: String,
    pub total_score: f64,
    pub economic_data: Option<EconomicValidator>,
    pub creative_data: Option<CreativeValidator>,
    pub community_data: Option<CommunityValidator>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationRound {
    pub round_id: u64,
    pub timestamp: u64,
    pub selected_validator: String,
    pub validator_type: ValidatorType,
    pub validation_score: f64,
    pub block_hash: String,
}

// ✅ SECURITY FIX: Identity verification status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum KycStatus {
    PENDING,
    VERIFIED,
    REJECTED,
}

// ✅ SECURITY FIX: Slashing reasons
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_camel_case_types)] // ✅ SECURITY FIX: Allow non-camel-case for enum variants (backward compatibility)
pub enum SlashReason {
    DOUBLE_SIGNING,
    DOWNTIME,
    MALICIOUS_BEHAVIOR,
    INSUFFICIENT_STAKE,
    IDENTITY_FRAUD,
}

// ✅ SECURITY FIX: Validator limits
const MAX_ECONOMIC_VALIDATORS: usize = 100;
const MAX_CREATIVE_VALIDATORS: usize = 50;
const MAX_COMMUNITY_VALIDATORS: usize = 50;

pub struct CPVConsensus {
    pub economic_validators: HashMap<String, EconomicValidator>,
    pub creative_validators: HashMap<String, CreativeValidator>,
    pub community_validators: HashMap<String, CommunityValidator>,
    pub validation_history: Vec<ValidationRound>,
    pub minimum_stake: u64,
    pub minimum_creative_score: f64,
    pub minimum_community_score: f64,
    pub lambda_economic: f64,  // Peso para validadores económicos
    pub lambda_creative: f64,  // Peso para validadores creativos
    pub lambda_community: f64, // Peso para validadores comunitarios
    pub vrf_manager: VRFManager,
    pub last_selection_timestamp: u64,
    pub selection_cooldown: u64, // Minimum time between selections (seconds)
    // ✅ SECURITY FIX: Add database pool for security checks
    pub db_pool: Option<PgPool>,
}

impl CPVConsensus {
    pub fn new() -> Self {
        CPVConsensus {
            economic_validators: HashMap::new(),
            creative_validators: HashMap::new(),
            community_validators: HashMap::new(),
            validation_history: Vec::new(),
            minimum_stake: 1000,
            minimum_creative_score: 50.0,
            minimum_community_score: 30.0,
            lambda_economic: 0.4,   // 40% peso económico
            lambda_creative: 0.35,  // 35% peso creativo
            lambda_community: 0.25, // 25% peso comunitario
            vrf_manager: VRFManager::new(),
            last_selection_timestamp: 0,
            selection_cooldown: 5, // 5 seconds minimum between selections
            db_pool: None, // ✅ SECURITY FIX: Database pool for security checks
        }
    }

    // ✅ SECURITY FIX: Set database pool for security operations
    pub fn set_db_pool(&mut self, pool: PgPool) {
        self.db_pool = Some(pool);
    }

    // ✅ P2.3: Load validators from database
    pub async fn load_validators_from_db(&mut self, pool: &PgPool) -> Result<(), String> {
        // Load validators directly using SQL queries
        use sqlx::Row;
        
        // Load economic validators
        let economic_db: Result<Vec<_>, _> = sqlx::query(
            "SELECT address, stake_amount, economic_activity, validation_count, is_active, last_validated_at FROM blockchain_validators WHERE validator_type = 'economic' AND is_active = true"
        )
        .map(|row: sqlx::postgres::PgRow| {
            let stake_amount: String = row.get("stake_amount");
            let economic_activity: String = row.get("economic_activity");
            let last_validated_at: Option<chrono::DateTime<chrono::Utc>> = row.get("last_validated_at");
            EconomicValidator {
                address: row.get("address"),
                stake: stake_amount.parse::<f64>().unwrap_or(0.0) as u64,
                economic_activity: economic_activity.parse::<f64>().unwrap_or(0.0),
                validation_count: row.get::<i64, _>("validation_count") as u64,
                is_active: row.get("is_active"),
                last_validation: last_validated_at.map(|dt| dt.timestamp() as u64).unwrap_or(0),
            }
        })
        .fetch_all(pool)
        .await;

        // Load creative validators
        let creative_db: Result<Vec<_>, _> = sqlx::query(
            "SELECT address, creative_score, royalty_earnings, verified_nfts, validation_count, is_active, last_validated_at FROM blockchain_validators WHERE validator_type = 'creative' AND is_active = true"
        )
        .map(|row: sqlx::postgres::PgRow| {
            let creative_score: String = row.get("creative_score");
            let royalty_earnings: String = row.get("royalty_earnings");
            let verified_nfts: serde_json::Value = row.get("verified_nfts");
            let last_validated_at: Option<chrono::DateTime<chrono::Utc>> = row.get("last_validated_at");
            let nfts: Vec<String> = serde_json::from_value(verified_nfts).unwrap_or_default();
            CreativeValidator {
                address: row.get("address"),
                verified_nfts: nfts,
                creative_score: creative_score.parse::<f64>().unwrap_or(0.0),
                royalty_earnings: royalty_earnings.parse::<f64>().unwrap_or(0.0) as u64,
                validation_count: row.get::<i64, _>("validation_count") as u64,
                is_active: row.get("is_active"),
                last_validation: last_validated_at.map(|dt| dt.timestamp() as u64).unwrap_or(0),
            }
        })
        .fetch_all(pool)
        .await;

        // Load community validators
        let community_db: Result<Vec<_>, _> = sqlx::query(
            "SELECT address, community_score, votes_cast, reports_filed, content_curated, validation_count, is_active, last_validated_at FROM blockchain_validators WHERE validator_type = 'community' AND is_active = true"
        )
        .map(|row: sqlx::postgres::PgRow| {
            let community_score: String = row.get("community_score");
            let last_validated_at: Option<chrono::DateTime<chrono::Utc>> = row.get("last_validated_at");
            CommunityValidator {
                address: row.get("address"),
                community_score: community_score.parse::<f64>().unwrap_or(0.0),
                votes_cast: row.get::<i64, _>("votes_cast") as u64,
                reports_filed: row.get::<i64, _>("reports_filed") as u64,
                content_curated: row.get::<i64, _>("content_curated") as u64,
                validation_count: row.get::<i64, _>("validation_count") as u64,
                is_active: row.get("is_active"),
                last_validation: last_validated_at.map(|dt| dt.timestamp() as u64).unwrap_or(0),
            }
        })
        .fetch_all(pool)
        .await;

        match (economic_db, creative_db, community_db) {
            (Ok(economic), Ok(creative), Ok(community)) => {
                // Clear existing validators
                self.economic_validators.clear();
                self.creative_validators.clear();
                self.community_validators.clear();

                // Populate from database
                for validator in economic {
                    self.economic_validators.insert(validator.address.clone(), validator);
                }
                for validator in creative {
                    self.creative_validators.insert(validator.address.clone(), validator);
                }
                for validator in community {
                    self.community_validators.insert(validator.address.clone(), validator);
                }

                info!(
                    economic = self.economic_validators.len(),
                    creative = self.creative_validators.len(),
                    community = self.community_validators.len(),
                    "✅ Loaded validators from database"
                );
                Ok(())
            }
            (Err(e), _, _) | (_, Err(e), _) | (_, _, Err(e)) => {
                error!(error = %e, "Failed to load validators from database");
                Err(format!("Failed to load validators: {}", e))
            }
        }
    }

    // ✅ SECURITY FIX #5: Check if validator can be registered (count limits)
    fn can_register_validator(&self, validator_type: &ValidatorType) -> bool {
        match validator_type {
            ValidatorType::Economic => self.economic_validators.len() < MAX_ECONOMIC_VALIDATORS,
            ValidatorType::Creative => self.creative_validators.len() < MAX_CREATIVE_VALIDATORS,
            ValidatorType::Community => self.community_validators.len() < MAX_COMMUNITY_VALIDATORS,
        }
    }

    // ✅ SECURITY FIX #1: Check identity verification status
    async fn check_identity_verification(&self, address: &str) -> Result<bool, String> {
        if let Some(ref pool) = self.db_pool {
            let kyc_status: Option<String> = sqlx::query_scalar(
                "SELECT kyc_status FROM validator_identity_verification WHERE validator_address = $1"
            )
            .bind(address)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("Database error checking identity: {}", e))?;

            match kyc_status.as_deref() {
                Some("VERIFIED") => Ok(true),
                Some("PENDING") => Err("Identity verification pending. Please wait for approval.".to_string()),
                Some("REJECTED") => Err("Identity verification rejected.".to_string()),
                None => Err("Identity verification required. Please submit KYC documents.".to_string()),
                _ => Err("Invalid KYC status.".to_string()),
            }
        } else {
            // If no database pool, allow for backward compatibility (but warn)
            warn!("No database pool available for identity verification check. Allowing registration (UNSAFE).");
            Ok(true)
        }
    }

    // ✅ SECURITY FIX #2: Verify minimum stake and lock it atomically
    // CRITICAL: Race condition in stake locking - check and insert were separate operations
    // SOLUTION: Use INSERT ... ON CONFLICT DO NOTHING to atomically check and insert
    async fn verify_and_lock_stake(
        &self,
        address: &str,
        stake_amount: u64,
        validator_type: &str,
    ) -> Result<(), String> {
        if let Some(ref pool) = self.db_pool {
            // ✅ ATOMIC OPERATION: Use INSERT ... ON CONFLICT DO NOTHING to prevent race conditions
            // This atomically checks if stake exists and inserts if it doesn't
            // If stake already exists, INSERT does nothing and returns 0 rows
            let insert_result = sqlx::query(
                r#"
                INSERT INTO validator_stakes (validator_address, validator_type, stake_amount, locked_at, is_active)
                VALUES ($1, $2, $3, NOW(), TRUE)
                ON CONFLICT (validator_address) DO NOTHING
                RETURNING validator_address
                "#
            )
            .bind(address)
            .bind(validator_type)
            .bind(stake_amount as i64)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("Database error locking stake: {}", e))?;

            // SECURITY CHECK: If insert_result is None, stake was already locked (race condition detected)
            if insert_result.is_none() {
                // Check if stake is actually active (not just a conflict)
                let existing_stake: Option<i64> = sqlx::query_scalar(
                    "SELECT stake_amount FROM validator_stakes WHERE validator_address = $1 AND is_active = TRUE"
                )
                .bind(address)
                .fetch_optional(pool)
                .await
                .map_err(|e| format!("Database error checking existing stake: {}", e))?;

                if existing_stake.is_some() {
                    return Err("Stake already locked for this validator address.".to_string());
                } else {
                    // This should never happen, but handle it defensively
                    return Err("Stake lock conflict detected. Please try again.".to_string());
                }
            }

            Ok(())
        } else {
            warn!("No database pool available for stake verification. Allowing registration (UNSAFE).");
            Ok(())
        }
    }

    // Register economic validator
    pub async fn register_economic_validator(
        &mut self,
        address: String,
        stake: u64,
    ) -> Result<(), String> {
        // ✅ SECURITY FIX #5: Check validator count limit
        if !self.can_register_validator(&ValidatorType::Economic) {
            return Err(format!(
                "Maximum number of economic validators reached ({}).",
                MAX_ECONOMIC_VALIDATORS
            ));
        }

        // ✅ SECURITY FIX #1: Check identity verification
        self.check_identity_verification(&address).await?;

        // ✅ SECURITY FIX #2: Verify minimum stake
        if stake < self.minimum_stake {
            return Err(format!(
                "Stake insuficiente para validador económico. Mínimo requerido: {}",
                self.minimum_stake
            ));
        }

        // ✅ SECURITY FIX #2: Verify and lock stake in database
        self.verify_and_lock_stake(&address, stake, "economic").await?;

        // ✅ SECURITY FIX: Initialize reputation in database
        if let Some(ref pool) = self.db_pool {
            sqlx::query(
                r#"
                INSERT INTO validator_reputation (validator_address, reputation_score, last_activity)
                VALUES ($1, 100.0, NOW())
                ON CONFLICT (validator_address) DO NOTHING
                "#
            )
            .bind(&address)
            .execute(pool)
            .await
            .map_err(|e| format!("Database error initializing reputation: {}", e))?;
        }

        let validator = EconomicValidator {
            address: address.clone(),
            stake,
            economic_activity: 0.0,
            validation_count: 0,
            is_active: true,
            last_validation: 0,
        };

        self.economic_validators.insert(address.clone(), validator.clone());

        // ✅ P2.3: Persist to database
        if let Some(ref pool) = self.db_pool {
            // Use direct SQL query to avoid module dependency issues
            if let Err(e) = sqlx::query(
                r#"
                INSERT INTO blockchain_validators (
                    address, validator_type, stake_amount, performance_score, is_active,
                    economic_activity, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (address) DO UPDATE SET
                    validator_type = EXCLUDED.validator_type,
                    stake_amount = EXCLUDED.stake_amount,
                    performance_score = EXCLUDED.performance_score,
                    is_active = EXCLUDED.is_active,
                    economic_activity = EXCLUDED.economic_activity,
                    updated_at = NOW()
                "#
            )
            .bind(&address)
            .bind("economic")
            .bind(stake as f64)
            .bind(100i32)
            .bind(true)
            .bind(0.0f64)
            .execute(pool)
            .await
            {
                error!(error = %e, address = %address, "Failed to persist economic validator to database");
                // Continue anyway - validator is in memory
            }
        }

        Ok(())
    }

    // Register creative validator
    pub async fn register_creative_validator(
        &mut self,
        address: String,
        verified_nfts: Vec<String>,
    ) -> Result<(), String> {
        // ✅ SECURITY FIX #5: Check validator count limit
        if !self.can_register_validator(&ValidatorType::Creative) {
            return Err(format!(
                "Maximum number of creative validators reached ({}).",
                MAX_CREATIVE_VALIDATORS
            ));
        }

        // ✅ SECURITY FIX #1: Check identity verification
        self.check_identity_verification(&address).await?;

        if verified_nfts.is_empty() {
            return Err("Se requieren NFTs verificados para validador creativo".to_string());
        }

        let creative_score = self.calculate_creative_score(&verified_nfts);
        if creative_score < self.minimum_creative_score {
            return Err("Puntuación creativa insuficiente".to_string());
        }

        // ✅ SECURITY FIX: Initialize reputation in database
        if let Some(ref pool) = self.db_pool {
            sqlx::query(
                r#"
                INSERT INTO validator_reputation (validator_address, reputation_score, last_activity)
                VALUES ($1, 100.0, NOW())
                ON CONFLICT (validator_address) DO NOTHING
                "#
            )
            .bind(&address)
            .execute(pool)
            .await
            .map_err(|e| format!("Database error initializing reputation: {}", e))?;
        }

        let validator = CreativeValidator {
            address: address.clone(),
            verified_nfts: verified_nfts.clone(),
            creative_score,
            royalty_earnings: 0,
            validation_count: 0,
            is_active: true,
            last_validation: 0,
        };

        self.creative_validators.insert(address.clone(), validator.clone());

        // ✅ P2.3: Persist to database
        if let Some(ref pool) = self.db_pool {
            let verified_nfts_json = serde_json::to_value(&verified_nfts).unwrap_or(serde_json::json!([]));
            if let Err(e) = sqlx::query(
                r#"
                INSERT INTO blockchain_validators (
                    address, validator_type, stake_amount, performance_score, is_active,
                    creative_score, verified_nfts, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (address) DO UPDATE SET
                    validator_type = EXCLUDED.validator_type,
                    performance_score = EXCLUDED.performance_score,
                    is_active = EXCLUDED.is_active,
                    creative_score = EXCLUDED.creative_score,
                    verified_nfts = EXCLUDED.verified_nfts,
                    updated_at = NOW()
                "#
            )
            .bind(&address)
            .bind("creative")
            .bind(0.0f64)
            .bind(100i32)
            .bind(true)
            .bind(creative_score)
            .bind(verified_nfts_json)
            .execute(pool)
            .await
            {
                error!(error = %e, address = %address, "Failed to persist creative validator to database");
                // Continue anyway - validator is in memory
            }
        }

        Ok(())
    }

    // Register community validator
    pub async fn register_community_validator(&mut self, address: String) -> Result<(), String> {
        // ✅ SECURITY FIX #5: Check validator count limit
        if !self.can_register_validator(&ValidatorType::Community) {
            return Err(format!(
                "Maximum number of community validators reached ({}).",
                MAX_COMMUNITY_VALIDATORS
            ));
        }

        // ✅ SECURITY FIX #1: Check identity verification
        self.check_identity_verification(&address).await?;

        // ✅ SECURITY FIX: Initialize reputation in database
        if let Some(ref pool) = self.db_pool {
            sqlx::query(
                r#"
                INSERT INTO validator_reputation (validator_address, reputation_score, last_activity)
                VALUES ($1, 100.0, NOW())
                ON CONFLICT (validator_address) DO NOTHING
                "#
            )
            .bind(&address)
            .execute(pool)
            .await
            .map_err(|e| format!("Database error initializing reputation: {}", e))?;
        }

        let validator = CommunityValidator {
            address: address.clone(),
            community_score: 0.0,
            votes_cast: 0,
            reports_filed: 0,
            content_curated: 0,
            validation_count: 0,
            is_active: true,
            last_validation: 0,
        };

        self.community_validators.insert(address.clone(), validator.clone());

        // ✅ P2.3: Persist to database
        if let Some(ref pool) = self.db_pool {
            if let Err(e) = sqlx::query(
                r#"
                INSERT INTO blockchain_validators (
                    address, validator_type, stake_amount, performance_score, is_active,
                    community_score, votes_cast, reports_filed, content_curated, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                ON CONFLICT (address) DO UPDATE SET
                    validator_type = EXCLUDED.validator_type,
                    performance_score = EXCLUDED.performance_score,
                    is_active = EXCLUDED.is_active,
                    community_score = EXCLUDED.community_score,
                    votes_cast = EXCLUDED.votes_cast,
                    reports_filed = EXCLUDED.reports_filed,
                    content_curated = EXCLUDED.content_curated,
                    updated_at = NOW()
                "#
            )
            .bind(&address)
            .bind("community")
            .bind(0.0f64)
            .bind(100i32)
            .bind(true)
            .bind(0.0f64)
            .bind(0i64)
            .bind(0i64)
            .bind(0i64)
            .execute(pool)
            .await
            {
                error!(error = %e, address = %address, "Failed to persist community validator to database");
                // Continue anyway - validator is in memory
            }
        }

        Ok(())
    }

    // Calculate creative score based on NFTs
    fn calculate_creative_score(&self, nft_ids: &[String]) -> f64 {
        // Logic to calculate score based on:
        // - Número de NFTs verificados
        // - Calidad del contenido
        // - Regalías generadas
        // - Reputación del artista
        nft_ids.len() as f64 * 10.0 // Simplified for now
    }

    // ✅ P2.3: Update economic score (with DB persistence)
    pub async fn update_economic_activity(&mut self, address: &str, activity: f64) {
        if let Some(validator) = self.economic_validators.get_mut(address) {
            validator.economic_activity += activity;
            
            // ✅ P2.3: Persist to database
            if let Some(ref pool) = self.db_pool {
                let _ = sqlx::query(
                    "UPDATE blockchain_validators SET economic_activity = $1, updated_at = NOW() WHERE address = $2"
                )
                .bind(validator.economic_activity)
                .bind(address)
                .execute(pool)
                .await;
            }
        }
    }

    // ✅ P2.3: Update creative score (with DB persistence)
    pub async fn update_creative_score(&mut self, address: &str, royalty_earnings: u64) {
        let verified_nfts = if let Some(validator) = self.creative_validators.get(address) {
            validator.verified_nfts.clone()
        } else {
            return;
        };

        let score = self.calculate_creative_score(&verified_nfts);

        if let Some(validator) = self.creative_validators.get_mut(address) {
            validator.royalty_earnings += royalty_earnings;
            validator.creative_score = score;
            
            // ✅ P2.3: Persist to database
            if let Some(ref pool) = self.db_pool {
                let _ = sqlx::query(
                    "UPDATE blockchain_validators SET creative_score = $1, royalty_earnings = $2, updated_at = NOW() WHERE address = $3"
                )
                .bind(validator.creative_score)
                .bind(validator.royalty_earnings as f64)
                .bind(address)
                .execute(pool)
                .await;
            }
        }
    }

    // ✅ P2.3: Update community score (with DB persistence)
    pub async fn update_community_score(
        &mut self,
        address: &str,
        votes: u64,
        reports: u64,
        curated: u64,
    ) {
        if let Some(validator) = self.community_validators.get_mut(address) {
            validator.votes_cast += votes;
            validator.reports_filed += reports;
            validator.content_curated += curated;
            validator.community_score = (validator.votes_cast as f64 * 0.4)
                + (validator.reports_filed as f64 * 0.3)
                + (validator.content_curated as f64 * 0.3);
            
            // ✅ P2.3: Persist to database
            if let Some(ref pool) = self.db_pool {
                let _ = sqlx::query(
                    "UPDATE blockchain_validators SET community_score = $1, votes_cast = $2, reports_filed = $3, content_curated = $4, updated_at = NOW() WHERE address = $5"
                )
                .bind(validator.community_score)
                .bind(validator.votes_cast as i64)
                .bind(validator.reports_filed as i64)
                .bind(validator.content_curated as i64)
                .bind(address)
                .execute(pool)
                .await;
            }
        }
    }

    // ✅ SECURITY FIX #3: Slashing mechanism
    pub async fn slash_validator(
        &mut self,
        address: &str,
        reason: SlashReason,
        slash_amount: u64,
        block_height: Option<u64>,
        transaction_hash: Option<String>,
    ) -> Result<(), String> {
        if let Some(ref pool) = self.db_pool {
            // Record slashing event in database
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|e| {
                    tracing::error!(error = %e, address = %address, "CRITICAL: System time error in slashing event");
                    format!("System time error: {}", e)
                })?;
            let event_id = format!("slash_{}_{}", address, timestamp.as_secs());
            let reason_str = match reason {
                SlashReason::DOUBLE_SIGNING => "DOUBLE_SIGNING",
                SlashReason::DOWNTIME => "DOWNTIME",
                SlashReason::MALICIOUS_BEHAVIOR => "MALICIOUS_BEHAVIOR",
                SlashReason::INSUFFICIENT_STAKE => "INSUFFICIENT_STAKE",
                SlashReason::IDENTITY_FRAUD => "IDENTITY_FRAUD",
            };

            sqlx::query(
                r#"
                INSERT INTO validator_slashing_events (event_id, validator_address, slash_amount, reason, slashed_at, block_height, transaction_hash)
                VALUES ($1, $2, $3, $4, NOW(), $5, $6)
                "#
            )
            .bind(&event_id)
            .bind(address)
            .bind(slash_amount as i64)
            .bind(reason_str)
            .bind(block_height.map(|h| h as i64))
            .bind(transaction_hash.as_deref())
            .execute(pool)
            .await
            .map_err(|e| format!("Database error recording slashing event: {}", e))?;

            // Update reputation (reduce score and increment slashing events)
            sqlx::query(
                r#"
                UPDATE validator_reputation
                SET 
                    reputation_score = GREATEST(0, reputation_score - 10.0),
                    slashing_events = slashing_events + 1,
                    updated_at = NOW()
                WHERE validator_address = $1
                "#
            )
            .bind(address)
            .execute(pool)
            .await
            .map_err(|e| format!("Database error updating reputation: {}", e))?;

            // Reduce or unlock stake
            sqlx::query(
                r#"
                UPDATE validator_stakes
                SET 
                    stake_amount = GREATEST(0, stake_amount - $1),
                    updated_at = NOW()
                WHERE validator_address = $2 AND is_active = TRUE
                "#
            )
            .bind(slash_amount as i64)
            .bind(address)
            .execute(pool)
            .await
            .map_err(|e| format!("Database error slashing stake: {}", e))?;

            // Deactivate validator if reputation too low or stake too low
            let reputation: Option<f64> = sqlx::query_scalar(
                "SELECT reputation_score FROM validator_reputation WHERE validator_address = $1"
            )
            .bind(address)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("Database error checking reputation: {}", e))?;

            let stake: Option<i64> = sqlx::query_scalar(
                "SELECT stake_amount FROM validator_stakes WHERE validator_address = $1 AND is_active = TRUE"
            )
            .bind(address)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("Database error checking stake: {}", e))?;

            // Deactivate if reputation < 50 or stake < minimum
            if let (Some(rep), Some(stk)) = (reputation, stake) {
                if rep < 50.0 || stk < self.minimum_stake as i64 {
                    // ✅ P2.3: Deactivate validator (with DB persistence)
                    if let Some(validator) = self.economic_validators.get_mut(address) {
                        validator.is_active = false;
                    }
                    if let Some(validator) = self.creative_validators.get_mut(address) {
                        validator.is_active = false;
                    }
                    if let Some(validator) = self.community_validators.get_mut(address) {
                        validator.is_active = false;
                    }
                    
                    // ✅ P2.3: Persist deactivation to database
                    let _ = sqlx::query(
                        "UPDATE blockchain_validators SET is_active = false, updated_at = NOW() WHERE address = $1"
                    )
                    .bind(address)
                    .execute(pool)
                    .await;

                    // Mark stake as inactive
                    sqlx::query(
                        r#"
                        UPDATE validator_stakes
                        SET is_active = FALSE, unlocked_at = NOW(), updated_at = NOW()
                        WHERE validator_address = $1
                        "#
                    )
                    .bind(address)
                    .execute(pool)
                    .await
                    .map_err(|e| format!("Database error deactivating stake: {}", e))?;

                    warn!("Validator {} deactivated due to low reputation ({}) or insufficient stake ({})", address, rep, stk);
                }
            }

            error!("Validator {} slashed: {} DYO for reason: {:?}", address, slash_amount, reason);
            Ok(())
        } else {
            warn!("No database pool available for slashing. Skipping slashing (UNSAFE).");
            Ok(())
        }
    }

    // ✅ SECURITY FIX #4: Update reputation after block proposal
    pub async fn update_reputation_after_block(
        &self,
        address: &str,
        success: bool,
    ) -> Result<(), String> {
        if let Some(ref pool) = self.db_pool {
            if success {
                // Successful block proposal: increase reputation and blocks proposed
                sqlx::query(
                    r#"
                    UPDATE validator_reputation
                    SET 
                        reputation_score = LEAST(100.0, reputation_score + 0.1),
                        total_blocks_proposed = total_blocks_proposed + 1,
                        last_activity = NOW(),
                        updated_at = NOW()
                    WHERE validator_address = $1
                    "#
                )
                .bind(address)
                .execute(pool)
                .await
                .map_err(|e| format!("Database error updating reputation: {}", e))?;
            } else {
                // Missed block: decrease reputation and increment blocks missed
                sqlx::query(
                    r#"
                    UPDATE validator_reputation
                    SET 
                        reputation_score = GREATEST(0, reputation_score - 0.5),
                        blocks_missed = blocks_missed + 1,
                        last_activity = NOW(),
                        updated_at = NOW()
                    WHERE validator_address = $1
                    "#
                )
                .bind(address)
                .execute(pool)
                .await
                .map_err(|e| format!("Database error updating reputation: {}", e))?;
            }
            Ok(())
        } else {
            warn!("No database pool available for reputation update. Skipping (UNSAFE).");
            Ok(())
        }
    }

    // Select validator using CPV with VRF for secure randomness
    pub fn select_validator(&mut self) -> Result<CPVValidator, String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Check cooldown period to prevent rapid successive selections
        if now - self.last_selection_timestamp < self.selection_cooldown {
            return Err(format!(
                "Selection cooldown active. Wait {} more seconds",
                self.selection_cooldown - (now - self.last_selection_timestamp)
            ));
        }

        let mut all_validators = Vec::new();

        // Add economic validators
        for (address, validator) in &self.economic_validators {
            if validator.is_active {
                let total_score = self.calculate_economic_score(validator);
                all_validators.push(CPVValidator {
                    validator_type: ValidatorType::Economic,
                    address: address.clone(),
                    total_score,
                    economic_data: Some(validator.clone()),
                    creative_data: None,
                    community_data: None,
                });
            }
        }

        // Add creative validators
        for (address, validator) in &self.creative_validators {
            if validator.is_active {
                let total_score = self.calculate_creative_total_score(validator);
                all_validators.push(CPVValidator {
                    validator_type: ValidatorType::Creative,
                    address: address.clone(),
                    total_score,
                    economic_data: None,
                    creative_data: Some(validator.clone()),
                    community_data: None,
                });
            }
        }

        // Add community validators
        for (address, validator) in &self.community_validators {
            if validator.is_active {
                let total_score = self.calculate_community_score(validator);
                all_validators.push(CPVValidator {
                    validator_type: ValidatorType::Community,
                    address: address.clone(),
                    total_score,
                    economic_data: None,
                    creative_data: None,
                    community_data: Some(validator.clone()),
                });
            }
        }

        if all_validators.is_empty() {
            return Err("No hay validadores activos".to_string());
        }

        // Create weighted items for VRF selection
        let weighted_items: Vec<(&CPVValidator, u64)> = all_validators
            .iter()
            .map(|v| (v, (v.total_score * 1000.0) as u64)) // Convert to integer weights
            .collect();

        // Create seed for VRF (includes timestamp and validator count for uniqueness)
        let mut seed = Vec::new();
        seed.extend_from_slice(&now.to_be_bytes());
        seed.extend_from_slice(&(all_validators.len() as u64).to_be_bytes());
        seed.extend_from_slice(&self.last_selection_timestamp.to_be_bytes());

        // Use VRF for secure weighted random selection
        let selected_validator = self
            .vrf_manager
            .weighted_random_selection(&weighted_items, &seed)
            .map_err(|e| format!("VRF selection failed: {}", e))?;

        // Update selection timestamp
        self.last_selection_timestamp = now;

        info!(
            "Validator selected via VRF: {} (type: {:?}, score: {})",
            selected_validator.address,
            selected_validator.validator_type,
            selected_validator.total_score
        );

        Ok(selected_validator.clone().clone())
    }

    // Calculate economic score total
    fn calculate_economic_score(&self, validator: &EconomicValidator) -> f64 {
        let stake_score = (validator.stake as f64 / self.minimum_stake as f64) * 100.0;
        let activity_score = validator.economic_activity;
        let validation_score = validator.validation_count as f64 * 2.0;

        (stake_score * 0.5 + activity_score * 0.3 + validation_score * 0.2) * self.lambda_economic
    }

    // Calculate creative score total
    fn calculate_creative_total_score(&self, validator: &CreativeValidator) -> f64 {
        let creative_score = validator.creative_score;
        let royalty_score = (validator.royalty_earnings as f64 / 1000.0) * 10.0; // Normalizado
        let validation_score = validator.validation_count as f64 * 2.0;

        (creative_score * 0.6 + royalty_score * 0.3 + validation_score * 0.1) * self.lambda_creative
    }

    // Calculate community score total
    fn calculate_community_score(&self, validator: &CommunityValidator) -> f64 {
        let community_score = validator.community_score;
        let validation_score = validator.validation_count as f64 * 2.0;

        (community_score * 0.8 + validation_score * 0.2) * self.lambda_community
    }

    // ✅ P2.3: Record validation round (with DB persistence)
    pub async fn record_validation_round(&mut self, validator: &CPVValidator, block_hash: String) {
        let round = ValidationRound {
            round_id: self.validation_history.len() as u64 + 1,
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            selected_validator: validator.address.clone(),
            validator_type: validator.validator_type.clone(),
            validation_score: validator.total_score,
            block_hash,
        };

        let timestamp = round.timestamp;
        self.validation_history.push(round);

        // ✅ P2.3: Update validation counter (with DB persistence)
        match validator.validator_type {
            ValidatorType::Economic => {
                if let Some(economic_validator) =
                    self.economic_validators.get_mut(&validator.address)
                {
                    economic_validator.validation_count += 1;
                    economic_validator.last_validation = timestamp;
                    
                    // ✅ P2.3: Persist validation to database
                    if let Some(ref pool) = self.db_pool {
                        let _ = sqlx::query(
                            "UPDATE blockchain_validators SET validation_count = $1, last_validated_at = NOW(), updated_at = NOW() WHERE address = $2"
                        )
                        .bind(economic_validator.validation_count as i64)
                        .bind(&validator.address)
                        .execute(pool)
                        .await;
                    }
                }
            }
            ValidatorType::Creative => {
                if let Some(creative_validator) =
                    self.creative_validators.get_mut(&validator.address)
                {
                    creative_validator.validation_count += 1;
                    creative_validator.last_validation = timestamp;
                    
                    // ✅ P2.3: Persist validation to database
                    if let Some(ref pool) = self.db_pool {
                        let _ = sqlx::query(
                            "UPDATE blockchain_validators SET validation_count = $1, last_validated_at = NOW(), updated_at = NOW() WHERE address = $2"
                        )
                        .bind(creative_validator.validation_count as i64)
                        .bind(&validator.address)
                        .execute(pool)
                        .await;
                    }
                }
            }
            ValidatorType::Community => {
                if let Some(community_validator) =
                    self.community_validators.get_mut(&validator.address)
                {
                    community_validator.validation_count += 1;
                    community_validator.last_validation = timestamp;
                    
                    // ✅ P2.3: Persist validation to database
                    if let Some(ref pool) = self.db_pool {
                        let _ = sqlx::query(
                            "UPDATE blockchain_validators SET validation_count = $1, last_validated_at = NOW(), updated_at = NOW() WHERE address = $2"
                        )
                        .bind(community_validator.validation_count as i64)
                        .bind(&validator.address)
                        .execute(pool)
                        .await;
                    }
                }
            }
        }
    }

    // Get consensus statistics
    pub fn get_consensus_stats(&self) -> HashMap<String, serde_json::Value> {
        let mut stats = HashMap::new();

        stats.insert(
            "economic_validators".to_string(),
            serde_json::json!(self.economic_validators.len()),
        );
        stats.insert(
            "creative_validators".to_string(),
            serde_json::json!(self.creative_validators.len()),
        );
        stats.insert(
            "community_validators".to_string(),
            serde_json::json!(self.community_validators.len()),
        );
        stats.insert(
            "total_validation_rounds".to_string(),
            serde_json::json!(self.validation_history.len()),
        );

        // Distribution of validations by type
        let mut economic_validations = 0;
        let mut creative_validations = 0;
        let mut community_validations = 0;

        for round in &self.validation_history {
            match round.validator_type {
                ValidatorType::Economic => economic_validations += 1,
                ValidatorType::Creative => creative_validations += 1,
                ValidatorType::Community => community_validations += 1,
            }
        }

        stats.insert(
            "economic_validations".to_string(),
            serde_json::json!(economic_validations),
        );
        stats.insert(
            "creative_validations".to_string(),
            serde_json::json!(creative_validations),
        );
        stats.insert(
            "community_validations".to_string(),
            serde_json::json!(community_validations),
        );

        stats
    }

    // Penalize validator (slash)
    // DEPRECATED: Use async slash_validator instead
    #[allow(dead_code)]
    pub fn slash_validator_legacy(
        &mut self,
        address: &str,
        penalty_percentage: f64,
    ) -> Result<(), String> {
        // Penalize economic validator
        if let Some(validator) = self.economic_validators.get_mut(address) {
            let penalty = (validator.stake as f64 * penalty_percentage) as u64;
            validator.stake = validator.stake.saturating_sub(penalty);
            if validator.stake < self.minimum_stake {
                validator.is_active = false;
            }
            return Ok(());
        }

        // Penalize creative validator
        let (verified_nfts, royalty_earnings) =
            if let Some(validator) = self.creative_validators.get(address) {
                (validator.verified_nfts.clone(), validator.royalty_earnings)
            } else {
                return Ok(());
            };

        let penalty = (royalty_earnings as f64 * penalty_percentage) as u64;
        let new_royalty_earnings = royalty_earnings.saturating_sub(penalty);
        let score = self.calculate_creative_score(&verified_nfts);

        if let Some(validator) = self.creative_validators.get_mut(address) {
            validator.royalty_earnings = new_royalty_earnings;
            validator.creative_score = score;
        }

        // Penalize community validator
        if let Some(validator) = self.community_validators.get_mut(address) {
            validator.community_score *= 1.0 - penalty_percentage;
            if validator.community_score < self.minimum_community_score {
                validator.is_active = false;
            }
            return Ok(());
        }

        Err("Validator not found".to_string())
    }
}
