# DUJYO API Endpoints Documentation

## Base URL
- Development: `http://localhost:8083`
- Production: `https://api.dujyo.com`

## Authentication
Most endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Health & Status

### GET /health
Basic health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

### GET /api/v1/health/detailed
Detailed health check with system status.

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "s2e_pool": "2000000.00 DYO remaining",
  "active_users": 0,
  "total_listings": 0,
  "total_tips": 0,
  "uptime": "0h 0m",
  "timestamp": 1234567890
}
```

## Stream-to-Earn (S2E)

### GET /api/v1/s2e/config
Get S2E configuration (public).

**Response:**
```json
{
  "daily_limit_per_user": 1000,
  "earnings_per_stream": 0.01,
  "pool_amount": 2000000.0
}
```

### GET /api/v1/stream-earn/history
Get user's S2E earnings history (requires auth).

**Response:**
```json
{
  "records": [
    {
      "id": "uuid",
      "user_address": "DU...",
      "content_id": "content-id",
      "tokens_earned": 0.5,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## Marketplace

### GET /api/v1/content/listings
Get active marketplace listings.

**Query Parameters:**
- `seller` (optional): Filter by seller address
- `license_type` (optional): Filter by license type (personal, commercial, exclusive)
- `max_price` (optional): Maximum price filter
- `sort_by` (optional): Sort order (newest, price_low, price_high)

**Response:**
```json
[
  {
    "listing_id": "uuid",
    "content_id": "content-id",
    "seller_address": "DU...",
    "price": 50.0,
    "currency": "DYO",
    "license_type": "commercial",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "content_title": "Song Title",
    "content_artist": "Artist Name",
    "thumbnail_url": "https://..."
  }
]
```

### POST /api/v1/content/listings
Create a new listing (requires auth).

**Request Body:**
```json
{
  "content_id": "content-id",
  "price": 50.0,
  "currency": "DYO",
  "license_type": "commercial"
}
```

**Response:**
```json
{
  "listing_id": "uuid",
  "content_id": "content-id",
  "seller_address": "DU...",
  "price": 50.0,
  "currency": "DYO",
  "license_type": "commercial",
  "status": "active",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### POST /api/v1/content/purchase
Purchase a listing (requires auth).

**Request Body:**
```json
{
  "listing_id": "uuid",
  "amount": 50.0,
  "tx_hash": "optional-tx-hash"
}
```

**Response:**
```json
{
  "purchase_id": "uuid",
  "license_key": "DUJYO-20240101-ABC123",
  "purchased_at": "2024-01-01T00:00:00Z",
  "content_id": "content-id",
  "license_type": "commercial"
}
```

## Tips System

### POST /api/v1/content/tips/send
Send a tip to an artist (requires auth).

**Request Body:**
```json
{
  "receiver_address": "DU...",
  "amount": 10.0,
  "currency": "DYO",
  "message": "Great work!",
  "content_id": "optional-content-id",
  "is_public": true
}
```

**Response:**
```json
{
  "tip_id": "uuid",
  "sender_address": "DU...",
  "receiver_address": "DU...",
  "amount": 10.0,
  "currency": "DYO",
  "message": "Great work!",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### GET /api/v1/content/tips/received/:address
Get tips received by an address.

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)

**Response:**
```json
[
  {
    "tip_id": "uuid",
    "sender_address": "DU...",
    "receiver_address": "DU...",
    "amount": 10.0,
    "currency": "DYO",
    "message": "Great work!",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### GET /api/v1/content/tips/leaderboard
Get top tipped artists.

**Query Parameters:**
- `limit` (optional): Number of results (default: 10)

**Response:**
```json
[
  {
    "artist_address": "DU...",
    "tip_count": 50,
    "total_received": 500.0,
    "last_tip": "2024-01-01T00:00:00Z"
  }
]
```

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid request parameters"
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

