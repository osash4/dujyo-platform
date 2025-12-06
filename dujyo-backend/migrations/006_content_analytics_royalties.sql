-- Dujyo Content, Analytics & Royalties Tables
-- Migration: 006_content_analytics_royalties.sql
-- Purpose: Create tables for content uploads, stream analytics, and royalty tracking

-- ============================================================================
-- CONTENT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS content (
    content_id VARCHAR(255) PRIMARY KEY,
    artist_id VARCHAR(255) NOT NULL,
    artist_name VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    content_type VARCHAR(50) NOT NULL, -- "audio", "video", "gaming"
    file_url VARCHAR(1000),
    ipfs_hash VARCHAR(255),
    thumbnail_url VARCHAR(1000),
    price DECIMAL(20, 6) DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_artist_id ON content(artist_id);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(content_type);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_genre ON content(genre);

-- ============================================================================
-- STREAM LOGS TABLE (for analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stream_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    content_id VARCHAR(255),
    artist_id VARCHAR(255) NOT NULL,
    user_address VARCHAR(255) NOT NULL,
    stream_type VARCHAR(50) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    tokens_earned DECIMAL(18, 8) NOT NULL DEFAULT 0.0,
    track_id VARCHAR(255),
    track_title VARCHAR(500),
    track_genre VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stream_logs_content_id ON stream_logs(content_id);
CREATE INDEX IF NOT EXISTS idx_stream_logs_artist_id ON stream_logs(artist_id);
CREATE INDEX IF NOT EXISTS idx_stream_logs_user_address ON stream_logs(user_address);
CREATE INDEX IF NOT EXISTS idx_stream_logs_created_at ON stream_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_logs_stream_type ON stream_logs(stream_type);

-- ============================================================================
-- ROYALTY PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS royalty_payments (
    payment_id VARCHAR(255) PRIMARY KEY,
    artist_id VARCHAR(255) NOT NULL,
    artist_name VARCHAR(255) NOT NULL,
    amount DECIMAL(20, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'DYO',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- "completed", "pending", "processing"
    source VARCHAR(100) NOT NULL, -- "spotify", "apple_music", "youtube", "dujyo"
    transaction_hash VARCHAR(255),
    payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_royalty_payments_artist_id ON royalty_payments(artist_id);
CREATE INDEX IF NOT EXISTS idx_royalty_payments_status ON royalty_payments(status);
CREATE INDEX IF NOT EXISTS idx_royalty_payments_source ON royalty_payments(source);
CREATE INDEX IF NOT EXISTS idx_royalty_payments_payment_date ON royalty_payments(payment_date DESC);

-- ============================================================================
-- EXTERNAL ROYALTY REPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS external_royalty_reports (
    report_id VARCHAR(255) PRIMARY KEY,
    artist_id VARCHAR(255) NOT NULL,
    platform VARCHAR(100) NOT NULL, -- "spotify", "apple_music", "youtube"
    streams BIGINT NOT NULL DEFAULT 0,
    revenue DECIMAL(20, 6) NOT NULL DEFAULT 0.0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_reports_artist_id ON external_royalty_reports(artist_id);
CREATE INDEX IF NOT EXISTS idx_external_reports_platform ON external_royalty_reports(platform);
CREATE INDEX IF NOT EXISTS idx_external_reports_processed ON external_royalty_reports(processed);

-- ============================================================================
-- ARTIST BALANCES TABLE (for royalty tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS artist_balances (
    artist_id VARCHAR(255) PRIMARY KEY,
    artist_name VARCHAR(255) NOT NULL,
    total_earned DECIMAL(20, 6) DEFAULT 0.0,
    pending_payout DECIMAL(20, 6) DEFAULT 0.0,
    last_payout_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artist_balances_pending ON artist_balances(pending_payout) WHERE pending_payout > 0;

