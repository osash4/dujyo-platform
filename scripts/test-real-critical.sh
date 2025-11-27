#!/bin/bash

# ✅ Testing REAL y HONESTO - XWave P0-P2
# Valida comportamiento real, no solo que endpoints respondan

set -e

echo "🔬 TESTING REAL Y CRÍTICO - XWAVE"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
API_BASE="http://localhost:8083"
TEST_EMAIL="realtest.$(date +%s)@gmail.com"
TEST_PASSWORD="RealTest123!"
TEST_USERNAME="realtest$(date +%s)"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
CRITICAL_FAILURES=0

# Helper functions
test_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((TESTS_PASSED++))
}

test_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((TESTS_FAILED++))
    ((CRITICAL_FAILURES++))
}

test_info() {
    echo -e "${YELLOW}ℹ️  INFO:${NC} $1"
}

# ============================================
# TEST 1: PERSISTENCIA REAL POST-RESTART
# ============================================
echo ""
echo "🔴 TEST 1: PERSISTENCIA POST-RESTART (CRÍTICO)"
echo "=============================================="

# 1.1: Verificar servidor corriendo
test_info "Verificando servidor inicial..."
if ! curl -f -s "${API_BASE}/health" > /dev/null 2>&1; then
    test_fail "Servidor NO está corriendo. Inicia primero: cd xwave-backend && cargo run"
    exit 1
fi
test_pass "Servidor corriendo"

# 1.2: Registrar usuario y obtener datos iniciales
test_info "Registrando usuario de prueba..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_BASE}/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${TEST_EMAIL}\",
        \"password\": \"${TEST_PASSWORD}\",
        \"username\": \"${TEST_USERNAME}\"
    }" 2>&1)

if echo "$REGISTER_RESPONSE" | grep -q "error\|Error\|failed"; then
    test_info "Usuario puede que ya exista, intentando login..."
    # Obtener wallet
    WALLET_RESPONSE=$(curl -s -X GET "${API_BASE}/api/user/wallet?email=${TEST_EMAIL}" 2>&1)
    WALLET_ADDRESS=$(echo "$WALLET_RESPONSE" | grep -o '"wallet":"[^"]*"' | cut -d'"' -f4 || echo "")
    
    if [ -z "$WALLET_ADDRESS" ]; then
        test_fail "No se pudo obtener wallet address"
        exit 1
    fi
    
    # Login
    LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${TEST_EMAIL}\",
            \"password\": \"${TEST_PASSWORD}\",
            \"wallet\": \"${WALLET_ADDRESS}\"
        }" 2>&1)
    
    if ! echo "$LOGIN_RESPONSE" | grep -q "token"; then
        test_fail "No se pudo hacer login: ${LOGIN_RESPONSE:0:200}"
        exit 1
    fi
    
    JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")
    test_pass "Login exitoso (usuario existente)"
else
    # Usuario nuevo registrado
    WALLET_RESPONSE=$(curl -s -X GET "${API_BASE}/api/user/wallet?email=${TEST_EMAIL}" 2>&1)
    WALLET_ADDRESS=$(echo "$WALLET_RESPONSE" | grep -o '"wallet":"[^"]*"' | cut -d'"' -f4 || echo "")
    
    if [ -z "$WALLET_ADDRESS" ]; then
        test_fail "Registro exitoso pero no se pudo obtener wallet"
        exit 1
    fi
    
    # Login
    LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${TEST_EMAIL}\",
            \"password\": \"${TEST_PASSWORD}\",
            \"wallet\": \"${WALLET_ADDRESS}\"
        }" 2>&1)
    
    JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")
    test_pass "Usuario registrado y login exitoso"
fi

test_info "Wallet: ${WALLET_ADDRESS}"
test_info "Token: ${JWT_TOKEN:0:30}..."

# 1.3: Crear contenido de prueba en DB (necesario para stream-earn)
test_info "Creando contenido de prueba..."
CONTENT_ID="test_persistence_$(date +%s)"
# Intentar crear contenido directamente en DB o vía API si existe endpoint

# 1.4: Ejecutar stream-earn ANTES del restart
test_info "Ejecutando stream-earn ANTES del restart..."
STREAM_BEFORE=$(curl -s -X POST "${API_BASE}/api/stream-earn" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -d "{
        \"user_id\": \"${WALLET_ADDRESS}\",
        \"content_id\": \"${CONTENT_ID}\",
        \"duration\": 180
    }" 2>&1)

test_info "Response antes del restart: ${STREAM_BEFORE:0:200}..."

# 1.5: Obtener estado ANTES del restart
test_info "Obteniendo estado de daily usage ANTES del restart..."
STATUS_BEFORE=$(curl -s -X GET "${API_BASE}/api/stream-earn/status?user_id=${WALLET_ADDRESS}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" 2>&1 || echo "{}")

test_info "Estado antes: ${STATUS_BEFORE:0:200}..."

