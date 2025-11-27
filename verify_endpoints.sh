#!/bin/bash

# 🔍 Script de Verificación de Endpoints
# Prueba todos los endpoints del backend y reporta cuáles funcionan

echo "======================================"
echo "🔍 VERIFICACIÓN DE ENDPOINTS - XWave"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend URL
BACKEND_URL="http://localhost:8083"

# Test account
TEST_ACCOUNT="XW2912A395F2F37BF3980E09296A139227764DECED"

# Get JWT token (you need to login first)
# For testing, we'll skip auth-required endpoints or use a mock token
JWT_TOKEN="your_jwt_token_here"

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local auth_required=$4
    
    echo -n "Testing ${method} ${endpoint}... "
    
    if [ "$auth_required" = "true" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X ${method} \
            -H "Authorization: Bearer ${JWT_TOKEN}" \
            -H "Content-Type: application/json" \
            "${BACKEND_URL}${endpoint}")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X ${method} "${BACKEND_URL}${endpoint}")
    fi
    
    if [ "$response" = "200" ] || [ "$response" = "201" ]; then
        echo -e "${GREEN}✅ OK${NC} (${response}) - ${description}"
        return 0
    elif [ "$response" = "404" ]; then
        echo -e "${RED}❌ NOT FOUND${NC} (${response}) - ${description}"
        return 1
    elif [ "$response" = "401" ] || [ "$response" = "403" ]; then
        echo -e "${YELLOW}🔐 AUTH REQUIRED${NC} (${response}) - ${description}"
        return 2
    else
        echo -e "${YELLOW}⚠️  ${response}${NC} - ${description}"
        return 3
    fi
}

echo "📡 TESTING PUBLIC ENDPOINTS..."
echo "─────────────────────────────────────"

# Health & System
test_endpoint "GET" "/health" "Health check"
test_endpoint "GET" "/blocks" "Get blockchain blocks"

# Balance
test_endpoint "GET" "/balance/${TEST_ACCOUNT}" "Get simple balance"
test_endpoint "GET" "/balance-detail/${TEST_ACCOUNT}" "Get detailed balance"

# Transactions
test_endpoint "GET" "/transactions/${TEST_ACCOUNT}" "Get transaction history"

# Staking
test_endpoint "GET" "/staking/history/${TEST_ACCOUNT}" "Get staking history"
test_endpoint "GET" "/staking/positions/${TEST_ACCOUNT}" "Get staking positions"

# NFTs and Tokens
test_endpoint "GET" "/nfts/${TEST_ACCOUNT}" "Get NFTs"
test_endpoint "GET" "/tokens/${TEST_ACCOUNT}" "Get tokens"

# DEX
test_endpoint "GET" "/pool/XWV_USXWV" "Get specific pool"
test_endpoint "GET" "/pools" "Get all pools"

# Analytics
test_endpoint "GET" "/api/v1/analytics/platform" "Platform analytics"
test_endpoint "GET" "/api/v1/analytics/real-time" "Real-time analytics"
test_endpoint "GET" "/api/v1/analytics/artist/artist_001" "Artist analytics"

# Royalties
test_endpoint "GET" "/api/v1/royalties/artist/artist_001" "Artist royalties"
test_endpoint "GET" "/api/v1/royalties/distribution" "Royalty distribution"
test_endpoint "GET" "/api/v1/royalties/pending" "Pending royalties"

# Discovery
test_endpoint "GET" "/api/v1/discovery/leaderboard" "Discovery leaderboard"
test_endpoint "GET" "/api/v1/discovery/user-stats/user_001" "User discovery stats"

# Wallet
test_endpoint "GET" "/api/wallet/session?session_id=test" "Get wallet session"

echo ""
echo "🔐 TESTING PROTECTED ENDPOINTS (Require JWT)..."
echo "─────────────────────────────────────"

# Transactions
test_endpoint "POST" "/transaction" "Submit transaction" true
test_endpoint "POST" "/mint" "Mint tokens" true

# DEX
test_endpoint "POST" "/swap" "Execute swap" true
test_endpoint "POST" "/liquidity/add" "Add liquidity" true

# Stream-to-Earn
test_endpoint "POST" "/api/stream-earn" "Stream-to-earn" true

# Staking
test_endpoint "POST" "/stake" "Stake tokens" true
test_endpoint "POST" "/unstake" "Unstake tokens" true
test_endpoint "POST" "/staking/claim-rewards" "Claim staking rewards" true

# NFTs
test_endpoint "POST" "/nfts/mint" "Mint NFT" true

# Discovery
test_endpoint "POST" "/api/v1/discovery/record-listening" "Record listening" true
test_endpoint "POST" "/api/v1/discovery/claim-rewards" "Claim discovery rewards" true

# Royalties
test_endpoint "POST" "/api/v1/royalties/external-report" "Submit royalty report" true

echo ""
echo "======================================"
echo "📊 RESUMEN DE VERIFICACIÓN"
echo "======================================"
echo ""
echo "Para probar endpoints protegidos con autenticación:"
echo "1. Login primero: curl -X POST http://localhost:8083/login -H 'Content-Type: application/json' -d '{\"username\":\"test\",\"password\":\"test\"}'"
echo "2. Copiar el JWT token de la respuesta"
echo "3. Ejecutar: JWT_TOKEN='tu_token_aqui' ./verify_endpoints.sh"
echo ""
echo "Para ver respuestas completas, ejecuta manualmente:"
echo "  curl http://localhost:8083/health"
echo "  curl http://localhost:8083/balance-detail/${TEST_ACCOUNT}"
echo ""

