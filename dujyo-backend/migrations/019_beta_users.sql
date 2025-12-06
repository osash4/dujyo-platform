-- Migration: Beta Users Table for S2E Closed Beta
-- Created: 2025-12-02

CREATE TABLE IF NOT EXISTS beta_users (
    user_address VARCHAR(255) PRIMARY KEY,
    access_code VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beta_users_active ON beta_users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_beta_users_granted_at ON beta_users(granted_at);

COMMENT ON TABLE beta_users IS 'Stores beta access information for S2E closed beta program';

