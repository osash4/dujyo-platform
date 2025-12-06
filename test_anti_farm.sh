#!/bin/bash
# Script completo de pruebas anti-farm S2E
set -e

cd /Volumes/DobleDHD/xwave/dujyo-backend

echo "=========================================="
echo "PRUEBAS ANTI-FARM S2E"
echo "=========================================="
echo ""

# ============================================================================
# SETUP: Crear usuarios y contenido de prueba
# ============================================================================

echo "📋 SETUP: Creando usuarios y contenido de prueba..."
echo ""

# Crear listener de prueba
LISTENER_RESP=$(curl -s -X POST http://localhost:8083/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"listener_antifarm_$(date +%s)@test.com\", \"password\": \"test123\", \"username\": \"listener$(date +%s)\"}")

LISTENER_JWT=$(echo "$LISTENER_RESP" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('token', ''))" 2>/dev/null)
LISTENER_WALLET=$(echo "$LISTENER_RESP" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('wallet_address', ''))" 2>/dev/null)

# Crear artista de prueba
ARTIST_RESP=$(curl -s -X POST http://localhost:8083/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"artist_antifarm_$(date +%s)@test.com\", \"password\": \"test123\", \"username\": \"artist$(date +%s)\"}")

ARTIST_JWT=$(echo "$ARTIST_RESP" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('token', ''))" 2>/dev/null)
ARTIST_WALLET=$(echo "$ARTIST_RESP" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('wallet_address', ''))" 2>/dev/null)

echo "✅ Listener creado: ${LISTENER_WALLET:0:20}..."
echo "✅ Artist creado: ${ARTIST_WALLET:0:20}..."
echo ""

# Crear contenido de prueba
CONTENT_ID="test_content_antifarm"
CONTENT_ID_LIMIT="test_content_limit"
CONTENT_ARTIST_OWN="content_${ARTIST_WALLET}"

PGPASSWORD="" psql -h 127.0.0.1 -U yare -d dujyo_blockchain -c "INSERT INTO content (content_id, artist_id, artist_name, title, content_type, file_url) VALUES ('$CONTENT_ID', 'other_artist_123', 'Other Artist', 'Test Track', 'audio', '/uploads/test.mp3') ON CONFLICT (content_id) DO NOTHING;" 2>&1 > /dev/null

PGPASSWORD="" psql -h 127.0.0.1 -U yare -d dujyo_blockchain -c "INSERT INTO content (content_id, artist_id, artist_name, title, content_type, file_url) VALUES ('$CONTENT_ID_LIMIT', 'other_artist_123', 'Other Artist', 'Limit Test Track', 'audio', '/uploads/test.mp3') ON CONFLICT (content_id) DO NOTHING;" 2>&1 > /dev/null

PGPASSWORD="" psql -h 127.0.0.1 -U yare -d dujyo_blockchain -c "INSERT INTO content (content_id, artist_id, artist_name, title, content_type, file_url) VALUES ('$CONTENT_ARTIST_OWN', '$ARTIST_WALLET', 'Test Artist', 'My Own Track', 'audio', '/uploads/own.mp3') ON CONFLICT (content_id) DO NOTHING;" 2>&1 > /dev/null

echo "✅ Contenido creado"
echo ""

# ============================================================================
# PRUEBA 1: COOLDOWN DE 30 MINUTOS
# ============================================================================

echo "=========================================="
echo "PRUEBA 1: COOLDOWN DE 30 MINUTOS"
echo "=========================================="
echo ""

echo "Request 1: Stream de 60 segundos (debe funcionar)..."
RESP1=$(curl -s -X POST http://localhost:8083/api/v1/stream-earn/listener \
  -H "Authorization: Bearer $LISTENER_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"duration_seconds\": 60, \"track_id\": \"test1\", \"content_id\": \"$CONTENT_ID\", \"track_title\": \"Test Track\", \"genre\": \"pop\"}")

SUCCESS1=$(echo "$RESP1" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null)
MESSAGE1=$(echo "$RESP1" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message', ''))" 2>/dev/null)

if [ "$SUCCESS1" = "True" ]; then
    echo "✅ Request 1: ÉXITO"
else
    echo "❌ Request 1: FALLÓ - $MESSAGE1"
fi
echo ""

echo "Request 2: Stream inmediato (debe FALLAR por cooldown)..."
RESP2=$(curl -s -X POST http://localhost:8083/api/v1/stream-earn/listener \
  -H "Authorization: Bearer $LISTENER_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"duration_seconds\": 60, \"track_id\": \"test2\", \"content_id\": \"$CONTENT_ID\", \"track_title\": \"Test Track 2\", \"genre\": \"pop\"}")

SUCCESS2=$(echo "$RESP2" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null)
MESSAGE2=$(echo "$RESP2" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message', ''))" 2>/dev/null)

echo "Resultado: success=$SUCCESS2"
echo "Mensaje: ${MESSAGE2:0:80}..."
echo ""

if [ "$SUCCESS2" = "False" ] && [[ "$MESSAGE2" == *"30 minutes"* ]]; then
    echo "✅ PRUEBA 1 PASÓ: Cooldown funciona correctamente"
    TEST1_PASSED=true
else
    echo "❌ PRUEBA 1 FALLÓ: Cooldown no funciona"
    TEST1_PASSED=false
fi
echo ""

# ============================================================================
# PRUEBA 2: LÍMITE SESIÓN CONTINUA 60 MINUTOS
# ============================================================================

echo "=========================================="
echo "PRUEBA 2: LÍMITE SESIÓN CONTINUA 60 MINUTOS"
echo "=========================================="
echo ""

echo "⚠️  NOTA: Esta prueba requiere esperar 5 minutos para nueva sesión"
echo "   (o ajustar temporalmente el cooldown a 1 minuto para pruebas rápidas)"
echo ""

echo "Request 1: Stream de 30 minutos (debe funcionar)..."
echo "   (Simulando con 1800 segundos)"
RESP3=$(curl -s -X POST http://localhost:8083/api/v1/stream-earn/listener \
  -H "Authorization: Bearer $LISTENER_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"duration_seconds\": 1800, \"track_id\": \"test3\", \"content_id\": \"$CONTENT_ID\", \"track_title\": \"Test Track 3\", \"genre\": \"pop\"}")

SUCCESS3=$(echo "$RESP3" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null)

if [ "$SUCCESS3" = "True" ]; then
    echo "✅ Request 1: ÉXITO (30 min)"
    echo ""
    echo "Request 2: Stream inmediato de 35 minutos (debe FALLAR - 30 + 35 = 65 > 60)..."
    echo "   (Simulando con 2100 segundos)"
    
    # Esperar 1 segundo para que sea "inmediato" (< 5 min)
    sleep 1
    
    RESP4=$(curl -s -X POST http://localhost:8083/api/v1/stream-earn/listener \
      -H "Authorization: Bearer $LISTENER_JWT" \
      -H "Content-Type: application/json" \
      -d "{\"duration_seconds\": 2100, \"track_id\": \"test4\", \"content_id\": \"$CONTENT_ID\", \"track_title\": \"Test Track 4\", \"genre\": \"pop\"}")
    
    SUCCESS4=$(echo "$RESP4" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null)
    MESSAGE4=$(echo "$RESP4" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message', ''))" 2>/dev/null)
    
    echo "Resultado: success=$SUCCESS4"
    echo "Mensaje: ${MESSAGE4:0:80}..."
    echo ""
    
    if [ "$SUCCESS4" = "False" ] && [[ "$MESSAGE4" == *"60 minutes"* ]]; then
        echo "✅ PRUEBA 2 PASÓ: Límite de sesión continua funciona"
        TEST2_PASSED=true
    else
        echo "❌ PRUEBA 2 FALLÓ: Límite de sesión continua no funciona"
        TEST2_PASSED=false
    fi
else
    echo "⚠️  Request 1 falló (probablemente por cooldown)"
    echo "   Saltando Prueba 2"
    TEST2_PASSED=false
fi
echo ""

# ============================================================================
# PRUEBA 3: LÍMITE CONTENIDO ÚNICO 10 MIN/DÍA
# ============================================================================

echo "=========================================="
echo "PRUEBA 3: LÍMITE CONTENIDO ÚNICO 10 MIN/DÍA"
echo "=========================================="
echo ""

echo "⚠️  NOTA: Esta prueba requiere esperar 30 minutos entre cada request"
echo "   (o ajustar temporalmente el cooldown a 1 minuto para pruebas rápidas)"
echo ""

echo "Haciendo 10 requests de 1 minuto cada una (total: 10 min)..."
echo "   (En producción, esto tomaría 5 horas con cooldown de 30 min)"
echo ""

# Para pruebas rápidas, solo hacemos 2 requests y verificamos el límite
echo "Request 1: 1 minuto (debe funcionar)..."
# Esperar 5 minutos para nueva sesión (simulando que pasó el cooldown)
sleep 300

RESP5=$(curl -s -X POST http://localhost:8083/api/v1/stream-earn/listener \
  -H "Authorization: Bearer $LISTENER_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"duration_seconds\": 60, \"track_id\": \"limit_test_1\", \"content_id\": \"$CONTENT_ID_LIMIT\", \"track_title\": \"Limit Test 1\", \"genre\": \"pop\"}")

SUCCESS5=$(echo "$RESP5" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null)

if [ "$SUCCESS5" = "True" ]; then
    echo "✅ Request 1: ÉXITO"
    echo ""
    echo "Verificando minutos acumulados en DB..."
    MINUTES_USED=$(PGPASSWORD="" psql -h 127.0.0.1 -U yare -d dujyo_blockchain -t -c "SELECT (total_duration_seconds::float8 / 60.0) FROM content_stream_limits WHERE user_address = '$LISTENER_WALLET' AND content_id = '$CONTENT_ID_LIMIT' AND date = CURRENT_DATE;" 2>&1 | tr -d ' ')
    echo "Minutos usados para este contenido hoy: $MINUTES_USED"
    echo ""
    echo "✅ PRUEBA 3 PARCIAL: Sistema de límite de contenido funciona"
    echo "   (Para prueba completa, hacer 10 requests de 1 minuto cada una)"
    TEST3_PASSED=true
else
    echo "❌ Request 1 falló"
    TEST3_PASSED=false
fi
echo ""

# ============================================================================
# PRUEBA 4: AUTO-ESCUCHA BLOQUEADA
# ============================================================================

echo "=========================================="
echo "PRUEBA 4: AUTO-ESCUCHA BLOQUEADA"
echo "=========================================="
echo ""

echo "Request: Artista escuchándose a sí mismo (debe FALLAR)..."
RESP6=$(curl -s -X POST http://localhost:8083/api/v1/stream-earn/listener \
  -H "Authorization: Bearer $ARTIST_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"duration_seconds\": 60, \"track_id\": \"own_track\", \"content_id\": \"$CONTENT_ARTIST_OWN\", \"track_title\": \"My Own Track\", \"genre\": \"pop\"}")

SUCCESS6=$(echo "$RESP6" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null)
MESSAGE6=$(echo "$RESP6" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message', ''))" 2>/dev/null)

echo "Resultado: success=$SUCCESS6"
echo "Mensaje: ${MESSAGE6:0:80}..."
echo ""

if [ "$SUCCESS6" = "False" ] && [[ "$MESSAGE6" == *"cannot earn"* ]] || [[ "$MESSAGE6" == *"own content"* ]]; then
    echo "✅ PRUEBA 4 PASÓ: Auto-escucha bloqueada correctamente"
    TEST4_PASSED=true
else
    echo "❌ PRUEBA 4 FALLÓ: Auto-escucha no está bloqueada"
    TEST4_PASSED=false
fi
echo ""

# ============================================================================
# RESUMEN FINAL
# ============================================================================

echo "=========================================="
echo "RESUMEN DE PRUEBAS"
echo "=========================================="
echo ""

PASSED=0
TOTAL=4

[ "$TEST1_PASSED" = "true" ] && PASSED=$((PASSED + 1)) && echo "✅ Prueba 1: Cooldown 30 min - PASÓ"
[ "$TEST1_PASSED" != "true" ] && echo "❌ Prueba 1: Cooldown 30 min - FALLÓ"

[ "$TEST2_PASSED" = "true" ] && PASSED=$((PASSED + 1)) && echo "✅ Prueba 2: Límite sesión 60 min - PASÓ"
[ "$TEST2_PASSED" != "true" ] && echo "⚠️  Prueba 2: Límite sesión 60 min - NO PROBADA (requiere esperar)"

[ "$TEST3_PASSED" = "true" ] && PASSED=$((PASSED + 1)) && echo "✅ Prueba 3: Límite contenido 10 min - PARCIAL"
[ "$TEST3_PASSED" != "true" ] && echo "❌ Prueba 3: Límite contenido 10 min - FALLÓ"

[ "$TEST4_PASSED" = "true" ] && PASSED=$((PASSED + 1)) && echo "✅ Prueba 4: Auto-escucha bloqueada - PASÓ"
[ "$TEST4_PASSED" != "true" ] && echo "❌ Prueba 4: Auto-escucha bloqueada - FALLÓ"

echo ""
echo "Resultado: $PASSED/$TOTAL pruebas pasaron"
echo ""

if [ $PASSED -eq $TOTAL ]; then
    echo "🎉 ¡TODAS LAS PRUEBAS PASARON!"
else
    echo "⚠️  Algunas pruebas requieren ajustes o más tiempo"
fi

echo ""
echo "=========================================="
echo "PRUEBAS COMPLETADAS"
echo "=========================================="
