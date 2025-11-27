-- Dujyo Database Optimization Migration
-- Migration: 003_database_optimization.sql
-- Purpose: Add optimized indexes and constraints for 1M+ users

-- ============================================================================
-- OPTIMIZED INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ============================================================================

-- 1. BALANCES TABLE OPTIMIZATION
-- ============================================================================

-- Composite index for balance lookups with timestamp
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_balances_address_updated 
ON balances (address, updated_at DESC);

-- Partial index for non-zero balances (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_balances_non_zero 
ON balances (address) 
WHERE balance > 0;

-- Index for balance range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_balances_amount_range 
ON balances (balance, address) 
WHERE balance > 0;

-- ============================================================================
-- 2. TOKEN_BALANCES TABLE OPTIMIZATION
-- ============================================================================

-- Composite index for token balance lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_balances_address_updated 
ON token_balances (address, updated_at DESC);

-- Partial indexes for each token type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_balances_dyo_non_zero 
ON token_balances (address, dyo_balance) 
WHERE dyo_balance > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_balances_usdyo_non_zero 
ON token_balances (address, usdyo_balance) 
WHERE usdyo_balance > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_balances_staked_non_zero 
ON token_balances (address, staked_balance) 
WHERE staked_balance > 0;

-- Index for total balance calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_balances_total 
ON token_balances ((dyo_balance + usdyo_balance + staked_balance), address);

-- ============================================================================
-- 3. TRANSACTIONS TABLE OPTIMIZATION
-- ============================================================================

-- Optimize existing indexes
DROP INDEX IF EXISTS idx_transactions_from;
DROP INDEX IF EXISTS idx_transactions_to;
DROP INDEX IF EXISTS idx_transactions_status;
DROP INDEX IF EXISTS idx_transactions_block_height;

-- Composite indexes for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_from_status_created 
ON transactions (from_address, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_to_status_created 
ON transactions (to_address, status, created_at DESC);

-- Index for transaction history with pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_history 
ON transactions (from_address, to_address, created_at DESC, tx_hash);

-- Index for pending transactions (frequently queried)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_pending 
ON transactions (status, created_at) 
WHERE status = 'pending';

-- Index for confirmed transactions by block
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_confirmed_block 
ON transactions (block_height, created_at) 
WHERE status = 'confirmed' AND block_height IS NOT NULL;

-- Index for amount-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_amount_range 
ON transactions (amount, created_at DESC) 
WHERE amount > 0;

-- ============================================================================
-- 4. BLOCKS TABLE OPTIMIZATION
-- ============================================================================

-- Optimize existing indexes
DROP INDEX IF EXISTS idx_blocks_hash;
DROP INDEX IF EXISTS idx_blocks_timestamp;

-- Composite index for block queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocks_height_timestamp 
ON blocks (height, timestamp DESC);

-- Index for block hash lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocks_hash_lookup 
ON blocks (hash) 
WHERE hash IS NOT NULL;

-- Index for recent blocks (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocks_recent 
ON blocks (timestamp DESC, height DESC) 
WHERE timestamp > NOW() - INTERVAL '7 days';

-- ============================================================================
-- 5. DEX TABLES OPTIMIZATION
-- ============================================================================

-- DEX pools optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dex_pools_token_pair 
ON dex_pools (token_a, token_b, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dex_pools_liquidity 
ON dex_pools (total_supply DESC, updated_at DESC) 
WHERE total_supply > 0;

-- DEX liquidity positions optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dex_liquidity_positions_user 
ON dex_liquidity_positions (user_address, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dex_liquidity_positions_pool 
ON dex_liquidity_positions (pool_id, lp_tokens DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dex_liquidity_positions_active 
ON dex_liquidity_positions (user_address, pool_id, lp_tokens) 
WHERE lp_tokens > 0;

-- ============================================================================
-- 6. PERFORMANCE VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for user balance summary
CREATE OR REPLACE VIEW user_balance_summary AS
SELECT 
    b.address,
    b.balance as legacy_balance,
    COALESCE(tb.dyo_balance, 0) as dyo_balance,
    COALESCE(tb.usdyo_balance, 0) as usdyo_balance,
    COALESCE(tb.staked_balance, 0) as staked_balance,
    COALESCE(tb.dyo_balance + tb.usdyo_balance + tb.staked_balance, b.balance) as total_balance,
    GREATEST(b.updated_at, COALESCE(tb.updated_at, b.updated_at)) as last_updated
FROM balances b
LEFT JOIN token_balances tb ON b.address = tb.address
WHERE b.balance > 0 OR COALESCE(tb.dyo_balance + tb.usdyo_balance + tb.staked_balance, 0) > 0;

-- View for transaction statistics
CREATE OR REPLACE VIEW transaction_stats AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_transactions,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_transactions,
    SUM(amount) FILTER (WHERE status = 'confirmed') as total_volume,
    AVG(amount) FILTER (WHERE status = 'confirmed') as avg_transaction_size
FROM transactions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- View for top holders
CREATE OR REPLACE VIEW top_holders AS
SELECT 
    address,
    total_balance,
    RANK() OVER (ORDER BY total_balance DESC) as rank,
    ROUND((total_balance * 100.0 / SUM(total_balance) OVER ()), 4) as percentage
FROM user_balance_summary
WHERE total_balance > 0
ORDER BY total_balance DESC;

-- ============================================================================
-- 7. PARTITIONING FOR LARGE TABLES (FUTURE SCALING)
-- ============================================================================

-- Partition transactions table by month (for future scaling)
-- Note: This requires careful planning and data migration
-- Uncomment when transaction volume exceeds 10M records

/*
-- Create partitioned table structure
CREATE TABLE transactions_partitioned (
    LIKE transactions INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE transactions_2024_01 PARTITION OF transactions_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE transactions_2024_02 PARTITION OF transactions_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Add more partitions as needed
*/

-- ============================================================================
-- 8. STATISTICS AND ANALYTICS OPTIMIZATION
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE balances;
ANALYZE token_balances;
ANALYZE transactions;
ANALYZE blocks;
ANALYZE dex_pools;
ANALYZE dex_liquidity_positions;

-- ============================================================================
-- 9. CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================================

-- Add check constraints for data validation
ALTER TABLE balances ADD CONSTRAINT chk_balance_non_negative 
CHECK (balance >= 0);

ALTER TABLE token_balances ADD CONSTRAINT chk_token_balances_non_negative 
CHECK (dyo_balance >= 0 AND usdyo_balance >= 0 AND staked_balance >= 0);

ALTER TABLE transactions ADD CONSTRAINT chk_transaction_amount_positive 
CHECK (amount > 0);

ALTER TABLE dex_pools ADD CONSTRAINT chk_dex_pool_reserves_positive 
CHECK (reserve_a >= 0 AND reserve_b >= 0 AND total_supply >= 0);

-- ============================================================================
-- 10. PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Create function for slow query monitoring
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE (
    query_text text,
    calls bigint,
    total_time double precision,
    mean_time double precision,
    rows bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        rows
    FROM pg_stat_statements
    WHERE mean_exec_time > 1000  -- Queries taking more than 1 second
    ORDER BY mean_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Create function for index usage monitoring
CREATE OR REPLACE FUNCTION get_index_usage()
RETURNS TABLE (
    table_name text,
    index_name text,
    index_scans bigint,
    tuples_read bigint,
    tuples_fetched bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        indexrelname as index_name,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. CLEANUP AND MAINTENANCE
-- ============================================================================

-- Create maintenance function for regular cleanup
CREATE OR REPLACE FUNCTION maintenance_cleanup()
RETURNS void AS $$
BEGIN
    -- Update table statistics
    ANALYZE;
    
    -- Clean up old transaction logs (keep last 30 days)
    DELETE FROM transactions 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND status = 'confirmed';
    
    -- Vacuum tables
    VACUUM ANALYZE balances;
    VACUUM ANALYZE token_balances;
    VACUUM ANALYZE transactions;
    VACUUM ANALYZE blocks;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant permissions for read-only user
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dujyo_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO dujyo_readonly;
GRANT EXECUTE ON FUNCTION get_slow_queries() TO dujyo_readonly;
GRANT EXECUTE ON FUNCTION get_index_usage() TO dujyo_readonly;

-- Grant permissions for application user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dujyo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dujyo_app;
GRANT EXECUTE ON FUNCTION maintenance_cleanup() TO dujyo_app;

-- Grant permissions for monitoring user
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring;
GRANT EXECUTE ON FUNCTION get_slow_queries() TO monitoring;
GRANT EXECUTE ON FUNCTION get_index_usage() TO monitoring;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
INSERT INTO blocks (height, hash, prev_hash, timestamp, tx_count, data) 
VALUES (
    (SELECT COALESCE(MAX(height), 0) + 1 FROM blocks),
    'migration_003_database_optimization_' || EXTRACT(EPOCH FROM NOW()),
    (SELECT hash FROM blocks ORDER BY height DESC LIMIT 1),
    NOW(),
    0,
    '{"migration": "003_database_optimization", "description": "Database optimization for 1M+ users", "timestamp": "' || NOW() || '"}'
) ON CONFLICT (height) DO NOTHING;
