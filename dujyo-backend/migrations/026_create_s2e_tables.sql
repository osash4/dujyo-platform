-- Migration: 026_create_s2e_tables.sql
-- Description: Creates S2E tables (s2e_monthly_pools and stream_earnings) and initializes pool
-- Date: 2025-01-XX
-- CRITICAL: This migration ensures S2E system is ready for MVP

-- ============================================================================
-- S2E MONTHLY POOLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS s2e_monthly_pools (
  month_year VARCHAR(7) PRIMARY KEY,
  total_amount DECIMAL(30,6) NOT NULL DEFAULT 2000000.0,  -- 2M DYO
  remaining_amount DECIMAL(30,6) NOT NULL DEFAULT 2000000.0,
  artist_pool DECIMAL(30,6) NOT NULL DEFAULT 1200000.0,   -- 60% de 2M
  listener_pool DECIMAL(30,6) NOT NULL DEFAULT 800000.0,  -- 40% de 2M
  artist_spent DECIMAL(30,6) DEFAULT 0.0,
  listener_spent DECIMAL(30,6) DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_s2e_pools_month_year ON s2e_monthly_pools(month_year);
CREATE INDEX IF NOT EXISTS idx_s2e_pools_remaining ON s2e_monthly_pools(remaining_amount);

-- ============================================================================
-- STREAM EARNINGS TABLE (aggregated view of stream_logs for reporting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stream_earnings (
  earning_id VARCHAR(255) PRIMARY KEY,
  user_address VARCHAR(255) NOT NULL,
  content_id VARCHAR(255),
  artist_id VARCHAR(255),
  earning_date DATE NOT NULL,
  total_minutes DECIMAL(10,2) DEFAULT 0.0,
  tokens_earned DECIMAL(20,6) DEFAULT 0.0,
  stream_type VARCHAR(50) NOT NULL, -- "artist" or "listener"
  pool_month VARCHAR(7) NOT NULL, -- References s2e_monthly_pools.month_year
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stream_earnings_user_address ON stream_earnings(user_address);
CREATE INDEX IF NOT EXISTS idx_stream_earnings_earning_date ON stream_earnings(earning_date);
CREATE INDEX IF NOT EXISTS idx_stream_earnings_artist_id ON stream_earnings(artist_id);
CREATE INDEX IF NOT EXISTS idx_stream_earnings_pool_month ON stream_earnings(pool_month);
CREATE INDEX IF NOT EXISTS idx_stream_earnings_stream_type ON stream_earnings(stream_type);

-- ============================================================================
-- INITIALIZE S2E POOL FOR CURRENT MONTH
-- ============================================================================

INSERT INTO s2e_monthly_pools (month_year, total_amount, remaining_amount, artist_pool, listener_pool) 
VALUES (TO_CHAR(NOW(), 'YYYY-MM'), 2000000.0, 2000000.0, 1200000.0, 800000.0)
ON CONFLICT (month_year) DO UPDATE SET
  total_amount = EXCLUDED.total_amount,
  remaining_amount = EXCLUDED.remaining_amount,
  artist_pool = EXCLUDED.artist_pool,
  listener_pool = EXCLUDED.listener_pool,
  updated_at = NOW();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE s2e_monthly_pools IS 'Monthly token pool for Stream-to-Earn distribution. Prevents unlimited emission.';
COMMENT ON COLUMN s2e_monthly_pools.month_year IS 'Month identifier in YYYY-MM format';
COMMENT ON COLUMN s2e_monthly_pools.total_amount IS 'Total pool size for the month (default: 2M DYO)';
COMMENT ON COLUMN s2e_monthly_pools.remaining_amount IS 'Remaining tokens available for distribution';
COMMENT ON COLUMN s2e_monthly_pools.artist_pool IS 'Allocated pool for artist rewards (60%)';
COMMENT ON COLUMN s2e_monthly_pools.listener_pool IS 'Allocated pool for listener rewards (40%)';

COMMENT ON TABLE stream_earnings IS 'Aggregated daily earnings from streaming for reporting and analytics';
COMMENT ON COLUMN stream_earnings.earning_date IS 'Date of the earnings (YYYY-MM-DD)';
COMMENT ON COLUMN stream_earnings.pool_month IS 'Month pool identifier (YYYY-MM)';

