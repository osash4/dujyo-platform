-- Dujyo Seed Data for Testing
-- Purpose: Insert realistic test data for artist testing sessions
-- Run this AFTER migrations are applied

-- ============================================================================
-- ARTIST VERIFICATIONS (3 test artists)
-- ============================================================================

INSERT INTO artist_verifications (artist_id, artist_name, verified, requested_at, approved_at, approved_by, created_at, updated_at)
VALUES 
    ('XW2912A395F2F37BF3980E09296A139227764DECED', 'Test Artist 1', TRUE, NOW(), NOW(), 'system', NOW(), NOW()),
    ('XW2222222222222222222222222222222222222222', 'Test Artist 2', TRUE, NOW(), NOW(), 'system', NOW(), NOW()),
    ('XW3333333333333333333333333333333333333333', 'Test Artist 3', TRUE, NOW(), NOW(), 'system', NOW(), NOW())
ON CONFLICT (artist_id) DO UPDATE SET
    verified = TRUE,
    approved_at = NOW(),
    updated_at = NOW();

-- ============================================================================
-- ARTIST BALANCES
-- ============================================================================

INSERT INTO artist_balances (artist_id, artist_name, total_earned, pending_payout, created_at, updated_at)
VALUES 
    ('XW2912A395F2F37BF3980E09296A139227764DECED', 'Test Artist 1', 1250.50, 250.00, NOW(), NOW()),
    ('XW2222222222222222222222222222222222222222', 'Test Artist 2', 890.25, 150.00, NOW(), NOW()),
    ('XW3333333333333333333333333333333333333333', 'Test Artist 3', 2100.75, 500.00, NOW(), NOW())
ON CONFLICT (artist_id) DO UPDATE SET
    updated_at = NOW();

-- ============================================================================
-- CONTENT (Sample tracks for each artist)
-- ============================================================================

INSERT INTO content (content_id, artist_id, artist_name, title, description, genre, content_type, file_url, ipfs_hash, thumbnail_url, price, created_at, updated_at)
VALUES 
    -- Artist 1 tracks
    ('CONTENT_001', 'XW2912A395F2F37BF3980E09296A139227764DECED', 'Test Artist 1', 'Summer Vibes', 'Upbeat summer track', 'Electronic', 'audio', '/uploads/audio/CONTENT_001_summer_vibes.mp3', 'Qm1234567890abcdef1234567890abcdef1234567890', '/uploads/audio/CONTENT_001_thumb.jpg', 0.0, NOW() - INTERVAL '30 days', NOW()),
    ('CONTENT_002', 'XW2912A395F2F37BF3980E09296A139227764DECED', 'Test Artist 1', 'Night Drive', 'Chill night driving music', 'Electronic', 'audio', '/uploads/audio/CONTENT_002_night_drive.mp3', 'Qm2345678901bcdef1234567890abcdef12345678901', '/uploads/audio/CONTENT_002_thumb.jpg', 0.0, NOW() - INTERVAL '20 days', NOW()),
    ('CONTENT_003', 'XW2912A395F2F37BF3980E09296A139227764DECED', 'Test Artist 1', 'Morning Coffee', 'Relaxing morning vibes', 'Jazz', 'audio', '/uploads/audio/CONTENT_003_morning_coffee.mp3', 'Qm3456789012cdef1234567890abcdef123456789012', '/uploads/audio/CONTENT_003_thumb.jpg', 0.0, NOW() - INTERVAL '10 days', NOW()),
    
    -- Artist 2 tracks
    ('CONTENT_004', 'XW2222222222222222222222222222222222222222', 'Test Artist 2', 'Urban Dreams', 'Hip hop track', 'Hip Hop', 'audio', '/uploads/audio/CONTENT_004_urban_dreams.mp3', 'Qm4567890123def1234567890abcdef1234567890123', '/uploads/audio/CONTENT_004_thumb.jpg', 0.0, NOW() - INTERVAL '25 days', NOW()),
    ('CONTENT_005', 'XW2222222222222222222222222222222222222222', 'Test Artist 2', 'City Lights', 'Electronic city vibes', 'Electronic', 'audio', '/uploads/audio/CONTENT_005_city_lights.mp3', 'Qm5678901234ef1234567890abcdef12345678901234', '/uploads/audio/CONTENT_005_thumb.jpg', 0.0, NOW() - INTERVAL '15 days', NOW()),
    
    -- Artist 3 tracks
    ('CONTENT_006', 'XW3333333333333333333333333333333333333333', 'Test Artist 3', 'Ocean Waves', 'Relaxing ocean sounds', 'Ambient', 'audio', '/uploads/audio/CONTENT_006_ocean_waves.mp3', 'Qm6789012345f1234567890abcdef123456789012345', '/uploads/audio/CONTENT_006_thumb.jpg', 0.0, NOW() - INTERVAL '28 days', NOW()),
    ('CONTENT_007', 'XW3333333333333333333333333333333333333333', 'Test Artist 3', 'Forest Walk', 'Nature sounds', 'Ambient', 'audio', '/uploads/audio/CONTENT_007_forest_walk.mp3', 'Qm78901234561234567890abcdef1234567890123456', '/uploads/audio/CONTENT_007_thumb.jpg', 0.0, NOW() - INTERVAL '18 days', NOW()),
    ('CONTENT_008', 'XW3333333333333333333333333333333333333333', 'Test Artist 3', 'Mountain Peak', 'Epic mountain vibes', 'Electronic', 'audio', '/uploads/audio/CONTENT_008_mountain_peak.mp3', 'Qm8901234567234567890abcdef12345678901234567', '/uploads/audio/CONTENT_008_thumb.jpg', 0.0, NOW() - INTERVAL '8 days', NOW())
