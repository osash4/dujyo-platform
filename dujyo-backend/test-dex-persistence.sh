#!/bin/bash

echo "🧪 Testing DEX Persistence"
echo "=========================="

# Get JWT token
echo "🔑 Getting JWT token..."
JWT_TOKEN=$(curl -s -X POST http://localhost:8083/login \
  -H "Content-Type: application/json" \
  -d '{"address": "XW1111111111111111111111111111111111111111"}' | \
  jq -r '.token')

if [ "$JWT_TOKEN" = "null" ] || [ -z "$JWT_TOKEN" ]; then
  echo "❌ Failed to get JWT token"
  exit 1
fi

echo "✅ JWT token obtained"

# Execute a swap
echo "🔄 Executing swap..."
SWAP_RESPONSE=$(curl -s -X POST http://localhost:8083/swap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "from": "XWAVE",
    "to": "USDC", 
    "amount": 5,
    "min_received": 4,
    "user": "XW1111111111111111111111111111111111111111"
  }')

echo "Swap response: $SWAP_RESPONSE"

# Extract transaction hash
TX_HASH=$(echo "$SWAP_RESPONSE" | jq -r '.tx_hash')
echo "Transaction hash: $TX_HASH"

# Check if transaction was saved to database
echo "🔍 Checking database..."
DB_RESULT=$(psql xwave_blockchain -t -c "SELECT COUNT(*) FROM transactions WHERE tx_hash = '$TX_HASH';" 2>/dev/null | tr -d ' ')

if [ "$DB_RESULT" = "1" ]; then
  echo "✅ Transaction saved to database"
  
  # Show transaction details
  echo "📊 Transaction details:"
  psql xwave_blockchain -c "SELECT tx_hash, from_address, to_address, amount_in, amount_out, pool_id, transaction_type, status FROM transactions WHERE tx_hash = '$TX_HASH';"
else
  echo "❌ Transaction NOT saved to database"
  echo "Expected 1 row, got: $DB_RESULT"
fi

echo "🏁 Test completed"
