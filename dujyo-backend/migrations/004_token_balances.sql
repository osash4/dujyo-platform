-- Dujyo Blockchain Database Schema
-- Migration: 004_token_balances.sql
-- Create token_balances table for detailed token balances

-- Create token_balances table
CREATE TABLE IF NOT EXISTS token_balances (
    address VARCHAR(255) PRIMARY KEY,
    dyo_balance BIGINT NOT NULL DEFAULT 0,
    dys_balance BIGINT NOT NULL DEFAULT 0,
    staked_balance BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_token_balances_dyo ON token_balances(dyo_balance);
CREATE INDEX IF NOT EXISTS idx_token_balances_dys ON token_balances(dys_balance);
CREATE INDEX IF NOT EXISTS idx_token_balances_staked ON token_balances(staked_balance);
CREATE INDEX IF NOT EXISTS idx_token_balances_updated ON token_balances(updated_at);

-- Migrate existing balances to token_balances table
INSERT INTO token_balances (address, dyo_balance, dys_balance, staked_balance, updated_at)
SELECT 
    address,
    balance as dyo_balance,
    0 as dys_balance,
    0 as staked_balance,
    updated_at
FROM balances
WHERE address NOT IN (SELECT address FROM token_balances)
ON CONFLICT (address) DO NOTHING;

-- Insert default token balances for test addresses
INSERT INTO token_balances (address, dyo_balance, dys_balance, staked_balance, updated_at) 
VALUES 
    ('XW1111111111111111111111111111111111111111', 1000000, 100000, 0, NOW()),
    ('XW2222222222222222222222222222222222222222', 500000, 50000, 0, NOW()),
    ('XW3333333333333333333333333333333333333333', 250000, 25000, 0, NOW()),
    ('XW4444444444444444444444444444444444444444', 100000, 10000, 0, NOW()),
    ('XW5555555555555555555555555555555555555555', 50000, 5000, 0, NOW())
ON CONFLICT (address) DO NOTHING;
