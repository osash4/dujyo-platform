-- Migration: 012_create_audit_and_royalty_tables.sql
-- Creates audit_logs and royalty-related tables for MVP

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
-- This table is used by both audit/royalty_audit.rs and middleware/audit_logging.rs
-- Need to support both schemas

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    method VARCHAR(10),
    path VARCHAR(500),
    status_code INTEGER,
    action_type VARCHAR(100) NOT NULL,
    resource VARCHAR(255),
    details JSONB,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    -- Additional fields for royalty audit
    event_type VARCHAR(100),
    user_address VARCHAR(255),
    content_id VARCHAR(255),
    amount DECIMAL(18, 8),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_path ON audit_logs(path);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_content_id ON audit_logs(content_id);

-- ============================================================================
-- ROYALTY TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS royalty_payments (
    payment_id VARCHAR(255) PRIMARY KEY,
    artist_id VARCHAR(255) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'DYO',
    status VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    transaction_hash VARCHAR(255),
    payment_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_royalty_payments_artist_id ON royalty_payments(artist_id);
CREATE INDEX IF NOT EXISTS idx_royalty_payments_status ON royalty_payments(status);
CREATE INDEX IF NOT EXISTS idx_royalty_payments_payment_date ON royalty_payments(payment_date);

CREATE TABLE IF NOT EXISTS external_royalty_reports (
    report_id VARCHAR(255) PRIMARY KEY,
    artist_id VARCHAR(255) NOT NULL,
    platform VARCHAR(100) NOT NULL,
    streams BIGINT NOT NULL,
    revenue DECIMAL(18, 8) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_royalty_reports_artist_id ON external_royalty_reports(artist_id);
CREATE INDEX IF NOT EXISTS idx_external_royalty_reports_platform ON external_royalty_reports(platform);
CREATE INDEX IF NOT EXISTS idx_external_royalty_reports_period ON external_royalty_reports(period_start, period_end);

CREATE TABLE IF NOT EXISTS artist_balances (
    artist_id VARCHAR(255) PRIMARY KEY,
    artist_name VARCHAR(255),
    pending_payout DECIMAL(18, 8) DEFAULT 0,
    total_earned DECIMAL(18, 8) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artist_balances_artist_id ON artist_balances(artist_id);

-- ============================================================================
-- STREAM-TO-EARN TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS stream_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    content_id VARCHAR(255),
    artist_id VARCHAR(255) NOT NULL,
    user_address VARCHAR(255) NOT NULL,
    stream_type VARCHAR(50) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    tokens_earned DECIMAL(18, 8) NOT NULL,
    track_id VARCHAR(255),
    track_title VARCHAR(255),
    track_genre VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stream_logs_user_address ON stream_logs(user_address);
CREATE INDEX IF NOT EXISTS idx_stream_logs_content_id ON stream_logs(content_id);
CREATE INDEX IF NOT EXISTS idx_stream_logs_artist_id ON stream_logs(artist_id);
CREATE INDEX IF NOT EXISTS idx_stream_logs_created_at ON stream_logs(created_at);

CREATE TABLE IF NOT EXISTS content_stream_limits (
    user_address VARCHAR(255) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    streams_count INTEGER DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    tokens_earned DECIMAL(18, 8) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_address, content_id, date)
);

CREATE INDEX IF NOT EXISTS idx_content_stream_limits_user_date ON content_stream_limits(user_address, date);
CREATE INDEX IF NOT EXISTS idx_content_stream_limits_content_id ON content_stream_limits(content_id);

CREATE TABLE IF NOT EXISTS stream_nonces (
    nonce VARCHAR(255) PRIMARY KEY,
    user_address VARCHAR(255) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stream_nonces_user_address ON stream_nonces(user_address);
CREATE INDEX IF NOT EXISTS idx_stream_nonces_content_id ON stream_nonces(content_id);
CREATE INDEX IF NOT EXISTS idx_stream_nonces_created_at ON stream_nonces(created_at);

CREATE TABLE IF NOT EXISTS monthly_pool (
    month VARCHAR(7) PRIMARY KEY, -- YYYY-MM format
    total_distributed DECIMAL(18, 8) DEFAULT 0,
    adjustment_active BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monthly_pool_month ON monthly_pool(month);

-- ============================================================================
-- ROYALTY CONTRACTS TABLE (if needed by pallets/royalty.rs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS royalty_contracts (
    content_id VARCHAR(255) PRIMARY KEY,
    creator_address VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    total_earnings DECIMAL(18, 8) DEFAULT 0,
    beneficiaries JSONB NOT NULL, -- Array of {address, share}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_royalty_contracts_creator ON royalty_contracts(creator_address);
CREATE INDEX IF NOT EXISTS idx_royalty_contracts_status ON royalty_contracts(status);

-- ============================================================================
-- ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ============================================================================

ANALYZE audit_logs;
ANALYZE royalty_payments;
ANALYZE external_royalty_reports;
ANALYZE artist_balances;
ANALYZE stream_logs;
ANALYZE content_stream_limits;
ANALYZE stream_nonces;
ANALYZE monthly_pool;
ANALYZE royalty_contracts;

