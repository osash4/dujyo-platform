#!/bin/bash
# Test Password Reset Flow End-to-End

BASE_URL="${1:-http://localhost:8083}"
TEST_EMAIL="${2:-test_reset_$(date +%s)@example.com}"

echo "🔐 Testing Password Reset Flow"
echo "==============================="
echo ""
echo "Test Email: $TEST_EMAIL"
echo ""

# Step 1: Register user (if needed)
echo "1️⃣  Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"TestPassword123!\", \"username\": \"testuser_$(date +%s)\"}")

if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
    echo "✅ User registered successfully"
else
    echo "⚠️  User may already exist or registration failed"
    echo "   Response: $REGISTER_RESPONSE"
fi

echo ""
echo "2️⃣  Requesting password reset..."
FORGOT_RESPONSE=$(curl -s -X POST "$BASE_URL/forgot-password" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$TEST_EMAIL\"}")

echo "Response: $FORGOT_RESPONSE"

if echo "$FORGOT_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Password reset request successful"
    echo ""
    echo "📧 Check server logs for reset token (if EMAIL_SERVICE=console)"
    echo "   Or check database: SELECT * FROM password_reset_tokens WHERE email = '$TEST_EMAIL' ORDER BY created_at DESC LIMIT 1;"
else
    echo "❌ Password reset request failed"
    exit 1
fi

echo ""
echo "3️⃣  Testing rate limiting (4 requests)..."
for i in {1..4}; do
    echo "   Request $i..."
    RESPONSE=$(curl -s -X POST "$BASE_URL/forgot-password" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$TEST_EMAIL\"}")
    
    if echo "$RESPONSE" | grep -q "rate limit\|too many"; then
        echo "   ✅ Rate limit detected on request $i"
        break
    fi
    sleep 1
done

echo ""
echo "4️⃣  To test reset-password endpoint:"
echo "   Get token from database or logs, then:"
echo ""
echo "   curl -X POST $BASE_URL/reset-password \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"token\": \"YOUR_TOKEN_HERE\", \"new_password\": \"NewPassword123!\"}'"
echo ""

echo "✅ Password Reset Testing Complete"

