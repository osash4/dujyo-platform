-- Dujyo Blockchain Database Schema
-- Migration: 001_initial_schema.sql

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
    height BIGINT PRIMARY KEY,
    hash VARCHAR(255) UNIQUE NOT NULL,
    prev_hash VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    tx_count INTEGER NOT NULL DEFAULT 0,
    data JSONB NOT NULL
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    tx_hash VARCHAR(255) PRIMARY KEY,
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL,
    nonce BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    block_height BIGINT REFERENCES blocks(height),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create balances table
CREATE TABLE IF NOT EXISTS balances (
    address VARCHAR(255) PRIMARY KEY,
    balance BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_block_height ON transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks(hash);
CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks(timestamp);

-- Insert genesis block
INSERT INTO blocks (height, hash, prev_hash, timestamp, tx_count, data) 
VALUES (
    0, 
    'genesis_hash_0000000000000000000000000000000000000000000000000000000000000000',
    '0',
    NOW(),
    1,
    '{"transactions": [{"from": "0x0000000000000000000000000000000000000000", "to": "XW1111111111111111111111111111111111111111", "amount": 1000000, "nft_id": null}], "validator": "genesis"}'
) ON CONFLICT (height) DO NOTHING;

-- Insert genesis balances
INSERT INTO balances (address, balance, updated_at) 
VALUES 
    ('XW1111111111111111111111111111111111111111', 1000000, NOW()),
    ('XW2222222222222222222222222222222222222222', 500000, NOW()),
    ('XW3333333333333333333333333333333333333333', 250000, NOW())
ON CONFLICT (address) DO NOTHING;
