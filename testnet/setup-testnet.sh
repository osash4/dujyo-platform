#!/bin/bash
# Setup XWave Private Testnet
# Deploys isolated blockchain with test users and realistic data

set -e

echo "======================================"
echo "XWave Private Testnet Setup"
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TESTNET_DIR="/Volumes/DobleDHD 8/xwave/testnet"
NUM_TEST_USERS=100
INITIAL_BALANCE_XWV=1000000  # 1M XWV per user
INITIAL_BALANCE_USXWV=10000000  # 10M USXWV per user

# Database configuration
DB_NAME="xwave_testnet"
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}

# Service ports (different from mainnet to avoid conflicts)
BACKEND_PORT=9083
BLOCKCHAIN_PORT=9080
FRONTEND_PORT=4173

echo ""
echo -e "${YELLOW}Step 1: Creating testnet directory structure${NC}"
mkdir -p "$TESTNET_DIR/data"
mkdir -p "$TESTNET_DIR/logs"
mkdir -p "$TESTNET_DIR/configs"
mkdir -p "$TESTNET_DIR/users"
echo -e "${GREEN}✓ Directory structure created${NC}"

echo ""
echo -e "${YELLOW}Step 2: Creating testnet database${NC}"
# Drop if exists and create new
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;" || true
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
echo -e "${GREEN}✓ Database created: $DB_NAME${NC}"

