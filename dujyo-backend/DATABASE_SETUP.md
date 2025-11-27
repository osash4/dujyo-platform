# Dujyo Blockchain Database Setup

## Overview
The Dujyo blockchain now includes PostgreSQL persistence for blocks, transactions, and balances.

## Database Schema

### Tables

#### `blocks`
- `height` (BIGINT PRIMARY KEY) - Block height/number
- `hash` (VARCHAR(255) UNIQUE) - Block hash
- `prev_hash` (VARCHAR(255)) - Previous block hash
- `timestamp` (TIMESTAMPTZ) - Block creation timestamp
- `tx_count` (INTEGER) - Number of transactions in block
- `data` (JSONB) - Block data including transactions

#### `transactions`
- `tx_hash` (VARCHAR(255) PRIMARY KEY) - Transaction hash
- `from_address` (VARCHAR(255)) - Sender address
- `to_address` (VARCHAR(255)) - Recipient address
- `amount` (BIGINT) - Transaction amount
- `nonce` (BIGINT) - Transaction nonce
- `status` (VARCHAR(50)) - Transaction status (pending/confirmed)
- `block_height` (BIGINT) - Block height (if confirmed)
- `created_at` (TIMESTAMPTZ) - Transaction creation time

#### `balances`
- `address` (VARCHAR(255) PRIMARY KEY) - Wallet address
- `balance` (BIGINT) - Current balance
- `updated_at` (TIMESTAMPTZ) - Last balance update

## Setup Instructions

### 1. Install PostgreSQL
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database
```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE dujyo_blockchain;
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE dujyo_blockchain TO postgres;
\q
```

### 3. Set Environment Variables
Create a `.env` file in the project root:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/dujyo_blockchain
```

### 4. Seed Demo Data
```bash
# Run the seed script
./scripts/seed-demo.sh
```

### 5. Start the Server
```bash
cargo run
```

### 6. Test the Blockchain
```bash
# Run the test script
./scripts/test-blockchain.sh
```

## Demo Addresses

The seed script creates these demo addresses:

- `XW1111111111111111111111111111111111111111` - Genesis (1,000,000 DUJYO)
- `XW2222222222222222222222222222222222222222` - Demo User 1 (500,000 DUJYO)
- `XW3333333333333333333333333333333333333333` - Demo User 2 (250,000 DUJYO)
- `XW4444444444444444444444444444444444444444` - Demo User 3 (100,000 DUJYO)
- `XW5555555555555555555555555555555555555555` - Demo User 4 (75,000 DUJYO)

## API Endpoints

- `GET /health` - Health check
- `GET /blocks` - Get blockchain
- `POST /transaction` - Submit transaction
- `POST /mint` - Mint tokens
- `GET /balance/{address}` - Get balance
- `WS /ws` - WebSocket for real-time updates

## Features

- ✅ Automatic database migrations on startup
- ✅ Blockchain state persistence
- ✅ Transaction history tracking
- ✅ Balance management
- ✅ Block production with database storage
- ✅ WebSocket real-time updates
- ✅ Demo data seeding
- ✅ Comprehensive testing

## Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Check DATABASE_URL format
3. Verify database exists
4. Check user permissions

### Migration Issues
1. Check database permissions
2. Ensure tables don't already exist
3. Review migration SQL syntax

### Test Failures
1. Ensure server is running
2. Check database connectivity
3. Verify demo data is seeded
4. Review server logs
