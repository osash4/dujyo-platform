-- Migration 005: Performance Optimization
-- Critical indexes and optimizations for production

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

-- Token Balances - Most queried table
CREATE INDEX IF NOT EXISTS idx_token_balances_address 
    ON token_balances(address);

-- Transactions - High volume table
CREATE INDEX IF NOT EXISTS idx_transactions_from_address 
    ON transactions(from_address);

CREATE INDEX IF NOT EXISTS idx_transactions_to_address 
    ON transactions(to_address);

CREATE INDEX IF NOT EXISTS idx_transactions_status 
    ON transactions(status);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at 
    ON transactions(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_from_status_created 
    ON transactions(from_address, status, created_at DESC);

-- DEX Transactions - using transactions table with transaction_type
CREATE INDEX IF NOT EXISTS idx_transactions_pool_id 
    ON transactions(pool_id) 
    WHERE pool_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_type_created 
    ON transactions(transaction_type, created_at DESC) 
    WHERE transaction_type = 'swap';

-- Users table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
    END IF;
END $$;

-- Content table indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content') THEN
        CREATE INDEX IF NOT EXISTS idx_content_artist_id ON content(artist_id);
        CREATE INDEX IF NOT EXISTS idx_content_type ON content(content_type);
        CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC);
    END IF;
END $$;

-- Staking Positions indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staking_positions') THEN
        CREATE INDEX IF NOT EXISTS idx_staking_user_address ON staking_positions(user_address);
        CREATE INDEX IF NOT EXISTS idx_staking_unlock_timestamp ON staking_positions(unlock_timestamp);
        CREATE INDEX IF NOT EXISTS idx_staking_active ON staking_positions(user_address, unlock_timestamp);
    END IF;
END $$;

-- ==========================================
-- QUERY OPTIMIZATION VIEWS
-- ==========================================

-- View for active stakes with calculated rewards (if staking_positions exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staking_positions') THEN
        EXECUTE '
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
        WHERE sp.unlock_timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL ''30 days'')::BIGINT';
    END IF;
END $$;

-- View for user portfolio summary
DROP VIEW IF EXISTS user_portfolio_summary;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staking_positions') THEN
        EXECUTE '
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
        ) tx_stats ON u.wallet_address = tx_stats.address';
    ELSE
        EXECUTE '
        CREATE VIEW user_portfolio_summary AS
        SELECT 
            u.user_id,
            u.email,
            u.wallet_address,
            COALESCE(balances.total_dyo, 0) AS total_dyo,
            COALESCE(balances.total_usdyo, 0) AS total_usdyo,
            0 AS total_staked,
            0 AS pending_rewards,
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
        ) tx_stats ON u.wallet_address = tx_stats.address';
    END IF;
END $$;

-- ==========================================
-- MATERIALIZED VIEWS FOR HEAVY QUERIES
-- ==========================================

-- DEX stats materialized view (using transactions table)
CREATE MATERIALIZED VIEW IF NOT EXISTS dex_stats_mv AS
SELECT 
    COUNT(*) AS total_swaps,
    COALESCE(SUM(amount_in), 0) AS total_volume_in,
    COALESCE(SUM(amount_out), 0) AS total_volume_out,
    pool_id,
    DATE_TRUNC('hour', created_at) AS hour
FROM transactions
WHERE transaction_type = 'swap' 
    AND created_at > NOW() - INTERVAL '7 days'
    AND pool_id IS NOT NULL
GROUP BY pool_id, DATE_TRUNC('hour', created_at);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_dex_stats_mv_hour ON dex_stats_mv(hour DESC);
CREATE INDEX IF NOT EXISTS idx_dex_stats_mv_pool ON dex_stats_mv(pool_id);

-- ==========================================
-- DATABASE SETTINGS OPTIMIZATION
-- ==========================================

-- Increase statistics target for better query planning
ALTER TABLE transactions ALTER COLUMN created_at SET STATISTICS 1000;
ALTER TABLE token_balances ALTER COLUMN address SET STATISTICS 1000;

-- ==========================================
-- MAINTENANCE FUNCTIONS
-- ==========================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'dex_stats_mv') THEN
        REFRESH MATERIALIZED VIEW dex_stats_mv;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old data (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    DELETE FROM transactions 
    WHERE created_at < NOW() - INTERVAL '1 year' 
    AND status = 'confirmed';
    
    DELETE FROM transactions 
    WHERE transaction_type = 'swap' 
    AND created_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- HELPFUL MONITORING QUERIES
-- ==========================================

-- Check index usage
CREATE OR REPLACE VIEW index_usage AS
SELECT 
    schemaname::text,
    relname::text as tablename,
    indexrelname::text as indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Check table sizes
DROP VIEW IF EXISTS table_sizes;
CREATE VIEW table_sizes AS
SELECT 
    schemaname::text,
    relname::text as tablename,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS indexes_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON INDEX idx_token_balances_address IS 'Index for fast balance lookups by address';
COMMENT ON INDEX idx_transactions_from_status_created IS 'Composite index for transaction history queries';
COMMENT ON MATERIALIZED VIEW dex_stats_mv IS 'Cached DEX statistics, refreshed every 5 minutes';

-- ==========================================
-- COMPLETION
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE 'Performance optimization migration completed successfully';
    RAISE NOTICE 'Created % indexes', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%');
    RAISE NOTICE 'Database is now optimized for production workloads';
END $$;
