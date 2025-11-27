#!/bin/bash

# XWave DEX Negative Tests
# Tests for error cases and edge conditions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="http://127.0.0.1:8083"
FROM_ADDRESS="XW1111111111111111111111111111111111111111"
TO_ADDRESS="XW2222222222222222222222222222222222222222"
TEST_AMOUNT=1000

echo -e "${BLUE}🧪 XWave DEX Negative Tests${NC}"
echo "=================================="
echo ""

# Function to check if server is running
check_server() {
    echo -e "${BLUE}🔍 Checking server status...${NC}"
    if curl -s "$SERVER_URL/health" > /dev/null; then
        echo -e "${GREEN}✅ Server is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Server is not running${NC}"
        return 1
    fi
}

# Function to get JWT token
get_jwt_token() {
    echo -e "${BLUE}🔑 Getting JWT token...${NC}"
    
    LOGIN_RESPONSE=$(curl -s -X POST "$SERVER_URL/login" \
        -H "Content-Type: application/json" \
        -d "{\"address\": \"$FROM_ADDRESS\"}")
    
    JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // ""')
    
    if [ "$JWT_TOKEN" != "" ] && [ "$JWT_TOKEN" != "null" ]; then
        echo -e "${GREEN}✅ JWT token obtained${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to get JWT token${NC}"
        return 1
    fi
}

# Test 1: Swap without JWT (should return 401)
test_swap_without_jwt() {
    echo -e "${BLUE}❌ Test 1: Swap without JWT (should return 401)${NC}"
    
    SWAP_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$SERVER_URL/swap" \
        -H "Content-Type: application/json" \
        -d "{
            \"from\": \"XWAVE\",
            \"to\": \"USDC\",
            \"amount\": $TEST_AMOUNT,
            \"min_received\": 900,
            \"user\": \"$FROM_ADDRESS\"
        }")
    
    HTTP_CODE=$(echo "$SWAP_RESPONSE" | tail -c 4)
    RESPONSE_BODY=$(echo "$SWAP_RESPONSE" | head -c -4)
    
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    
    if [ "$HTTP_CODE" = "401" ]; then
        echo -e "${GREEN}✅ Test 1 PASSED: Correctly returned 401 Unauthorized${NC}"
        return 0
    else
        echo -e "${RED}❌ Test 1 FAILED: Expected 401, got $HTTP_CODE${NC}"
        return 1
    fi
}

# Test 2: Swap with insufficient balance (should return error)
test_swap_insufficient_balance() {
    echo -e "${BLUE}❌ Test 2: Swap with insufficient balance${NC}"
    
    # Try to swap more than the user has
    LARGE_AMOUNT=999999999
    
    SWAP_RESPONSE=$(curl -s -X POST "$SERVER_URL/swap" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -d "{
            \"from\": \"XWAVE\",
            \"to\": \"USDC\",
            \"amount\": $LARGE_AMOUNT,
            \"min_received\": 900,
            \"user\": \"$FROM_ADDRESS\"
        }")
    
    echo "Response: $SWAP_RESPONSE"
    
    SUCCESS=$(echo "$SWAP_RESPONSE" | jq -r '.success // false')
    MESSAGE=$(echo "$SWAP_RESPONSE" | jq -r '.message // ""')
    
    if [ "$SUCCESS" = "false" ] && [[ "$MESSAGE" == *"Insufficient"* ]]; then
        echo -e "${GREEN}✅ Test 2 PASSED: Correctly returned insufficient balance error${NC}"
        return 0
    else
        echo -e "${RED}❌ Test 2 FAILED: Expected insufficient balance error${NC}"
        return 1
    fi
}

# Test 3: Swap with non-existent pool (should return error)
test_swap_nonexistent_pool() {
    echo -e "${BLUE}❌ Test 3: Swap with non-existent pool${NC}"
    
    # Use a small amount that the user has to avoid insufficient balance error
    SMALL_AMOUNT=10
    
    SWAP_RESPONSE=$(curl -s -X POST "$SERVER_URL/swap" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -d "{
            \"from\": \"NONEXISTENT\",
            \"to\": \"ALSO_NONEXISTENT\",
            \"amount\": $SMALL_AMOUNT,
            \"min_received\": 5,
            \"user\": \"$FROM_ADDRESS\"
        }")
    
    echo "Response: $SWAP_RESPONSE"
    
    SUCCESS=$(echo "$SWAP_RESPONSE" | jq -r '.success // false')
    MESSAGE=$(echo "$SWAP_RESPONSE" | jq -r '.message // ""')
    
    if [ "$SUCCESS" = "false" ] && [[ "$MESSAGE" == *"Pool not found"* ]]; then
        echo -e "${GREEN}✅ Test 3 PASSED: Correctly returned pool not found error${NC}"
        return 0
    else
        echo -e "${RED}❌ Test 3 FAILED: Expected pool not found error${NC}"
        return 1
    fi
}

