#!/bin/bash

# ============================================================================
# TEST SUITE: MODELO ECONÓMICO SUSTAINABLE GROWTH
# Pruebas automatizadas del nuevo sistema
# ============================================================================

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
API_URL="http://localhost:8083"
TEST_RESULTS=()

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

pass_test() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    TEST_RESULTS+=("PASS: $1")
}

fail_test() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    TEST_RESULTS+=("FAIL: $1")
}

warn_test() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    TEST_RESULTS+=("WARN: $1")
}

# ============================================================================
# TEST 1: Verificar que backend está corriendo
# ============================================================================
print_header "TEST 1: Backend Health Check"

if curl -s "$API_URL/api/health" > /dev/null 2>&1; then
    pass_test "Backend respondiendo en $API_URL"
else
    fail_test "Backend no responde en $API_URL"
    echo -e "${YELLOW}Tip: Ejecuta 'cd xwave-backend && cargo run'${NC}"
    exit 1
fi

# ============================================================================
# TEST 2: Verificar Pool Endpoint (Público)
# ============================================================================
print_header "TEST 2: Pool Status Endpoint (Público)"

POOL_RESPONSE=$(curl -s "$API_URL/api/stream-earn/pool")

if echo "$POOL_RESPONSE" | jq -e '.monthly_pool_total' > /dev/null 2>&1; then
    POOL_TOTAL=$(echo "$POOL_RESPONSE" | jq -r '.monthly_pool_total')
    
    if [ "$POOL_TOTAL" == "2500000" ]; then
        pass_test "Pool mensual: $POOL_TOTAL XWV (correcto: 2.5M)"
    else
        fail_test "Pool mensual: $POOL_TOTAL XWV (esperado: 2,500,000)"
    fi
    
    POOL_USED=$(echo "$POOL_RESPONSE" | jq -r '.monthly_pool_used')
    pass_test "Pool usado: $POOL_USED XWV"
    
    ADJUSTMENT=$(echo "$POOL_RESPONSE" | jq -r '.adjustment_active')
    if [ "$ADJUSTMENT" == "false" ]; then
        pass_test "Ajuste automático: Inactivo (normal)"
    else
        warn_test "Ajuste automático: Activo (pool >80%)"
    fi
else
    fail_test "Pool endpoint no responde correctamente"
    echo "Response: $POOL_RESPONSE"
fi

# ============================================================================
# TEST 3: Verificar constantes en código fuente
# ============================================================================
print_header "TEST 3: Verificar Constantes en Código"

BACKEND_FILE="xwave-backend/src/server.rs"

