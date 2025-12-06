-- Script para actualizar direcciones de wallet de XW a DU
-- Ejecutar con: psql -U dujyo_user -d dujyo_db -f update_wallets_xw_to_du.sql

BEGIN;

-- Mostrar conteo antes de actualizar
SELECT '=== CONTEOS ANTES DE ACTUALIZAR ===' as info;

SELECT 'artist_tip_stats' as tabla, COUNT(*) as xw_count 
FROM artist_tip_stats WHERE artist_address LIKE 'XW%'
UNION ALL
SELECT 'content_licenses', COUNT(*) 
FROM content_licenses WHERE buyer_address LIKE 'XW%'
UNION ALL
SELECT 'content_listings', COUNT(*) 
FROM content_listings WHERE seller_address LIKE 'XW%'
UNION ALL
SELECT 'content_purchases', COUNT(*) 
FROM content_purchases WHERE buyer_address LIKE 'XW%'
UNION ALL
SELECT 'stream_earnings (user_address)', COUNT(*) 
FROM stream_earnings WHERE user_address LIKE 'XW%'
UNION ALL
SELECT 'stream_earnings (artist_id)', COUNT(*) 
FROM stream_earnings WHERE artist_id LIKE 'XW%'
UNION ALL
SELECT 'tips (sender_address)', COUNT(*) 
FROM tips WHERE sender_address LIKE 'XW%'
UNION ALL
SELECT 'tips (receiver_address)', COUNT(*) 
FROM tips WHERE receiver_address LIKE 'XW%'
UNION ALL
SELECT 'user_tip_stats', COUNT(*) 
FROM user_tip_stats WHERE user_address LIKE 'XW%';

-- Actualizar artist_tip_stats
UPDATE artist_tip_stats 
SET artist_address = 'DU' || SUBSTRING(artist_address FROM 3)
WHERE artist_address LIKE 'XW%';

-- Actualizar content_licenses
UPDATE content_licenses 
SET buyer_address = 'DU' || SUBSTRING(buyer_address FROM 3)
WHERE buyer_address LIKE 'XW%';

-- Actualizar content_listings
UPDATE content_listings 
SET seller_address = 'DU' || SUBSTRING(seller_address FROM 3)
WHERE seller_address LIKE 'XW%';

-- Actualizar content_purchases
UPDATE content_purchases 
SET buyer_address = 'DU' || SUBSTRING(buyer_address FROM 3)
WHERE buyer_address LIKE 'XW%';

-- Actualizar stream_earnings (user_address)
UPDATE stream_earnings 
SET user_address = 'DU' || SUBSTRING(user_address FROM 3)
WHERE user_address LIKE 'XW%';

-- Actualizar stream_earnings (artist_id)
UPDATE stream_earnings 
SET artist_id = 'DU' || SUBSTRING(artist_id FROM 3)
WHERE artist_id LIKE 'XW%';

-- Actualizar tips (sender_address)
UPDATE tips 
SET sender_address = 'DU' || SUBSTRING(sender_address FROM 3)
WHERE sender_address LIKE 'XW%';

-- Actualizar tips (receiver_address)
UPDATE tips 
SET receiver_address = 'DU' || SUBSTRING(receiver_address FROM 3)
WHERE receiver_address LIKE 'XW%';

-- Actualizar user_tip_stats
UPDATE user_tip_stats 
SET user_address = 'DU' || SUBSTRING(user_address FROM 3)
WHERE user_address LIKE 'XW%';

