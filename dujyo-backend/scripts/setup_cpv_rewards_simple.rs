use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct CPVRewardPool {
    pub pool_id: String,
    pub pool_name: String,
    pub validator_type: String,
    pub reward_rate: f64, // DYO per validation
    pub min_stake: u64,
    pub max_rewards_per_day: u64,
    pub description: String,
}

#[derive(Debug, Clone)]
pub struct CPVConfiguration {
    pub economic_validators: CPVRewardPool,
    pub creative_validators: CPVRewardPool,
    pub community_validators: CPVRewardPool,
    pub total_daily_rewards: u64,
}

impl CPVConfiguration {
    pub fn new() -> Self {
        let economic_validators = CPVRewardPool {
            pool_id: "ECONOMIC_POOL".to_string(),
            pool_name: "Economic Validators Pool".to_string(),
            validator_type: "Economic".to_string(),
            reward_rate: 10.0, // 10 DYO per validation
            min_stake: 1000, // Minimum 1000 DYO stake
            max_rewards_per_day: 10000, // Max 10K DYO per day
            description: "Rewards for validators who stake DYO tokens and validate economic transactions".to_string(),
        };
        
        let creative_validators = CPVRewardPool {
            pool_id: "CREATIVE_POOL".to_string(),
            pool_name: "Creative Validators Pool".to_string(),
            validator_type: "Creative".to_string(),
            reward_rate: 15.0, // 15 DYO per validation
            min_stake: 0, // No minimum stake for creative validators
            max_rewards_per_day: 15000, // Max 15K DYO per day
            description: "Rewards for artists and creators who validate content authenticity and NFTs".to_string(),
        };
        
        let community_validators = CPVRewardPool {
            pool_id: "COMMUNITY_POOL".to_string(),
            pool_name: "Community Validators Pool".to_string(),
            validator_type: "Community".to_string(),
            reward_rate: 5.0, // 5 DYO per validation
            min_stake: 0, // No minimum stake for community validators
            max_rewards_per_day: 5000, // Max 5K DYO per day
            description: "Rewards for community members who report fraud, curate content, and vote on proposals".to_string(),
        };
        
        let total_daily_rewards = economic_validators.max_rewards_per_day + 
                                 creative_validators.max_rewards_per_day + 
                                 community_validators.max_rewards_per_day;
        
        CPVConfiguration {
            economic_validators,
            creative_validators,
            community_validators,
            total_daily_rewards,
        }
    }
    
    pub fn display_configuration(&self) {
        println!("🎯 DUJYO CPV REWARDS CONFIGURATION");
        println!("═══════════════════════════════════════════════════════════════");
        println!("💰 Total Daily Rewards: {} DYO", self.total_daily_rewards);
        println!("═══════════════════════════════════════════════════════════════");
        
        println!("🏦 ECONOMIC VALIDATORS:");
        println!("   Pool ID: {}", self.economic_validators.pool_id);
        println!("   Reward Rate: {} DYO per validation", self.economic_validators.reward_rate);
        println!("   Min Stake: {} DYO", self.economic_validators.min_stake);
        println!("   Max Daily Rewards: {} DYO", self.economic_validators.max_rewards_per_day);
        println!("   Description: {}", self.economic_validators.description);
        println!();
        
        println!("🎨 CREATIVE VALIDATORS:");
        println!("   Pool ID: {}", self.creative_validators.pool_id);
        println!("   Reward Rate: {} DYO per validation", self.creative_validators.reward_rate);
        println!("   Min Stake: {} DYO", self.creative_validators.min_stake);
        println!("   Max Daily Rewards: {} DYO", self.creative_validators.max_rewards_per_day);
        println!("   Description: {}", self.creative_validators.description);
        println!();
        
        println!("👥 COMMUNITY VALIDATORS:");
        println!("   Pool ID: {}", self.community_validators.pool_id);
        println!("   Reward Rate: {} DYO per validation", self.community_validators.reward_rate);
        println!("   Min Stake: {} DYO", self.community_validators.min_stake);
        println!("   Max Daily Rewards: {} DYO", self.community_validators.max_rewards_per_day);
        println!("   Description: {}", self.community_validators.description);
        println!();
        
        println!("═══════════════════════════════════════════════════════════════");
    }
    
    pub fn generate_sql_commands(&self) -> Vec<String> {
        let mut commands = Vec::new();
        
        // Crear tabla para pools de recompensas
        commands.push(
            "CREATE TABLE IF NOT EXISTS cpv_reward_pools (
                pool_id VARCHAR(255) PRIMARY KEY,
                pool_name VARCHAR(255) NOT NULL,
                validator_type VARCHAR(50) NOT NULL,
                reward_rate DECIMAL(10,2) NOT NULL,
                min_stake BIGINT NOT NULL DEFAULT 0,
                max_rewards_per_day BIGINT NOT NULL,
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );".to_string()
        );
        
