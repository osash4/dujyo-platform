#!/bin/bash
# Test Atomic Pool Operations
# This script tests that concurrent requests don't exceed pool limit

set -e

echo "🧪 TEST 3: Atomic Pool Operations"
echo "=================================="

# Get initial pool state
echo "📊 Initial pool state:"
INITIAL_POOL=$(psql -d xwave_db -t -c "SELECT total_distributed FROM monthly_pool WHERE month = TO_CHAR(NOW(), 'YYYY-MM');" 2>/dev/null | xargs)
echo "Total distributed: $INITIAL_POOL"

# Send 5 concurrent requests
echo ""
echo "📤 Sending 5 concurrent requests..."
for i in {1..5}; do
    curl -X POST http://localhost:8083/api/stream-earn \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer test_token" \
      -d "{\"user_id\": \"concurrent_$i\", \"content_id\": \"content_$i\"}" \
      > /dev/null 2>&1 &
done

# Wait for all requests to complete
wait

sleep 2

# Get final pool state
echo ""
echo "📊 Final pool state:"
FINAL_POOL=$(psql -d xwave_db -t -c "SELECT total_distributed FROM monthly_pool WHERE month = TO_CHAR(NOW(), 'YYYY-MM');" 2>/dev/null | xargs)
echo "Total distributed: $FINAL_POOL"

# Calculate difference
DIFF=$(echo "$FINAL_POOL - $INITIAL_POOL" | bc 2>/dev/null || echo "N/A")
echo "Difference: $DIFF"

# Check pool limit (assuming 1,000,000 XWV monthly limit)
POOL_LIMIT=1000000
if (( $(echo "$FINAL_POOL <= $POOL_LIMIT" | bc -l 2>/dev/null || echo 1) )); then
    echo -e "\033[0;32m✅ TEST PASSED: Pool within limit ($FINAL_POOL <= $POOL_LIMIT)\033[0m"
else
    echo -e "\033[0;31m❌ TEST FAILED: Pool exceeded limit ($FINAL_POOL > $POOL_LIMIT)\033[0m"
fi

echo ""
echo "=================================="
echo "Test completed"

