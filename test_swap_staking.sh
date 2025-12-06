#!/bin/bash

# Script para verificar swap y staking endpoints
# Uso: ./test_swap_staking.sh [JWT_TOKEN]

API_URL="http://localhost:8083"
TOKEN="${1:-test}"

echo "=== VERIFICACIÓN DE SWAP Y STAKING ==="
echo ""

# 1. Verificar que el servidor está corriendo
echo "1. Verificando servidor..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health")
if [ "$HEALTH" != "200" ]; then
    echo "❌ Servidor no está corriendo (HTTP $HEALTH)"
    exit 1
fi
echo "✅ Servidor está corriendo"
echo ""

# 2. Verificar endpoint de swap
echo "2. Verificando endpoint /swap..."
SWAP_RESPONSE=$(curl -s -X POST "$API_URL/swap" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "from": "DYO",
        "to": "DYS",
        "amount": 10,
        "min_received": 9.8,
        "user": "DUtest123"
    }')

echo "Respuesta de swap:"
echo "$SWAP_RESPONSE" | jq . 2>/dev/null || echo "$SWAP_RESPONSE"
echo ""

# 3. Verificar endpoint de stake
echo "3. Verificando endpoint /stake..."
STAKE_RESPONSE=$(curl -s -X POST "$API_URL/stake" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "account": "DUtest123",
        "amount": 5.0
    }')

echo "Respuesta de stake:"
echo "$STAKE_RESPONSE" | jq . 2>/dev/null || echo "$STAKE_RESPONSE"
echo ""

# 4. Verificar endpoint de unstake
echo "4. Verificando endpoint /unstake..."
UNSTAKE_RESPONSE=$(curl -s -X POST "$API_URL/unstake" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "account": "DUtest123",
        "amount": 2.0
    }')

echo "Respuesta de unstake:"
echo "$UNSTAKE_RESPONSE" | jq . 2>/dev/null || echo "$UNSTAKE_RESPONSE"
echo ""

echo "=== VERIFICACIÓN COMPLETA ==="

