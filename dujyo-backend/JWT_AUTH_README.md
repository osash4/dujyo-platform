# Dujyo Blockchain JWT Authentication

## Overview
The Dujyo blockchain now includes JWT (JSON Web Token) authentication for secure access to protected endpoints. This ensures that only authenticated users can submit transactions and mint tokens.

## Protected Endpoints
The following endpoints require JWT authentication:
- `POST /transaction` - Submit a new transaction
- `POST /mint` - Mint new tokens

## Public Endpoints
These endpoints are accessible without authentication:
- `GET /health` - Health check
- `GET /blocks` - Get blockchain data
- `GET /balance/{address}` - Get balance for an address
- `WS /ws` - WebSocket connection
- `POST /login` - Authenticate and get JWT token

## Authentication Flow

### 1. Login to Get JWT Token
```bash
curl -X POST http://127.0.0.1:8083/login \
  -H "Content-Type: application/json" \
  -d '{
    "address": "XW1111111111111111111111111111111111111111"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "message": "Login successful"
}
```

### 2. Use JWT Token for Protected Endpoints
Include the JWT token in the Authorization header:

```bash
curl -X POST http://127.0.0.1:8083/transaction \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "from": "XW1111111111111111111111111111111111111111",
    "to": "XW2222222222222222222222222222222222222222",
    "amount": 1000
  }'
```

## JWT Token Details

### Token Structure
The JWT token contains the following claims:
- `sub` (Subject): User's blockchain address
- `exp` (Expiration): Token expiration time (24 hours from issue)
- `iat` (Issued At): Token creation time
- `iss` (Issuer): "dujyo-blockchain"

### Token Expiration
- Tokens expire after 24 hours
- After expiration, you need to login again to get a new token
- Expired tokens will return 401 Unauthorized

## Environment Configuration

### JWT Secret
Set the JWT secret in your environment:
```bash
export JWT_SECRET="your_super_secret_jwt_key_here"
```

If not set, the system uses a default secret: `dujyo_blockchain_secret_key_2024`

## Testing JWT Authentication

### 1. Start the Server
```bash
cargo run
```

### 2. Test Login
```bash
# Login with a demo address
curl -X POST http://127.0.0.1:8083/login \
  -H "Content-Type: application/json" \
  -d '{
    "address": "XW1111111111111111111111111111111111111111"
  }'
```

### 3. Test Protected Endpoint Without Token
```bash
# This should return 401 Unauthorized
curl -X POST http://127.0.0.1:8083/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "from": "XW1111111111111111111111111111111111111111",
    "to": "XW2222222222222222222222222222222222222222",
    "amount": 1000
  }'
```

### 4. Test Protected Endpoint With Token
```bash
# Replace YOUR_JWT_TOKEN with the token from step 2
curl -X POST http://127.0.0.1:8083/transaction \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "from": "XW1111111111111111111111111111111111111111",
    "to": "XW2222222222222222222222222222222222222222",
    "amount": 1000
  }'
```

## Demo Addresses
Use these demo addresses for testing:
- `XW1111111111111111111111111111111111111111` - Genesis (1,000,000 DUJYO)
- `XW2222222222222222222222222222222222222222` - Demo User 1 (500,000 DUJYO)
- `XW3333333333333333333333333333333333333333` - Demo User 2 (250,000 DUJYO)
- `XW4444444444444444444444444444444444444444` - Demo User 3 (100,000 DUJYO)
- `XW5555555555555555555555555555555555555555` - Demo User 4 (75,000 DUJYO)

## Complete Test Script

Here's a complete test script to verify JWT authentication:

```bash
#!/bin/bash

SERVER_URL="http://127.0.0.1:8083"
FROM_ADDRESS="XW1111111111111111111111111111111111111111"
TO_ADDRESS="XW2222222222222222222222222222222222222222"

echo "🔐 Testing JWT Authentication..."

# Step 1: Login and get JWT token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $SERVER_URL/login \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"$FROM_ADDRESS\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "✅ Login successful, token: ${TOKEN:0:50}..."

# Step 2: Test transaction without token (should fail)
echo "2. Testing transaction without token (should fail)..."
NO_TOKEN_RESPONSE=$(curl -s -X POST $SERVER_URL/transaction \
  -H "Content-Type: application/json" \
  -d "{\"from\": \"$FROM_ADDRESS\", \"to\": \"$TO_ADDRESS\", \"amount\": 1000}")

if echo $NO_TOKEN_RESPONSE | grep -q "401"; then
    echo "✅ Correctly rejected request without token"
else
    echo "❌ Should have rejected request without token"
fi

# Step 3: Test transaction with token (should succeed)
echo "3. Testing transaction with token (should succeed)..."
WITH_TOKEN_RESPONSE=$(curl -s -X POST $SERVER_URL/transaction \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"from\": \"$FROM_ADDRESS\", \"to\": \"$TO_ADDRESS\", \"amount\": 1000}")

if echo $WITH_TOKEN_RESPONSE | grep -q "success.*true"; then
    echo "✅ Transaction successful with valid token"
else
    echo "❌ Transaction failed with valid token"
fi

# Step 4: Test mint with token
echo "4. Testing mint with token..."
MINT_RESPONSE=$(curl -s -X POST $SERVER_URL/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"address\": \"$FROM_ADDRESS\", \"amount\": 1000}")

if echo $MINT_RESPONSE | grep -q "success.*true"; then
    echo "✅ Mint successful with valid token"
else
    echo "❌ Mint failed with valid token"
fi

echo "🎉 JWT Authentication test completed!"
```

## Security Notes

1. **JWT Secret**: Always use a strong, unique JWT secret in production
2. **Token Expiration**: Tokens expire after 24 hours for security
3. **HTTPS**: Use HTTPS in production to protect tokens in transit
4. **Signature Verification**: The current implementation accepts any address for demo purposes. In production, implement proper signature verification.

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```
This occurs when:
- No Authorization header is provided
- Invalid JWT token format
- Expired JWT token
- Invalid JWT signature

### 400 Bad Request
```json
{
  "error": "Bad Request"
}
```
This occurs when:
- Invalid JSON in request body
- Missing required fields

## Integration with Frontend

To integrate JWT authentication with your frontend:

1. **Login Flow**: Call `/login` endpoint to get JWT token
2. **Store Token**: Store the JWT token securely (localStorage, sessionStorage, or secure cookie)
3. **Include in Requests**: Add `Authorization: Bearer <token>` header to all protected API calls
4. **Handle Expiration**: Implement token refresh logic or redirect to login when token expires

Example JavaScript:
```javascript
// Login and store token
const loginResponse = await fetch('/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: userAddress })
});
const { token } = await loginResponse.json();
localStorage.setItem('jwt_token', token);

// Use token in API calls
const response = await fetch('/transaction', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
  },
  body: JSON.stringify(transactionData)
});
```
