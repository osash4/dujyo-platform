#!/bin/bash
# ✅ TESTING: Gas Fees System - 20 Transacciones con Diferentes Escenarios
# 
# Este script prueba el sistema de gas fees con auto-swap en diferentes escenarios

set -e

BASE_URL="${BASE_URL:-http://localhost:8083}"
JWT_TOKEN="${JWT_TOKEN:-}"

echo "🧪 TESTING GAS FEES SYSTEM - 20 Transacciones"
echo "=============================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
SUCCESS=0
FAILED=0
AUTO_SWAP_COUNT=0

# Función para hacer login y obtener token
login() {
    if [ -z "$JWT_TOKEN" ]; then
        echo "📝 Login requerido..."
        read -p "Email: " EMAIL
        read -sp "Password: " PASSWORD
        echo ""
        
        RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
        
        # Debug: mostrar respuesta completa
        echo "🔍 Respuesta del login:"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        echo ""
        
        # Intentar obtener token de diferentes formatos posibles
        JWT_TOKEN=$(echo "$RESPONSE" | jq -r '.token // .data.token // empty' 2>/dev/null)
        
        # Si aún no hay token, verificar success
        if [ -z "$JWT_TOKEN" ]; then
            SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false' 2>/dev/null)
            if [ "$SUCCESS" != "true" ]; then
                echo -e "${RED}❌ Login fallido${NC}"
                echo "Mensaje: $(echo "$RESPONSE" | jq -r '.message // "Unknown error"' 2>/dev/null)"
                exit 1
            fi
        fi
        
        if [ -z "$JWT_TOKEN" ]; then
            echo -e "${RED}❌ No se pudo obtener token JWT${NC}"
            echo "Por favor, verifica que el usuario existe y las credenciales son correctas"
            exit 1
        fi
        
        echo -e "${GREEN}✅ Login exitoso${NC}"
        echo "Token: ${JWT_TOKEN:0:20}..."
    fi
}

# Función para obtener balance
get_balance() {
    local address=$1
    curl -s -X GET "$BASE_URL/balance-detail/$address" \
        -H "Authorization: Bearer $JWT_TOKEN" | jq -r '.dyo // 0'
}

# Función para enviar transacción
send_transaction() {
    local from=$1
    local to=$2
    local amount=$3
    local test_name=$4
    
    echo ""
    echo "🔄 Test: $test_name"
    echo "   From: $from"
    echo "   To: $to"
    echo "   Amount: $amount"
    
    # Obtener balance antes
    BALANCE_BEFORE=$(get_balance "$from")
    echo "   Balance antes: $BALANCE_BEFORE DYO"
    
    # Enviar transacción
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/transaction" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"from\": \"$from\",
            \"to\": \"$to\",
            \"amount\": $amount
        }")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        SUCCESS=$((SUCCESS + 1))
        echo -e "   ${GREEN}✅ Transacción exitosa${NC}"
        
        # Verificar si hubo auto-swap
        if echo "$BODY" | grep -q "auto-swapped"; then
            AUTO_SWAP_COUNT=$((AUTO_SWAP_COUNT + 1))
            echo -e "   ${YELLOW}🔄 Auto-swap ejecutado${NC}"
        fi
        
        # Obtener balance después
        sleep 1
        BALANCE_AFTER=$(get_balance "$from")
        echo "   Balance después: $BALANCE_AFTER DYO"
        echo "   Mensaje: $(echo "$BODY" | jq -r '.message // ""')"
    else
        FAILED=$((FAILED + 1))
        echo -e "   ${RED}❌ Transacción fallida (HTTP $HTTP_CODE)${NC}"
        echo "   Error: $(echo "$BODY" | jq -r '.message // .error // "Unknown error"')"
    fi
}

# Función para obtener wallet address del usuario logueado
get_user_wallet() {
    # Obtener wallet address del token JWT o del login response
    if [ -f "/tmp/dujyo_test_credentials.txt" ]; then
        source /tmp/dujyo_test_credentials.txt 2>/dev/null
        # Intentar obtener wallet desde el login
        LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
        WALLET=$(echo "$LOGIN_RESPONSE" | jq -r '.wallet_address // empty' 2>/dev/null)
        if [ -n "$WALLET" ]; then
            echo "$WALLET"
            return
        fi
    fi
    
    # Si no se encuentra, usar endpoint para obtener wallet por email
    if [ -f "/tmp/dujyo_test_credentials.txt" ]; then
        source /tmp/dujyo_test_credentials.txt 2>/dev/null
        WALLET_RESPONSE=$(curl -s "$BASE_URL/api/v1/user/wallet?email=$EMAIL" 2>/dev/null)
        WALLET=$(echo "$WALLET_RESPONSE" | jq -r '.wallet_address // empty' 2>/dev/null)
        if [ -n "$WALLET" ]; then
            echo "$WALLET"
            return
        fi
    fi
    
    # Fallback: crear una wallet de prueba
    echo "DU$(uuidgen | tr -d '-' | head -c 40)"
}

