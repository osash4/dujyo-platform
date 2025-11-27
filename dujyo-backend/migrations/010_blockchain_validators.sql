-- ✅ P2.3: Migration for blockchain_validators table
-- Stores validator state for persistence across server restarts

CREATE TABLE IF NOT EXISTS blockchain_validators (
    id SERIAL PRIMARY KEY,
    address VARCHAR(255) NOT NULL UNIQUE,
    validator_type VARCHAR(50) NOT NULL, -- 'economic', 'creative', 'community', 'simple'
    stake_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
    performance_score INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    
    -- Economic validator fields
    economic_activity DECIMAL(20, 8) DEFAULT 0,
    
    -- Creative validator fields
    creative_score DECIMAL(10, 4) DEFAULT 0,
    royalty_earnings DECIMAL(20, 8) DEFAULT 0,
    verified_nfts JSONB DEFAULT '[]'::jsonb,
    
    -- Community validator fields
    community_score DECIMAL(10, 4) DEFAULT 0,
    votes_cast BIGINT DEFAULT 0,
    reports_filed BIGINT DEFAULT 0,
    content_curated BIGINT DEFAULT 0,
    
    -- Common fields
    validation_count BIGINT DEFAULT 0,
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_validator_type CHECK (validator_type IN ('economic', 'creative', 'community', 'simple'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blockchain_validators_address ON blockchain_validators(address);
CREATE INDEX IF NOT EXISTS idx_blockchain_validators_active ON blockchain_validators(is_active);
CREATE INDEX IF NOT EXISTS idx_blockchain_validators_type ON blockchain_validators(validator_type);
CREATE INDEX IF NOT EXISTS idx_blockchain_validators_type_active ON blockchain_validators(validator_type, is_active);

-- Index for performance score queries
CREATE INDEX IF NOT EXISTS idx_blockchain_validators_performance ON blockchain_validators(performance_score DESC);