# Test 4: Add liquidity without JWT (should return 401)
test_liquidity_without_jwt() {
    echo -e "${BLUE}❌ Test 4: Add liquidity without JWT (should return 401)${NC}"
    
    LIQUIDITY_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$SERVER_URL/liquidity/add" \
        -H "Content-Type: application/json" \
        -d "{
            \"pool_id\": \"XWAVE_USDC\",
            \"amounts\": [1000, 1000],
            \"user\": \"$FROM_ADDRESS\"
        }")
    
    HTTP_CODE=$(echo "$LIQUIDITY_RESPONSE" | tail -c 4)
    RESPONSE_BODY=$(echo "$LIQUIDITY_RESPONSE" | head -c -4)
    
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    
    if [ "$HTTP_CODE" = "401" ]; then
        echo -e "${GREEN}✅ Test 4 PASSED: Correctly returned 401 Unauthorized${NC}"
        return 0
    else
        echo -e "${RED}❌ Test 4 FAILED: Expected 401, got $HTTP_CODE${NC}"
        return 1
    fi
}

# Test 5: Add liquidity with insufficient balance (should return error)
test_liquidity_insufficient_balance() {
    echo -e "${BLUE}❌ Test 5: Add liquidity with insufficient balance${NC}"
    
    # Try to add more liquidity than the user has
    LARGE_AMOUNT=999999999
    
    LIQUIDITY_RESPONSE=$(curl -s -X POST "$SERVER_URL/liquidity/add" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -d "{
            \"pool_id\": \"XWAVE_USDC\",
            \"amounts\": [$LARGE_AMOUNT, $LARGE_AMOUNT],
            \"user\": \"$FROM_ADDRESS\"
        }")
    
    echo "Response: $LIQUIDITY_RESPONSE"
    
    SUCCESS=$(echo "$LIQUIDITY_RESPONSE" | jq -r '.success // false')
    MESSAGE=$(echo "$LIQUIDITY_RESPONSE" | jq -r '.message // ""')
    
    if [ "$SUCCESS" = "false" ] && [[ "$MESSAGE" == *"Insufficient"* ]]; then
        echo -e "${GREEN}✅ Test 5 PASSED: Correctly returned insufficient balance error${NC}"
        return 0
    else
        echo -e "${RED}❌ Test 5 FAILED: Expected insufficient balance error${NC}"
        return 1
    fi
}

# Test 6: Add liquidity to non-existent pool (should return error)
test_liquidity_nonexistent_pool() {
    echo -e "${BLUE}❌ Test 6: Add liquidity to non-existent pool${NC}"
    
    # Use small amounts that the user has to avoid insufficient balance error
    SMALL_AMOUNT=10
    
    LIQUIDITY_RESPONSE=$(curl -s -X POST "$SERVER_URL/liquidity/add" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -d "{
            \"pool_id\": \"NONEXISTENT_POOL\",
            \"amounts\": [$SMALL_AMOUNT, $SMALL_AMOUNT],
            \"user\": \"$FROM_ADDRESS\"
        }")
    
    echo "Response: $LIQUIDITY_RESPONSE"
    
    SUCCESS=$(echo "$LIQUIDITY_RESPONSE" | jq -r '.success // false')
    MESSAGE=$(echo "$LIQUIDITY_RESPONSE" | jq -r '.message // ""')
    
    if [ "$SUCCESS" = "false" ] && [[ "$MESSAGE" == *"Pool not found"* ]]; then
        echo -e "${GREEN}✅ Test 6 PASSED: Correctly returned pool not found error${NC}"
        return 0
    else
        echo -e "${RED}❌ Test 6 FAILED: Expected pool not found error${NC}"
        return 1
    fi
}

# Main test function
main() {
    echo -e "${BLUE}🚀 Starting DEX negative tests...${NC}"
    echo ""
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq command not found. Please install jq for JSON parsing.${NC}"
        echo -e "${YELLOW}On macOS: brew install jq${NC}"
        exit 1
    fi
    
    # Run tests
    if ! check_server; then
        exit 1
    fi
    
    if ! get_jwt_token; then
        exit 1
    fi
    
    echo ""
    echo -e "${BLUE}🧪 Running negative tests...${NC}"
    echo ""
    
    TESTS_PASSED=0
    TESTS_TOTAL=6
    
    # Run all negative tests
    if test_swap_without_jwt; then ((TESTS_PASSED++)); fi
    echo ""
    
    if test_swap_insufficient_balance; then ((TESTS_PASSED++)); fi
    echo ""
    
    if test_swap_nonexistent_pool; then ((TESTS_PASSED++)); fi
    echo ""
    
    if test_liquidity_without_jwt; then ((TESTS_PASSED++)); fi
    echo ""
    
    if test_liquidity_insufficient_balance; then ((TESTS_PASSED++)); fi
    echo ""
    
    if test_liquidity_nonexistent_pool; then ((TESTS_PASSED++)); fi
    echo ""
    
    # Summary
    echo -e "${BLUE}📊 Test Summary${NC}"
    echo "==============="
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}/$TESTS_TOTAL"
    
    if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
        echo -e "${GREEN}🎉 All negative tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        exit 1
    fi
}

# Run main function
main