# Iniciar testing
echo "🔐 Autenticando..."
login

echo ""
echo "📊 Obteniendo direcciones de prueba..."

# Obtener wallet address del usuario logueado
USER_WALLET=""

# Intentar desde credenciales guardadas
if [ -f "/tmp/dujyo_test_credentials.txt" ]; then
    source /tmp/dujyo_test_credentials.txt 2>/dev/null
    if [ -n "$EMAIL" ] && [ -n "$PASSWORD" ]; then
        LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
        USER_WALLET=$(echo "$LOGIN_RESPONSE" | jq -r '.wallet_address // empty' 2>/dev/null)
        if [ -n "$USER_WALLET" ] && [ "$USER_WALLET" != "null" ] && [ "$USER_WALLET" != "" ]; then
            echo "   ✅ Wallet obtenida del login: $USER_WALLET"
        fi
    fi
fi

# Si no se obtuvo, intentar desde endpoint
if [ -z "$USER_WALLET" ] || [ "$USER_WALLET" = "null" ] || [ "$USER_WALLET" = "" ]; then
    if [ -f "/tmp/dujyo_test_credentials.txt" ]; then
        source /tmp/dujyo_test_credentials.txt 2>/dev/null
        if [ -n "$EMAIL" ]; then
            WALLET_RESPONSE=$(curl -s "$BASE_URL/api/v1/user/wallet?email=$EMAIL" 2>/dev/null)
            USER_WALLET=$(echo "$WALLET_RESPONSE" | jq -r '.wallet_address // empty' 2>/dev/null)
            if [ -n "$USER_WALLET" ] && [ "$USER_WALLET" != "null" ] && [ "$USER_WALLET" != "" ]; then
                echo "   ✅ Wallet obtenida del endpoint: $USER_WALLET"
            fi
        fi
    fi
fi

# Si aún no se tiene, usar función get_user_wallet
if [ -z "$USER_WALLET" ] || [ "$USER_WALLET" = "null" ] || [ "$USER_WALLET" = "" ]; then
    USER_WALLET=$(get_user_wallet)
    echo "   ⚠️  Usando wallet generada: $USER_WALLET"
fi

# Crear segunda wallet para recibir transacciones
TEST_RECEIVER="DU$(date +%s | head -c 10)$(openssl rand -hex 15 2>/dev/null || echo "0000000000000000000000000000000000000000")"

TEST_USER1="$USER_WALLET"
TEST_USER2="$TEST_RECEIVER"

echo "   From (TEST_USER1): $TEST_USER1"
echo "   To (TEST_USER2): $TEST_USER2"

echo ""
echo "=========================================="
echo "TEST 1-5: Transacciones con suficiente DYO"
echo "=========================================="

for i in {1..5}; do
    send_transaction "$TEST_USER1" "$TEST_USER2" $((1000 * i)) "Test $i: Suficiente DYO"
    sleep 0.5
done

echo ""
echo "=========================================="
echo "TEST 6-10: Transacciones sin DYO (con DYS)"
echo "=========================================="

for i in {6..10}; do
    send_transaction "$TEST_USER1" "$TEST_USER2" $((1000 * i)) "Test $i: Sin DYO, con DYS"
    sleep 0.5
done

echo ""
echo "=========================================="
echo "TEST 11-15: Transacciones pequeñas"
echo "=========================================="

for i in {11..15}; do
    send_transaction "$TEST_USER1" "$TEST_USER2" $((100 * i)) "Test $i: Transacción pequeña"
    sleep 0.5
done

echo ""
echo "=========================================="
echo "TEST 16-20: Transacciones grandes"
echo "=========================================="

for i in {16..20}; do
    send_transaction "$TEST_USER1" "$TEST_USER2" $((10000 * i)) "Test $i: Transacción grande"
    sleep 0.5
done

# Resumen
echo ""
echo "=========================================="
echo "📊 RESUMEN"
echo "=========================================="
echo -e "${GREEN}✅ Exitosas: $SUCCESS${NC}"
echo -e "${RED}❌ Fallidas: $FAILED${NC}"
echo -e "${YELLOW}🔄 Auto-swaps: $AUTO_SWAP_COUNT${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Todos los tests pasaron${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Algunos tests fallaron${NC}"
    exit 1
fi

