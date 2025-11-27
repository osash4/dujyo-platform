-- Migration: User Daily Usage Persistence
-- Description: Persists daily usage tracking to database instead of in-memory HashMap
-- Date: 2024-11-15

-- Create user_daily_usage table
CREATE TABLE IF NOT EXISTS user_daily_usage (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    minutes_used BIGINT NOT NULL DEFAULT 0,
    tokens_earned DECIMAL(20, 8) NOT NULL DEFAULT 0,
    user_type VARCHAR(50) NOT NULL DEFAULT 'listener',
    consecutive_days INTEGER NOT NULL DEFAULT 1,
    is_content_creator BOOLEAN NOT NULL DEFAULT false,
    genres_listened_today JSONB DEFAULT '[]'::jsonb,
    last_intensive_session BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_address, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_daily_usage_user_address ON user_daily_usage(user_address);
CREATE INDEX IF NOT EXISTS idx_user_daily_usage_date ON user_daily_usage(date);
CREATE INDEX IF NOT EXISTS idx_user_daily_usage_user_date ON user_daily_usage(user_address, date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_daily_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_user_daily_usage_updated_at ON user_daily_usage;
CREATE TRIGGER trigger_update_user_daily_usage_updated_at
    BEFORE UPDATE ON user_daily_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_user_daily_usage_updated_at();

-- Add comment
COMMENT ON TABLE user_daily_usage IS 'Tracks daily usage statistics per user (minutes streamed, tokens earned, etc.)';
COMMENT ON COLUMN user_daily_usage.user_address IS 'Wallet address of the user';
COMMENT ON COLUMN user_daily_usage.date IS 'Date in YYYY-MM-DD format';
COMMENT ON COLUMN user_daily_usage.minutes_used IS 'Total minutes streamed today';
COMMENT ON COLUMN user_daily_usage.tokens_earned IS 'Total tokens earned today';
COMMENT ON COLUMN user_daily_usage.consecutive_days IS 'Number of consecutive days user has streamed';
COMMENT ON COLUMN user_daily_usage.genres_listened_today IS 'Array of genres listened to today (for bonus calculation)';

