-- ============================================================================
-- MIGRACIÓN DE BASE DE DATOS: XWave → Dujyo
-- ============================================================================
-- Este script actualiza la base de datos existente para reflejar el rebranding
-- Ejecutar con cuidado y hacer backup primero
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. RENOMBRAR COLUMNAS EN token_balances
-- ============================================================================

-- Renombrar xwv_balance a dyo_balance
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_balances' 
        AND column_name = 'xwv_balance'
    ) THEN
        ALTER TABLE token_balances 
        RENAME COLUMN xwv_balance TO dyo_balance;
        RAISE NOTICE '✅ Renombrada columna xwv_balance → dyo_balance';
    END IF;
END $$;

-- Renombrar usxwv_balance a dys_balance
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_balances' 
        AND column_name = 'usxwv_balance'
    ) THEN
        ALTER TABLE token_balances 
        RENAME COLUMN usxwv_balance TO dys_balance;
        RAISE NOTICE '✅ Renombrada columna usxwv_balance → dys_balance';
    END IF;
END $$;

-- Renombrar usdyo_balance a dys_balance si existe (por si acaso)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'token_balances' 
        AND column_name = 'usdyo_balance'
    ) THEN
        ALTER TABLE token_balances 
        RENAME COLUMN usdyo_balance TO dys_balance;
        RAISE NOTICE '✅ Renombrada columna usdyo_balance → dys_balance';
    END IF;
END $$;

-- ============================================================================
-- 2. ACTUALIZAR ÍNDICES
-- ============================================================================

-- Eliminar índices antiguos
DROP INDEX IF EXISTS idx_token_balances_usdyo;
DROP INDEX IF EXISTS idx_token_balances_usxwv;
DROP INDEX IF EXISTS idx_token_balances_xwv;

-- Crear nuevos índices
CREATE INDEX IF NOT EXISTS idx_token_balances_dyo ON token_balances(dyo_balance);
CREATE INDEX IF NOT EXISTS idx_token_balances_dys ON token_balances(dys_balance);

-- ============================================================================
-- 3. ACTUALIZAR COMENTARIOS EN COLUMNAS
-- ============================================================================

COMMENT ON COLUMN token_balances.dyo_balance IS 'DYO token balance (formerly XWV)';
COMMENT ON COLUMN token_balances.dys_balance IS 'DYS stablecoin balance (formerly USXWV/USDYO)';

-- ============================================================================
-- 4. ACTUALIZAR DATOS EN native_tokens (si existe la tabla)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'native_tokens') THEN
        UPDATE native_tokens 
        SET 
            name = 'Dujyo Token',
            symbol = 'DYO'
        WHERE symbol = 'XWV' OR name LIKE '%XWave%';

        UPDATE native_tokens 
        SET 
            name = 'Dujyo USD Stablecoin',
            symbol = 'DYS'
        WHERE symbol = 'USXWV' OR symbol = 'USDYO' OR name LIKE '%USXWV%';
        
        RAISE NOTICE '✅ Datos en native_tokens actualizados';
    ELSE
        RAISE NOTICE 'ℹ️  Tabla native_tokens no existe, omitiendo actualización';
    END IF;
END $$;

-- ============================================================================
-- 5. ACTUALIZAR COMENTARIOS EN TABLAS
-- ============================================================================

COMMENT ON TABLE token_balances IS 'Token balances for DYO and DYS tokens (formerly XWV and USXWV)';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'native_tokens') THEN
        COMMENT ON TABLE native_tokens IS 'Native tokens for Dujyo blockchain (formerly XWave)';
    END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
    col_count INTEGER;
    dyo_exists BOOLEAN;
    dys_exists BOOLEAN;
BEGIN
    -- Verificar que las columnas existen
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'token_balances' AND column_name = 'dyo_balance'
    ) INTO dyo_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'token_balances' AND column_name = 'dys_balance'
    ) INTO dys_exists;
    
    IF dyo_exists AND dys_exists THEN
        RAISE NOTICE '✅ Verificación exitosa: Columnas dyo_balance y dys_balance existen';
    ELSE
        RAISE WARNING '⚠️  Advertencia: dyo_balance=% , dys_balance=%', dyo_exists, dys_exists;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- RESUMEN (antes del commit)
-- ============================================================================

SELECT 
    'Migración completada' as status,
    COUNT(*) as token_balances_updated
FROM token_balances
WHERE dys_balance IS NOT NULL;

