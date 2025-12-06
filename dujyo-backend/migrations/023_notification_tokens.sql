-- Migration: Create notification_tokens table for FCM token storage

CREATE TABLE IF NOT EXISTS notification_tokens (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(255) NOT NULL,
    token TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'ios' or 'android'
    device_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_address, device_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_address ON notification_tokens(user_address);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_token ON notification_tokens(token);

-- Add comment
COMMENT ON TABLE notification_tokens IS 'Stores FCM tokens for push notifications per user device';

