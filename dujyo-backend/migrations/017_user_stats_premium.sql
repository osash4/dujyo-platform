-- Migration: User Statistics, Premium Subscriptions, and Achievements
-- Description: Create tables for user stats, premium features, and achievements
-- Date: 2024-12

-- ============================================================================
-- USER STATISTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_statistics (
    stat_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255) NOT NULL UNIQUE REFERENCES users(wallet_address) ON DELETE CASCADE,
    total_listening_minutes BIGINT NOT NULL DEFAULT 0,
    total_content_played INTEGER NOT NULL DEFAULT 0,
    total_likes_given INTEGER NOT NULL DEFAULT 0,
    total_comments_made INTEGER NOT NULL DEFAULT 0,
    total_reviews_written INTEGER NOT NULL DEFAULT 0,
    total_followers INTEGER NOT NULL DEFAULT 0,
    total_following INTEGER NOT NULL DEFAULT 0,
    favorite_genres JSONB DEFAULT '[]'::jsonb,
    longest_streak_days INTEGER NOT NULL DEFAULT 0,
    current_streak_days INTEGER NOT NULL DEFAULT 0,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_statistics_followers ON user_statistics(total_followers DESC);
CREATE INDEX IF NOT EXISTS idx_user_statistics_listening_minutes ON user_statistics(total_listening_minutes DESC);

-- ============================================================================
-- PREMIUM SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS premium_subscriptions (
    subscription_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL, -- 'monthly', 'yearly', 'lifetime'
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'pending'
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    payment_method VARCHAR(100),
    price_paid DECIMAL(20, 6),
    currency VARCHAR(10) DEFAULT 'DYO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT premium_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_user_id ON premium_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_status ON premium_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_expires_at ON premium_subscriptions(expires_at);

-- ============================================================================
-- EXCLUSIVE CONTENT ACCESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS exclusive_content_access (
    access_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    content_id VARCHAR(255) NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    access_type VARCHAR(50) NOT NULL, -- 'premium', 'purchase', 'subscription', 'free_trial'
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT exclusive_content_access_unique UNIQUE (content_id, user_id),
    CONSTRAINT exclusive_content_access_content_id_fkey FOREIGN KEY (content_id) REFERENCES content(content_id) ON DELETE CASCADE,
    CONSTRAINT exclusive_content_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exclusive_content_access_content_id ON exclusive_content_access(content_id);
CREATE INDEX IF NOT EXISTS idx_exclusive_content_access_user_id ON exclusive_content_access(user_id);
CREATE INDEX IF NOT EXISTS idx_exclusive_content_access_active ON exclusive_content_access(is_active, expires_at);

-- ============================================================================
-- ACHIEVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS achievements (
    achievement_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    achievement_code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url VARCHAR(1000),
    category VARCHAR(50), -- 'listening', 'social', 'content', 'streak', 'premium'
    rarity VARCHAR(50) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_code ON achievements(achievement_code);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements(rarity);

-- ============================================================================
-- USER ACHIEVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_achievements (
    user_achievement_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    achievement_id VARCHAR(255) NOT NULL REFERENCES achievements(achievement_id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    progress INTEGER NOT NULL DEFAULT 100, -- 0-100, for progress tracking
    is_notified BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT user_achievements_unique UNIQUE (user_id, achievement_id),
    CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(wallet_address) ON DELETE CASCADE,
    CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES achievements(achievement_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

-- ============================================================================
-- CONTENT EXCLUSIVE FLAG
-- ============================================================================
-- Add exclusive flag to content table if it doesn't exist
ALTER TABLE content 
ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_premium BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS exclusive_price DECIMAL(20, 6);

CREATE INDEX IF NOT EXISTS idx_content_is_exclusive ON content(is_exclusive);
CREATE INDEX IF NOT EXISTS idx_content_requires_premium ON content(requires_premium);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATE STATS
-- ============================================================================

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update followers count
    UPDATE user_statistics 
    SET total_followers = (
        SELECT COUNT(*) FROM user_follows 
        WHERE following_id = NEW.user_id
    )
    WHERE user_id = NEW.user_id;
    
    -- Update following count
    UPDATE user_statistics 
    SET total_following = (
        SELECT COUNT(*) FROM user_follows 
        WHERE follower_id = NEW.user_id
    )
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_follows
DROP TRIGGER IF EXISTS trigger_update_user_statistics_follows ON user_follows;
CREATE TRIGGER trigger_update_user_statistics_follows
    AFTER INSERT OR DELETE ON user_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_user_statistics();

-- Comments
COMMENT ON TABLE user_statistics IS 'Aggregated user statistics and metrics';
COMMENT ON TABLE premium_subscriptions IS 'User premium subscription management';
COMMENT ON TABLE exclusive_content_access IS 'Tracks user access to exclusive/premium content';
COMMENT ON TABLE achievements IS 'Available achievements in the platform';
COMMENT ON TABLE user_achievements IS 'User unlocked achievements';

