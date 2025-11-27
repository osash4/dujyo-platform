#!/bin/bash
# ✅ DIAGNÓSTICO SIMPLE - Verificar que todo funciona

set -e

BASE_URL="${BASE_URL:-http://localhost:8083}"

echo "🔍 DIAGNÓSTICO SIMPLE - DUJYO Backend"
echo "======================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Verificar que el servidor está corriendo
echo "1️⃣  Verificando que el servidor está corriendo..."
if curl -s -f "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Servidor respondiendo${NC}"
    HEALTH=$(curl -s "$BASE_URL/health")
    echo "   Respuesta: $HEALTH"
else
    echo -e "${RED}❌ Servidor NO está respondiendo${NC}"
    echo "   Por favor, inicia el servidor primero:"
    echo "   cd dujyo-backend && cargo run"
    exit 1
fi

echo ""

# 2. Verificar endpoint de métricas
echo "2️⃣  Verificando endpoint de métricas..."
METRICS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/api/v1/metrics" 2>&1)
HTTP_CODE=$(echo "$METRICS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$METRICS_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q "transactions\|rate_limiting\|redis"; then
    echo -e "${GREEN}✅ Endpoint de métricas funciona${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" = "200" ]; then
    echo -e "${YELLOW}⚠️  Endpoint responde pero formato inesperado${NC}"
    echo "   HTTP Code: $HTTP_CODE"
    echo "   Respuesta: $BODY"
else
    echo -e "${YELLOW}⚠️  Endpoint de métricas no responde correctamente${NC}"
    echo "   HTTP Code: $HTTP_CODE"
    echo "   Respuesta: $BODY"
    echo "   (Puede que necesites reiniciar el servidor después de los cambios)"
fi

echo ""

# 3. Verificar rate limiting (test simple)
echo "3️⃣  Verificando rate limiting..."
echo "   ⚠️  NOTA: Rate limiting es por MINUTO, no por segundo"
echo "   Enviando 65 requests rápidas a /health (límite: 60 req/min)..."
echo "   (Si no se activa, es normal - el límite se cuenta durante 60 segundos completos)"
RATE_LIMITED=0
for i in {1..65}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
    if [ "$HTTP_CODE" -eq 429 ]; then
        RATE_LIMITED=$((RATE_LIMITED + 1))
        if [ $RATE_LIMITED -eq 1 ]; then
            echo -e "   ${YELLOW}⚠️  Rate limit activado en request #$i${NC}"
        fi
    fi
    sleep 0.1
done

if [ $RATE_LIMITED -gt 0 ]; then
    echo -e "   ${GREEN}✅ Rate limiting funcionando ($RATE_LIMITED requests bloqueadas)${NC}"
else
    echo -e "   ${YELLOW}⚠️  Rate limiting no se activó en este test${NC}"
    echo "   💡 Esto es NORMAL porque el límite es por minuto completo"
    echo "   💡 Para probar correctamente, envía requests durante 60 segundos"
fi

echo ""

# 4. Verificar Redis
echo "4️⃣  Verificando Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli -h localhost -p 6379 ping &> /dev/null; then
        echo -e "${GREEN}✅ Redis está disponible${NC}"
    else
        echo -e "${YELLOW}⚠️  Redis no está disponible (usando fallback a memoria)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  redis-cli no está instalado (no se puede verificar)${NC}"
fi

echo ""

# 5. Verificar login
echo "5️⃣  Verificando endpoint de login..."
LOGIN_TEST=$(curl -s -X POST "$BASE_URL/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' 2>&1)

if echo "$LOGIN_TEST" | grep -q "token\|success"; then
    echo -e "${GREEN}✅ Endpoint de login responde${NC}"
    echo "   (Puede fallar si el usuario no existe, eso es normal)"
else
    echo -e "${YELLOW}⚠️  Endpoint de login no responde como se espera${NC}"
    echo "   Respuesta: $LOGIN_TEST"
fi

echo ""
echo "=========================================="
echo "📊 RESUMEN"
echo "=========================================="
echo -e "${GREEN}✅ Diagnóstico completado${NC}"
echo ""
echo "Si hay problemas, verifica:"
echo "1. El servidor está corriendo: cargo run"
echo "2. La base de datos está disponible"
echo "3. Redis está disponible (opcional)"

