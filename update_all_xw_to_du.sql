-- Script para actualizar TODAS las direcciones XW a DU y borrar la wallet específica
-- Ejecutar con: psql -U dujyo_user -d dujyo_db -f update_all_xw_to_du.sql

BEGIN;

-- ============================================================================
-- PASO 1: BORRAR la wallet específica XW2829331f0b5147d1afc3d4c6570d973f
-- ============================================================================
SELECT '=== BORRANDO WALLET XW2829331f0b5147d1afc3d4c6570d973f ===' as info;

-- Borrar de artist_tip_stats
DELETE FROM artist_tip_stats WHERE artist_address = 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Borrar de content_licenses
DELETE FROM content_licenses WHERE buyer_address = 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Borrar de content_listings
DELETE FROM content_listings WHERE seller_address = 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Borrar de content_purchases
DELETE FROM content_purchases WHERE buyer_address = 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Borrar de stream_earnings
DELETE FROM stream_earnings WHERE user_address = 'XW2829331f0b5147d1afc3d4c6570d973f' OR artist_id = 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Borrar de tips
DELETE FROM tips WHERE sender_address = 'XW2829331f0b5147d1afc3d4c6570d973f' OR receiver_address = 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Borrar de user_tip_stats
DELETE FROM user_tip_stats WHERE user_address = 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Borrar de tablas opcionales si existen
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stream_logs') THEN
        DELETE FROM stream_logs WHERE user_address = 'XW2829331f0b5147d1afc3d4c6570d973f' OR artist_id = 'XW2829331f0b5147d1afc3d4c6570d973f';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_daily_usage') THEN
        DELETE FROM user_daily_usage WHERE user_address = 'XW2829331f0b5147d1afc3d4c6570d973f';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_stream_limits') THEN
        DELETE FROM content_stream_limits WHERE user_address = 'XW2829331f0b5147d1afc3d4c6570d973f';
    END IF;
END $$;

-- ============================================================================
-- PASO 2: ACTUALIZAR todas las direcciones XW a DU (excepto la que borramos)
-- ============================================================================
SELECT '=== ACTUALIZANDO TODAS LAS WALLETS XW A DU ===' as info;

-- Actualizar artist_tip_stats
UPDATE artist_tip_stats 
SET artist_address = 'DU' || SUBSTRING(artist_address FROM 3)
WHERE artist_address LIKE 'XW%' AND artist_address != 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Actualizar content_licenses
UPDATE content_licenses 
SET buyer_address = 'DU' || SUBSTRING(buyer_address FROM 3)
WHERE buyer_address LIKE 'XW%' AND buyer_address != 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Actualizar content_listings
UPDATE content_listings 
SET seller_address = 'DU' || SUBSTRING(seller_address FROM 3)
WHERE seller_address LIKE 'XW%' AND seller_address != 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Actualizar content_purchases
UPDATE content_purchases 
SET buyer_address = 'DU' || SUBSTRING(buyer_address FROM 3)
WHERE buyer_address LIKE 'XW%' AND buyer_address != 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Actualizar stream_earnings (user_address)
UPDATE stream_earnings 
SET user_address = 'DU' || SUBSTRING(user_address FROM 3)
WHERE user_address LIKE 'XW%' AND user_address != 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Actualizar stream_earnings (artist_id)
UPDATE stream_earnings 
SET artist_id = 'DU' || SUBSTRING(artist_id FROM 3)
WHERE artist_id LIKE 'XW%' AND artist_id != 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Actualizar tips (sender_address)
UPDATE tips 
SET sender_address = 'DU' || SUBSTRING(sender_address FROM 3)
WHERE sender_address LIKE 'XW%' AND sender_address != 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Actualizar tips (receiver_address)
UPDATE tips 
SET receiver_address = 'DU' || SUBSTRING(receiver_address FROM 3)
WHERE receiver_address LIKE 'XW%' AND receiver_address != 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Actualizar user_tip_stats
UPDATE user_tip_stats 
SET user_address = 'DU' || SUBSTRING(user_address FROM 3)
WHERE user_address LIKE 'XW%' AND user_address != 'XW2829331f0b5147d1afc3d4c6570d973f';

-- Actualizar tablas opcionales
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stream_logs') THEN
        UPDATE stream_logs 
        SET user_address = 'DU' || SUBSTRING(user_address FROM 3)
        WHERE user_address LIKE 'XW%' AND user_address != 'XW2829331f0b5147d1afc3d4c6570d973f';
        
        UPDATE stream_logs 
        SET artist_id = 'DU' || SUBSTRING(artist_id FROM 3)
        WHERE artist_id LIKE 'XW%' AND artist_id != 'XW2829331f0b5147d1afc3d4c6570d973f';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_daily_usage') THEN
        UPDATE user_daily_usage 
        SET user_address = 'DU' || SUBSTRING(user_address FROM 3)
        WHERE user_address LIKE 'XW%' AND user_address != 'XW2829331f0b5147d1afc3d4c6570d973f';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_stream_limits') THEN
        UPDATE content_stream_limits 
        SET user_address = 'DU' || SUBSTRING(user_address FROM 3)
        WHERE user_address LIKE 'XW%' AND user_address != 'XW2829331f0b5147d1afc3d4c6570d973f';
    END IF;
END $$;

-- ============================================================================
-- PASO 3: VERIFICACIÓN FINAL
-- ============================================================================
SELECT '=== VERIFICACIÓN FINAL ===' as info;

-- Verificar que no quedan direcciones XW
DO $$
DECLARE
    total_xw INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO total_xw FROM artist_tip_stats WHERE artist_address LIKE 'XW%';
    SELECT total_xw + COUNT(*) INTO total_xw FROM content_licenses WHERE buyer_address LIKE 'XW%';
    SELECT total_xw + COUNT(*) INTO total_xw FROM content_listings WHERE seller_address LIKE 'XW%';
    SELECT total_xw + COUNT(*) INTO total_xw FROM content_purchases WHERE buyer_address LIKE 'XW%';
    SELECT total_xw + COUNT(*) INTO total_xw FROM stream_earnings WHERE user_address LIKE 'XW%' OR artist_id LIKE 'XW%';
    SELECT total_xw + COUNT(*) INTO total_xw FROM tips WHERE sender_address LIKE 'XW%' OR receiver_address LIKE 'XW%';
    SELECT total_xw + COUNT(*) INTO total_xw FROM user_tip_stats WHERE user_address LIKE 'XW%';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stream_logs') THEN
        SELECT total_xw + COUNT(*) INTO total_xw FROM stream_logs WHERE user_address LIKE 'XW%' OR artist_id LIKE 'XW%';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_daily_usage') THEN
        SELECT total_xw + COUNT(*) INTO total_xw FROM user_daily_usage WHERE user_address LIKE 'XW%';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_stream_limits') THEN
        SELECT total_xw + COUNT(*) INTO total_xw FROM content_stream_limits WHERE user_address LIKE 'XW%';
    END IF;
    
    RAISE NOTICE 'Total direcciones XW restantes: %', total_xw;
    
    IF total_xw > 0 THEN
        RAISE WARNING 'Aún quedan % direcciones XW en la base de datos', total_xw;
    ELSE
        RAISE NOTICE '✅ Todas las direcciones XW han sido actualizadas o borradas';
    END IF;
END $$;

COMMIT;

