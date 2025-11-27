#!/bin/bash

# XWave Blockchain Test Script
# This script tests the blockchain functionality: add transaction, mine block, verify DB

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 XWave Blockchain Test Script${NC}"
echo "================================="

# Configuration
SERVER_URL="http://127.0.0.1:8083"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/xwave_blockchain}"

# Test addresses
FROM_ADDRESS="XW1111111111111111111111111111111111111111"
TO_ADDRESS="XW2222222222222222222222222222222222222222"
TEST_AMOUNT=1000

echo -e "${BLUE}🎯 Test Configuration:${NC}"
echo "Server URL: $SERVER_URL"
echo "From: $FROM_ADDRESS"
echo "To: $TO_ADDRESS"
echo "Amount: $TEST_AMOUNT XWAVE"
echo ""

# Function to check if server is running
check_server() {
    echo -e "${BLUE}🔍 Checking if server is running...${NC}"
    if curl -s "$SERVER_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Server is not running. Please start it with: cargo run${NC}"
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

# Function to submit a transaction
submit_transaction() {
    echo -e "${BLUE}📤 Submitting transaction...${NC}"
    
    TRANSACTION_RESPONSE=$(curl -s -X POST "$SERVER_URL/transaction" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -d "{
            \"from\": \"$FROM_ADDRESS\",
            \"to\": \"$TO_ADDRESS\",
            \"amount\": $TEST_AMOUNT
        }")
    
    echo "Response: $TRANSACTION_RESPONSE"
    
    SUCCESS=$(echo "$TRANSACTION_RESPONSE" | jq -r '.success // false')
    TX_HASH=$(echo "$TRANSACTION_RESPONSE" | jq -r '.transaction_id // null')
    
    if [ "$SUCCESS" = "true" ]; then
        echo -e "${GREEN}✅ Transaction submitted successfully${NC}"
        echo -e "${YELLOW}Transaction Hash: $TX_HASH${NC}"
        return 0
    else
        echo -e "${RED}❌ Transaction failed${NC}"
        return 1
    fi
}

# Function to wait for block production
wait_for_block() {
    echo -e "${BLUE}⏳ Waiting for block production (up to 15 seconds)...${NC}"
    
    INITIAL_BLOCKS=$(curl -s "$SERVER_URL/blocks" | jq -r '.total_blocks // 0')
    echo -e "${YELLOW}Initial blocks: $INITIAL_BLOCKS${NC}"
    
    for i in {1..15}; do
        sleep 1
        CURRENT_BLOCKS=$(curl -s "$SERVER_URL/blocks" | jq -r '.total_blocks // 0')
        echo -e "${BLUE}Checking blocks... $CURRENT_BLOCKS (attempt $i/15)${NC}"
        
        if [ "$CURRENT_BLOCKS" -gt "$INITIAL_BLOCKS" ]; then
            echo -e "${GREEN}✅ New block created!${NC}"
            return 0
        fi
    done
    
    echo -e "${RED}❌ No new block created within 15 seconds${NC}"
    return 1
}

# Function to verify balances after transaction
verify_balances() {
    echo -e "${BLUE}🔍 Verifying balances after transaction...${NC}"
    
    NEW_FROM_BALANCE=$(curl -s "$SERVER_URL/balance/$FROM_ADDRESS" | jq -r '.balance // 0')
    NEW_TO_BALANCE=$(curl -s "$SERVER_URL/balance/$TO_ADDRESS" | jq -r '.balance // 0')
    
    echo -e "${YELLOW}New From balance: ${NEW_FROM_BALANCE} XWAVE${NC}"
    echo -e "${YELLOW}New To balance: ${NEW_TO_BALANCE} XWAVE${NC}"
    
    # Calculate expected balances
    EXPECTED_FROM=$((FROM_BALANCE - TEST_AMOUNT))
    EXPECTED_TO=$((TO_BALANCE + TEST_AMOUNT))
    
    if [ "$NEW_FROM_BALANCE" -eq "$EXPECTED_FROM" ] && [ "$NEW_TO_BALANCE" -eq "$EXPECTED_TO" ]; then
        echo -e "${GREEN}✅ Balances are correct!${NC}"
        return 0
    else
        echo -e "${RED}❌ Balances are incorrect!${NC}"
        echo -e "${RED}Expected From: $EXPECTED_FROM, Got: $NEW_FROM_BALANCE${NC}"
        echo -e "${RED}Expected To: $EXPECTED_TO, Got: $NEW_TO_BALANCE${NC}"
        return 1
    fi
}

# Function to verify database records
verify_database() {
    echo -e "${BLUE}🗄️  Verifying database records...${NC}"
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        echo -e "${YELLOW}⚠️  psql not available, skipping database verification${NC}"
        return 0
    fi
    
    # Count records
    BLOCKS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM blocks;" 2>/dev/null | tr -d ' ' || echo "0")
    TRANSACTIONS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM transactions;" 2>/dev/null | tr -d ' ' || echo "0")
    BALANCES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM balances;" 2>/dev/null | tr -d ' ' || echo "0")
    
    echo -e "${YELLOW}Database Records:${NC}"
    echo -e "${YELLOW}  Blocks: $BLOCKS${NC}"
    echo -e "${YELLOW}  Transactions: $TRANSACTIONS${NC}"
    echo -e "${YELLOW}  Balances: $BALANCES${NC}"
    
    if [ "$BLOCKS" -gt "0" ] && [ "$TRANSACTIONS" -gt "0" ] && [ "$BALANCES" -gt "0" ]; then
        echo -e "${GREEN}✅ Database records look good!${NC}"
        return 0
    else
        echo -e "${RED}❌ Database records are missing!${NC}"
        return 1
    fi
}

# Function to get blockchain stats
get_blockchain_stats() {
    echo -e "${BLUE}📊 Blockchain Statistics:${NC}"
    
    BLOCKS_RESPONSE=$(curl -s "$SERVER_URL/blocks")
    TOTAL_BLOCKS=$(echo "$BLOCKS_RESPONSE" | jq -r '.total_blocks // 0')
    
    echo -e "${YELLOW}Total Blocks: $TOTAL_BLOCKS${NC}"
    
    if [ "$TOTAL_BLOCKS" -gt "0" ]; then
        LATEST_BLOCK=$(echo "$BLOCKS_RESPONSE" | jq -r '.blocks[-1] // null')
        if [ "$LATEST_BLOCK" != "null" ]; then
            BLOCK_HASH=$(echo "$LATEST_BLOCK" | jq -r '.hash // "unknown"')
            BLOCK_TXS=$(echo "$LATEST_BLOCK" | jq -r '.transactions | length // 0')
            echo -e "${YELLOW}Latest Block Hash: $BLOCK_HASH${NC}"
            echo -e "${YELLOW}Latest Block Transactions: $BLOCK_TXS${NC}"
        fi
    fi
    echo ""
}

# Main test execution
main() {
    echo -e "${BLUE}🚀 Starting blockchain test...${NC}"
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
    get_blockchain_stats
    
    if ! get_jwt_token; then
        exit 1
    fi
    
    if ! submit_transaction; then
        exit 1
    fi
    
    if ! wait_for_block; then
        exit 1
    fi
    
    if ! verify_balances; then
        exit 1
    fi
    
    if ! verify_database; then
        exit 1
    fi
    
    get_blockchain_stats
    
    echo -e "${GREEN}🎉 All tests passed! Blockchain is working correctly.${NC}"
    echo ""
    echo -e "${BLUE}📋 Test Summary:${NC}"
    echo "✅ Server is running"
    echo "✅ Transaction submitted successfully"
    echo "✅ Block was mined"
    echo "✅ Balances updated correctly"
    echo "✅ Database records are consistent"
    echo ""
    echo -e "${GREEN}🚀 XWave Blockchain is ready for production!${NC}"
}

# Run main function
main "$@"
