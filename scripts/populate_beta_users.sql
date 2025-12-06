-- Script to populate 50 beta users for MVP launch
-- Usage: psql -U dujyo_user -d dujyo_db -f scripts/populate_beta_users.sql

-- Generate 50 beta access codes and insert into beta_users table
-- Note: Replace 'user_wallet_address_X' with actual wallet addresses

INSERT INTO beta_users (user_address, access_code, is_active, created_at) VALUES
('user_wallet_address_001', 'DUJYO-BETA-001', true, NOW()),
('user_wallet_address_002', 'DUJYO-BETA-002', true, NOW()),
('user_wallet_address_003', 'DUJYO-BETA-003', true, NOW()),
('user_wallet_address_004', 'DUJYO-BETA-004', true, NOW()),
('user_wallet_address_005', 'DUJYO-BETA-005', true, NOW()),
('user_wallet_address_006', 'DUJYO-BETA-006', true, NOW()),
('user_wallet_address_007', 'DUJYO-BETA-007', true, NOW()),
('user_wallet_address_008', 'DUJYO-BETA-008', true, NOW()),
('user_wallet_address_009', 'DUJYO-BETA-009', true, NOW()),
('user_wallet_address_010', 'DUJYO-BETA-010', true, NOW()),
('user_wallet_address_011', 'DUJYO-BETA-011', true, NOW()),
('user_wallet_address_012', 'DUJYO-BETA-012', true, NOW()),
('user_wallet_address_013', 'DUJYO-BETA-013', true, NOW()),
('user_wallet_address_014', 'DUJYO-BETA-014', true, NOW()),
('user_wallet_address_015', 'DUJYO-BETA-015', true, NOW()),
('user_wallet_address_016', 'DUJYO-BETA-016', true, NOW()),
('user_wallet_address_017', 'DUJYO-BETA-017', true, NOW()),
('user_wallet_address_018', 'DUJYO-BETA-018', true, NOW()),
('user_wallet_address_019', 'DUJYO-BETA-019', true, NOW()),
('user_wallet_address_020', 'DUJYO-BETA-020', true, NOW()),
('user_wallet_address_021', 'DUJYO-BETA-021', true, NOW()),
('user_wallet_address_022', 'DUJYO-BETA-022', true, NOW()),
('user_wallet_address_023', 'DUJYO-BETA-023', true, NOW()),
('user_wallet_address_024', 'DUJYO-BETA-024', true, NOW()),
('user_wallet_address_025', 'DUJYO-BETA-025', true, NOW()),
('user_wallet_address_026', 'DUJYO-BETA-026', true, NOW()),
('user_wallet_address_027', 'DUJYO-BETA-027', true, NOW()),
('user_wallet_address_028', 'DUJYO-BETA-028', true, NOW()),
('user_wallet_address_029', 'DUJYO-BETA-029', true, NOW()),
('user_wallet_address_030', 'DUJYO-BETA-030', true, NOW()),
('user_wallet_address_031', 'DUJYO-BETA-031', true, NOW()),
('user_wallet_address_032', 'DUJYO-BETA-032', true, NOW()),
('user_wallet_address_033', 'DUJYO-BETA-033', true, NOW()),
('user_wallet_address_034', 'DUJYO-BETA-034', true, NOW()),
('user_wallet_address_035', 'DUJYO-BETA-035', true, NOW()),
('user_wallet_address_036', 'DUJYO-BETA-036', true, NOW()),
('user_wallet_address_037', 'DUJYO-BETA-037', true, NOW()),
('user_wallet_address_038', 'DUJYO-BETA-038', true, NOW()),
('user_wallet_address_039', 'DUJYO-BETA-039', true, NOW()),
('user_wallet_address_040', 'DUJYO-BETA-040', true, NOW()),
('user_wallet_address_041', 'DUJYO-BETA-041', true, NOW()),
('user_wallet_address_042', 'DUJYO-BETA-042', true, NOW()),
('user_wallet_address_043', 'DUJYO-BETA-043', true, NOW()),
('user_wallet_address_044', 'DUJYO-BETA-044', true, NOW()),
('user_wallet_address_045', 'DUJYO-BETA-045', true, NOW()),
('user_wallet_address_046', 'DUJYO-BETA-046', true, NOW()),
('user_wallet_address_047', 'DUJYO-BETA-047', true, NOW()),
('user_wallet_address_048', 'DUJYO-BETA-048', true, NOW()),
('user_wallet_address_049', 'DUJYO-BETA-049', true, NOW()),
('user_wallet_address_050', 'DUJYO-BETA-050', true, NOW())
ON CONFLICT (access_code) DO NOTHING;

-- Initialize S2E pool for current month
INSERT INTO s2e_monthly_pools (month_year, total_amount, remaining_amount, created_at)
VALUES (
    TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
    2000000.0,
    2000000.0,
    NOW()
)
ON CONFLICT (month_year) DO UPDATE SET
    remaining_amount = EXCLUDED.remaining_amount,
    updated_at = NOW();

-- Verify counts
SELECT 
    (SELECT COUNT(*) FROM beta_users WHERE is_active = true) as active_beta_users,
    (SELECT COUNT(*) FROM s2e_monthly_pools WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')) as s2e_pools,
    (SELECT remaining_amount FROM s2e_monthly_pools WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM') ORDER BY created_at DESC LIMIT 1) as current_pool_amount;

