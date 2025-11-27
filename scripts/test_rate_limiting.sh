#!/bin/bash
# ✅ TESTING: Rate Limiting en Endpoints Críticos
# 
# Este script prueba el rate limiting en diferentes endpoints

set -e

BASE_URL="${BASE_URL:-http://localhost:8083}"
JWT_TOKEN="${JWT_TOKEN:-}"

echo "🧪 TESTING RATE LIMITING"
echo "========================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Función para hacer login
login() {
    if [ -z "$JWT_TOKEN" ]; then
        echo "📝 Login requerido..."
        read -p "Email: " EMAIL
        read -sp "Password: " PASSWORD
        echo ""
        
        RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
        
        JWT_TOKEN=$(echo $RESPONSE | jq -r '.token // empty')
        
        if [ -z "$JWT_TOKEN" ]; then
            echo -e "${RED}❌ Login fallido${NC}"
            exit 1
        fi
    fi
}

# Función para probar rate limit
test_rate_limit() {
    local endpoint=$1
    local method=$2
    local limit=$3
    local test_name=$4
    
    echo ""
    echo "🔄 Test: $test_name"
    echo "   Endpoint: $endpoint"
    echo "   Límite esperado: $limit req/min"
    
    local success=0
    local rate_limited=0
    
    # Enviar requests hasta exceder el límite
    for i in $(seq 1 $((limit + 5))); do
        if [ "$method" = "GET" ]; then
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $JWT_TOKEN")
        else
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $JWT_TOKEN" \
                -H "Content-Type: application/json" \
                -d '{}')
        fi
        
        if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
            success=$((success + 1))
        elif [ "$HTTP_CODE" -eq 429 ]; then
            rate_limited=$((rate_limited + 1))
            if [ $rate_limited -eq 1 ]; then
                echo -e "   ${YELLOW}⚠️  Rate limit alcanzado en request #$i${NC}"
            fi
        fi
        
        # Pequeña pausa para no saturar
        sleep 0.1
    done
    
    echo "   ✅ Exitosas: $success"
    echo "   🚫 Rate limited: $rate_limited"
    
    if [ $rate_limited -gt 0 ]; then
        echo -e "   ${GREEN}✅ Rate limiting funcionando correctamente${NC}"
        return 0
    else
        echo -e "   ${RED}❌ Rate limiting no se activó${NC}"
        return 1
    fi
}

# Iniciar testing
login

echo ""
echo "=========================================="
echo "TEST 1: Rate Limiting - Endpoint Público"
echo "=========================================="
test_rate_limit "/health" "GET" 60 "Endpoint público (60 req/min)"

echo ""
echo "=========================================="
echo "TEST 2: Rate Limiting - Endpoint Auth"
echo "=========================================="
test_rate_limit "/login" "POST" 10 "Endpoint auth (10 req/min)"

echo ""
echo "=========================================="
echo "TEST 3: Rate Limiting - Endpoint Financial"
echo "=========================================="
test_rate_limit "/transaction" "POST" 30 "Endpoint financial (30 req/min)"

echo ""
echo "=========================================="
echo "TEST 4: Rate Limiting - Headers de Respuesta"
echo "=========================================="

echo "🔄 Verificando headers de rate limit..."
HEADERS=$(curl -s -I -X GET "$BASE_URL/health" \
    -H "Authorization: Bearer $JWT_TOKEN")

if echo "$HEADERS" | grep -q "X-RateLimit-Limit"; then
    echo -e "${GREEN}✅ Header X-RateLimit-Limit presente${NC}"
    echo "$HEADERS" | grep "X-RateLimit"
else
    echo -e "${RED}❌ Headers de rate limit no presentes${NC}"
fi

echo ""
echo "=========================================="
echo "📊 RESUMEN"
echo "=========================================="
echo -e "${GREEN}✅ Tests completados${NC}"

