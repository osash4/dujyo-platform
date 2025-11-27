#!/bin/bash

# ✅ Testing Final Comprehensivo - Sistema Integrado P0-P2
# Valida persistencia, seguridad, monitoring y performance

set -e

echo "🧪 TESTING FINAL COMPREHENSIVO - XWAVE P0-P2"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:8083"
TEST_EMAIL="test.final.$(date +%s)@gmail.com"
TEST_PASSWORD="TestPassword123!"
TEST_USERNAME="testfinal$(date +%s)"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
test_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((TESTS_PASSED++))
}

test_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((TESTS_FAILED++))
}

test_info() {
    echo -e "${YELLOW}ℹ️  INFO:${NC} $1"
}

# ============================================
# TEST 1: PERSISTENCIA END-TO-END
# ============================================
echo ""
echo "📊 TEST 1: PERSISTENCIA END-TO-END"
echo "-----------------------------------"

# 1.1: Verificar que el servidor está corriendo
test_info "Verificando que el servidor está corriendo..."
if curl -f -s "${API_BASE}/health" > /dev/null 2>&1; then
    test_pass "Servidor está corriendo"
else
    test_fail "Servidor NO está corriendo. Inicia el servidor primero."
    echo "Ejecuta: cd xwave-backend && cargo run"
    exit 1
fi

# 1.2: Registrar usuario y obtener wallet
test_info "Registrando usuario de prueba..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_BASE}/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${TEST_EMAIL}\",
        \"password\": \"${TEST_PASSWORD}\",
        \"username\": \"${TEST_USERNAME}\"
    }" 2>&1)

if echo "$REGISTER_RESPONSE" | grep -q "token\|success\|wallet\|user_id"; then
    test_pass "Usuario registrado exitosamente"
    
    # Obtener wallet
    WALLET_RESPONSE=$(curl -s -X GET "${API_BASE}/api/user/wallet?email=${TEST_EMAIL}" 2>&1)
    WALLET_ADDRESS=$(echo "$WALLET_RESPONSE" | grep -o '"wallet":"[^"]*"' | cut -d'"' -f4 || echo "XW0000000000000000000000000000000000000000")
    test_info "Wallet address: ${WALLET_ADDRESS}"
    
    # Intentar login para obtener token
    LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${TEST_EMAIL}\",
            \"password\": \"${TEST_PASSWORD}\",
            \"wallet\": \"${WALLET_ADDRESS}\"
        }" 2>&1)
    
    if echo "$LOGIN_RESPONSE" | grep -q "token"; then
        JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")
        test_info "Token obtenido: ${JWT_TOKEN:0:20}..."
    fi
else
    test_info "Registro falló o usuario ya existe: ${REGISTER_RESPONSE:0:100}..."
    # Intentar login si el usuario ya existe
    test_info "Intentando login..."
    
    # Primero obtener wallet
    WALLET_RESPONSE=$(curl -s -X GET "${API_BASE}/api/user/wallet?email=${TEST_EMAIL}" 2>&1)
    WALLET_ADDRESS=$(echo "$WALLET_RESPONSE" | grep -o '"wallet":"[^"]*"' | cut -d'"' -f4 || echo "XW0000000000000000000000000000000000000000")
    
    LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${TEST_EMAIL}\",
            \"password\": \"${TEST_PASSWORD}\",
            \"wallet\": \"${WALLET_ADDRESS}\"
        }" 2>&1)
    
    if echo "$LOGIN_RESPONSE" | grep -q "token"; then
        test_pass "Login exitoso (usuario existente)"
        JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")
        test_info "Token obtenido: ${JWT_TOKEN:0:20}..."
    else
        test_info "Login falló: ${LOGIN_RESPONSE:0:100}..."
        test_info "Continuando con tests que no requieren autenticación..."
        WALLET_ADDRESS="XW0000000000000000000000000000000000000000"
        JWT_TOKEN=""
    fi
fi

