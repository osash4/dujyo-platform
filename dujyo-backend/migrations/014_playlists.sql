-- Migration: Playlists System
-- Description: Create tables for user playlists and playlist tracks

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
    playlist_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    is_collaborative BOOLEAN NOT NULL DEFAULT false,
    track_count INTEGER NOT NULL DEFAULT 0,
    total_duration_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Playlist tracks (junction table)
CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_track_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    playlist_id VARCHAR(255) NOT NULL REFERENCES playlists(playlist_id) ON DELETE CASCADE,
    content_id VARCHAR(255) NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_by VARCHAR(255) REFERENCES users(wallet_address),
    CONSTRAINT playlist_tracks_playlist_content_unique UNIQUE (playlist_id, content_id)
);

-- Playlist collaborators (for collaborative playlists)
CREATE TABLE IF NOT EXISTS playlist_collaborators (
    playlist_id VARCHAR(255) NOT NULL REFERENCES playlists(playlist_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    can_edit BOOLEAN NOT NULL DEFAULT true,
    can_add_tracks BOOLEAN NOT NULL DEFAULT true,
    can_remove_tracks BOOLEAN NOT NULL DEFAULT true,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (playlist_id, user_id)
);

-- User listening history (for recommendations)
CREATE TABLE IF NOT EXISTS listening_history (
    history_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    content_id VARCHAR(255) NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
    listened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_public ON playlists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_content_id ON playlist_tracks(content_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_playlist_id ON playlist_collaborators(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_user_id ON playlist_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_user_id ON listening_history(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_content_id ON listening_history(content_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_listened_at ON listening_history(listened_at DESC);

-- Function to update playlist track_count and total_duration
CREATE OR REPLACE FUNCTION update_playlist_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE playlists
        SET 
            track_count = (
                SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = NEW.playlist_id
            ),
            updated_at = NOW()
        WHERE playlist_id = NEW.playlist_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE playlists
        SET 
            track_count = (
                SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = OLD.playlist_id
            ),
            updated_at = NOW()
        WHERE playlist_id = OLD.playlist_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update playlist stats
DROP TRIGGER IF EXISTS trigger_update_playlist_stats ON playlist_tracks;
CREATE TRIGGER trigger_update_playlist_stats
    AFTER INSERT OR DELETE ON playlist_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_playlist_stats();

-- Comments
COMMENT ON TABLE playlists IS 'User-created playlists for organizing content';
COMMENT ON TABLE playlist_tracks IS 'Tracks within playlists with ordering';
COMMENT ON TABLE playlist_collaborators IS 'Collaborators for collaborative playlists';
COMMENT ON TABLE listening_history IS 'User listening history for recommendations';

