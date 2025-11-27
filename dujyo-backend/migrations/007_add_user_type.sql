-- Migration: Add user_type column to users table
-- Date: December 2024
-- Purpose: Separate listeners from artists

-- Add user_type column with default 'listener'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'listener' CHECK (user_type IN ('listener', 'artist'));

-- Update existing users to be listeners (if they don't have user_type set)
UPDATE users 
SET user_type = 'listener' 
WHERE user_type IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- Add comment
COMMENT ON COLUMN users.user_type IS 'User type: listener (default) or artist (after verification)';

