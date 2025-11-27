-- Dujyo DEX Transactions Support
-- Migration: 002_dex_transactions.sql

-- Add DEX-specific columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS amount_in BIGINT,
ADD COLUMN IF NOT EXISTS amount_out BIGINT,
ADD COLUMN IF NOT EXISTS pool_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(50) DEFAULT 'transfer';

-- Create DEX pools table
CREATE TABLE IF NOT EXISTS dex_pools (
    pool_id VARCHAR(255) PRIMARY KEY,
    token_a VARCHAR(255) NOT NULL,
    token_b VARCHAR(255) NOT NULL,
    reserve_a BIGINT NOT NULL DEFAULT 0,
    reserve_b BIGINT NOT NULL DEFAULT 0,
    total_supply BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create DEX liquidity positions table
CREATE TABLE IF NOT EXISTS dex_liquidity_positions (
    position_id VARCHAR(255) PRIMARY KEY,
    user_address VARCHAR(255) NOT NULL,
    pool_id VARCHAR(255) NOT NULL REFERENCES dex_pools(pool_id),
    lp_tokens BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for DEX tables
CREATE INDEX IF NOT EXISTS idx_transactions_pool_id ON transactions(pool_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_dex_pools_tokens ON dex_pools(token_a, token_b);
CREATE INDEX IF NOT EXISTS idx_liquidity_positions_user ON dex_liquidity_positions(user_address);
CREATE INDEX IF NOT EXISTS idx_liquidity_positions_pool ON dex_liquidity_positions(pool_id);

-- Insert default DEX pool (DUJYO/USDC)
INSERT INTO dex_pools (pool_id, token_a, token_b, reserve_a, reserve_b, total_supply)
VALUES (
    'DUJYO_USDC',
    'DUJYO',
    'USDC',
    1000000,  -- 1M DUJYO
    1000000,  -- 1M USDC
    1000000   -- 1M LP tokens
) ON CONFLICT (pool_id) DO NOTHING;