ON CONFLICT (content_id) DO UPDATE SET
    updated_at = NOW();

-- ============================================================================
-- STREAM LOGS (Sample streaming activity)
-- ============================================================================

INSERT INTO stream_logs (log_id, content_id, artist_id, user_address, stream_type, duration_seconds, tokens_earned, track_id, track_title, track_genre, created_at)
VALUES 
    -- Artist 1 streams
    ('LOG_001', 'CONTENT_001', 'XW2912A395F2F37BF3980E09296A139227764DECED', 'XW1111111111111111111111111111111111111111', 'listener', 180, 1.8, 'CONTENT_001', 'Summer Vibes', 'Electronic', NOW() - INTERVAL '2 days'),
    ('LOG_002', 'CONTENT_001', 'XW2912A395F2F37BF3980E09296A139227764DECED', 'XW1111111111111111111111111111111111111111', 'listener', 240, 2.4, 'CONTENT_001', 'Summer Vibes', 'Electronic', NOW() - INTERVAL '1 day'),
    ('LOG_003', 'CONTENT_002', 'XW2912A395F2F37BF3980E09296A139227764DECED', 'XW2222222222222222222222222222222222222222', 'listener', 200, 2.0, 'CONTENT_002', 'Night Drive', 'Electronic', NOW() - INTERVAL '3 days'),
    ('LOG_004', 'CONTENT_003', 'XW2912A395F2F37BF3980E09296A139227764DECED', 'XW3333333333333333333333333333333333333333', 'listener', 150, 1.5, 'CONTENT_003', 'Morning Coffee', 'Jazz', NOW() - INTERVAL '1 day'),
    
    -- Artist 2 streams
    ('LOG_005', 'CONTENT_004', 'XW2222222222222222222222222222222222222222', 'XW1111111111111111111111111111111111111111', 'listener', 300, 3.0, 'CONTENT_004', 'Urban Dreams', 'Hip Hop', NOW() - INTERVAL '4 days'),
    ('LOG_006', 'CONTENT_005', 'XW2222222222222222222222222222222222222222', 'XW4444444444444444444444444444444444444444', 'listener', 180, 1.8, 'CONTENT_005', 'City Lights', 'Electronic', NOW() - INTERVAL '2 days'),
    
    -- Artist 3 streams
    ('LOG_007', 'CONTENT_006', 'XW3333333333333333333333333333333333333333', 'XW1111111111111111111111111111111111111111', 'listener', 360, 3.6, 'CONTENT_006', 'Ocean Waves', 'Ambient', NOW() - INTERVAL '5 days'),
    ('LOG_008', 'CONTENT_007', 'XW3333333333333333333333333333333333333333', 'XW2222222222222222222222222222222222222222', 'listener', 240, 2.4, 'CONTENT_007', 'Forest Walk', 'Ambient', NOW() - INTERVAL '3 days'),
    ('LOG_009', 'CONTENT_008', 'XW3333333333333333333333333333333333333333', 'XW5555555555555555555555555555555555555555', 'listener', 200, 2.0, 'CONTENT_008', 'Mountain Peak', 'Electronic', NOW() - INTERVAL '1 day')
