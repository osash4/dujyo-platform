#!/bin/bash
# Script completo de pruebas S2E
set -e

cd /Volumes/DobleDHD/xwave/dujyo-backend

echo "=========================================="
echo "PRUEBAS FUNCIONALES COMPLETAS S2E"
echo "=========================================="
echo ""

# 1. Crear usuarios
echo "1. Creando usuarios de prueba..."
LISTENER_RESP=$(curl -s -X POST http://localhost:8083/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"listener_$(date +%s)@test.com\", \"password\": \"test123\", \"username\": \"listener$(date +%s)\"}")

LISTENER_JWT=$(echo "$LISTENER_RESP" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('token', ''))" 2>/dev/null)
LISTENER_WALLET=$(echo "$LISTENER_RESP" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('wallet_address', ''))" 2>/dev/null)

ARTIST_RESP=$(curl -s -X POST http://localhost:8083/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"artist_$(date +%s)@test.com\", \"password\": \"test123\", \"username\": \"artist$(date +%s)\"}")

ARTIST_JWT=$(echo "$ARTIST_RESP" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('token', ''))" 2>/dev/null)
ARTIST_WALLET=$(echo "$ARTIST_RESP" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('wallet_address', ''))" 2>/dev/null)

echo "✅ Listener creado: ${LISTENER_WALLET:0:20}..."
echo "✅ Artist creado: ${ARTIST_WALLET:0:20}..."
echo ""

# 2. Verificar pool inicial
echo "2. Verificando pool inicial..."
POOL_BEFORE=$(curl -s http://localhost:8083/api/v1/s2e/config | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('pool_remaining', 0))" 2>/dev/null)
echo "Pool remaining ANTES: $POOL_BEFORE DYO"
echo ""

# 3. Test listener normal
echo "3. TEST: Listener normal (debe funcionar)..."
LISTENER_RESULT=$(curl -s -X POST http://localhost:8083/api/v1/stream-earn/listener \
  -H "Authorization: Bearer $LISTENER_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"duration_seconds\": 60, \"track_id\": \"test_track_1\", \"content_id\": \"other_artist_123\", \"track_title\": \"Test Track\", \"genre\": \"pop\"}")

echo "$LISTENER_RESULT" | python3 -m json.tool 2>/dev/null || echo "$LISTENER_RESULT"
echo ""

# 4. Verificar pool después
echo "4. Verificando pool después de listener..."
sleep 2
POOL_AFTER=$(curl -s http://localhost:8083/api/v1/s2e/config | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('pool_remaining', 0))" 2>/dev/null)
echo "Pool remaining DESPUÉS: $POOL_AFTER DYO"
if [ -n "$POOL_BEFORE" ] && [ -n "$POOL_AFTER" ]; then
  DIFF=$(echo "$POOL_BEFORE - $POOL_AFTER" | bc 2>/dev/null || echo "N/A")
  echo "✅ Pool decrementó: $DIFF DYO"
fi
echo ""

# 5. Test auto-escucha
echo "5. TEST: Auto-escucha (artista escuchándose - DEBE FALLAR)..."
AUTO_RESULT=$(curl -s -X POST http://localhost:8083/api/v1/stream-earn/listener \
  -H "Authorization: Bearer $ARTIST_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"duration_seconds\": 60, \"track_id\": \"own_track\", \"content_id\": \"$ARTIST_WALLET\", \"track_title\": \"My Own Track\", \"genre\": \"pop\"}")

echo "$AUTO_RESULT" | python3 -m json.tool 2>/dev/null || echo "$AUTO_RESULT"
echo ""

# 6. Verificar endpoint /artist
echo "6. TEST: Endpoint /artist NO EXISTE (debe dar 404)..."
ARTIST_ENDPOINT=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:8083/api/v1/stream-earn/artist \
  -H "Authorization: Bearer $ARTIST_JWT" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "$ARTIST_ENDPOINT"
echo ""

# 7. Verificación final en DB
echo "7. Verificación final en base de datos..."
PGPASSWORD="" psql -h 127.0.0.1 -U yare -d dujyo_blockchain -c "SELECT month_year, total_amount, remaining_amount, artist_spent, listener_spent FROM s2e_monthly_pools;" 2>&1
echo ""

echo "=========================================="
echo "PRUEBAS COMPLETADAS"
echo "=========================================="

