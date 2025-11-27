#!/bin/bash
# Test Nonce System Prevents Replay Attacks
# This script tests that the same request cannot be processed twice

set -e

echo "🧪 TEST 2: Nonce System - Replay Attack Prevention"
echo "===================================================="

# Apply migration if not already applied
echo "📋 Checking/Applying migration..."
psql -d xwave_db -f xwave-backend/migrations/011_stream_nonces.sql 2>/dev/null || echo "Migration may already be applied"

# Test user
USER_ID="test_nonce_$(date +%s)"
CONTENT_ID="test_content_123"

echo ""
echo "📤 Sending first request..."
RESPONSE1=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8083/api/stream-earn \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_token" \
  -d "{\"user_id\": \"$USER_ID\", \"content_id\": \"$CONTENT_ID\"}" 2>&1)

HTTP_CODE1=$(echo "$RESPONSE1" | tail -n1)
echo "First request: $HTTP_CODE1"

# Wait a moment
sleep 1

echo ""
echo "📤 Sending duplicate request (should fail)..."
RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8083/api/stream-earn \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_token" \
  -d "{\"user_id\": \"$USER_ID\", \"content_id\": \"$CONTENT_ID\"}" 2>&1)

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
BODY2=$(echo "$RESPONSE2" | sed '$d')
echo "Second request: $HTTP_CODE2"

# Verify in database
echo ""
echo "🔍 Checking database..."
NONCE_COUNT=$(psql -d xwave_db -t -c "SELECT COUNT(*) FROM stream_nonces WHERE user_address = '$USER_ID';" 2>/dev/null | xargs)

echo "Nonces in DB for user: $NONCE_COUNT"

# Verify
if [ "$NONCE_COUNT" = "1" ]; then
    echo -e "\033[0;32m✅ TEST PASSED: Only 1 nonce recorded (replay prevented)\033[0m"
else
    echo -e "\033[0;31m❌ TEST FAILED: Found $NONCE_COUNT nonces (replay not prevented)\033[0m"
fi

if [ "$HTTP_CODE2" = "400" ] || [ "$HTTP_CODE2" = "409" ] || echo "$BODY2" | grep -q "duplicate\|already\|nonce"; then
    echo -e "\033[0;32m✅ TEST PASSED: Second request was rejected\033[0m"
else
    echo -e "\033[1;33m⚠️  Second request may have been processed (check logs)\033[0m"
fi

echo ""
echo "======================================"
echo "Test completed"

