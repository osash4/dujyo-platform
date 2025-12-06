-- Migration: 027_staking_positions.sql
-- Description: Creates staking_positions table for token staking with lock periods
-- Date: 2025-01-XX
-- CRITICAL: This table is required for staking functionality

-- ============================================================================
-- STAKING POSITIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS staking_positions (
    position_id VARCHAR(255) PRIMARY KEY,
    user_address VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL,
    lock_period_days INTEGER NOT NULL DEFAULT 30,
    unlock_timestamp BIGINT NOT NULL,
    rewards_earned BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staking_positions_user ON staking_positions(user_address);
CREATE INDEX IF NOT EXISTS idx_staking_positions_unlock ON staking_positions(unlock_timestamp);

-- Add comments
COMMENT ON TABLE staking_positions IS 'Staking positions with lock periods for token staking functionality';
COMMENT ON COLUMN staking_positions.position_id IS 'Unique identifier for the staking position';
COMMENT ON COLUMN staking_positions.user_address IS 'Wallet address of the user who staked';
COMMENT ON COLUMN staking_positions.amount IS 'Amount staked in micro-DYO (1 DYO = 1,000,000 micro-DYO)';
COMMENT ON COLUMN staking_positions.lock_period_days IS 'Number of days the tokens are locked';
COMMENT ON COLUMN staking_positions.unlock_timestamp IS 'Unix timestamp when the position can be unlocked';
COMMENT ON COLUMN staking_positions.rewards_earned IS 'Total rewards earned from staking in micro-DYO';

