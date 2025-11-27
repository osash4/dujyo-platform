-- Migration: Create NFTs table
-- This table stores NFT metadata and ownership information

CREATE TABLE IF NOT EXISTS nfts (
    nft_id VARCHAR(255) PRIMARY KEY,
    owner_address VARCHAR(255) NOT NULL,
    token_uri TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    content_id VARCHAR(255), -- Optional link to content table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(owner_address);
CREATE INDEX IF NOT EXISTS idx_nfts_content ON nfts(content_id);
CREATE INDEX IF NOT EXISTS idx_nfts_created ON nfts(created_at DESC);

-- Add foreign key constraint if content table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content') THEN
        ALTER TABLE nfts 
        ADD CONSTRAINT fk_nfts_content 
        FOREIGN KEY (content_id) REFERENCES content(content_id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON TABLE nfts IS 'Stores NFT metadata and ownership information';
COMMENT ON COLUMN nfts.nft_id IS 'Unique identifier for the NFT';
COMMENT ON COLUMN nfts.owner_address IS 'Current owner wallet address';
COMMENT ON COLUMN nfts.token_uri IS 'URI pointing to NFT metadata (IPFS, etc.)';
COMMENT ON COLUMN nfts.metadata IS 'JSON metadata for the NFT';
COMMENT ON COLUMN nfts.content_id IS 'Optional link to content table (for content-based NFTs)';