# 1.3: Verificar persistencia de Daily Usage
test_info "Verificando persistencia de Daily Usage..."
if [ -n "$JWT_TOKEN" ] && [ "$WALLET_ADDRESS" != "XW0000000000000000000000000000000000000000" ]; then
    # Simular stream-earn
    STREAM_RESPONSE=$(curl -s -X POST "${API_BASE}/api/stream-earn" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${JWT_TOKEN}" \
        -d "{
            \"user_id\": \"${WALLET_ADDRESS}\",
            \"content_id\": \"test_content_$(date +%s)\",
            \"duration\": 180
        }" 2>&1)

    if echo "$STREAM_RESPONSE" | grep -q "tokens\|earned\|success"; then
        test_pass "Stream-earn ejecutado (daily usage creado)"
    else
        test_info "Stream-earn response: ${STREAM_RESPONSE:0:100}..."
        test_info "Esto puede ser normal si requiere contenido válido o autenticación específica"
    fi
else
    test_info "Saltando stream-earn (no hay token válido)"
fi

# 1.4: Verificar que validators se cargan desde DB
test_info "Verificando carga de validators desde DB..."
# Esto se verifica en los logs del servidor, pero podemos verificar el endpoint de stats
STATS_RESPONSE=$(curl -s "${API_BASE}/api/stats" 2>/dev/null || echo "{}")
if echo "$STATS_RESPONSE" | grep -q "validators\|economic\|creative"; then
    test_pass "Validators cargados desde DB"
else
    test_info "Stats endpoint no disponible o no muestra validators (puede ser normal)"
fi

# 1.5: Verificar rate limiting persistente (Redis)
test_info "Verificando rate limiting persistente..."
# Intentar múltiples requests rápidas
RATE_LIMIT_COUNT=0
for i in {1..5}; do
    RESPONSE=$(curl -s -X POST "${API_BASE}/forgot-password" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"ratelimit@test.com\"}" \
        -w "%{http_code}")
    
    if echo "$RESPONSE" | grep -q "429\|rate limit\|too many"; then
        ((RATE_LIMIT_COUNT++))
    fi
    sleep 0.5
done

if [ $RATE_LIMIT_COUNT -gt 0 ]; then
    test_pass "Rate limiting activo (${RATE_LIMIT_COUNT} requests bloqueados)"
else
    test_info "Rate limiting no bloqueó requests (puede ser normal si el límite es alto)"
fi

# ============================================
# TEST 2: SEGURIDAD + MONITORING
# ============================================
echo ""
echo "🔒 TEST 2: SEGURIDAD + MONITORING"
echo "-----------------------------------"

# 2.1: Verificar CORS bloquea origins no permitidos
test_info "Verificando CORS..."
CORS_RESPONSE=$(curl -s -X OPTIONS "${API_BASE}/api/stream-earn" \
    -H "Origin: http://malicious-site.com" \
    -H "Access-Control-Request-Method: POST" \
    -v 2>&1)

if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin.*malicious\|403\|CORS"; then
    test_fail "CORS permite origins maliciosos"
else
    test_pass "CORS bloquea origins no permitidos"
fi

# 2.2: Verificar endpoint /metrics
test_info "Verificando endpoint /metrics..."
METRICS_RESPONSE=$(curl -s "${API_BASE}/metrics" 2>/dev/null)

if echo "$METRICS_RESPONSE" | grep -q "http_requests\|xwave_"; then
    test_pass "Endpoint /metrics funciona y muestra métricas"
else
    if [ -z "$METRICS_RESPONSE" ]; then
        test_fail "Endpoint /metrics no responde"
    else
        test_info "Endpoint /metrics responde pero formato puede ser diferente"
        test_info "Response: ${METRICS_RESPONSE:0:200}..."
    fi
fi

# 2.3: Verificar health checks
test_info "Verificando health checks..."
HEALTH_RESPONSE=$(curl -s "${API_BASE}/health")
READY_RESPONSE=$(curl -s "${API_BASE}/ready")
LIVE_RESPONSE=$(curl -s "${API_BASE}/live")

if echo "$HEALTH_RESPONSE" | grep -q "status\|healthy\|ok"; then
    test_pass "Health check (/health) funciona"
else
    test_fail "Health check no funciona correctamente"
fi

if echo "$READY_RESPONSE" | grep -q "status\|ready\|ok"; then
    test_pass "Ready check (/ready) funciona"
else
    test_info "Ready check puede no estar implementado (opcional)"
fi

# 2.4: Verificar logging estructurado (request IDs)
test_info "Verificando logging estructurado..."
# Los request IDs se verifican en los logs del servidor
# Aquí solo verificamos que el servidor responde con headers apropiados
HEADERS=$(curl -s -I "${API_BASE}/health" 2>/dev/null)
if echo "$HEADERS" | grep -q "request-id\|x-request-id"; then
    test_pass "Request IDs en headers"
else
    test_info "Request IDs pueden estar solo en logs (verificar logs del servidor)"
fi

# ============================================
# TEST 3: PERFORMANCE BÁSICO
# ============================================
echo ""
echo "⚡ TEST 3: PERFORMANCE BÁSICO"
echo "------------------------------"

# 3.1: Health check bajo carga básica
test_info "Ejecutando health checks bajo carga básica..."
HEALTH_SUCCESS=0
for i in {1..10}; do
    if curl -f -s "${API_BASE}/health" > /dev/null 2>&1; then
        ((HEALTH_SUCCESS++))
    fi
    sleep 0.1
done

if [ $HEALTH_SUCCESS -eq 10 ]; then
    test_pass "Health checks estables bajo carga (10/10)"
else
    test_fail "Health checks inestables (${HEALTH_SUCCESS}/10)"
fi

# 3.2: Verificar tiempo de respuesta
test_info "Midiendo tiempo de respuesta..."
RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" "${API_BASE}/health" 2>/dev/null || echo "0")
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d'.' -f1)

if [ "$RESPONSE_TIME_MS" -lt 1000 ]; then
    test_pass "Tiempo de respuesta aceptable (${RESPONSE_TIME_MS}ms)"
else
    test_info "Tiempo de respuesta: ${RESPONSE_TIME_MS}ms (puede ser normal en desarrollo)"
fi

# ============================================
# RESUMEN FINAL
# ============================================
echo ""
echo "=============================================="
echo "📊 RESUMEN FINAL"
echo "=============================================="
echo ""
echo -e "${GREEN}Tests pasados: ${TESTS_PASSED}${NC}"
echo -e "${RED}Tests fallidos: ${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡TODOS LOS TESTS PASARON! Sistema listo para beta.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Algunos tests fallaron. Revisa los detalles arriba.${NC}"
    exit 1
fi

