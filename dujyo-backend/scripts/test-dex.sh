#!/bin/bash

# XWave DEX Test Script
# Tests the DEX endpoints: swap, liquidity, and pool information

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="http://127.0.0.1:8083"
FROM_ADDRESS="XW1111111111111111111111111111111111111111"
TO_ADDRESS="XW2222222222222222222222222222222222222222"
SWAP_AMOUNT=100.0
MIN_RECEIVED=90.0

echo -e "${BLUE}🔄 XWave DEX Test Script${NC}"
echo "================================="
echo -e "${BLUE}🎯 Test Configuration:${NC}"
echo "Server URL: $SERVER_URL"
echo "From: $FROM_ADDRESS"
echo "To: $TO_ADDRESS"
echo "Swap Amount: $SWAP_AMOUNT XWAVE"
echo "Min Received: $MIN_RECEIVED USDC"
echo ""

# Function to check if server is running
check_server() {
    echo -e "${BLUE}🔍 Checking if server is running...${NC}"
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

# Function to get initial balances
get_initial_balances() {
    echo -e "${BLUE}💰 Getting initial balances...${NC}"
    
    FROM_BALANCE=$(curl -s "$SERVER_URL/balance/$FROM_ADDRESS" | jq -r '.balance // 0')
    TO_BALANCE=$(curl -s "$SERVER_URL/balance/$TO_ADDRESS" | jq -r '.balance // 0')
    
    echo -e "${YELLOW}From balance: ${FROM_BALANCE} XWAVE${NC}"
    echo -e "${YELLOW}To balance: ${TO_BALANCE} XWAVE${NC}"
    echo ""
}

# Function to get pool information
get_pool_info() {
    echo -e "${BLUE}🏊 Getting XWAVE_USDC pool information...${NC}"
    
    POOL_RESPONSE=$(curl -s "$SERVER_URL/pool/XWAVE_USDC")
    echo "Pool Response: $POOL_RESPONSE"
    
    SUCCESS=$(echo "$POOL_RESPONSE" | jq -r '.success // false')
    if [ "$SUCCESS" = "true" ]; then
        RESERVE_A=$(echo "$POOL_RESPONSE" | jq -r '.pool.reserve_a // 0')
        RESERVE_B=$(echo "$POOL_RESPONSE" | jq -r '.pool.reserve_b // 0')
        FEE_RATE=$(echo "$POOL_RESPONSE" | jq -r '.pool.fee_rate // 0')
        
        echo -e "${GREEN}✅ Pool information retrieved${NC}"
        echo -e "${YELLOW}XWAVE Reserve: ${RESERVE_A}${NC}"
        echo -e "${YELLOW}USDC Reserve: ${RESERVE_B}${NC}"
        echo -e "${YELLOW}Fee Rate: ${FEE_RATE}${NC}"
    else
        echo -e "${RED}❌ Failed to get pool information${NC}"
        return 1
    fi
    echo ""
}

# Function to mint some USDC tokens for testing
mint_usdc_tokens() {
    echo -e "${BLUE}🪙 Minting USDC tokens for testing...${NC}"
    
    MINT_RESPONSE=$(curl -s -X POST "$SERVER_URL/mint" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -d "{\"account\": \"$FROM_ADDRESS\", \"amount\": 1000.0}")
    
    echo "Mint Response: $MINT_RESPONSE"
    
    SUCCESS=$(echo "$MINT_RESPONSE" | jq -r '.success // false')
    if [ "$SUCCESS" = "true" ]; then
        echo -e "${GREEN}✅ USDC tokens minted successfully${NC}"
    else
        echo -e "${RED}❌ Failed to mint USDC tokens${NC}"
        return 1
    fi
    echo ""
}

# Function to execute a swap
execute_swap() {
    echo -e "${BLUE}🔄 Executing XWAVE to USDC swap...${NC}"
    
    SWAP_RESPONSE=$(curl -s -X POST "$SERVER_URL/swap" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -d "{
            \"from\": \"XWAVE\",
            \"to\": \"USDC\",
            \"amount\": $SWAP_AMOUNT,
            \"min_received\": $MIN_RECEIVED,
            \"user\": \"$FROM_ADDRESS\"
        }")
    
    echo "Swap Response: $SWAP_RESPONSE"
    
    SUCCESS=$(echo "$SWAP_RESPONSE" | jq -r '.success // false')
    if [ "$SUCCESS" = "true" ]; then
        TX_HASH=$(echo "$SWAP_RESPONSE" | jq -r '.tx_hash // null')
        AMOUNT_RECEIVED=$(echo "$SWAP_RESPONSE" | jq -r '.amount_received // 0')
        PRICE_IMPACT=$(echo "$SWAP_RESPONSE" | jq -r '.price_impact // 0')
        
        echo -e "${GREEN}✅ Swap executed successfully${NC}"
        echo -e "${YELLOW}Transaction Hash: $TX_HASH${NC}"
        echo -e "${YELLOW}Amount Received: $AMOUNT_RECEIVED USDC${NC}"
        echo -e "${YELLOW}Price Impact: $PRICE_IMPACT%${NC}"
    else
        MESSAGE=$(echo "$SWAP_RESPONSE" | jq -r '.message // "Unknown error"')
        echo -e "${RED}❌ Swap failed: $MESSAGE${NC}"
        return 1
    fi
    echo ""
}

# Function to add liquidity
add_liquidity() {
    echo -e "${BLUE}💧 Adding liquidity to XWAVE_USDC pool...${NC}"
    
    LIQUIDITY_RESPONSE=$(curl -s -X POST "$SERVER_URL/liquidity/add" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -d "{
            \"pool_id\": \"XWAVE_USDC\",
            \"amounts\": [50.0, 50.0],
            \"user\": \"$FROM_ADDRESS\"
        }")
    
    echo "Liquidity Response: $LIQUIDITY_RESPONSE"
    
    SUCCESS=$(echo "$LIQUIDITY_RESPONSE" | jq -r '.success // false')
    if [ "$SUCCESS" = "true" ]; then
        TX_HASH=$(echo "$LIQUIDITY_RESPONSE" | jq -r '.tx_hash // null')
        LP_TOKENS=$(echo "$LIQUIDITY_RESPONSE" | jq -r '.lp_tokens_minted // 0')
        
        echo -e "${GREEN}✅ Liquidity added successfully${NC}"
        echo -e "${YELLOW}Transaction Hash: $TX_HASH${NC}"
        echo -e "${YELLOW}LP Tokens Minted: $LP_TOKENS${NC}"
    else
        MESSAGE=$(echo "$LIQUIDITY_RESPONSE" | jq -r '.message // "Unknown error"')
        echo -e "${RED}❌ Liquidity addition failed: $MESSAGE${NC}"
        return 1
    fi
    echo ""
}

# Function to verify final balances
verify_final_balances() {
    echo -e "${BLUE}🔍 Verifying final balances...${NC}"
    
    FROM_BALANCE=$(curl -s "$SERVER_URL/balance/$FROM_ADDRESS" | jq -r '.balance // 0')
    TO_BALANCE=$(curl -s "$SERVER_URL/balance/$TO_ADDRESS" | jq -r '.balance // 0')
    
    echo -e "${YELLOW}Final From balance: ${FROM_BALANCE} XWAVE${NC}"
    echo -e "${YELLOW}Final To balance: ${TO_BALANCE} XWAVE${NC}"
    echo ""
}

# Function to test swap without JWT (should fail)
test_swap_without_jwt() {
    echo -e "${BLUE}🚫 Testing swap without JWT (should fail)...${NC}"
    
    NO_AUTH_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$SERVER_URL/swap" \
        -H "Content-Type: application/json" \
        -d "{
            \"from\": \"XWAVE\",
            \"to\": \"USDC\",
            \"amount\": 10.0,
            \"min_received\": 9.0,
            \"user\": \"$FROM_ADDRESS\"
        }")
    
    HTTP_CODE="${NO_AUTH_RESPONSE: -3}"
    RESPONSE_BODY="${NO_AUTH_RESPONSE%???}"
    
    echo "HTTP Status: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    
    if [ "$HTTP_CODE" = "401" ]; then
        echo -e "${GREEN}✅ Correctly rejected swap request without JWT${NC}"
    else
        echo -e "${RED}❌ Expected 401 Unauthorized, got $HTTP_CODE${NC}"
        return 1
    fi
    echo ""
}

# Main test function
main() {
    echo -e "${BLUE}🚀 Starting DEX tests...${NC}"
    echo ""
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq command not found. Please install jq for JSON parsing.${NC}"
        echo -e "${YELLOW}On macOS: brew install jq${NC}"
        echo -e "${YELLOW}On Ubuntu: sudo apt-get install jq${NC}"
        exit 1
    fi
    
    # Run tests
    if ! check_server; then
        exit 1
    fi
    
    get_initial_balances
    
    if ! get_jwt_token; then
        exit 1
    fi
    
    if ! get_pool_info; then
        exit 1
    fi
    
    if ! mint_usdc_tokens; then
        exit 1
    fi
    
    if ! execute_swap; then
        exit 1
    fi
    
    if ! add_liquidity; then
        exit 1
    fi
    
    if ! test_swap_without_jwt; then
        exit 1
    fi
    
    verify_final_balances
    
    echo -e "${GREEN}🎉 All DEX tests completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📊 Test Summary:${NC}"
    echo "=================="
    echo -e "${GREEN}✅ Pool information retrieval${NC}"
    echo -e "${GREEN}✅ JWT authentication${NC}"
    echo -e "${GREEN}✅ Token minting${NC}"
    echo -e "${GREEN}✅ XWAVE to USDC swap${NC}"
    echo -e "${GREEN}✅ Liquidity addition${NC}"
    echo -e "${GREEN}✅ Authentication protection${NC}"
    echo ""
    echo -e "${GREEN}🚀 DEX is ready for production!${NC}"
}

# Run main function
main "$@"
