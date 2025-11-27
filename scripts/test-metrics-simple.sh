#!/bin/bash

# Test simple del endpoint /metrics sin iniciar servidor
# Asume que el servidor ya está corriendo

echo "🧪 Testing Endpoint /metrics"
echo "============================"
echo ""

BASE_URL="http://localhost:8083"

# Test 1: Verificar que el endpoint existe
echo "1. Verificando endpoint /metrics..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/metrics")

if [ "$STATUS" = "200" ]; then
    echo "   ✅ Endpoint responde 200"
elif [ "$STATUS" = "404" ]; then
    echo "   ❌ Endpoint no encontrado (404) - Servidor necesita reiniciarse con nueva versión"
    exit 1
else
    echo "   ⚠️  Endpoint responde: $STATUS"
fi

# Test 2: Verificar formato Prometheus
echo ""
echo "2. Verificando formato Prometheus..."
METRICS=$(curl -s "$BASE_URL/metrics")

if echo "$METRICS" | grep -q "^xwave_tps"; then
    echo "   ✅ Formato Prometheus correcto"
    METRICS_COUNT=$(echo "$METRICS" | grep -c "^xwave_" || echo "0")
    echo "   📊 Total métricas: $METRICS_COUNT"
else
    echo "   ❌ Formato incorrecto o métricas no encontradas"
    echo "   Respuesta recibida:"
    echo "$METRICS" | head -5
    exit 1
fi

# Test 3: Verificar métricas críticas
echo ""
echo "3. Verificando métricas críticas..."
CRITICAL_METRICS=("xwave_tps" "xwave_error_rate" "xwave_response_time_avg" "xwave_memory_usage")
ALL_PRESENT=true

for metric in "${CRITICAL_METRICS[@]}"; do
    if echo "$METRICS" | grep -q "^$metric"; then
        echo "   ✅ $metric"
    else
        echo "   ❌ $metric (faltante)"
        ALL_PRESENT=false
    fi
done

if [ "$ALL_PRESENT" = true ]; then
    echo ""
    echo "✅ TODOS LOS TESTS PASARON"
    exit 0
else
    echo ""
    echo "❌ ALGUNAS MÉTRICAS FALTAN"
    exit 1
fi

