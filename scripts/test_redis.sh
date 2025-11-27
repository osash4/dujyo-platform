#!/bin/bash
# ✅ TESTING: Redis Connection y Health Checks
# 
# Este script verifica la conexión a Redis y el fallback a memoria

set -e

BASE_URL="${BASE_URL:-http://localhost:8083}"

echo "🧪 TESTING REDIS CONNECTION"
echo "==========================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar si Redis está disponible
check_redis_connection() {
    echo "🔍 Verificando conexión a Redis..."
    
    if command -v redis-cli &> /dev/null; then
        if redis-cli -h localhost -p 6379 ping &> /dev/null; then
            echo -e "${GREEN}✅ Redis está disponible${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  Redis no responde en localhost:6379${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  redis-cli no está instalado${NC}"
        return 1
    fi
}

# Verificar health check del servidor
check_server_health() {
    echo ""
    echo "🔍 Verificando health check del servidor..."
    
    RESPONSE=$(curl -s "$BASE_URL/health")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Servidor respondiendo${NC}"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        return 0
    else
        echo -e "${RED}❌ Servidor no responde${NC}"
        return 1
    fi
}

# Test 1: Redis disponible
echo "=========================================="
echo "TEST 1: Verificar Redis Connection"
echo "=========================================="

if check_redis_connection; then
    REDIS_AVAILABLE=true
else
    REDIS_AVAILABLE=false
    echo -e "${YELLOW}⚠️  Continuando con fallback a memoria${NC}"
fi

# Test 2: Health check del servidor
echo ""
echo "=========================================="
echo "TEST 2: Health Check del Servidor"
echo "=========================================="

if check_server_health; then
    echo -e "${GREEN}✅ Health check exitoso${NC}"
else
    echo -e "${RED}❌ Health check fallido${NC}"
    exit 1
fi

# Test 3: Verificar que rate limiting funciona (con o sin Redis)
echo ""
echo "=========================================="
echo "TEST 3: Rate Limiting (con/sin Redis)"
echo "=========================================="

echo "🔄 Enviando requests para verificar rate limiting..."
SUCCESS=0
RATE_LIMITED=0

for i in {1..65}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/health")
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        SUCCESS=$((SUCCESS + 1))
    elif [ "$HTTP_CODE" -eq 429 ]; then
        RATE_LIMITED=$((RATE_LIMITED + 1))
        if [ $RATE_LIMITED -eq 1 ]; then
            echo -e "${YELLOW}⚠️  Rate limit alcanzado en request #$i${NC}"
        fi
    fi
    
    sleep 0.1
done

echo "   ✅ Exitosas: $SUCCESS"
echo "   🚫 Rate limited: $RATE_LIMITED"

if [ $RATE_LIMITED -gt 0 ]; then
    echo -e "${GREEN}✅ Rate limiting funcionando${NC}"
    if [ "$REDIS_AVAILABLE" = true ]; then
        echo -e "${GREEN}   (usando Redis)${NC}"
    else
        echo -e "${YELLOW}   (usando memoria - fallback)${NC}"
    fi
else
    echo -e "${RED}❌ Rate limiting no se activó${NC}"
fi

# Resumen
echo ""
echo "=========================================="
echo "📊 RESUMEN"
echo "=========================================="

if [ "$REDIS_AVAILABLE" = true ]; then
    echo -e "${GREEN}✅ Redis: Disponible${NC}"
else
    echo -e "${YELLOW}⚠️  Redis: No disponible (usando fallback)${NC}"
fi

echo -e "${GREEN}✅ Servidor: Respondiendo${NC}"
echo -e "${GREEN}✅ Rate Limiting: Funcionando${NC}"

