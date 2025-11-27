-- Migration: Stream Nonces Table
-- Description: Creates table for storing stream nonces to prevent replay attacks
-- Date: 2024-12-19
-- ✅ SECURITY FIX: Required for nonce system to prevent stream-to-earn replay attacks

-- Create stream_nonces table
CREATE TABLE IF NOT EXISTS stream_nonces (
    id SERIAL PRIMARY KEY,
    nonce VARCHAR(64) NOT NULL UNIQUE,
    user_address VARCHAR(255) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stream_nonces_nonce ON stream_nonces(nonce);
CREATE INDEX IF NOT EXISTS idx_stream_nonces_user_content ON stream_nonces(user_address, content_id);
CREATE INDEX IF NOT EXISTS idx_stream_nonces_user_address ON stream_nonces(user_address);
CREATE INDEX IF NOT EXISTS idx_stream_nonces_content_id ON stream_nonces(content_id);
CREATE INDEX IF NOT EXISTS idx_stream_nonces_created_at ON stream_nonces(created_at);

-- Add comments
COMMENT ON TABLE stream_nonces IS 'Stores unique nonces for stream-to-earn requests to prevent replay attacks';
COMMENT ON COLUMN stream_nonces.nonce IS 'Unique nonce (32-character hex string, 128 bits) generated server-side';
COMMENT ON COLUMN stream_nonces.user_address IS 'Wallet address of the user making the stream request';
COMMENT ON COLUMN stream_nonces.content_id IS 'ID of the content being streamed';
COMMENT ON COLUMN stream_nonces.created_at IS 'Timestamp when the nonce was created';

-- Optional: Create cleanup function to remove old nonces (older than 7 days)
-- This prevents the table from growing indefinitely
CREATE OR REPLACE FUNCTION cleanup_old_stream_nonces()
RETURNS void AS $$
BEGIN
    DELETE FROM stream_nonces
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Note: This cleanup function should be called periodically (e.g., via cron job)
-- Example: SELECT cleanup_old_stream_nonces();

