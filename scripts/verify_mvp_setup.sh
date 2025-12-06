#!/bin/bash
set -e

echo "🔍 VERIFICACIÓN COMPLETA DEL MVP DUJYO"
echo "========================================"
echo ""

# 1. Verificar migración S2E
echo "1. Verificando migración S2E..."
POOL_COUNT=$(psql -U dujyo_user -d dujyo_db -t -c "SELECT COUNT(*) FROM s2e_monthly_pools WHERE month_year = TO_CHAR(NOW(), 'YYYY-MM');" | xargs)
if [ "$POOL_COUNT" -gt 0 ]; then
    echo "   ✅ Pool S2E inicializado para el mes actual"
    psql -U dujyo_user -d dujyo_db -c "SELECT month_year, remaining_amount FROM s2e_monthly_pools WHERE month_year = TO_CHAR(NOW(), 'YYYY-MM');" 2>&1 | grep -E "2025|2000000"
else
    echo "   ❌ Pool S2E no encontrado"
fi

# 2. Verificar tablas
echo ""
echo "2. Verificando tablas..."
TABLES="s2e_monthly_pools stream_earnings tips artist_tip_stats"
for table in $TABLES; do
    EXISTS=$(psql -U dujyo_user -d dujyo_db -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | xargs)
    if [ "$EXISTS" = "t" ]; then
        echo "   ✅ Tabla '$table' existe"
    else
        echo "   ❌ Tabla '$table' NO existe"
    fi
done

# 3. Verificar endpoint en backend
echo ""
echo "3. Verificando endpoint tips_routes en backend..."
if grep -q "tips_routes" dujyo-backend/src/server.rs; then
    echo "   ✅ tips_routes registrado en server.rs"
else
    echo "   ❌ tips_routes NO registrado"
fi

if grep -q "pub fn tips_routes" dujyo-backend/src/routes/upload.rs; then
    echo "   ✅ tips_routes definido en upload.rs"
else
    echo "   ❌ tips_routes NO definido"
fi

# 4. Verificar frontend
echo ""
echo "4. Verificando ArtistDashboard.tsx..."
if grep -q "loadTipsReceived" dujyo-frontend/src/components/artist/ArtistDashboard.tsx; then
    echo "   ✅ loadTipsReceived definido"
else
    echo "   ❌ loadTipsReceived NO definido"
fi

if grep -q "/api/tips/artist" dujyo-frontend/src/components/artist/ArtistDashboard.tsx; then
    echo "   ✅ Endpoint /api/tips/artist usado"
else
    echo "   ⚠️  Endpoint /api/tips/artist no encontrado (puede usar fallback)"
fi

echo ""
echo "🎉 VERIFICACIÓN COMPLETA"
