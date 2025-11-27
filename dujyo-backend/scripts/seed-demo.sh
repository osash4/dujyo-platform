#!/bin/bash

# XWave Blockchain Demo Data Seeder
# This script seeds the database with demo data for testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌱 XWave Blockchain Demo Data Seeder${NC}"
echo "=================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not set, using default${NC}"
    export DATABASE_URL="postgresql://postgres:password@localhost:5432/xwave_blockchain"
fi

echo -e "${BLUE}📊 Database URL: ${DATABASE_URL}${NC}"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql command not found. Please install PostgreSQL client.${NC}"
    exit 1
fi

# Test database connection
echo -e "${BLUE}🔌 Testing database connection...${NC}"
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to database. Please check your DATABASE_URL and ensure PostgreSQL is running.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"

# Create database if it doesn't exist
DB_NAME=$(echo "$DATABASE_URL" | sed 's/.*\/\([^?]*\).*/\1/')
DB_HOST=$(echo "$DATABASE_URL" | sed 's/.*@\([^:]*\):.*/\1/')
DB_USER=$(echo "$DATABASE_URL" | sed 's/.*\/\/\([^:]*\):.*/\1/')

echo -e "${BLUE}🗄️  Ensuring database exists...${NC}"
psql "postgresql://$DB_USER@$DB_HOST:5432/postgres" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true

# Run the migration
echo -e "${BLUE}📋 Running database migration...${NC}"
psql "$DATABASE_URL" -f "$(dirname "$0")/../migrations/001_initial_schema.sql"

echo -e "${GREEN}✅ Migration completed${NC}"

# Seed demo data
echo -e "${BLUE}🌱 Seeding demo data...${NC}"

# Insert additional demo addresses with balances
psql "$DATABASE_URL" << EOF
-- Insert demo addresses with various balances
INSERT INTO balances (address, balance, updated_at) VALUES
    ('XW4444444444444444444444444444444444444444', 100000, NOW()),
    ('XW5555555555555555555555555555555555555555', 75000, NOW()),
    ('XW6666666666666666666666666666666666666666', 50000, NOW()),
    ('XW7777777777777777777777777777777777777777', 25000, NOW()),
    ('XW8888888888888888888888888888888888888888', 10000, NOW())
ON CONFLICT (address) DO UPDATE SET 
    balance = EXCLUDED.balance,
    updated_at = EXCLUDED.updated_at;

-- Insert some demo transactions
INSERT INTO transactions (tx_hash, from_address, to_address, amount, nonce, status, created_at) VALUES
    ('demo_tx_001', 'XW1111111111111111111111111111111111111111', 'XW2222222222222222222222222222222222222222', 10000, 1, 'confirmed', NOW() - INTERVAL '1 hour'),
    ('demo_tx_002', 'XW2222222222222222222222222222222222222222', 'XW3333333333333333333333333333333333333333', 5000, 1, 'confirmed', NOW() - INTERVAL '30 minutes'),
    ('demo_tx_003', 'XW3333333333333333333333333333333333333333', 'XW4444444444444444444444444444444444444444', 2500, 1, 'pending', NOW() - INTERVAL '5 minutes'),
    ('demo_tx_004', 'XW4444444444444444444444444444444444444444', 'XW5555555555555555555555555555555555555555', 1000, 1, 'pending', NOW() - INTERVAL '2 minutes')
ON CONFLICT (tx_hash) DO NOTHING;

-- Insert some demo blocks (if not already present)
INSERT INTO blocks (height, hash, prev_hash, timestamp, tx_count, data) VALUES
    (1, 'block_hash_001', 'genesis_hash_0000000000000000000000000000000000000000000000000000000000000000', NOW() - INTERVAL '1 hour', 1, '{"transactions": [{"from": "XW1111111111111111111111111111111111111111", "to": "XW2222222222222222222222222222222222222222", "amount": 10000, "nft_id": null}], "validator": "system"}'),
    (2, 'block_hash_002', 'block_hash_001', NOW() - INTERVAL '30 minutes', 1, '{"transactions": [{"from": "XW2222222222222222222222222222222222222222", "to": "XW3333333333333333333333333333333333333333", "amount": 5000, "nft_id": null}], "validator": "system"}')
ON CONFLICT (height) DO NOTHING;

-- Update transaction block heights for confirmed transactions
UPDATE transactions SET block_height = 1 WHERE tx_hash = 'demo_tx_001';
UPDATE transactions SET block_height = 2 WHERE tx_hash = 'demo_tx_002';
EOF

echo -e "${GREEN}✅ Demo data seeded successfully${NC}"

# Display summary
echo -e "${BLUE}📊 Database Summary:${NC}"
echo "=================="

# Count records
BLOCKS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM blocks;")
TRANSACTIONS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM transactions;")
BALANCES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM balances;")

echo -e "${GREEN}📦 Blocks: ${BLOCKS}${NC}"
echo -e "${GREEN}💸 Transactions: ${TRANSACTIONS}${NC}"
echo -e "${GREEN}💰 Balances: ${BALANCES}${NC}"

echo ""
echo -e "${BLUE}🎯 Demo Addresses:${NC}"
echo "=================="
echo -e "${YELLOW}XW1111111111111111111111111111111111111111${NC} - Genesis (1,000,000 XWAVE)"
echo -e "${YELLOW}XW2222222222222222222222222222222222222222${NC} - Demo User 1 (500,000 XWAVE)"
echo -e "${YELLOW}XW3333333333333333333333333333333333333333${NC} - Demo User 2 (250,000 XWAVE)"
echo -e "${YELLOW}XW4444444444444444444444444444444444444444${NC} - Demo User 3 (100,000 XWAVE)"
echo -e "${YELLOW}XW5555555555555555555555555555555555555555${NC} - Demo User 4 (75,000 XWAVE)"

echo ""
echo -e "${GREEN}🚀 Ready to test! You can now start the blockchain server.${NC}"
echo -e "${BLUE}💡 Use: cargo run${NC}"
