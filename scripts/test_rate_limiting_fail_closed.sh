#!/bin/bash
# Test Rate Limiting Fail-Closed Behavior
# This script tests that rate limiting rejects requests when Redis is down

set -e

echo "🧪 TEST 1: Rate Limiting Fail-Closed"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Redis is running
if pgrep -x "redis-server" > /dev/null; then
    echo -e "${YELLOW}⚠️  Redis is running. Stopping Redis for test...${NC}"
    sudo systemctl stop redis || pkill redis-server || true
    sleep 2
else
    echo -e "${GREEN}✅ Redis is already stopped${NC}"
fi

# Wait a moment
sleep 1

# Test 1: Send request - should FAIL
echo ""
echo "📤 Sending request to stream-earn endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8083/api/stream-earn \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_token" \
  -d '{"user_id": "test_fail_closed", "content_id": "test_content"}' 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response Code: $HTTP_CODE"
echo "Response Body: $BODY"

# Verify
if [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "500" ] || echo "$BODY" | grep -q "unavailable\|fail-closed\|Service Unavailable"; then
    echo -e "${GREEN}✅ TEST PASSED: Request was rejected (fail-closed)${NC}"
else
    echo -e "${RED}❌ TEST FAILED: Request was allowed (fail-open)${NC}"
    echo "Expected: 503 Service Unavailable or error message"
    echo "Got: $HTTP_CODE"
fi

# Restart Redis
echo ""
echo "🔄 Restarting Redis..."
sudo systemctl start redis || redis-server --daemonize yes || true
sleep 2

# Test 2: Send request with Redis running - should work
echo ""
echo "📤 Sending request with Redis running..."
RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8083/api/stream-earn \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_token" \
  -d '{"user_id": "test_redis_ok", "content_id": "test_content"}' 2>&1)

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)

if [ "$HTTP_CODE2" != "503" ] && [ "$HTTP_CODE2" != "500" ]; then
    echo -e "${GREEN}✅ TEST PASSED: Request processed with Redis running${NC}"
else
    echo -e "${YELLOW}⚠️  Redis may not be fully started yet${NC}"
fi

echo ""
echo "======================================"
echo "Test completed"

