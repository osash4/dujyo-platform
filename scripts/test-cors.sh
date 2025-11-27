#!/bin/bash
# Test CORS Configuration

BASE_URL="${1:-http://localhost:8083}"

echo "🔒 Testing CORS Configuration"
echo "=============================="
echo ""

echo "1️⃣  Testing ALLOWED origin (localhost:5173):"
echo "----------------------------------------------"
curl -v -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     "$BASE_URL/api/stream-earn" 2>&1 | grep -i "access-control\|HTTP"

echo ""
echo "2️⃣  Testing CORS headers in GET request:"
echo "----------------------------------------"
curl -v -H "Origin: http://localhost:5173" \
     "$BASE_URL/health" 2>&1 | grep -i "access-control\|HTTP"

echo ""
echo "3️⃣  Testing POST request with CORS:"
echo "----------------------------------"
curl -v -H "Origin: http://localhost:5173" \
     -H "Content-Type: application/json" \
     -X POST \
     "$BASE_URL/health" 2>&1 | grep -i "access-control\|HTTP"

echo ""
echo "✅ CORS Testing Complete"

