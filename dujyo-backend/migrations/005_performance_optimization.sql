-- Migration 005: Performance Optimization
-- Critical indexes and optimizations for production

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

-- Token Balances - Most queried table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_balances_address 
    ON token_balances(address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_balances_token_symbol 
    ON token_balances(token_symbol);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_balances_composite 
    ON token_balances(address, token_symbol);

-- Transactions - High volume table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_from_address 
    ON transactions(from_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_to_address 
    ON transactions(to_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_status 
    ON transactions(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_created_at 
    ON transactions(created_at DESC);

-- Composite index for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_from_status_created 
    ON transactions(from_address, status, created_at DESC);

-- DEX Transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dex_tx_user_address 
    ON dex_transactions(user_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dex_tx_created_at 
    ON dex_transactions(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dex_tx_token_pair 
    ON dex_transactions(token_in, token_out);

-- Staking Positions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staking_user_address 
    ON staking_positions(user_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staking_end_date 
    ON staking_positions(end_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staking_active 
    ON staking_positions(user_address) WHERE end_date > NOW();

-- Users table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
    ON users(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_wallet_address 
    ON users(wallet_address);

-- Content table (if exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_artist_id 
    ON content(artist_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_type 
    ON content(content_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_created_at 
    ON content(created_at DESC);

-- ==========================================
-- TABLE PARTITIONING FOR LARGE TABLES
-- ==========================================

-- Partition transactions by month (for scaling)
-- Note: This requires converting existing table to partitioned table
-- Run this ONLY if transactions table is getting very large (>10M rows)

/*
-- Create partitioned transactions table
CREATE TABLE transactions_partitioned (
    LIKE transactions INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for the next 12 months
CREATE TABLE transactions_2025_10 PARTITION OF transactions_partitioned
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
    
CREATE TABLE transactions_2025_11 PARTITION OF transactions_partitioned
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
    
-- Continue for other months...

-- Migrate data (do this during low traffic period)
-- INSERT INTO transactions_partitioned SELECT * FROM transactions;

-- Rename tables (backup original first!)
-- ALTER TABLE transactions RENAME TO transactions_old;
-- ALTER TABLE transactions_partitioned RENAME TO transactions;
*/

-- ==========================================
-- QUERY OPTIMIZATION VIEWS
-- ==========================================

-- View for active stakes with calculated rewards
CREATE OR REPLACE VIEW active_stakes_with_rewards AS
SELECT 
    sp.id,
    sp.user_address,
    sp.amount,
    sp.apy,
    sp.start_date,
    sp.end_date,
    sp.rewards_claimed,
    -- Calculate pending rewards
    CASE 
        WHEN sp.end_date > NOW() THEN
            (sp.amount * sp.apy / 100.0) * 
            (EXTRACT(EPOCH FROM (NOW() - sp.start_date)) / (365.25 * 24 * 60 * 60))
        ELSE
            (sp.amount * sp.apy / 100.0) * 
            (EXTRACT(EPOCH FROM (sp.end_date - sp.start_date)) / (365.25 * 24 * 60 * 60))
    END - sp.rewards_claimed AS pending_rewards,
    -- Calculate time remaining
    CASE 
        WHEN sp.end_date > NOW() THEN
            EXTRACT(EPOCH FROM (sp.end_date - NOW()))
        ELSE
            0
    END AS seconds_remaining
FROM staking_positions sp
WHERE sp.end_date > NOW() - INTERVAL '30 days'; -- Include recently ended stakes

-- View for user portfolio summary
CREATE OR REPLACE VIEW user_portfolio_summary AS
SELECT 
    u.id AS user_id,
    u.email,
    u.wallet_address,
    COALESCE(balances.total_dyo, 0) AS total_dyo,
    COALESCE(balances.total_usdyo, 0) AS total_usdyo,
    COALESCE(stakes.total_staked, 0) AS total_staked,
    COALESCE(stakes.pending_rewards, 0) AS pending_rewards,
    COALESCE(tx_stats.total_transactions, 0) AS total_transactions,
    COALESCE(tx_stats.last_transaction, NULL) AS last_transaction
FROM users u
LEFT JOIN (
    SELECT 
        address,
        SUM(CASE WHEN token_symbol = 'DYO' THEN balance ELSE 0 END) AS total_dyo,
        SUM(CASE WHEN token_symbol = 'USDYO' THEN balance ELSE 0 END) AS total_usdyo
    FROM token_balances
    GROUP BY address
) balances ON u.wallet_address = balances.address
LEFT JOIN (
    SELECT 
        user_address,
        SUM(amount) AS total_staked,
        SUM(pending_rewards) AS pending_rewards
    FROM active_stakes_with_rewards
    GROUP BY user_address
) stakes ON u.wallet_address = stakes.user_address
LEFT JOIN (
    SELECT 
        from_address AS address,
        COUNT(*) AS total_transactions,
        MAX(created_at) AS last_transaction
    FROM transactions
    GROUP BY from_address
) tx_stats ON u.wallet_address = tx_stats.address;

-- ==========================================
-- MATERIALIZED VIEWS FOR HEAVY QUERIES
-- ==========================================

-- DEX stats materialized view (refresh every 5 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS dex_stats_mv AS
SELECT 
    COUNT(*) AS total_swaps,
    SUM(amount_in) AS total_volume_in,
    SUM(amount_out) AS total_volume_out,
    AVG(price_impact) AS avg_price_impact,
    token_in,
    token_out,
    DATE_TRUNC('hour', created_at) AS hour
FROM dex_transactions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY token_in, token_out, DATE_TRUNC('hour', created_at);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_dex_stats_mv_hour ON dex_stats_mv(hour DESC);

-- ==========================================
-- DATABASE SETTINGS OPTIMIZATION
-- ==========================================

-- Increase statistics target for better query planning
ALTER TABLE transactions ALTER COLUMN created_at SET STATISTICS 1000;
ALTER TABLE token_balances ALTER COLUMN address SET STATISTICS 1000;
ALTER TABLE dex_transactions ALTER COLUMN created_at SET STATISTICS 1000;

-- ==========================================
-- VACUUM AND ANALYZE
-- ==========================================

-- Vacuum and analyze all tables for optimal performance
VACUUM ANALYZE transactions;
VACUUM ANALYZE token_balances;
VACUUM ANALYZE dex_transactions;
VACUUM ANALYZE staking_positions;
VACUUM ANALYZE users;
VACUUM ANALYZE content;

-- ==========================================
-- QUERY STATISTICS EXTENSION
-- ==========================================

-- Enable pg_stat_statements for query performance monitoring
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
-- CREATE OR REPLACE VIEW slow_queries AS
-- SELECT 
--     query,
--     calls,
--     total_exec_time,
--     mean_exec_time,
--     max_exec_time
-- FROM pg_stat_statements
-- WHERE mean_exec_time > 100 -- queries slower than 100ms
-- ORDER BY mean_exec_time DESC
-- LIMIT 50;

-- ==========================================
-- MAINTENANCE FUNCTIONS
-- ==========================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dex_stats_mv;
    -- Add other materialized views here
END;
$$ LANGUAGE plpgsql;

-- Function to clean old data (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete transactions older than 1 year
    DELETE FROM transactions WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Delete old DEX transactions (keep 6 months)
    DELETE FROM dex_transactions WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Vacuum after cleanup
    VACUUM ANALYZE transactions;
    VACUUM ANALYZE dex_transactions;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- AUTOMATED MAINTENANCE
-- ==========================================

-- Create pgcron job to refresh stats every 5 minutes (requires pg_cron extension)
-- SELECT cron.schedule('refresh-dex-stats', '*/5 * * * *', 'SELECT refresh_materialized_views()');

-- Create pgcron job to cleanup old data weekly
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * 0', 'SELECT cleanup_old_data()');

-- ==========================================
-- HELPFUL MONITORING QUERIES
-- ==========================================

-- Check index usage
CREATE OR REPLACE VIEW index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Check table sizes
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON INDEX idx_token_balances_address IS 'Index for fast balance lookups by address';
COMMENT ON INDEX idx_transactions_from_status_created IS 'Composite index for transaction history queries';
COMMENT ON VIEW active_stakes_with_rewards IS 'Real-time view of active stakes with calculated rewards';
COMMENT ON MATERIALIZED VIEW dex_stats_mv IS 'Cached DEX statistics, refreshed every 5 minutes';

-- ==========================================
-- COMPLETION
-- ==========================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Performance optimization migration completed successfully';
    RAISE NOTICE 'Created % indexes', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%');
    RAISE NOTICE 'Database is now optimized for production workloads';
END $$;

