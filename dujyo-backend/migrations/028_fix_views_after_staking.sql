-- Migration: 028_fix_views_after_staking.sql
-- Description: Fix views that depend on staking_positions table
-- Date: 2024-12-20
-- Purpose: Recreate views that were created before staking_positions existed

-- ============================================================================
-- FIX: user_portfolio_summary VIEW
-- ============================================================================
-- Recreate view to include staking_positions data now that the table exists

DROP VIEW IF EXISTS user_portfolio_summary;
CREATE VIEW user_portfolio_summary AS
SELECT 
    u.user_id,
    u.email,
    u.wallet_address,
    COALESCE(balances.total_dyo, 0) AS total_dyo,
    COALESCE(balances.total_usdyo, 0) AS total_usdyo,
    COALESCE((
        SELECT SUM(amount) FROM staking_positions 
        WHERE user_address = u.wallet_address 
        AND unlock_timestamp > EXTRACT(EPOCH FROM NOW())::BIGINT
    ), 0) AS total_staked,
    COALESCE((
        SELECT SUM(rewards_earned) FROM staking_positions 
        WHERE user_address = u.wallet_address 
        AND unlock_timestamp > EXTRACT(EPOCH FROM NOW())::BIGINT
    ), 0) AS pending_rewards,
    COALESCE(tx_stats.total_transactions, 0) AS total_transactions,
    COALESCE(tx_stats.last_transaction, NULL) AS last_transaction
FROM users u
LEFT JOIN (
    SELECT 
        address,
        dyo_balance AS total_dyo,
        dys_balance AS total_usdyo
    FROM token_balances
) balances ON u.wallet_address = balances.address
LEFT JOIN (
    SELECT 
        from_address AS address,
        COUNT(*) AS total_transactions,
        MAX(created_at) AS last_transaction
    FROM transactions
    GROUP BY from_address
) tx_stats ON u.wallet_address = tx_stats.address;

-- ============================================================================
-- CREATE: active_stakes_with_rewards VIEW
-- ============================================================================
-- Create view that was supposed to be created in migration 005 but wasn't
-- because staking_positions didn't exist yet

CREATE OR REPLACE VIEW active_stakes_with_rewards AS
SELECT 
    sp.position_id as id,
    sp.user_address,
    sp.amount,
    sp.lock_period_days,
    sp.unlock_timestamp,
    sp.rewards_earned,
    CASE 
        WHEN sp.unlock_timestamp > EXTRACT(EPOCH FROM NOW())::BIGINT THEN
            sp.unlock_timestamp - EXTRACT(EPOCH FROM NOW())::BIGINT
        ELSE
            0
    END AS seconds_remaining,
    CASE 
        WHEN sp.unlock_timestamp > EXTRACT(EPOCH FROM NOW())::BIGINT THEN
            true
        ELSE
            false
    END AS is_locked
FROM staking_positions sp
WHERE sp.unlock_timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')::BIGINT;

-- Comments
COMMENT ON VIEW user_portfolio_summary IS 'User portfolio summary including balances, staking, and transaction stats';
COMMENT ON VIEW active_stakes_with_rewards IS 'Active staking positions with calculated rewards and time remaining';

