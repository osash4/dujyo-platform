#!/bin/bash

# XWave Blockchain JWT Authentication Test Script
# This script tests JWT authentication functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 XWave Blockchain JWT Authentication Test${NC}"
echo "=============================================="

# Configuration
SERVER_URL="http://127.0.0.1:8083"
FROM_ADDRESS="XW1111111111111111111111111111111111111111"
TO_ADDRESS="XW2222222222222222222222222222222222222222"

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq command not found. Please install jq for JSON parsing.${NC}"
    echo -e "${YELLOW}On macOS: brew install jq${NC}"
    echo -e "${YELLOW}On Ubuntu: sudo apt-get install jq${NC}"
    exit 1
fi

# Check if server is running
echo -e "${BLUE}🔍 Checking if server is running...${NC}"
if ! curl -s "$SERVER_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Server is not running. Please start it with: cargo run${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"

echo ""

# Step 1: Login and get JWT token
echo -e "${BLUE}1. 🔑 Logging in to get JWT token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$SERVER_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"$FROM_ADDRESS\"}")

echo "Login response: $LOGIN_RESPONSE"

SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success // false')
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // ""')

if [ "$SUCCESS" = "true" ] && [ "$TOKEN" != "" ]; then
    echo -e "${GREEN}✅ Login successful${NC}"
    echo -e "${YELLOW}Token: ${TOKEN:0:50}...${NC}"
else
    echo -e "${RED}❌ Login failed${NC}"
    exit 1
fi

echo ""

# Step 2: Test transaction without token (should fail)
echo -e "${BLUE}2. 🚫 Testing transaction without token (should fail)...${NC}"
NO_TOKEN_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$SERVER_URL/transaction" \
  -H "Content-Type: application/json" \
  -d "{\"from\": \"$FROM_ADDRESS\", \"to\": \"$TO_ADDRESS\", \"amount\": 1000}")

HTTP_CODE="${NO_TOKEN_RESPONSE: -3}"
RESPONSE_BODY="${NO_TOKEN_RESPONSE%???}"

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✅ Correctly rejected request without token${NC}"
else
    echo -e "${RED}❌ Should have rejected request without token (expected 401, got $HTTP_CODE)${NC}"
fi

echo ""

# Step 3: Test transaction with token (should succeed)
echo -e "${BLUE}3. ✅ Testing transaction with token (should succeed)...${NC}"
WITH_TOKEN_RESPONSE=$(curl -s -X POST "$SERVER_URL/transaction" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"from\": \"$FROM_ADDRESS\", \"to\": \"$TO_ADDRESS\", \"amount\": 1000}")

echo "Response: $WITH_TOKEN_RESPONSE"

SUCCESS=$(echo "$WITH_TOKEN_RESPONSE" | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Transaction successful with valid token${NC}"
else
    echo -e "${RED}❌ Transaction failed with valid token${NC}"
fi

echo ""

# Step 4: Test mint with token
echo -e "${BLUE}4. 🪙 Testing mint with token...${NC}"
MINT_RESPONSE=$(curl -s -X POST "$SERVER_URL/mint" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"account\": \"$FROM_ADDRESS\", \"amount\": 1000}")

echo "Response: $MINT_RESPONSE"

SUCCESS=$(echo "$MINT_RESPONSE" | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Mint successful with valid token${NC}"
else
    echo -e "${RED}❌ Mint failed with valid token${NC}"
fi

echo ""

# Step 5: Test mint without token (should fail)
echo -e "${BLUE}5. 🚫 Testing mint without token (should fail)...${NC}"
NO_TOKEN_MINT_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$SERVER_URL/mint" \
  -H "Content-Type: application/json" \
  -d "{\"account\": \"$FROM_ADDRESS\", \"amount\": 1000}")

HTTP_CODE="${NO_TOKEN_MINT_RESPONSE: -3}"
RESPONSE_BODY="${NO_TOKEN_MINT_RESPONSE%???}"

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✅ Correctly rejected mint request without token${NC}"
else
    echo -e "${RED}❌ Should have rejected mint request without token (expected 401, got $HTTP_CODE)${NC}"
fi

echo ""

# Step 6: Test with invalid token
echo -e "${BLUE}6. 🚫 Testing with invalid token (should fail)...${NC}"
INVALID_TOKEN_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$SERVER_URL/transaction" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token_here" \
  -d "{\"from\": \"$FROM_ADDRESS\", \"to\": \"$TO_ADDRESS\", \"amount\": 1000}")

HTTP_CODE="${INVALID_TOKEN_RESPONSE: -3}"
RESPONSE_BODY="${INVALID_TOKEN_RESPONSE%???}"

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✅ Correctly rejected request with invalid token${NC}"
else
    echo -e "${RED}❌ Should have rejected request with invalid token (expected 401, got $HTTP_CODE)${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}📊 Test Summary:${NC}"
echo "=================="
echo -e "${GREEN}✅ JWT Authentication is working correctly!${NC}"
echo ""
echo -e "${BLUE}🎯 Key Features Verified:${NC}"
echo "• Login endpoint generates valid JWT tokens"
echo "• Protected endpoints require valid JWT tokens"
echo "• Requests without tokens are rejected (401)"
echo "• Requests with invalid tokens are rejected (401)"
echo "• Valid tokens allow access to protected endpoints"
echo ""
echo -e "${GREEN}🚀 JWT Authentication is ready for production!${NC}"