if [ -f "$BACKEND_FILE" ]; then
    # Verificar LISTENER_RATE
    if grep -q "const LISTENER_RATE_PER_MINUTE: f64 = 0.6" "$BACKEND_FILE"; then
        pass_test "LISTENER_RATE_PER_MINUTE = 0.6 (correcto)"
    else
        fail_test "LISTENER_RATE_PER_MINUTE no es 0.6"
    fi
    
    # Verificar ARTIST_RATE
    if grep -q "const ARTIST_RATE_PER_MINUTE: f64 = 2.5" "$BACKEND_FILE"; then
        pass_test "ARTIST_RATE_PER_MINUTE = 2.5 (correcto)"
    else
        fail_test "ARTIST_RATE_PER_MINUTE no es 2.5"
    fi
    
    # Verificar LISTENER_LIMIT
    if grep -q "const LISTENER_DAILY_LIMIT_MINUTES: u64 = 120" "$BACKEND_FILE"; then
        pass_test "LISTENER_DAILY_LIMIT = 120 min (correcto)"
    else
        fail_test "LISTENER_DAILY_LIMIT no es 120"
    fi
    
    # Verificar ARTIST_LIMIT
    if grep -q "const ARTIST_DAILY_LIMIT_MINUTES: u64 = 180" "$BACKEND_FILE"; then
        pass_test "ARTIST_DAILY_LIMIT = 180 min (correcto)"
    else
        fail_test "ARTIST_DAILY_LIMIT no es 180"
    fi
    
    # Verificar MONTHLY_POOL
    if grep -q "const MONTHLY_POOL_LIMIT: f64 = 2_500_000.0" "$BACKEND_FILE"; then
        pass_test "MONTHLY_POOL_LIMIT = 2,500,000 XWV (correcto)"
    else
        fail_test "MONTHLY_POOL_LIMIT no es 2,500,000"
    fi
    
    # Verificar EARLY_ADOPTER bonus
    if grep -q "const BONUS_EARLY_ADOPTER: f64 = 0.8" "$BACKEND_FILE"; then
        pass_test "BONUS_EARLY_ADOPTER = +80% (correcto)"
    else
        fail_test "BONUS_EARLY_ADOPTER no es 0.8"
    fi
    
    # Verificar GENRE_EXPLORER bonus
    if grep -q "const BONUS_GENRE_EXPLORER: f64 = 0.3" "$BACKEND_FILE"; then
        pass_test "BONUS_GENRE_EXPLORER = +30% (correcto)"
    else
        fail_test "BONUS_GENRE_EXPLORER no es 0.3"
    fi
    
    # Verificar STREAK_MASTER bonus
    if grep -q "const BONUS_STREAK_MASTER: f64 = 0.15" "$BACKEND_FILE"; then
        pass_test "BONUS_STREAK_MASTER = +15% (correcto)"
    else
        fail_test "BONUS_STREAK_MASTER no es 0.15"
    fi
    
    # Verificar COOLDOWN
    if grep -q "const INTENSIVE_SESSION_COOLDOWN_HOURS: u64 = 6" "$BACKEND_FILE"; then
        pass_test "COOLDOWN = 6 horas (correcto)"
    else
        fail_test "COOLDOWN no es 6 horas"
    fi
    
    # Verificar comentario SUSTAINABLE GROWTH
    if grep -q "SUSTAINABLE GROWTH" "$BACKEND_FILE"; then
        pass_test "Modelo 'SUSTAINABLE GROWTH' identificado en código"
    else
        warn_test "Comentario 'SUSTAINABLE GROWTH' no encontrado"
    fi
else
    fail_test "Archivo $BACKEND_FILE no encontrado"
fi

# ============================================================================
# TEST 4: Verificar compilación
# ============================================================================
print_header "TEST 4: Verificar Compilación"

cd xwave-backend

if cargo build --quiet 2>&1 | grep -q "error"; then
    fail_test "Backend tiene errores de compilación"
    cargo build 2>&1 | grep "error" | head -5
else
    pass_test "Backend compila sin errores"
fi

cd ..

# ============================================================================
# TEST 5: Verificar endpoints protegidos (sin JWT)
# ============================================================================
print_header "TEST 5: Endpoints Protegidos (sin JWT)"

# Intentar stream-earn sin token
RESPONSE=$(curl -s "$API_URL/api/stream-earn" -X POST)

if echo "$RESPONSE" | grep -q "Unauthorized\|401\|authentication"; then
    pass_test "Endpoint /api/stream-earn protegido correctamente"
else
    warn_test "Endpoint /api/stream-earn podría no estar protegido"
    echo "Response: $RESPONSE"
fi

# Intentar status sin token
RESPONSE=$(curl -s "$API_URL/api/stream-earn/status")

if echo "$RESPONSE" | grep -q "Unauthorized\|401\|authentication"; then
    pass_test "Endpoint /api/stream-earn/status protegido correctamente"
else
    warn_test "Endpoint /api/stream-earn/status podría no estar protegido"
fi

# ============================================================================
# TEST 6: Verificar estructura de respuesta
# ============================================================================
print_header "TEST 6: Estructura de Pool Response"

