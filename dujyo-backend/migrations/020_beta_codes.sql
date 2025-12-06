-- Migration: Beta Codes Table for S2E Admin
-- Created: 2025-12-02

CREATE TABLE IF NOT EXISTS beta_codes (
    code VARCHAR(100) PRIMARY KEY,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_beta_codes_active ON beta_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_beta_codes_created_at ON beta_codes(created_at);

COMMENT ON TABLE beta_codes IS 'Stores generated beta access codes for S2E closed beta program';

