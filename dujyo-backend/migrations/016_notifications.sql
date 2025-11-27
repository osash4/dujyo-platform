-- Migration: Notifications System
-- Description: Create tables for real-time notifications
-- Date: 2024-12

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'follow', 'comment', 'like', 'review', 'mention', 'content_update', 'achievement'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_content_id VARCHAR(255) REFERENCES content(content_id) ON DELETE SET NULL,
    related_user_id VARCHAR(255) REFERENCES users(wallet_address) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    preference_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT false,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notification_preferences_unique UNIQUE (user_id, notification_type),
    CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Comments
COMMENT ON TABLE notifications IS 'User notifications for various events (follows, comments, likes, etc.)';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification types';