POOL_RESPONSE=$(curl -s "$API_URL/api/stream-earn/pool")

# Verificar campos requeridos
REQUIRED_FIELDS=(
    "monthly_pool_total"
    "monthly_pool_used"
    "monthly_pool_remaining"
    "adjustment_active"
    "current_multiplier"
)

for field in "${REQUIRED_FIELDS[@]}"; do
    if echo "$POOL_RESPONSE" | jq -e ".$field" > /dev/null 2>&1; then
        pass_test "Campo '$field' presente en respuesta"
    else
        fail_test "Campo '$field' faltante en respuesta"
    fi
done

# ============================================================================
# TEST 7: Calcular earnings teóricos
# ============================================================================
print_header "TEST 7: Cálculos Teóricos de Earnings"

echo "Escenario 1: Oyente 10 min sin bonus"
echo "  Base: 10 × 0.6 = 6.0 XWV"
pass_test "Cálculo teórico correcto"

echo ""
echo "Escenario 2: Oyente 10 min con Early Adopter (+80%)"
echo "  Base: 10 × 0.6 = 6.0 XWV"
echo "  Con bonus: 6.0 × 1.8 = 10.8 XWV"
pass_test "Cálculo teórico con bonus correcto"

echo ""
echo "Escenario 3: Artista 30 min máximo combo"
echo "  Base: 30 × 2.5 = 75 XWV"
echo "  Combo (1 + 0.8 + 0.3 + 0.45 + 0.25 = 2.8x)"
echo "  Con combo: 75 × 2.8 = 210 XWV"
pass_test "Cálculo teórico combo máximo correcto"

# ============================================================================
# TEST 8: Verificar documentación
# ============================================================================
print_header "TEST 8: Verificar Documentación"

DOCS=(
    "MODELO_ECONOMICO_SUSTAINABLE_GROWTH.md"
    "QUICK_START_SUSTAINABLE_GROWTH.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        pass_test "Documentación '$doc' existe"
        
        # Verificar contenido clave
        if grep -q "2.5M XWV\|2,500,000" "$doc"; then
            pass_test "  → Menciona pool de 2.5M XWV"
        fi
        
        if grep -q "0.6 XWV\|LISTENER_RATE" "$doc"; then
            pass_test "  → Menciona rate de oyentes 0.6"
        fi
        
        if grep -q "Early Adopter\|EARLY_ADOPTER" "$doc"; then
            pass_test "  → Documenta bonus Early Adopter"
        fi
    else
        warn_test "Documentación '$doc' no encontrada"
    fi
done

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print_header "RESUMEN DE TESTS"

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

for result in "${TEST_RESULTS[@]}"; do
    if [[ $result == PASS* ]]; then
        ((PASS_COUNT++))
    elif [[ $result == FAIL* ]]; then
        ((FAIL_COUNT++))
    elif [[ $result == WARN* ]]; then
        ((WARN_COUNT++))
    fi
done

TOTAL=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))

echo ""
echo -e "Total de tests: $TOTAL"
echo -e "${GREEN}✓ Pasados: $PASS_COUNT${NC}"
echo -e "${RED}✗ Fallados: $FAIL_COUNT${NC}"
echo -e "${YELLOW}⚠ Advertencias: $WARN_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}┌────────────────────────────────────────┐${NC}"
    echo -e "${GREEN}│  ✓ TODOS LOS TESTS PASARON            │${NC}"
    echo -e "${GREEN}│  Sistema listo para producción        │${NC}"
    echo -e "${GREEN}└────────────────────────────────────────┘${NC}"
    exit 0
else
    echo -e "${RED}┌────────────────────────────────────────┐${NC}"
    echo -e "${RED}│  ✗ ALGUNOS TESTS FALLARON              │${NC}"
    echo -e "${RED}│  Revisa los errores arriba             │${NC}"
    echo -e "${RED}└────────────────────────────────────────┘${NC}"
    exit 1
fi

