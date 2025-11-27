#!/bin/bash
# ✅ Iniciar servidor y ejecutar tests automáticamente

set -e

cd "$(dirname "$0")/../dujyo-backend"

echo "🚀 INICIANDO SERVIDOR Y EJECUTANDO TESTS"
echo "========================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Detener servidor anterior si existe
echo "1️⃣  Deteniendo servidor anterior (si existe)..."
pkill -f "xwavve-backend" 2>/dev/null || echo "   No hay servidor anterior"
sleep 2

# Iniciar servidor en background
echo ""
echo "2️⃣  Iniciando servidor..."
cargo run --bin xwavve-backend > /tmp/dujyo_server.log 2>&1 &
SERVER_PID=$!
echo "   Servidor iniciado (PID: $SERVER_PID)"
echo "   Logs: /tmp/dujyo_server.log"

# Esperar a que el servidor esté listo
echo ""
echo "3️⃣  Esperando a que el servidor esté listo..."
for i in {1..30}; do
    if curl -s http://localhost:8083/health > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Servidor listo!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "   ${RED}❌ Servidor no respondió después de 30 intentos${NC}"
        echo "   Revisa los logs: tail -f /tmp/dujyo_server.log"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
    echo "   Intento $i/30..."
    sleep 2
done

# Ejecutar tests
echo ""
echo "4️⃣  Ejecutando tests..."
echo ""

cd "$(dirname "$0")/.."

# Test 1: Diagnóstico
echo "TEST 1: Diagnóstico Simple"
echo "---------------------------"
./scripts/diagnostico_simple.sh 2>&1 | tail -20
echo ""

# Test 2: Métricas
echo "TEST 2: Métricas"
echo "-----------------"
METRICS=$(curl -s http://localhost:8083/api/v1/metrics 2>&1)
if echo "$METRICS" | grep -q "transactions\|rate_limiting\|redis"; then
    echo -e "${GREEN}✅ Métricas funcionando${NC}"
    echo "$METRICS" | jq '.' 2>/dev/null || echo "$METRICS"
else
    echo -e "${YELLOW}⚠️  Métricas no responde correctamente${NC}"
    echo "$METRICS"
fi
echo ""

# Test 3: Gas Fees (si hay credenciales)
if [ -f "/tmp/dujyo_test_credentials.txt" ]; then
    echo "TEST 3: Gas Fees"
    echo "----------------"
    source /tmp/dujyo_test_credentials.txt 2>/dev/null
    export JWT_TOKEN=$(curl -s -X POST http://localhost:8083/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r '.token // empty')
    
    if [ -n "$JWT_TOKEN" ]; then
        echo "✅ Token obtenido"
        BASE_URL="http://localhost:8083" ./scripts/test_gas_fees.sh 2>&1 | head -80
    else
        echo "❌ No se pudo obtener token"
    fi
    echo ""
fi

# Resumen
echo "=========================================="
echo "📊 RESUMEN"
echo "=========================================="
echo -e "${GREEN}✅ Tests completados${NC}"
echo ""
echo "Para detener el servidor:"
echo "  kill $SERVER_PID"
echo "  o: pkill -f xwavve-backend"
echo ""
echo "Para ver logs:"
echo "  tail -f /tmp/dujyo_server.log"

