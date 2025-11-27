CREATE TABLE IF NOT EXISTS cpv_reward_pools (
                pool_id VARCHAR(255) PRIMARY KEY,
                pool_name VARCHAR(255) NOT NULL,
                validator_type VARCHAR(50) NOT NULL,
                reward_rate DECIMAL(10,2) NOT NULL,
                min_stake BIGINT NOT NULL DEFAULT 0,
                max_rewards_per_day BIGINT NOT NULL,
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

CREATE TABLE IF NOT EXISTS cpv_validators (
                address VARCHAR(255) PRIMARY KEY,
                validator_type VARCHAR(50) NOT NULL,
                stake_amount BIGINT NOT NULL DEFAULT 0,
                creative_score DECIMAL(10,2) NOT NULL DEFAULT 0,
                community_score DECIMAL(10,2) NOT NULL DEFAULT 0,
                total_validations INTEGER NOT NULL DEFAULT 0,
                last_validation TIMESTAMPTZ,
                registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

CREATE TABLE IF NOT EXISTS cpv_validation_history (
                id SERIAL PRIMARY KEY,
                validator_address VARCHAR(255) NOT NULL,
                validator_type VARCHAR(50) NOT NULL,
                block_hash VARCHAR(255) NOT NULL,
                reward_amount DECIMAL(10,2) NOT NULL,
                validation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                FOREIGN KEY (validator_address) REFERENCES cpv_validators(address)
            );

INSERT INTO cpv_reward_pools (pool_id, pool_name, validator_type, reward_rate, min_stake, max_rewards_per_day, description) 
                 VALUES ('ECONOMIC_POOL', 'Economic Validators Pool', 'Economic', 10, 1000, 10000, 'Rewards for validators who stake DYO tokens and validate economic transactions')
                 ON CONFLICT (pool_id) DO UPDATE SET 
                     pool_name = EXCLUDED.pool_name,
                     validator_type = EXCLUDED.validator_type,
                     reward_rate = EXCLUDED.reward_rate,
                     min_stake = EXCLUDED.min_stake,
                     max_rewards_per_day = EXCLUDED.max_rewards_per_day,
                     description = EXCLUDED.description,
                     updated_at = NOW();

INSERT INTO cpv_reward_pools (pool_id, pool_name, validator_type, reward_rate, min_stake, max_rewards_per_day, description) 
                 VALUES ('CREATIVE_POOL', 'Creative Validators Pool', 'Creative', 15, 0, 15000, 'Rewards for artists and creators who validate content authenticity and NFTs')
                 ON CONFLICT (pool_id) DO UPDATE SET 
                     pool_name = EXCLUDED.pool_name,
                     validator_type = EXCLUDED.validator_type,
                     reward_rate = EXCLUDED.reward_rate,
                     min_stake = EXCLUDED.min_stake,
                     max_rewards_per_day = EXCLUDED.max_rewards_per_day,
                     description = EXCLUDED.description,
                     updated_at = NOW();

INSERT INTO cpv_reward_pools (pool_id, pool_name, validator_type, reward_rate, min_stake, max_rewards_per_day, description) 
                 VALUES ('COMMUNITY_POOL', 'Community Validators Pool', 'Community', 5, 0, 5000, 'Rewards for community members who report fraud, curate content, and vote on proposals')
                 ON CONFLICT (pool_id) DO UPDATE SET 
                     pool_name = EXCLUDED.pool_name,
                     validator_type = EXCLUDED.validator_type,
                     reward_rate = EXCLUDED.reward_rate,
                     min_stake = EXCLUDED.min_stake,
                     max_rewards_per_day = EXCLUDED.max_rewards_per_day,
                     description = EXCLUDED.description,
                     updated_at = NOW();