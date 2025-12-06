#!/bin/bash

# DUJYO MVP Testing Script
# Tests critical endpoints and functionality
# Usage: ./scripts/test_mvp.sh [base_url]

set -e

BASE_URL="${1:-http://localhost:8083}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🧪 Testing DUJYO MVP endpoints..."
echo "Base URL: $BASE_URL"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local expected_status="${4:-200}"
    local data="$5"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" || echo "000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url" || echo "000")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected $expected_status, got $http_code)"
        echo "   Response: $body"
        ((TESTS_FAILED++))
        return 1
    fi
}

# 1. Health Check
echo "=== Health Checks ==="
test_endpoint "Basic Health Check" "GET" "$BASE_URL/health"
test_endpoint "Detailed Health Check" "GET" "$BASE_URL/api/v1/health/detailed"
echo ""

# 2. Public Endpoints
echo "=== Public Endpoints ==="
test_endpoint "S2E Config" "GET" "$BASE_URL/api/v1/s2e/config"
test_endpoint "Marketplace Listings" "GET" "$BASE_URL/api/v1/content/listings"
test_endpoint "Tips Leaderboard" "GET" "$BASE_URL/api/v1/content/tips/leaderboard"
echo ""

# 3. Protected Endpoints (require auth)
echo "=== Protected Endpoints (require JWT) ==="
echo -e "${YELLOW}⚠️  These tests require authentication token${NC}"
echo "   Set JWT_TOKEN environment variable to test:"
echo "   export JWT_TOKEN='your-jwt-token'"
echo ""

if [ -n "$JWT_TOKEN" ]; then
    AUTH_HEADER="Authorization: Bearer $JWT_TOKEN"
    test_endpoint "User Profile" "GET" "$BASE_URL/api/v1/users/me" 200 "" "$AUTH_HEADER"
    test_endpoint "S2E History" "GET" "$BASE_URL/api/v1/stream-earn/history" 200 "" "$AUTH_HEADER"
else
    echo -e "${YELLOW}⚠️  Skipping protected endpoint tests (no JWT_TOKEN)${NC}"
fi

echo ""
echo "=== Test Summary ==="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

