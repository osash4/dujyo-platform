-- Database Indexes for Dujyo Performance Optimization
-- Run this script to create strategic indexes for frequently queried tables

-- ============================================
-- USER TABLES
-- ============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_artist_verified ON users(artist_verified) WHERE artist_verified = true;

-- ============================================
-- CONTENT TABLES
-- ============================================

-- Content table indexes
CREATE INDEX IF NOT EXISTS idx_content_artist_id ON content(artist_id);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(content_type);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_updated_at ON content(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_genre ON content(genre);
CREATE INDEX IF NOT EXISTS idx_content_artist_type ON content(artist_id, content_type);

-- Composite index for content discovery
CREATE INDEX IF NOT EXISTS idx_content_discovery ON content(status, content_type, created_at DESC) WHERE status = 'published';

-- ============================================
-- STREAMING TABLES
-- ============================================

-- Streams table indexes
CREATE INDEX IF NOT EXISTS idx_streams_user_id ON streams(user_id);
CREATE INDEX IF NOT EXISTS idx_streams_content_id ON streams(content_id);
CREATE INDEX IF NOT EXISTS idx_streams_timestamp ON streams(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_streams_user_content ON streams(user_id, content_id);
CREATE INDEX IF NOT EXISTS idx_streams_date_range ON streams(timestamp) WHERE timestamp > NOW() - INTERVAL '30 days';

-- ============================================
-- ROYALTIES TABLES
-- ============================================

-- Royalties table indexes
CREATE INDEX IF NOT EXISTS idx_royalties_artist_id ON royalties(artist_id);
CREATE INDEX IF NOT EXISTS idx_royalties_content_id ON royalties(content_id);
CREATE INDEX IF NOT EXISTS idx_royalties_timestamp ON royalties(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_royalties_artist_date ON royalties(artist_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_royalties_paid ON royalties(paid) WHERE paid = false;

-- ============================================
-- ANALYTICS TABLES
-- ============================================

-- Analytics table indexes
CREATE INDEX IF NOT EXISTS idx_analytics_artist_id ON analytics(artist_id);
CREATE INDEX IF NOT EXISTS idx_analytics_content_id ON analytics(content_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_artist_date ON analytics(artist_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics(analytics_type);

-- ============================================
-- TRANSACTION TABLES
-- ============================================

-- Transactions table indexes
CREATE INDEX IF NOT EXISTS idx_transactions_from_address ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to_address ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_from_to ON transactions(from_address, to_address);
CREATE INDEX IF NOT EXISTS idx_transactions_pending ON transactions(status) WHERE status = 'pending';

-- ============================================
-- NFT TABLES
-- ============================================

-- NFT table indexes
CREATE INDEX IF NOT EXISTS idx_nfts_owner_id ON nfts(owner_id);
CREATE INDEX IF NOT EXISTS idx_nfts_content_id ON nfts(content_id);
CREATE INDEX IF NOT EXISTS idx_nfts_token_id ON nfts(token_id);
CREATE INDEX IF NOT EXISTS idx_nfts_created_at ON nfts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nfts_owner_content ON nfts(owner_id, content_id);

-- ============================================
-- STAKING TABLES
-- ============================================

-- Staking table indexes
CREATE INDEX IF NOT EXISTS idx_staking_user_id ON staking(user_id);
CREATE INDEX IF NOT EXISTS idx_staking_status ON staking(status);
CREATE INDEX IF NOT EXISTS idx_staking_created_at ON staking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staking_user_status ON staking(user_id, status);

-- ============================================
-- AUDIT LOGS
-- ============================================

-- Audit logs table indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_path ON audit_logs(path);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, timestamp DESC);

-- ============================================
-- DISCOVERY TABLES
-- ============================================

-- Discovery table indexes
CREATE INDEX IF NOT EXISTS idx_discovery_user_id ON discovery(user_id);
CREATE INDEX IF NOT EXISTS idx_discovery_content_id ON discovery(content_id);
CREATE INDEX IF NOT EXISTS idx_discovery_timestamp ON discovery(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_user_date ON discovery(user_id, timestamp DESC);

-- ============================================
-- FULL TEXT SEARCH INDEXES
-- ============================================

-- Full text search for content
CREATE INDEX IF NOT EXISTS idx_content_search ON content USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Full text search for users
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin(to_tsvector('english', username || ' ' || COALESCE(bio, '')));

-- ============================================
-- PARTIAL INDEXES FOR COMMON QUERIES
-- ============================================

-- Active content only
CREATE INDEX IF NOT EXISTS idx_content_active ON content(id, created_at DESC) WHERE status = 'published';

-- Recent streams only
CREATE INDEX IF NOT EXISTS idx_streams_recent ON streams(content_id, timestamp DESC) WHERE timestamp > NOW() - INTERVAL '7 days';

-- Unpaid royalties
CREATE INDEX IF NOT EXISTS idx_royalties_unpaid ON royalties(artist_id, amount, timestamp DESC) WHERE paid = false;

-- ============================================
-- STATISTICS UPDATE
-- ============================================

-- Update statistics after creating indexes
ANALYZE users;
ANALYZE content;
ANALYZE streams;
ANALYZE royalties;
ANALYZE analytics;
ANALYZE transactions;
ANALYZE nfts;
ANALYZE staking;
ANALYZE audit_logs;
ANALYZE discovery;

-- ============================================
-- VERIFICATION
-- ============================================

-- Show all indexes created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

