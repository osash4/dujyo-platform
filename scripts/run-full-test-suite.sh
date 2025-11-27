#!/bin/bash
# ✅ Test Suite Completo Automatizado - Implementaciones P0
# Inicia servidor, ejecuta tests, captura resultados, apaga servidor

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$BASE_DIR/xwave-backend"
TEST_DIR="$BASE_DIR"
HEALTH_CHECK_URL="http://localhost:8083/health"
MAX_WAIT_TIME=60  # Maximum seconds to wait for server
WAIT_INTERVAL=2   # Seconds between health check attempts

# Log files
LOG_DIR="$BASE_DIR/test-logs-$(date +%Y%m%d_%H%M%S)"
SERVER_LOG="$LOG_DIR/server.log"
TEST_LOG="$LOG_DIR/tests.log"
REPORT_FILE="$LOG_DIR/test-report.md"

# Initialize
mkdir -p "$LOG_DIR"
SERVER_PID=""
TEST_EXIT_CODE=0

# Cleanup function
cleanup() {
    echo ""
    echo -e "${BLUE}🧹 Limpiando...${NC}"
    
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        echo -e "${YELLOW}🛑 Apagando servidor (PID: $SERVER_PID)...${NC}"
        kill "$SERVER_PID" 2>/dev/null || true
        sleep 2
        
        # Force kill if still running
        if kill -0 "$SERVER_PID" 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Forzando cierre del servidor...${NC}"
            kill -9 "$SERVER_PID" 2>/dev/null || true
        fi
        
        wait "$SERVER_PID" 2>/dev/null || true
        echo -e "${GREEN}✅ Servidor apagado${NC}"
    fi
}

# Trap to ensure cleanup on exit
trap cleanup EXIT INT TERM

echo -e "${BLUE}🧪 ==========================================${NC}"
echo -e "${BLUE}🧪 TEST SUITE COMPLETO - IMPLEMENTACIONES P0${NC}"
echo -e "${BLUE}🧪 ==========================================${NC}"
echo ""
echo "📁 Directorio base: $BASE_DIR"
echo "📁 Logs: $LOG_DIR"
echo ""

# Step 1: Start server in background
echo -e "${BLUE}📋 PASO 1: Iniciando servidor backend...${NC}"
cd "$BACKEND_DIR"

# Check if already running
if curl -f "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Servidor ya está corriendo en http://localhost:8083${NC}"
    echo -e "${YELLOW}   Usando servidor existente...${NC}"
    SERVER_PID=""
else
    echo "   Compilando y ejecutando servidor..."
    cargo run --bin xwavve-backend > "$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    echo -e "${GREEN}✅ Servidor iniciado con PID: $SERVER_PID${NC}"
    echo "   Logs: $SERVER_LOG"
fi

# Step 2: Wait for server to be ready
echo ""
echo -e "${BLUE}📋 PASO 2: Esperando que servidor esté listo...${NC}"

WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT_TIME ]; do
    if curl -f "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Servidor listo!${NC}"
        break
    fi
    
    echo "   Esperando... ($WAIT_COUNT/$MAX_WAIT_TIME segundos)"
    sleep $WAIT_INTERVAL
    WAIT_COUNT=$((WAIT_COUNT + WAIT_INTERVAL))
    
    # Check if server process is still running
    if [ -n "$SERVER_PID" ] && ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo -e "${RED}❌ Servidor se detuvo inesperadamente${NC}"
        echo "   Últimas líneas del log:"
        tail -20 "$SERVER_LOG" || true
        exit 1
    fi
done

if [ $WAIT_COUNT -ge $MAX_WAIT_TIME ]; then
    echo -e "${RED}❌ Timeout esperando servidor${NC}"
    echo "   Últimas líneas del log:"
    tail -20 "$SERVER_LOG" || true
    exit 1
fi

# Verify health check
echo ""
echo -e "${BLUE}📋 Verificando health check...${NC}"
HEALTH_RESPONSE=$(curl -s "$HEALTH_CHECK_URL" || echo "")
if [ -z "$HEALTH_RESPONSE" ]; then
    echo -e "${RED}❌ Health check falló${NC}"
    exit 1