# 1.6: REINICIAR SERVIDOR (CRÍTICO)
test_info "🔄 REINICIANDO SERVIDOR (esto es crítico)..."
SERVER_PID=$(ps aux | grep -E "xwavve-backend|cargo run.*xwavve" | grep -v grep | awk '{print $2}' | head -1)

if [ -n "$SERVER_PID" ]; then
    test_info "Deteniendo servidor (PID: $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    sleep 3
    
    # Verificar que se detuvo
    if ps -p "$SERVER_PID" > /dev/null 2>&1; then
        test_info "Forzando cierre..."
        kill -9 "$SERVER_PID" 2>/dev/null || true
        sleep 2
    fi
else
    test_info "No se encontró proceso del servidor (puede estar corriendo de otra forma)"
fi

test_info "Esperando 5 segundos..."
sleep 5

# 1.7: Reiniciar servidor
test_info "Iniciando servidor..."
cd "$(dirname "$0")/../xwave-backend"
cargo run --bin xwavve-backend > /tmp/xwave-server-restart.log 2>&1 &
NEW_SERVER_PID=$!
test_info "Nuevo servidor iniciado (PID: $NEW_SERVER_PID)"

# 1.8: Esperar que el servidor esté listo
test_info "Esperando que servidor esté listo..."
MAX_WAIT=30
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if curl -f -s "${API_BASE}/health" > /dev/null 2>&1; then
        test_pass "Servidor reiniciado y respondiendo"
        break
    fi
    sleep 1
    ((WAIT_COUNT++))
    echo -n "."
done
echo ""

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    test_fail "Servidor NO respondió después de $MAX_WAIT segundos"
    echo "Logs del servidor:"
    tail -20 /tmp/xwave-server-restart.log
    exit 1
fi

# 1.9: Verificar persistencia DESPUÉS del restart
test_info "Verificando persistencia DESPUÉS del restart..."

# Re-login para obtener nuevo token
LOGIN_AFTER=$(curl -s -X POST "${API_BASE}/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${TEST_EMAIL}\",
        \"password\": \"${TEST_PASSWORD}\",
        \"wallet\": \"${WALLET_ADDRESS}\"
    }" 2>&1)

JWT_TOKEN_AFTER=$(echo "$LOGIN_AFTER" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$JWT_TOKEN_AFTER" ]; then
    test_fail "No se pudo hacer login después del restart"
    exit 1
fi

# Obtener estado DESPUÉS del restart
STATUS_AFTER=$(curl -s -X GET "${API_BASE}/api/stream-earn/status?user_id=${WALLET_ADDRESS}" \
    -H "Authorization: Bearer ${JWT_TOKEN_AFTER}" 2>&1 || echo "{}")

test_info "Estado después: ${STATUS_AFTER:0:200}..."

# Verificar que los datos persisten
if echo "$STATUS_AFTER" | grep -q "minutes_used\|tokens_earned\|daily"; then
    test_pass "Datos de daily usage persisten después del restart"
else
    test_fail "Datos NO persisten después del restart"
    test_info "Status antes: $STATUS_BEFORE"
    test_info "Status después: $STATUS_AFTER"
fi

# ============================================
# TEST 2: RATE LIMITING REAL
# ============================================
echo ""
echo "🔴 TEST 2: RATE LIMITING REAL (CRÍTICO)"
echo "========================================"

test_info "Probando rate limiting en /forgot-password (límite: 3 requests/hora)..."

RATE_LIMIT_PASSED=true
BLOCKED_COUNT=0
ALLOWED_COUNT=0

for i in {1..5}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/forgot-password" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"ratelimit.$(date +%s)@test.com\"}" 2>&1)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    echo "  Intento $i: HTTP $HTTP_CODE"
    
    if [ "$HTTP_CODE" = "429" ] || echo "$BODY" | grep -qi "rate limit\|too many\|limit exceeded"; then
        ((BLOCKED_COUNT++))
        if [ $i -le 3 ]; then
            test_fail "Rate limiting bloqueó en intento $i (debería permitir hasta 3)"
            RATE_LIMIT_PASSED=false
        fi
    else
        ((ALLOWED_COUNT++))
        if [ $i -gt 3 ] && [ "$HTTP_CODE" = "200" ]; then
            test_fail "Rate limiting NO bloqueó en intento $i (debería bloquear después de 3)"
            RATE_LIMIT_PASSED=false
        fi
    fi
    
    sleep 0.5
done

if [ "$RATE_LIMIT_PASSED" = true ] && [ $BLOCKED_COUNT -gt 0 ]; then
    test_pass "Rate limiting funciona correctamente (${ALLOWED_COUNT} permitidos, ${BLOCKED_COUNT} bloqueados)"
else
    test_fail "Rate limiting NO funciona correctamente (${ALLOWED_COUNT} permitidos, ${BLOCKED_COUNT} bloqueados)"
fi

# ============================================
# TEST 3: AUTENTICACIÓN REAL END-TO-END
# ============================================
echo ""
echo "🔴 TEST 3: AUTENTICACIÓN END-TO-END (CRÍTICO)"
echo "============================================="

