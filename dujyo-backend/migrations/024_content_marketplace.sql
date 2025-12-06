-- Migration: Create Content Marketplace tables
-- Enables artists to sell their content directly to buyers

-- Tabla principal de listings
CREATE TABLE IF NOT EXISTS content_listings (
    listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR(255) NOT NULL,
    seller_address VARCHAR(255) NOT NULL,
    price DECIMAL(20,6) NOT NULL CHECK (price > 0),
    currency VARCHAR(10) DEFAULT 'DYO',
    license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('personal', 'commercial', 'exclusive')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(content_id, seller_address, license_type)
);

-- Tabla de compras
CREATE TABLE IF NOT EXISTS content_purchases (
    purchase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES content_listings(listing_id) ON DELETE CASCADE,
    buyer_address VARCHAR(255) NOT NULL,
    amount DECIMAL(20,6) NOT NULL CHECK (amount > 0),
    tx_hash VARCHAR(255),
    license_key VARCHAR(255) UNIQUE NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked'))
);

-- Tabla de licencias (para verificación)
CREATE TABLE IF NOT EXISTS content_licenses (
    license_key VARCHAR(255) PRIMARY KEY,
    purchase_id UUID NOT NULL REFERENCES content_purchases(purchase_id) ON DELETE CASCADE,
    content_id VARCHAR(255) NOT NULL,
    buyer_address VARCHAR(255) NOT NULL,
    license_type VARCHAR(50) NOT NULL,
    terms TEXT,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_valid BOOLEAN DEFAULT TRUE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_content_listings_seller ON content_listings(seller_address);
CREATE INDEX IF NOT EXISTS idx_content_listings_status ON content_listings(status);
CREATE INDEX IF NOT EXISTS idx_content_listings_content ON content_listings(content_id);
CREATE INDEX IF NOT EXISTS idx_content_purchases_buyer ON content_purchases(buyer_address);
CREATE INDEX IF NOT EXISTS idx_content_purchases_listing ON content_purchases(listing_id);
CREATE INDEX IF NOT EXISTS idx_content_licenses_buyer ON content_licenses(buyer_address);
CREATE INDEX IF NOT EXISTS idx_content_licenses_content ON content_licenses(content_id);
CREATE INDEX IF NOT EXISTS idx_content_licenses_valid ON content_licenses(is_valid) WHERE is_valid = TRUE;

-- Comentarios
COMMENT ON TABLE content_listings IS 'Listings de contenido en el marketplace';
COMMENT ON TABLE content_purchases IS 'Registro de compras realizadas';
COMMENT ON TABLE content_licenses IS 'Licencias generadas para compradores';