fi
echo "   Response: $HEALTH_RESPONSE" | head -1

# Step 3: Run tests
echo ""
echo -e "${BLUE}📋 PASO 3: Ejecutando tests completos...${NC}"
cd "$TEST_DIR"

# Run main test script
if [ -f "./scripts/test-p0-implementations.sh" ]; then
    echo "   Ejecutando: ./scripts/test-p0-implementations.sh"
    ./scripts/test-p0-implementations.sh > "$TEST_LOG" 2>&1 || TEST_EXIT_CODE=$?
else
    echo -e "${YELLOW}⚠️  Script test-p0-implementations.sh no encontrado${NC}"
    echo "   Ejecutando tests individuales..."
    
    # Run individual tests
    TEST_EXIT_CODE=0
    
    echo ""
    echo "   Test 1: Health Checks"
    ./scripts/test-cors.sh >> "$TEST_LOG" 2>&1 || TEST_EXIT_CODE=$?
    
    echo "   Test 2: CORS"
    ./scripts/test-cors.sh >> "$TEST_LOG" 2>&1 || TEST_EXIT_CODE=$?
    
    echo "   Test 3: Password Reset"
    ./scripts/test-password-reset.sh "test_$(date +%s)@example.com" >> "$TEST_LOG" 2>&1 || TEST_EXIT_CODE=$?
    
    echo "   Test 4: Backups"
    ./scripts/test-backups.sh "./test-backups-$(date +%s)" >> "$TEST_LOG" 2>&1 || TEST_EXIT_CODE=$?
fi

# Step 4: Generate report
echo ""
echo -e "${BLUE}📋 PASO 4: Generando reporte...${NC}"

cat > "$REPORT_FILE" <<EOF
# 🧪 REPORTE DE TESTING - IMPLEMENTACIONES P0

**Fecha:** $(date)
**Ejecutado por:** Automated Test Suite
**Estado:** $([ $TEST_EXIT_CODE -eq 0 ] && echo "✅ EXITOSO" || echo "❌ FALLIDO")

---

## 📊 RESUMEN

- **Servidor PID:** ${SERVER_PID:-"N/A (usando existente)"}
- **Código de Salida:** $TEST_EXIT_CODE
- **Logs:** $LOG_DIR

---

## 📋 RESULTADOS

### Health Check Inicial:
\`\`\`
$HEALTH_RESPONSE
\`\`\`

### Logs del Servidor:
\`\`\`
$(tail -50 "$SERVER_LOG" 2>/dev/null || echo "No hay logs del servidor")
\`\`\`

### Resultados de Tests:
\`\`\`
$(tail -100 "$TEST_LOG" 2>/dev/null || echo "No hay logs de tests")
\`\`\`

---

## ✅ CONCLUSIÓN

$([ $TEST_EXIT_CODE -eq 0 ] && echo "✅ **TODOS LOS TESTS PASARON**" || echo "❌ **ALGUNOS TESTS FALLARON**")

**Código de salida:** $TEST_EXIT_CODE

---

**Ver logs completos en:** $LOG_DIR
EOF

echo -e "${GREEN}✅ Reporte generado: $REPORT_FILE${NC}"

# Step 5: Display summary
echo ""
echo -e "${BLUE}📊 RESUMEN FINAL${NC}"
echo "=================="
echo ""
echo "📁 Logs guardados en: $LOG_DIR"
echo "📄 Reporte: $REPORT_FILE"
echo "📋 Logs del servidor: $SERVER_LOG"
echo "📋 Logs de tests: $TEST_LOG"
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ TODOS LOS TESTS PASARON${NC}"
    echo ""
    echo "📊 Últimas líneas de resultados:"
    tail -20 "$TEST_LOG" 2>/dev/null || echo "No hay resultados"
else
    echo -e "${RED}❌ ALGUNOS TESTS FALLARON (código: $TEST_EXIT_CODE)${NC}"
    echo ""
    echo "📊 Últimas líneas de errores:"
    tail -30 "$TEST_LOG" 2>/dev/null || echo "No hay errores registrados"
fi

echo ""
echo -e "${BLUE}🧪 Test Suite Completado${NC}"
echo ""

# Exit with test exit code
exit $TEST_EXIT_CODE