-- Actualizar stream_logs (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stream_logs') THEN
        UPDATE stream_logs 
        SET user_address = 'DU' || SUBSTRING(user_address FROM 3)
        WHERE user_address LIKE 'XW%';
        
        UPDATE stream_logs 
        SET artist_id = 'DU' || SUBSTRING(artist_id FROM 3)
        WHERE artist_id LIKE 'XW%';
    END IF;
END $$;

-- Actualizar user_daily_usage (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_daily_usage') THEN
        UPDATE user_daily_usage 
        SET user_address = 'DU' || SUBSTRING(user_address FROM 3)
        WHERE user_address LIKE 'XW%';
    END IF;
END $$;

-- Actualizar content_stream_limits (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_stream_limits') THEN
        UPDATE content_stream_limits 
        SET user_address = 'DU' || SUBSTRING(user_address FROM 3)
        WHERE user_address LIKE 'XW%';
    END IF;
END $$;

-- Mostrar conteo después de actualizar
SELECT '=== CONTEOS DESPUÉS DE ACTUALIZAR ===' as info;

SELECT 'artist_tip_stats' as tabla, COUNT(*) as xw_count 
FROM artist_tip_stats WHERE artist_address LIKE 'XW%'
UNION ALL
SELECT 'content_licenses', COUNT(*) 
FROM content_licenses WHERE buyer_address LIKE 'XW%'
UNION ALL
SELECT 'content_listings', COUNT(*) 
FROM content_listings WHERE seller_address LIKE 'XW%'
UNION ALL
SELECT 'content_purchases', COUNT(*) 
FROM content_purchases WHERE buyer_address LIKE 'XW%'
UNION ALL
SELECT 'stream_earnings (user_address)', COUNT(*) 
FROM stream_earnings WHERE user_address LIKE 'XW%'
UNION ALL
SELECT 'stream_earnings (artist_id)', COUNT(*) 
FROM stream_earnings WHERE artist_id LIKE 'XW%'
UNION ALL
SELECT 'tips (sender_address)', COUNT(*) 
FROM tips WHERE sender_address LIKE 'XW%'
UNION ALL
SELECT 'tips (receiver_address)', COUNT(*) 
FROM tips WHERE receiver_address LIKE 'XW%'
UNION ALL
SELECT 'user_tip_stats', COUNT(*) 
FROM user_tip_stats WHERE user_address LIKE 'XW%';

-- Mostrar resumen de actualizaciones
SELECT '=== RESUMEN DE ACTUALIZACIONES ===' as info;
SELECT 
    'Total actualizado' as resumen,
    (SELECT COUNT(*) FROM artist_tip_stats WHERE artist_address LIKE 'DU%' AND artist_address NOT LIKE 'XW%') +
    (SELECT COUNT(*) FROM content_licenses WHERE buyer_address LIKE 'DU%' AND buyer_address NOT LIKE 'XW%') +
    (SELECT COUNT(*) FROM content_listings WHERE seller_address LIKE 'DU%' AND seller_address NOT LIKE 'XW%') +
    (SELECT COUNT(*) FROM content_purchases WHERE buyer_address LIKE 'DU%' AND buyer_address NOT LIKE 'XW%') +
    (SELECT COUNT(*) FROM stream_earnings WHERE (user_address LIKE 'DU%' OR artist_id LIKE 'DU%') AND user_address NOT LIKE 'XW%' AND artist_id NOT LIKE 'XW%') +
    (SELECT COUNT(*) FROM tips WHERE (sender_address LIKE 'DU%' OR receiver_address LIKE 'DU%') AND sender_address NOT LIKE 'XW%' AND receiver_address NOT LIKE 'XW%') +
    (SELECT COUNT(*) FROM user_tip_stats WHERE user_address LIKE 'DU%' AND user_address NOT LIKE 'XW%')
    as total_registros_du;

COMMIT;

-- Verificar que no quedan direcciones XW
SELECT '=== VERIFICACIÓN FINAL ===' as info;

DO $$
DECLARE
    total_xw INTEGER := 0;
BEGIN
    -- Contar en tablas existentes
    SELECT COUNT(*) INTO total_xw FROM artist_tip_stats WHERE artist_address LIKE 'XW%';
    SELECT total_xw + COUNT(*) INTO total_xw FROM content_licenses WHERE buyer_address LIKE 'XW%';
    SELECT total_xw + COUNT(*) INTO total_xw FROM content_listings WHERE seller_address LIKE 'XW%';
    SELECT total_xw + COUNT(*) INTO total_xw FROM content_purchases WHERE buyer_address LIKE 'XW%';
    SELECT total_xw + COUNT(*) INTO total_xw FROM stream_earnings WHERE user_address LIKE 'XW%' OR artist_id LIKE 'XW%';
    SELECT total_xw + COUNT(*) INTO total_xw FROM tips WHERE sender_address LIKE 'XW%' OR receiver_address LIKE 'XW%';
    SELECT total_xw + COUNT(*) INTO total_xw FROM user_tip_stats WHERE user_address LIKE 'XW%';
    
    -- Contar en tablas opcionales
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stream_logs') THEN
        SELECT total_xw + COUNT(*) INTO total_xw FROM stream_logs WHERE user_address LIKE 'XW%' OR artist_id LIKE 'XW%';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_daily_usage') THEN
        SELECT total_xw + COUNT(*) INTO total_xw FROM user_daily_usage WHERE user_address LIKE 'XW%';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_stream_limits') THEN
        SELECT total_xw + COUNT(*) INTO total_xw FROM content_stream_limits WHERE user_address LIKE 'XW%';
    END IF;
    
    RAISE NOTICE 'Quedan direcciones XW: %', total_xw;
END $$;

