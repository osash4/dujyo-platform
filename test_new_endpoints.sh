#!/bin/bash

# 🧪 Test Script for New Endpoints
# Tests all the newly implemented endpoints

echo "========================================"
echo "🧪 TESTING NEW ENDPOINTS - XWave"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backend URL
BACKEND_URL="http://localhost:8083"

# Test account
TEST_ACCOUNT="XW2912A395F2F37BF3980E09296A139227764DECED"

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo -n "Testing ${method} ${endpoint}... "
    
    response=$(curl -s -w "\n%{http_code}" -X ${method} "${BACKEND_URL}${endpoint}")
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ OK${NC} (${http_code})"
        echo -e "   ${BLUE}→${NC} ${description}"
        # Show first line of response
        echo "$body" | jq -c '.' 2>/dev/null | head -c 100
        echo "..."
        echo ""
        return 0
    elif [ "$http_code" = "404" ]; then
        echo -e "${RED}❌ NOT FOUND${NC} (${http_code})"
        echo -e "   ${RED}→${NC} ${description}"
        echo ""
        return 1
    else
        echo -e "${YELLOW}⚠️  ${http_code}${NC}"
        echo -e "   ${YELLOW}→${NC} ${description}"
        echo ""
        return 2
    fi
}

echo "🆕 TESTING NEWLY IMPLEMENTED ENDPOINTS..."
echo "─────────────────────────────────────────"
echo ""

# Test 1: Transactions
echo "1️⃣  Transactions Endpoint"
test_endpoint "GET" "/transactions/${TEST_ACCOUNT}" "Get transaction history"

# Test 2: Staking History
echo "2️⃣  Staking History Endpoint"
test_endpoint "GET" "/staking/history/${TEST_ACCOUNT}" "Get staking history"

# Test 3: Staking Positions
echo "3️⃣  Staking Positions Endpoint"
test_endpoint "GET" "/staking/positions/${TEST_ACCOUNT}" "Get active staking positions"

# Test 4: NFTs
echo "4️⃣  NFTs Endpoint"
test_endpoint "GET" "/nfts/${TEST_ACCOUNT}" "Get user NFTs"

# Test 5: Tokens
echo "5️⃣  Tokens Endpoint"
test_endpoint "GET" "/tokens/${TEST_ACCOUNT}" "Get all tokens (XWV, USXWV)"

# Test 6: Pools
echo "6️⃣  Pools Endpoint"
test_endpoint "GET" "/pools" "Get all DEX pools"

echo ""
echo "======================================"
echo "📊 TESTING SUMMARY"
echo "======================================"
echo ""
echo "All new endpoints tested!"
echo ""
echo "Note: Protected endpoints (/staking/claim-rewards, /nfts/mint) "
echo "require JWT authentication and should be tested with a valid token."
echo ""
echo "To get a JWT token:"
echo "  curl -X POST http://localhost:8083/login \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"username\":\"test\",\"password\":\"test\"}'"
echo ""
echo "Then test protected endpoints:"
echo "  curl -X POST http://localhost:8083/staking/claim-rewards \\"
echo "    -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\"
echo "    -H 'Content-Type: application/json'"
echo ""