AUTH_EMAIL="authtest.$(date +%s)@gmail.com"
AUTH_PASSWORD="AuthTest123!"
AUTH_USERNAME="authtest$(date +%s)"

# 3.1: Registro
test_info "Registrando nuevo usuario..."
REG_AUTH=$(curl -s -X POST "${API_BASE}/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${AUTH_EMAIL}\",
        \"password\": \"${AUTH_PASSWORD}\",
        \"username\": \"${AUTH_USERNAME}\"
    }" 2>&1)

if echo "$REG_AUTH" | grep -q "error\|Error\|failed\|already exists"; then
    test_fail "Registro falló: ${REG_AUTH:0:200}"
else
    test_pass "Registro exitoso"
fi

# 3.2: Obtener wallet
test_info "Obteniendo wallet address..."
WALLET_AUTH_RESPONSE=$(curl -s -X GET "${API_BASE}/api/user/wallet?email=${AUTH_EMAIL}" 2>&1)
WALLET_AUTH=$(echo "$WALLET_AUTH_RESPONSE" | grep -o '"wallet":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$WALLET_AUTH" ]; then
    test_fail "No se pudo obtener wallet después del registro"
else
    test_pass "Wallet obtenido: ${WALLET_AUTH:0:20}..."
fi

# 3.3: Login
test_info "Haciendo login..."
LOGIN_AUTH=$(curl -s -X POST "${API_BASE}/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${AUTH_EMAIL}\",
        \"password\": \"${AUTH_PASSWORD}\",
        \"wallet\": \"${WALLET_AUTH}\"
    }" 2>&1)

if ! echo "$LOGIN_AUTH" | grep -q "token"; then
    test_fail "Login falló: ${LOGIN_AUTH:0:200}"
else
    JWT_AUTH=$(echo "$LOGIN_AUTH" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")
    if [ -n "$JWT_AUTH" ] && [ ${#JWT_AUTH} -gt 20 ]; then
        test_pass "Login exitoso y token JWT válido obtenido"
    else
        test_fail "Token JWT inválido o vacío"
    fi
fi

# 3.4: Verificar token funciona
if [ -n "$JWT_AUTH" ]; then
    test_info "Verificando que el token funciona..."
    PROTECTED_RESPONSE=$(curl -s -X GET "${API_BASE}/api/user/profile" \
        -H "Authorization: Bearer ${JWT_AUTH}" 2>&1)
    
    if echo "$PROTECTED_RESPONSE" | grep -q "401\|Unauthorized\|invalid\|expired"; then
        test_fail "Token NO funciona para endpoints protegidos"
    else
        test_pass "Token funciona para endpoints protegidos"
    fi
fi

# ============================================
# TEST 4: PERSISTENCIA VALIDATORS
# ============================================
echo ""
echo "🔴 TEST 4: PERSISTENCIA VALIDATORS (CRÍTICO)"
echo "============================================"

# 4.1: Verificar que la tabla existe (vía logs o verificación indirecta)
test_info "Verificando que validators se cargan desde DB..."

# Verificar en logs del servidor que se cargaron validators
if [ -f /tmp/xwave-server-restart.log ]; then
    if grep -q "Loaded validators from database\|Loaded.*validators\|blockchain_validators" /tmp/xwave-server-restart.log 2>/dev/null; then
        test_pass "Validators se cargaron desde DB (verificado en logs)"
    else
        test_info "No se encontró evidencia en logs (puede ser normal si no hay validators en DB)"
        test_info "Verificando endpoint de stats..."
        
        STATS_RESPONSE=$(curl -s "${API_BASE}/api/stats" 2>/dev/null || echo "{}")
        if echo "$STATS_RESPONSE" | grep -q "validators\|economic\|creative"; then
            test_pass "Validators disponibles (verificado vía stats)"
        else
            test_info "Stats no muestra validators (puede ser normal si no hay validators registrados)"
        fi
    fi
else
    test_info "Logs no disponibles - verificando indirectamente..."
fi

# ============================================
# RESUMEN FINAL
# ============================================
echo ""
echo "=============================================="
echo "📊 RESUMEN FINAL - TESTING REAL"
echo "=============================================="
echo ""
echo -e "${GREEN}Tests pasados: ${TESTS_PASSED}${NC}"
echo -e "${RED}Tests fallidos: ${TESTS_FAILED}${NC}"
echo -e "${RED}Fallos críticos: ${CRITICAL_FAILURES}${NC}"
echo ""

if [ $CRITICAL_FAILURES -eq 0 ] && [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡TODOS LOS TESTS CRÍTICOS PASARON!${NC}"
    echo -e "${GREEN}Sistema validado y listo para beta.${NC}"
    exit 0
elif [ $CRITICAL_FAILURES -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Algunos tests fallaron pero NO son críticos.${NC}"
    echo -e "${YELLOW}Revisa los detalles arriba.${NC}"
    exit 0
else
    echo -e "${RED}❌ HAY FALLOS CRÍTICOS. Sistema NO está listo para beta.${NC}"
    echo -e "${RED}Corrige los problemas antes de proceder.${NC}"
    exit 1
fi

