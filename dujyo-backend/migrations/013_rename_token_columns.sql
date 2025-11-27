-- Migration: 013_rename_token_columns.sql
-- Rename token balance columns from USXWV/USDYO to DYS
-- This migration updates existing database schemas

-- ============================================================================
-- RENAME COLUMN IN token_balances TABLE
-- ============================================================================

-- Check if column exists and rename it
DO $$
BEGIN
    -- Rename usdyo_balance to dys_balance if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_balances' 
        AND column_name = 'usdyo_balance'
    ) THEN
        ALTER TABLE token_balances 
        RENAME COLUMN usdyo_balance TO dys_balance;
        RAISE NOTICE 'Renamed column usdyo_balance to dys_balance';
    END IF;

    -- Rename usxwv_balance to dys_balance if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_balances' 
        AND column_name = 'usxwv_balance'
    ) THEN
        ALTER TABLE token_balances 
        RENAME COLUMN usxwv_balance TO dys_balance;
        RAISE NOTICE 'Renamed column usxwv_balance to dys_balance';
    END IF;
END $$;

-- ============================================================================
-- UPDATE INDEXES
-- ============================================================================

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_token_balances_usdyo;
DROP INDEX IF EXISTS idx_token_balances_usxwv;

-- Create new index for dys_balance
CREATE INDEX IF NOT EXISTS idx_token_balances_dys ON token_balances(dys_balance);

-- ============================================================================
-- UPDATE COMMENTS
-- ============================================================================

COMMENT ON COLUMN token_balances.dyo_balance IS 'DYO token balance (formerly XWV)';
COMMENT ON COLUMN token_balances.dys_balance IS 'DYS stablecoin balance (formerly USXWV/USDYO)';