ON CONFLICT (log_id) DO NOTHING;

-- ============================================================================
-- ROYALTY PAYMENTS (Sample payments)
-- ============================================================================

INSERT INTO royalty_payments (payment_id, artist_id, artist_name, amount, currency, status, source, transaction_hash, payment_date, created_at, updated_at)
VALUES 
    ('PAY_001', 'XW2912A395F2F37BF3980E09296A139227764DECED', 'Test Artist 1', 500.00, 'DYO', 'completed', 'dujyo', 'tx_hash_001', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
    ('PAY_002', 'XW2912A395F2F37BF3980E09296A139227764DECED', 'Test Artist 1', 250.50, 'DYO', 'completed', 'dujyo', 'tx_hash_002', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
    ('PAY_003', 'XW2222222222222222222222222222222222222222', 'Test Artist 2', 400.00, 'DYO', 'completed', 'dujyo', 'tx_hash_003', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
    ('PAY_004', 'XW3333333333333333333333333333333333333333', 'Test Artist 3', 800.00, 'DYO', 'completed', 'dujyo', 'tx_hash_004', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
    ('PAY_005', 'XW3333333333333333333333333333333333333333', 'Test Artist 3', 600.75, 'DYO', 'completed', 'dujyo', 'tx_hash_005', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
    
    -- Pending payments
    ('PAY_006', 'XW2912A395F2F37BF3980E09296A139227764DECED', 'Test Artist 1', 250.00, 'DYO', 'pending', 'dujyo', NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    ('PAY_007', 'XW2222222222222222222222222222222222222222', 'Test Artist 2', 150.00, 'DYO', 'pending', 'dujyo', NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    ('PAY_008', 'XW3333333333333333333333333333333333333333', 'Test Artist 3', 500.00, 'DYO', 'pending', 'dujyo', NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
ON CONFLICT (payment_id) DO NOTHING;

-- ============================================================================
-- EXTERNAL ROYALTY REPORTS (Sample external platform data)
-- ============================================================================

INSERT INTO external_royalty_reports (report_id, artist_id, platform, streams, revenue, period_start, period_end, processed, created_at, updated_at)
VALUES 
    ('REPORT_001', 'XW2912A395F2F37BF3980E09296A139227764DECED', 'spotify', 15000, 45.50, '2024-01-01', '2024-01-31', TRUE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ('REPORT_002', 'XW2912A395F2F37BF3980E09296A139227764DECED', 'apple_music', 8500, 32.25, '2024-01-01', '2024-01-31', TRUE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ('REPORT_003', 'XW2222222222222222222222222222222222222222', 'spotify', 12000, 38.00, '2024-01-01', '2024-01-31', TRUE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ('REPORT_004', 'XW3333333333333333333333333333333333333333', 'spotify', 25000, 75.00, '2024-01-01', '2024-01-31', TRUE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ('REPORT_005', 'XW3333333333333333333333333333333333333333', 'youtube', 18000, 55.50, '2024-01-01', '2024-01-31', TRUE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')
ON CONFLICT (report_id) DO NOTHING;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Verify data was inserted
SELECT 
    'artist_verifications' as table_name,
    COUNT(*) as count
FROM artist_verifications
WHERE verified = TRUE
UNION ALL
SELECT 
    'content' as table_name,
    COUNT(*) as count
FROM content
UNION ALL
SELECT 
    'stream_logs' as table_name,
    COUNT(*) as count
FROM stream_logs
UNION ALL
SELECT 
    'royalty_payments' as table_name,
    COUNT(*) as count
FROM royalty_payments
UNION ALL
SELECT 
    'external_royalty_reports' as table_name,
    COUNT(*) as count
FROM external_royalty_reports;

