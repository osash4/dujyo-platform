#!/bin/bash

# Script para verificar que Stream-to-Earn actualiza el balance en tiempo real

echo "🔍 VERIFICACIÓN: Stream-to-Earn con Balance Real"
echo "================================================"
echo ""

WALLET="XW2912A395F2F37BF3980E09296A139227764DECED"
API_URL="http://localhost:8083"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "📍 Wallet: $WALLET"
echo ""

# 1. Obtener balance inicial
echo "${BLUE}1. Balance Inicial:${NC}"
BALANCE_BEFORE=$(curl -s "$API_URL/api/balance-detail/$WALLET" | python3 -c "import sys, json; print(json.load(sys.stdin)['xwv'])")
echo "   Balance: ${GREEN}${BALANCE_BEFORE} XWV${NC}"
echo ""

# 2. Obtener transacciones iniciales
echo "${BLUE}2. Transacciones Actuales:${NC}"
TX_COUNT_BEFORE=$(curl -s "$API_URL/api/transactions/$WALLET" | python3 -c "import sys, json; print(json.load(sys.stdin)['total_count'])")
echo "   Total: ${GREEN}${TX_COUNT_BEFORE} transacciones${NC}"
echo ""

# 3. Instrucciones
echo "${YELLOW}3. ACCIÓN REQUERIDA:${NC}"
echo "   ┌────────────────────────────────────────────────────┐"
echo "   │  🎵 Ve a http://localhost:5173                    │"
echo "   │  🎵 Login si es necesario                         │"
echo "   │  🎵 Reproduce UNA canción                         │"
echo "   │  🎵 Déjala sonar por 30 segundos                  │"
echo "   └────────────────────────────────────────────────────┘"
echo ""
echo "   Presiona ENTER cuando hayas terminado..."
read

# 4. Esperar un poco más
echo "${BLUE}4. Esperando procesamiento...${NC}"
sleep 5
echo "   ✓ Listo"
echo ""

# 5. Obtener balance final
echo "${BLUE}5. Balance Final:${NC}"
BALANCE_AFTER=$(curl -s "$API_URL/api/balance-detail/$WALLET" | python3 -c "import sys, json; print(json.load(sys.stdin)['xwv'])")
echo "   Balance: ${GREEN}${BALANCE_AFTER} XWV${NC}"
echo ""

# 6. Obtener transacciones finales
echo "${BLUE}6. Transacciones Finales:${NC}"
TX_COUNT_AFTER=$(curl -s "$API_URL/api/transactions/$WALLET" | python3 -c "import sys, json; print(json.load(sys.stdin)['total_count'])")
echo "   Total: ${GREEN}${TX_COUNT_AFTER} transacciones${NC}"
echo ""

# 7. Calcular diferencias
BALANCE_DIFF=$((BALANCE_AFTER - BALANCE_BEFORE))
TX_DIFF=$((TX_COUNT_AFTER - TX_COUNT_BEFORE))

echo "================================================"
echo "${BLUE}📊 RESULTADOS:${NC}"
echo "================================================"
echo ""

if [ $BALANCE_DIFF -gt 0 ]; then
    echo "✅ ${GREEN}Balance aumentó: +${BALANCE_DIFF} XWV${NC}"
else
    echo "❌ ${RED}Balance NO cambió (aún: $BALANCE_AFTER XWV)${NC}"
fi

if [ $TX_DIFF -gt 0 ]; then
    echo "✅ ${GREEN}Nuevas transacciones: +${TX_DIFF}${NC}"
else
    echo "⚠️  ${YELLOW}No hay nuevas transacciones registradas${NC}"
fi

echo ""

# 8. Ver últimas transacciones
if [ $TX_DIFF -gt 0 ]; then
    echo "${BLUE}7. Últimas Transacciones:${NC}"
    curl -s "$API_URL/api/transactions/$WALLET" | python3 -c "
import sys, json
from datetime import datetime

data = json.load(sys.stdin)
for tx in data['transactions'][:3]:
    timestamp = datetime.fromisoformat(tx['timestamp'].replace('Z', '+00:00'))
    print(f\"   • {tx['type']:8} {tx['amount']:>8.2f} XWV  {timestamp.strftime('%H:%M:%S')}\")
"
    echo ""
fi

# 9. Verificación del Pool
echo "${BLUE}8. Estado del Pool:${NC}"
curl -s "$API_URL/api/stream-earn/pool" | python3 -c "
import sys, json
pool = json.load(sys.stdin)
used_pct = (pool['monthly_pool_used'] / pool['monthly_pool_total']) * 100
print(f\"   Total:     {pool['monthly_pool_total']:,.0f} XWV\")
print(f\"   Usado:     {pool['monthly_pool_used']:,.2f} XWV ({used_pct:.2f}%)\")
print(f\"   Restante:  {pool['monthly_pool_remaining']:,.2f} XWV\")
"
echo ""

# 10. Conclusión
echo "================================================"
if [ $BALANCE_DIFF -gt 0 ] && [ $TX_DIFF -gt 0 ]; then
    echo "${GREEN}✅ STREAM-TO-EARN FUNCIONA CORRECTAMENTE${NC}"
    echo "   - Balance actualizado en blockchain"
    echo "   - Transacciones registradas"
    echo "   - Pool funcionando"
    echo ""
    echo "${YELLOW}⚠️  Si la UI no muestra el cambio, el problema es solo visual${NC}"
    echo "   Solución: Refresco de balance en GlobalPlayer"
elif [ $BALANCE_DIFF -gt 0 ]; then
    echo "${YELLOW}⚠️  BALANCE ACTUALIZADO PERO SIN TRANSACCIONES${NC}"
    echo "   Posible causa: Transacciones agrupadas en bloques"
elif [ $TX_DIFF -gt 0 ]; then
    echo "${YELLOW}⚠️  TRANSACCIONES REGISTRADAS PERO BALANCE NO CAMBIÓ${NC}"
    echo "   Posible causa: Timing de procesamiento"
else
    echo "${RED}❌ NO HUBO CAMBIOS${NC}"
    echo "   Posibles causas:"
    echo "   - No se reprodujo música"
    echo "   - No hay JWT token (no autenticado)"
    echo "   - Stream-earn deshabilitado"
    echo "   - Error en el backend"
fi
echo "================================================"

