-- Migration: 018_wallets.sql
-- Creates wallets table for persistent wallet storage
-- Replaces in-memory wallet storage with database-backed storage

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id VARCHAR(255) PRIMARY KEY,
    balance DECIMAL(20, 8) NOT NULL DEFAULT 0.0,
    currency VARCHAR(10) NOT NULL DEFAULT 'DYO',
    user_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);
CREATE INDEX IF NOT EXISTS idx_wallets_updated_at ON wallets(updated_at DESC);

-- Create transactions table for wallet transfers (if not exists)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id VARCHAR(255) PRIMARY KEY,
    from_wallet VARCHAR(255) NOT NULL,
    to_wallet VARCHAR(255) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'DYO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (from_wallet) REFERENCES wallets(id),
    FOREIGN KEY (to_wallet) REFERENCES wallets(id)
);

-- Create indexes for wallet_transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_from ON wallet_transactions(from_wallet);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_to ON wallet_transactions(to_wallet);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