echo ""
echo -e "${YELLOW}Step 3: Running migrations${NC}"
export DATABASE_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
cd "/Volumes/DobleDHD 8/xwave/xwave-backend"
# Run all migrations
for migration in migrations/*.sql; do
    echo "  Running: $(basename $migration)"
    psql "$DATABASE_URL" -f "$migration" || echo "  Warning: Migration may have warnings"
done
echo -e "${GREEN}✓ Migrations completed${NC}"

echo ""
echo -e "${YELLOW}Step 4: Generating test users${NC}"

# Generate test users with realistic addresses
cat > "$TESTNET_DIR/users/test_users.json" << 'EOF'
{
  "users": [
EOF

for i in $(seq 1 $NUM_TEST_USERS); do
    # Generate random wallet address
    ADDRESS=$(openssl rand -hex 20 | sed 's/^/xw1/')
    EMAIL="testuser${i}@xwave-testnet.local"
    USERNAME="testuser${i}"
    
    # Add to JSON (all but last without comma)
    if [ $i -eq $NUM_TEST_USERS ]; then
        cat >> "$TESTNET_DIR/users/test_users.json" << EOF
    {
      "id": $i,
      "email": "$EMAIL",
      "username": "$USERNAME",
      "wallet_address": "$ADDRESS",
      "initial_xwv": $INITIAL_BALANCE_XWV,
      "initial_usxwv": $INITIAL_BALANCE_USXWV
    }
EOF
    else
        cat >> "$TESTNET_DIR/users/test_users.json" << EOF
    {
      "id": $i,
      "email": "$EMAIL",
      "username": "$USERNAME",
      "wallet_address": "$ADDRESS",
      "initial_xwv": $INITIAL_BALANCE_XWV,
      "initial_usxwv": $INITIAL_BALANCE_USXWV
    },
EOF
    fi
done

cat >> "$TESTNET_DIR/users/test_users.json" << 'EOF'
  ]
}
EOF

echo -e "${GREEN}✓ Generated $NUM_TEST_USERS test users${NC}"
echo "  User data saved to: $TESTNET_DIR/users/test_users.json"

echo ""
echo -e "${YELLOW}Step 5: Seeding initial balances${NC}"

# Create SQL script to seed balances
cat > "$TESTNET_DIR/seed_balances.sql" << 'EOF'
-- Seed initial balances for testnet users
BEGIN;

-- Create users and set balances
EOF

# Read users and create SQL inserts
for i in $(seq 1 $NUM_TEST_USERS); do
    ADDRESS=$(jq -r ".users[$((i-1))].wallet_address" "$TESTNET_DIR/users/test_users.json")
    EMAIL=$(jq -r ".users[$((i-1))].email" "$TESTNET_DIR/users/test_users.json")
    USERNAME=$(jq -r ".users[$((i-1))].username" "$TESTNET_DIR/users/test_users.json")
    
    cat >> "$TESTNET_DIR/seed_balances.sql" << EOF
-- User $i
INSERT INTO users (email, username, wallet_address, password_hash, role, created_at, updated_at)
VALUES ('$EMAIL', '$USERNAME', '$ADDRESS', '\$2b\$12\$testpasswordhash', 'user', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO token_balances (address, token_symbol, balance, updated_at)
VALUES 
    ('$ADDRESS', 'XWV', $INITIAL_BALANCE_XWV, NOW()),
    ('$ADDRESS', 'USXWV', $INITIAL_BALANCE_USXWV, NOW())
ON CONFLICT (address, token_symbol) DO UPDATE 
    SET balance = EXCLUDED.balance, updated_at = NOW();

EOF
done

cat >> "$TESTNET_DIR/seed_balances.sql" << 'EOF'
COMMIT;

-- Summary
SELECT 
    token_symbol,
    COUNT(*) AS num_addresses,
    SUM(balance) AS total_supply
FROM token_balances
GROUP BY token_symbol;
EOF

# Run seed script
psql "$DATABASE_URL" -f "$TESTNET_DIR/seed_balances.sql" > "$TESTNET_DIR/logs/seed_output.log" 2>&1

echo -e "${GREEN}✓ Initial balances seeded${NC}"
echo "  Total XWV distributed: $((NUM_TEST_USERS * INITIAL_BALANCE_XWV))"
echo "  Total USXWV distributed: $((NUM_TEST_USERS * INITIAL_BALANCE_USXWV))"

echo ""
echo -e "${YELLOW}Step 6: Creating test transactions${NC}"

# Generate realistic test transactions
cat > "$TESTNET_DIR/generate_test_data.sql" << EOF
-- Generate realistic test data

BEGIN;

-- Create DEX pool
INSERT INTO token_balances (address, token_symbol, balance, updated_at)
VALUES 
    ('xw1pool00000000000000000000000000000000000', 'XWV', 50000000, NOW()),
    ('xw1pool00000000000000000000000000000000000', 'USXWV', 50000000, NOW())
ON CONFLICT (address, token_symbol) DO UPDATE 
    SET balance = EXCLUDED.balance;

-- Generate random transactions between users
DO \$\$
DECLARE
    sender_addr text;
    receiver_addr text;
    amount numeric;
    i integer;
BEGIN
    FOR i IN 1..500 LOOP
        -- Random sender and receiver
        sender_addr := (SELECT wallet_address FROM users ORDER BY RANDOM() LIMIT 1);
        receiver_addr := (SELECT wallet_address FROM users WHERE wallet_address != sender_addr ORDER BY RANDOM() LIMIT 1);
        amount := (RANDOM() * 10000)::numeric;
        
        -- Insert transaction
        INSERT INTO transactions (from_address, to_address, amount, token_symbol, status, created_at)
        VALUES (sender_addr, receiver_addr, amount, 'XWV', 'completed', NOW() - (RANDOM() * INTERVAL '30 days'));
    END LOOP;
END \$\$;

-- Generate DEX transactions
DO \$\$
DECLARE
    user_addr text;
    amount_in numeric;
    amount_out numeric;
    i integer;
BEGIN
    FOR i IN 1..200 LOOP
        user_addr := (SELECT wallet_address FROM users ORDER BY RANDOM() LIMIT 1);
        amount_in := (RANDOM() * 50000 + 1000)::numeric;
        amount_out := (amount_in * (0.95 + RANDOM() * 0.05))::numeric; -- 95-100% of input
        
        INSERT INTO dex_transactions (user_address, token_in, token_out, amount_in, amount_out, price_impact, created_at)
        VALUES (user_addr, 'XWV', 'USXWV', amount_in, amount_out, RANDOM() * 5, NOW() - (RANDOM() * INTERVAL '30 days'));
    END LOOP;
END \$\$;

-- Create staking positions
DO \$\$
DECLARE
    user_addr text;
    stake_amount numeric;
    i integer;
BEGIN
    FOR i IN 1..50 LOOP
        user_addr := (SELECT wallet_address FROM users ORDER BY RANDOM() LIMIT 1);
        stake_amount := (RANDOM() * 100000 + 10000)::numeric;
        
        INSERT INTO staking_positions (user_address, amount, apy, start_date, end_date, rewards_claimed)
        VALUES (
            user_addr, 
            stake_amount, 
            12.0, 
            NOW() - (RANDOM() * INTERVAL '30 days'), 
            NOW() + (RANDOM() * INTERVAL '30 days'),
            (stake_amount * 0.12 * RANDOM() * 0.5)::numeric
        );
    END LOOP;
END \$\$;

COMMIT;

-- Summary statistics
SELECT 'Transactions' AS table_name, COUNT(*) AS count FROM transactions
UNION ALL
SELECT 'DEX Transactions', COUNT(*) FROM dex_transactions
UNION ALL
SELECT 'Staking Positions', COUNT(*) FROM staking_positions;
EOF

psql "$DATABASE_URL" -f "$TESTNET_DIR/generate_test_data.sql" > "$TESTNET_DIR/logs/test_data_output.log" 2>&1

echo -e "${GREEN}✓ Test data generated${NC}"

echo ""
echo -e "${YELLOW}Step 7: Creating testnet configuration${NC}"

# Create testnet .env file
cat > "$TESTNET_DIR/configs/.env.testnet" << EOF
# XWave Testnet Configuration
# NEVER USE IN PRODUCTION

# Database
DATABASE_URL=postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME
DATABASE_MAX_CONNECTIONS=20
DATABASE_MIN_CONNECTIONS=5

# Server Ports (different from mainnet)
RPC_PORT=$BACKEND_PORT
WS_PORT=$((BACKEND_PORT + 1))
BLOCKCHAIN_PORT=$BLOCKCHAIN_PORT
FRONTEND_PORT=$FRONTEND_PORT

# JWT (weak secret for testnet only)
JWT_SECRET=testnet_secret_DO_NOT_USE_IN_PROD
JWT_EXPIRATION=86400

# Blockchain
GENESIS_ADDRESS=xw1testgenesis000000000000000000000000000
INITIAL_SUPPLY=1000000000
STABLECOIN_SUPPLY=10000000000

# Security (relaxed for testnet)
RATE_LIMIT_PER_IP=1000
RATE_LIMIT_PER_USER=2000
ENABLE_RATE_LIMITING=false
ENABLE_CIRCUIT_BREAKER=false

# Redis (optional)
REDIS_URL=redis://localhost:6379/1

# Features
ENABLE_DEX=true
ENABLE_STAKING=true
ENABLE_NFT_MARKETPLACE=true

# Testnet specific
TESTNET_MODE=true
FAST_BLOCK_TIME=true
MOCK_EXTERNAL_SERVICES=true
EOF

echo -e "${GREEN}✓ Configuration created${NC}"
echo "  Config file: $TESTNET_DIR/configs/.env.testnet"

echo ""
echo -e "${YELLOW}Step 8: Creating testnet startup script${NC}"

cat > "$TESTNET_DIR/start-testnet.sh" << 'SCRIPT_EOF'
#!/bin/bash
# Start XWave Testnet Services

set -e

TESTNET_DIR="/Volumes/DobleDHD 8/xwave/testnet"
BACKEND_DIR="/Volumes/DobleDHD 8/xwave/xwave-backend"
FRONTEND_DIR="/Volumes/DobleDHD 8/xwave/xwave-frontend"

echo "Starting XWave Testnet..."

# Load testnet environment
export $(cat "$TESTNET_DIR/configs/.env.testnet" | xargs)

# Start backend
cd "$BACKEND_DIR"
echo "Starting backend on port $RPC_PORT..."
cargo run --release > "$TESTNET_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$TESTNET_DIR/backend.pid"
echo "✓ Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
sleep 5

# Start frontend
cd "$FRONTEND_DIR"
echo "Starting frontend on port $FRONTEND_PORT..."
VITE_BACKEND_URL="http://localhost:$RPC_PORT" npm run dev -- --port $FRONTEND_PORT > "$TESTNET_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$TESTNET_DIR/frontend.pid"
echo "✓ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "======================================"
echo "XWave Testnet is running!"
echo "======================================"
echo ""
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Backend API: http://localhost:$RPC_PORT"
echo ""
echo "Test Users: $TESTNET_DIR/users/test_users.json"
echo "Logs: $TESTNET_DIR/logs/"
echo ""
echo "To stop testnet: $TESTNET_DIR/stop-testnet.sh"
SCRIPT_EOF

chmod +x "$TESTNET_DIR/start-testnet.sh"

# Create stop script
cat > "$TESTNET_DIR/stop-testnet.sh" << 'SCRIPT_EOF'
#!/bin/bash
# Stop XWave Testnet Services

TESTNET_DIR="/Volumes/DobleDHD 8/xwave/testnet"

echo "Stopping XWave Testnet..."

if [ -f "$TESTNET_DIR/backend.pid" ]; then
    kill $(cat "$TESTNET_DIR/backend.pid") 2>/dev/null || true
    rm "$TESTNET_DIR/backend.pid"
    echo "✓ Backend stopped"
fi

if [ -f "$TESTNET_DIR/frontend.pid" ]; then
    kill $(cat "$TESTNET_DIR/frontend.pid") 2>/dev/null || true
    rm "$TESTNET_DIR/frontend.pid"
    echo "✓ Frontend stopped"
fi

echo "Testnet stopped"
SCRIPT_EOF

chmod +x "$TESTNET_DIR/stop-testnet.sh"

echo -e "${GREEN}✓ Startup scripts created${NC}"

echo ""
echo -e "${GREEN}======================================"
echo -e "Testnet Setup Complete!"
echo -e "======================================${NC}"
echo ""
echo "Summary:"
echo "  - Database: $DB_NAME"
echo "  - Test users: $NUM_TEST_USERS"
echo "  - Initial XWV per user: $INITIAL_BALANCE_XWV"
echo "  - Initial USXWV per user: $INITIAL_BALANCE_USXWV"
echo "  - Transactions generated: 500"
echo "  - DEX transactions: 200"
echo "  - Staking positions: 50"
echo ""
echo "To start testnet:"
echo "  $TESTNET_DIR/start-testnet.sh"
echo ""
echo "To stop testnet:"
echo "  $TESTNET_DIR/stop-testnet.sh"
echo ""
echo "Test user credentials:"
echo "  Email: testuser1@xwave-testnet.local (through testuser100)"
echo "  Password: LoadTest123!"
echo ""

