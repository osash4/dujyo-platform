-- Migration: Create Tips System tables
-- Enables users to send tips directly to artists

CREATE TABLE IF NOT EXISTS tips (
    tip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_address VARCHAR(255) NOT NULL,
    receiver_address VARCHAR(255) NOT NULL,
    amount DECIMAL(20,6) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'DYO',
    message TEXT,
    content_id VARCHAR(255), -- Optional: tip for specific content
    tx_hash VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_public BOOLEAN DEFAULT TRUE -- Show in public feed
);

CREATE TABLE IF NOT EXISTS artist_tip_stats (
    artist_address VARCHAR(255) PRIMARY KEY,
    total_tips_received DECIMAL(20,6) DEFAULT 0,
    tip_count INTEGER DEFAULT 0,
    last_tip_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_tip_stats (
    user_address VARCHAR(255) PRIMARY KEY,
    total_tips_sent DECIMAL(20,6) DEFAULT 0,
    tip_count INTEGER DEFAULT 0,
    last_tip_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tips_receiver ON tips(receiver_address);
CREATE INDEX IF NOT EXISTS idx_tips_sender ON tips(sender_address);
CREATE INDEX IF NOT EXISTS idx_tips_content ON tips(content_id);
CREATE INDEX IF NOT EXISTS idx_tips_created ON tips(created_at DESC);

-- Materialized view para leaderboard (se refresca manualmente o con trigger)
CREATE MATERIALIZED VIEW IF NOT EXISTS tip_leaderboard AS
SELECT 
    receiver_address as artist_address,
    COUNT(*) as tip_count,
    SUM(amount) as total_received,
    MAX(created_at) as last_tip
FROM tips
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY receiver_address
ORDER BY total_received DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tip_leaderboard ON tip_leaderboard(artist_address);

-- Función para refrescar leaderboard
CREATE OR REPLACE FUNCTION refresh_tip_leaderboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW tip_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- Trigger para refrescar leaderboard automáticamente (comentado por performance)
-- CREATE TRIGGER refresh_tip_leaderboard_trigger
-- AFTER INSERT OR UPDATE ON tips
-- FOR EACH STATEMENT
-- EXECUTE FUNCTION refresh_tip_leaderboard();

-- Comentarios
COMMENT ON TABLE tips IS 'Tips enviados de usuarios a artistas';
COMMENT ON TABLE artist_tip_stats IS 'Estadísticas de tips recibidos por artista';
COMMENT ON TABLE user_tip_stats IS 'Estadísticas de tips enviados por usuario';
COMMENT ON MATERIALIZED VIEW tip_leaderboard IS 'Leaderboard de artistas más apoyados (últimos 30 días)';