        // Crear tabla para validadores
        commands.push(
            "CREATE TABLE IF NOT EXISTS cpv_validators (
                address VARCHAR(255) PRIMARY KEY,
                validator_type VARCHAR(50) NOT NULL,
                stake_amount BIGINT NOT NULL DEFAULT 0,
                creative_score DECIMAL(10,2) NOT NULL DEFAULT 0,
                community_score DECIMAL(10,2) NOT NULL DEFAULT 0,
                total_validations INTEGER NOT NULL DEFAULT 0,
                last_validation TIMESTAMPTZ,
                registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );".to_string()
        );
        
        // Crear tabla para historial de validaciones
        commands.push(
            "CREATE TABLE IF NOT EXISTS cpv_validation_history (
                id SERIAL PRIMARY KEY,
                validator_address VARCHAR(255) NOT NULL,
                validator_type VARCHAR(50) NOT NULL,
                block_hash VARCHAR(255) NOT NULL,
                reward_amount DECIMAL(10,2) NOT NULL,
                validation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                FOREIGN KEY (validator_address) REFERENCES cpv_validators(address)
            );".to_string()
        );
        
        // Insertar pools de recompensas
        let pools = vec![
            &self.economic_validators,
            &self.creative_validators,
            &self.community_validators,
        ];
        
        for pool in pools {
            let sql = format!(
                "INSERT INTO cpv_reward_pools (pool_id, pool_name, validator_type, reward_rate, min_stake, max_rewards_per_day, description) 
                 VALUES ('{}', '{}', '{}', {}, {}, {}, '{}')
                 ON CONFLICT (pool_id) DO UPDATE SET 
                     pool_name = EXCLUDED.pool_name,
                     validator_type = EXCLUDED.validator_type,
                     reward_rate = EXCLUDED.reward_rate,
                     min_stake = EXCLUDED.min_stake,
                     max_rewards_per_day = EXCLUDED.max_rewards_per_day,
                     description = EXCLUDED.description,
                     updated_at = NOW();",
                pool.pool_id, pool.pool_name, pool.validator_type, 
                pool.reward_rate, pool.min_stake, pool.max_rewards_per_day, pool.description
            );
            commands.push(sql);
        }
        
        commands
    }
    
    pub fn generate_api_commands(&self) -> Vec<String> {
        let mut commands = Vec::new();
        
        // Comandos para registrar validadores de ejemplo
        let example_validators = vec![
            ("XW0000000000000000000000000000000000000003", "Economic", 50000),
            ("XW0000000000000000000000000000000000000004", "Creative", 0),
            ("XW0000000000000000000000000000000000000005", "Community", 0),
        ];
        
        for (address, validator_type, stake) in example_validators {
            let curl_command = format!(
                "curl -X POST http://localhost:8083/consensus/register/{} \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer YOUR_JWT_TOKEN_HERE\" \\
  -d '{{\"address\": \"{}\", \"stake\": {}}}'",
                validator_type.to_lowercase(), address, stake
            );
            commands.push(curl_command);
        }
        
        commands
    }
}

fn main() {
    println!("🚀 Dujyo CPV Rewards Setup");
    println!("═══════════════════════════════════════════════════════════════");
    
    let config = CPVConfiguration::new();
    config.display_configuration();
    
    // Generar comandos SQL
    println!("📝 SQL COMMANDS FOR DATABASE:");
    println!("═══════════════════════════════════════════════════════════════");
    let sql_commands = config.generate_sql_commands();
    for (i, cmd) in sql_commands.iter().enumerate() {
        println!("{}. {}", i + 1, cmd);
    }
    
    // Generar comandos API
    println!("\n🔧 API COMMANDS FOR VALIDATOR REGISTRATION:");
    println!("═══════════════════════════════════════════════════════════════");
    let api_commands = config.generate_api_commands();
    for (i, cmd) in api_commands.iter().enumerate() {
        println!("{}. {}", i + 1, cmd);
    }
    
    // Guardar configuración
    let config_data = format!(
        "DUJYO_CPV_CONFIG\n\
        Total Daily Rewards: {} DYO\n\
        \n\
        ECONOMIC VALIDATORS:\n\
        Pool ID: {}\n\
        Reward Rate: {} DYO per validation\n\
        Min Stake: {} DYO\n\
        Max Daily Rewards: {} DYO\n\
        \n\
        CREATIVE VALIDATORS:\n\
        Pool ID: {}\n\
        Reward Rate: {} DYO per validation\n\
        Min Stake: {} DYO\n\
        Max Daily Rewards: {} DYO\n\
        \n\
        COMMUNITY VALIDATORS:\n\
        Pool ID: {}\n\
        Reward Rate: {} DYO per validation\n\
        Min Stake: {} DYO\n\
        Max Daily Rewards: {} DYO\n",
        config.total_daily_rewards,
        config.economic_validators.pool_id,
        config.economic_validators.reward_rate,
        config.economic_validators.min_stake,
        config.economic_validators.max_rewards_per_day,
        config.creative_validators.pool_id,
        config.creative_validators.reward_rate,
        config.creative_validators.min_stake,
        config.creative_validators.max_rewards_per_day,
        config.community_validators.pool_id,
        config.community_validators.reward_rate,
        config.community_validators.min_stake,
        config.community_validators.max_rewards_per_day
    );
    
    std::fs::write("dujyo_cpv_config.txt", config_data)
        .expect("Failed to write config file");
    
    // Guardar comandos SQL
    let sql_content = sql_commands.join("\n\n");
    std::fs::write("dujyo_cpv_setup.sql", sql_content)
        .expect("Failed to write SQL file");
    
    // Guardar comandos API
    let api_content = api_commands.join("\n\n");
    std::fs::write("dujyo_cpv_api_commands.sh", api_content)
        .expect("Failed to write shell script");
    
    println!("\n💾 Configuration saved to: dujyo_cpv_config.txt");
    println!("🔧 SQL commands saved to: dujyo_cpv_setup.sql");
    println!("🔧 API commands saved to: dujyo_cpv_api_commands.sh");
    
    println!("\n✅ CPV Rewards configuration generated successfully!");
    println!("📋 Next steps:");
    println!("   1. Run the SQL commands to set up CPV tables");
    println!("   2. Get a JWT token from the login endpoint");
    println!("   3. Run the API commands to register validators");
    println!("   4. Start the blockchain to begin CPV validation");
}
