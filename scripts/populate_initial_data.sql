-- Script: populate_initial_data.sql
-- Description: Populate initial data for MVP (S2E pool, test user, example earnings)
-- Date: 2025-01-XX

-- ============================================================================
-- 1. ENSURE S2E POOL EXISTS FOR CURRENT MONTH
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
-- 2. CREATE TEST USER IF NOT EXISTS
-- ============================================================================

INSERT INTO users (wallet_address, user_type, created_at, updated_at)
VALUES ('test_artist_001', 'artist', NOW(), NOW())
ON CONFLICT (wallet_address) DO UPDATE SET
  user_type = EXCLUDED.user_type,
  updated_at = NOW();

INSERT INTO users (wallet_address, user_type, created_at, updated_at)
VALUES ('test_listener_001', 'listener', NOW(), NOW())
ON CONFLICT (wallet_address) DO UPDATE SET
  user_type = EXCLUDED.user_type,
  updated_at = NOW();

-- ============================================================================
-- 3. INITIALIZE TOKEN BALANCES FOR TEST USERS
-- ============================================================================

INSERT INTO token_balances (address, dyo_balance, dys_balance, updated_at)
VALUES ('test_artist_001', 1000.0, 500.0, NOW())
ON CONFLICT (address) DO UPDATE SET
  dyo_balance = EXCLUDED.dyo_balance,
  dys_balance = EXCLUDED.dys_balance,
  updated_at = NOW();

INSERT INTO token_balances (address, dyo_balance, dys_balance, updated_at)
VALUES ('test_listener_001', 500.0, 200.0, NOW())
ON CONFLICT (address) DO UPDATE SET
  dyo_balance = EXCLUDED.dyo_balance,
  dys_balance = EXCLUDED.dys_balance,
  updated_at = NOW();

-- ============================================================================
-- 4. INSERT EXAMPLE STREAM EARNINGS (if stream_logs table exists)
-- ============================================================================

-- Insert example stream log for artist
INSERT INTO stream_logs (
    log_id, 
    content_id, 
    artist_id, 
    user_address, 
    stream_type, 
    duration_seconds, 
    tokens_earned, 
    track_id, 
    track_title, 
    track_genre, 
    created_at
)
SELECT 
    'stream_log_' || generate_random_uuid()::text,
    'content_001',
    'test_artist_001',
    'test_listener_001',
    'listener',
    180, -- 3 minutes
    0.30, -- 0.10 DYO per minute * 3 minutes
    'track_001',
    'Example Track',
    'Electronic',
    NOW() - INTERVAL '1 day'
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stream_logs')
ON CONFLICT DO NOTHING;

-- Insert example stream log for artist earning
INSERT INTO stream_logs (
    log_id, 
    content_id, 
    artist_id, 
    user_address, 
    stream_type, 
    duration_seconds, 
    tokens_earned, 
    track_id, 
    track_title, 
    track_genre, 
    created_at
)
SELECT 
    'stream_log_' || generate_random_uuid()::text,
    'content_001',
    'test_artist_001',
    'test_artist_001',
    'artist',
    180, -- 3 minutes
    1.50, -- 0.50 DYO per minute * 3 minutes
    'track_001',
    'Example Track',
    'Electronic',
    NOW() - INTERVAL '1 day'
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stream_logs')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. VERIFY DATA
-- ============================================================================

SELECT 'S2E Pool' as check_type, month_year, remaining_amount FROM s2e_monthly_pools WHERE month_year = TO_CHAR(NOW(), 'YYYY-MM')
UNION ALL
SELECT 'Test Users' as check_type, COUNT(*)::text, 0 FROM users WHERE wallet_address IN ('test_artist_001', 'test_listener_001')
UNION ALL
SELECT 'Token Balances' as check_type, COUNT(*)::text, 0 FROM token_balances WHERE address IN ('test_artist_001', 'test_listener_001');

