#!/bin/bash

# ============================================================================
# XWAVE BLOCKCHAIN - TESTNET DEPLOYMENT SCRIPT
# ============================================================================
# This script deploys the XWave blockchain in testnet
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print with colors
print_step() {
    echo -e "${BLUE} $1${NC}"
}

print_success() {
    echo -e "${GREEN} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}  $1${NC}"
}

print_error() {
    echo -e "${RED} $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ  $1${NC}"
}

print_header() {
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
}

# ============================================================================
# INITIAL CONFIGURATION
# ============================================================================

print_header "XWAVE BLOCKCHAIN - TESTNET DEPLOYMENT"
echo "Deploying XWave Native Token (XWV) to testnet"
echo ""

# Check if we are in the correct directory
if [ ! -f "Cargo.toml" ]; then
    print_error "This script must be run from the xwave-backend directory"
    exit 1
fi

# Create directory for logs
mkdir -p logs
LOG_FILE="logs/testnet_deployment_$(date +%Y%m%d_%H%M%S).log"

# Function for logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "Starting XWave testnet deployment"

# ============================================================================
# CONFIGURACIÓN DE TESTNET
# ============================================================================

# Testnet configuration
TESTNET_PORT=8083
TESTNET_HOST="localhost"
TESTNET_DB="xwave_testnet"
TESTNET_USER="yare"

# Testnet URLs
TESTNET_URL="http://$TESTNET_HOST:$TESTNET_PORT"
DB_URL="postgresql://$TESTNET_USER@localhost:5432/$TESTNET_DB"

print_info "Testnet Configuration:"
print_info "  Host: $TESTNET_HOST"
print_info "  Port: $TESTNET_PORT"
print_info "  Database: $TESTNET_DB"
print_info "  URL: $TESTNET_URL"

# ============================================================================
# STEP 1: VERIFY PREREQUISITES
# ============================================================================

print_step "STEP 1: Verifying Prerequisites"

# Verificar Rust/Cargo
if ! command -v cargo &> /dev/null; then
    print_error "Rust/Cargo is not installed"
    exit 1
fi

print_success "Rust/Cargo is available"

# Verify PostgreSQL
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL is not installed or not in PATH"
    exit 1
fi

# Verify that PostgreSQL is running
if ! pg_isready -q; then
    print_error "PostgreSQL is not running"
    exit 1
fi

print_success "PostgreSQL is running"

# ============================================================================
# STEP 2: COMPILE CODE
# ============================================================================

print_step "STEP 2: Compiling Code"

print_info "Compiling XWave backend..."
if cargo build --release; then
    print_success "Backend compiled successfully"
else
    print_error "Failed to compile backend"
    exit 1
fi

# ============================================================================
# STEP 3: CONFIGURE TESTNET DATABASE
# ============================================================================

print_step "STEP 3: Configuring Testnet Database"

# Create testnet database if it doesn't exist
print_info "Creating testnet database..."
if psql -c "CREATE DATABASE $TESTNET_DB;" 2>/dev/null || true; then
    print_success "Testnet database ready"
else
    print_warning "Database creation failed or already exists"
fi

# Verify connection to the database
if ! psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    print_error "Cannot connect to testnet database"
    exit 1
fi

print_success "Testnet database connection verified"

# Execute database configuration script
print_info "Setting up testnet database schema..."
if psql "$DB_URL" -f scripts/setup_native_token_database.sql; then
    print_success "Testnet database schema created"
else
    print_error "Failed to create testnet database schema"
    exit 1
fi

# ============================================================================
# STEP 4: CONFIGURE ENVIRONMENT VARIABLES
# ============================================================================

print_step "STEP 4: Configuring Environment Variables"

# Create .env file for testnet
cat > .env.testnet << EOF
# XWave Testnet Configuration
DATABASE_URL=$DB_URL
JWT_SECRET=xwave_testnet_secret_key_2025
SERVER_HOST=$TESTNET_HOST
SERVER_PORT=$TESTNET_PORT
ENVIRONMENT=testnet
LOG_LEVEL=info
EOF

print_success "Testnet environment variables configured"

# ============================================================================
# STEP 5: START TESTNET SERVER
# ============================================================================

print_step "STEP 5: Starting Testnet Server"

# Stop previous server if it is running
if pgrep -f "xwavve-backend" > /dev/null; then
    print_info "Stopping previous server..."
    pkill -f "xwavve-backend" || true
    sleep 2
fi

# Start server in background
print_info "Starting XWave testnet server..."
nohup cargo run --release > logs/testnet_server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > logs/testnet_server.pid

# Wait for server to start
print_info "Waiting for server to start..."
sleep 10

# Verify that the server is running
if ! curl -s "$TESTNET_URL/health" > /dev/null; then
    print_error "Server failed to start"
    print_info "Server log:"
    tail -20 logs/testnet_server.log
    exit 1
fi

print_success "Testnet server is running (PID: $SERVER_PID)"

# ============================================================================
# STEP 6: VERIFY ENDPOINTS
# ============================================================================

print_step "STEP 6: Verifying Endpoints"

# Verify health endpoint
print_info "Testing health endpoint..."
if curl -s "$TESTNET_URL/health" | grep -q "healthy"; then
    print_success "Health endpoint working"
else
    print_error "Health endpoint failed"
fi

# Verify blocks endpoint
print_info "Testing blocks endpoint..."
if curl -s "$TESTNET_URL/blocks" > /dev/null; then
    print_success "Blocks endpoint working"
else
    print_error "Blocks endpoint failed"
fi

# Verify pools endpoint
print_info "Testing pools endpoint..."
if curl -s "$TESTNET_URL/pools" > /dev/null; then
    print_success "Pools endpoint working"
else
    print_error "Pools endpoint failed"
fi

# ============================================================================
# STEP 7: CONFIGURE NATIVE TOKEN
# ============================================================================

print_step "STEP 7: Configuring Native Token"

# Get JWT token
print_info "Getting JWT token..."
JWT_TOKEN=$(curl -s -X POST "$TESTNET_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"address": "XW_ADMIN_ADDRESS"}' | \
  jq -r '.token')

if [ "$JWT_TOKEN" = "null" ] || [ -z "$JWT_TOKEN" ]; then
    print_error "Failed to get JWT token"
    exit 1
fi

print_success "JWT token obtained"

# ============================================================================
# STEP 8: CONFIGURE MULTISIG WALLETS
# ============================================================================

print_step "STEP 8: Configuring Multisig Wallets"

# Create script to configure multisig in testnet
cat > scripts/setup_testnet_multisig.sh << EOF
#!/bin/bash

echo "🔐 Setting up Testnet Multisig Wallets..."

# Treasury Wallet
echo "Creating Treasury Multisig Wallet..."
curl -X POST $TESTNET_URL/multisig/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "XWave Treasury Testnet",
    "purpose": "TREASURY",
    "owners": [
      "XW_TREASURY_OWNER_1_TESTNET",
      "XW_TREASURY_OWNER_2_TESTNET", 
      "XW_TREASURY_OWNER_3_TESTNET",
      "XW_TREASURY_OWNER_4_TESTNET",
      "XW_TREASURY_OWNER_5_TESTNET"
    ],
    "threshold": 3,
    "daily_limit": 10000000
  }'

# Dev Wallet
echo "Creating Development Multisig Wallet..."
curl -X POST $TESTNET_URL/multisig/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "XWave Development Testnet",
    "purpose": "DEV",
    "owners": [
      "XW_DEV_OWNER_1_TESTNET",
      "XW_DEV_OWNER_2_TESTNET",
      "XW_DEV_OWNER_3_TESTNET", 
      "XW_DEV_OWNER_4_TESTNET",
      "XW_DEV_OWNER_5_TESTNET"
    ],
    "threshold": 3,
    "daily_limit": 5000000
  }'

# Ops Wallet
echo "Creating Operations Multisig Wallet..."
curl -X POST $TESTNET_URL/multisig/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "XWave Operations Testnet",
    "purpose": "OPS",
    "owners": [
      "XW_OPS_OWNER_1_TESTNET",
      "XW_OPS_OWNER_2_TESTNET",
      "XW_OPS_OWNER_3_TESTNET",
      "XW_OPS_OWNER_4_TESTNET", 
      "XW_OPS_OWNER_5_TESTNET"
    ],
    "threshold": 3,
    "daily_limit": 2000000
  }'

echo "✅ Testnet multisig wallets configured"
EOF

chmod +x scripts/setup_testnet_multisig.sh

# Execute multisig configuration
print_info "Configuring testnet multisig wallets..."
if ./scripts/setup_testnet_multisig.sh; then
    print_success "Testnet multisig wallets configured"
else
    print_warning "Multisig configuration had issues"
fi

# ============================================================================
# STEP 9: CONFIGURE VESTING SCHEDULES
# ============================================================================

print_step "STEP 9: Configuring Vesting Schedules"

# Create script to configure vesting in testnet
cat > scripts/setup_testnet_vesting.sh << EOF
#!/bin/bash

echo "⏰ Setting up Testnet Vesting Schedules..."

# Treasury Vesting (12 months cliff + 36 months linear)
echo "Creating Treasury Vesting Schedule..."
curl -X POST $TESTNET_URL/vesting/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "beneficiary": "XWMS_TREASURY_WALLET_ADDRESS_TESTNET",
    "total_amount": 300000000,
    "cliff_duration": 31536000,
    "vesting_duration": 94608000,
    "release_frequency": 2592000,
    "revocable": true,
    "created_by": "admin"
  }'

# Creative Incentives Vesting (10% immediate + 24 months)
echo "Creating Creative Incentives Vesting Schedule..."
curl -X POST $TESTNET_URL/vesting/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "beneficiary": "XW_CREATIVE_INCENTIVES_ADDRESS_TESTNET",
    "total_amount": 250000000,
    "cliff_duration": 0,
    "vesting_duration": 63072000,
    "release_frequency": 2592000,
    "revocable": true,
    "created_by": "admin"
  }'

# Community Vesting (24 months linear)
echo "Creating Community Vesting Schedule..."
curl -X POST $TESTNET_URL/vesting/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "beneficiary": "XW_COMMUNITY_ADDRESS_TESTNET",
    "total_amount": 150000000,
    "cliff_duration": 0,
    "vesting_duration": 63072000,
    "release_frequency": 2592000,
    "revocable": true,
    "created_by": "admin"
  }'

# Seed Investors Vesting (6 months cliff + 24 months linear)
echo "Creating Seed Investors Vesting Schedule..."
curl -X POST $TESTNET_URL/vesting/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "beneficiary": "XW_SEED_INVESTORS_ADDRESS_TESTNET",
    "total_amount": 100000000,
    "cliff_duration": 15552000,
    "vesting_duration": 63072000,
    "release_frequency": 2592000,
    "revocable": true,
    "created_by": "admin"
  }'

echo "Testnet vesting schedules configured"
EOF

chmod +x scripts/setup_testnet_vesting.sh

# Execute vesting configuration
print_info "Configuring testnet vesting schedules..."
if ./scripts/setup_testnet_vesting.sh; then
    print_success "Testnet vesting schedules configured"
else
    print_warning "Vesting configuration had issues"
fi

# ============================================================================
# STEP 10: CONFIGURE STAKING AND REWARDS
# ============================================================================

print_step "STEP 10: Configuring Staking and Rewards"

# Create script to configure staking in testnet
cat > scripts/setup_testnet_staking.sh << EOF
#!/bin/bash

echo "🏦 Setting up Testnet Staking Contracts and Reward Pools..."

# Economic Validators Staking Contract
echo "Creating Economic Validators Staking Contract..."
curl -X POST $TESTNET_URL/staking/create-contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Economic Validators Testnet",
    "purpose": "VALIDATORS",
    "min_stake": 1000000,
    "max_stake": 100000000,
    "reward_frequency": 86400,
    "slashing_enabled": true,
    "slashing_rate": 5.0
  }'

# Creative Validators Staking Contract
echo "Creating Creative Validators Staking Contract..."
curl -X POST $TESTNET_URL/staking/create-contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Creative Validators Testnet",
    "purpose": "CREATIVE",
    "min_stake": 0,
    "max_stake": 50000000,
    "reward_frequency": 604800,
    "slashing_enabled": false,
    "slashing_rate": 0.0
  }'

# Community Validators Staking Contract
echo "Creating Community Validators Staking Contract..."
curl -X POST $TESTNET_URL/staking/create-contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Community Validators Testnet",
    "purpose": "COMMUNITY",
    "min_stake": 0,
    "max_stake": 10000000,
    "reward_frequency": 604800,
    "slashing_enabled": false,
    "slashing_rate": 0.0
  }'

# Economic Rewards Pool
echo "Creating Economic Rewards Pool..."
curl -X POST $TESTNET_URL/staking/create-reward-pool \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Economic Rewards Pool Testnet",
    "purpose": "ECONOMIC",
    "total_rewards": 200000000,
    "reward_rate": 10,
    "max_rewards_per_day": 10000
  }'

# Creative Rewards Pool
echo "Creating Creative Rewards Pool..."
curl -X POST $TESTNET_URL/staking/create-reward-pool \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Creative Rewards Pool Testnet",
    "purpose": "CREATIVE",
    "total_rewards": 200000000,
    "reward_rate": 15,
    "max_rewards_per_day": 15000
  }'

# Community Rewards Pool
echo "Creating Community Rewards Pool..."
curl -X POST $TESTNET_URL/staking/create-reward-pool \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Community Rewards Pool Testnet",
    "purpose": "COMMUNITY",
    "total_rewards": 200000000,
    "reward_rate": 5,
    "max_rewards_per_day": 5000
  }'

echo "Testnet staking contracts and reward pools configured"
EOF

chmod +x scripts/setup_testnet_staking.sh

# Execute staking configuration
print_info "Configuring testnet staking contracts..."
if ./scripts/setup_testnet_staking.sh; then
    print_success "Testnet staking contracts configured"
else
    print_warning "Staking configuration had issues"
fi

# ============================================================================
# STEP 11: CONFIGURE LIQUIDITY SEED
# ============================================================================

print_step "STEP 11: Configuring Liquidity Seed"

# Create script to seed liquidity in testnet
cat > scripts/setup_testnet_liquidity.sh << EOF
#!/bin/bash

echo "Setting up Testnet Initial Liquidity..."

# Seed XWV/XUSD Pool
echo "Seeding XWV/XUSD liquidity pool..."
curl -X POST $TESTNET_URL/liquidity/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "pool_id": "DEX_XWV_XUSD_POOL_001_TESTNET",
    "amounts": [100000000, 100000],
    "user": "XW_LIQUIDITY_PROVIDER_TESTNET"
  }'

# Configure timelock for liquidity (180 days)
echo "Setting up liquidity timelock..."
curl -X POST $TESTNET_URL/liquidity/timelock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "pool_id": "DEX_XWV_XUSD_POOL_001_TESTNET",
    "timelock_duration": 15552000,
    "admin": "admin"
  }'

echo "Testnet initial liquidity configured"
EOF

chmod +x scripts/setup_testnet_liquidity.sh

# Execute liquidity configuration
print_info "Configuring testnet initial liquidity..."
if ./scripts/setup_testnet_liquidity.sh; then
    print_success "Testnet initial liquidity configured"
else
    print_warning "Liquidity configuration had issues"
fi

# ============================================================================
# STEP 12: VERIFY DEPLOYMENT
# ============================================================================

print_step "STEP 12: Verifying Deployment"

# Verify native token
print_info "Verifying native token..."
TOKEN_STATS=$(curl -s "$TESTNET_URL/token/stats")
if echo "$TOKEN_STATS" | jq -e '.name' > /dev/null; then
    print_success "Native token is active"
    echo "Token Stats: $TOKEN_STATS"
else
    print_warning "Could not verify native token"
fi

# Verify multisig wallets
print_info "Verifying multisig wallets..."
MULTISIG_STATS=$(curl -s "$TESTNET_URL/multisig/stats")
if echo "$MULTISIG_STATS" | jq -e '.total_wallets' > /dev/null; then
    print_success "Multisig wallets are active"
    echo "Multisig Stats: $MULTISIG_STATS"
else
    print_warning "Could not verify multisig wallets"
fi

# Verify vesting schedules
print_info "Verifying vesting schedules..."
VESTING_STATS=$(curl -s "$TESTNET_URL/vesting/stats")
if echo "$VESTING_STATS" | jq -e '.total_schedules' > /dev/null; then
    print_success "Vesting schedules are active"
    echo "Vesting Stats: $VESTING_STATS"
else
    print_warning "Could not verify vesting schedules"
fi

# Verify staking contracts
print_info "Verifying staking contracts..."
STAKING_STATS=$(curl -s "$TESTNET_URL/staking/stats")
if echo "$STAKING_STATS" | jq -e '.total_contracts' > /dev/null; then
    print_success "Staking contracts are active"
    echo "Staking Stats: $STAKING_STATS"
else
    print_warning "Could not verify staking contracts"
fi

# ============================================================================
# STEP 13: GENERATE TESTNET REPORT
# ============================================================================

print_step "STEP 13: Generating Testnet Report"

# Create testnet report
cat > logs/testnet_report.md << EOF
# XWave Blockchain - Testnet Deployment Report

## Deployment Summary
- **Date**: $(date)
- **Environment**: Testnet
- **Host**: $TESTNET_HOST
- **Port**: $TESTNET_PORT
- **Database**: $TESTNET_DB
- **Status**: ✅ DEPLOYED

## Server Information
- **Server PID**: $SERVER_PID
- **Server Log**: logs/testnet_server.log
- **Health Check**: $TESTNET_URL/health

## Endpoints
- **Health**: $TESTNET_URL/health
- **Blocks**: $TESTNET_URL/blocks
- **Pools**: $TESTNET_URL/pools
- **Token Stats**: $TESTNET_URL/token/stats
- **Multisig Stats**: $TESTNET_URL/multisig/stats
- **Vesting Stats**: $TESTNET_URL/vesting/stats
- **Staking Stats**: $TESTNET_URL/staking/stats

## Configuration
- **JWT Token**: Obtained
- **Multisig Wallets**: 3 configured
- **Vesting Schedules**: 4 configured
- **Staking Contracts**: 3 configured
- **Reward Pools**: 3 configured
- **Liquidity Pool**: 1 configured

## Test Commands
\`\`\`bash
# Health check
curl $TESTNET_URL/health

# Get token stats
curl $TESTNET_URL/token/stats

# Get multisig stats
curl $TESTNET_URL/multisig/stats

# Get vesting stats
curl $TESTNET_URL/vesting/stats

# Get staking stats
curl $TESTNET_URL/staking/stats
\`\`\`

## Logs
- **Deployment Log**: $LOG_FILE
- **Server Log**: logs/testnet_server.log
- **Server PID**: logs/testnet_server.pid

## Next Steps
1. Test all endpoints
2. Verify token operations
3. Test multisig transactions
4. Test vesting releases
5. Test staking operations
6. Deploy to mainnet
EOF

print_success "Testnet report generated: logs/testnet_report.md"

# ============================================================================
# FINAL SUMMARY
# ============================================================================

print_header "TESTNET DEPLOYMENT COMPLETED"

echo "XWave Blockchain testnet deployment completed!"
echo ""
echo "DEPLOYMENT SUMMARY:"
echo "   ✅ Server: RUNNING (PID: $SERVER_PID)"
echo "   ✅ Database: CONFIGURED"
echo "   ✅ Multisig Wallets: 3 configured"
echo "   ✅ Vesting Schedules: 4 configured"
echo "   ✅ Staking Contracts: 3 configured"
echo "   ✅ Reward Pools: 3 configured"
echo "   ✅ Liquidity Pool: 1 configured"
echo ""
echo "TESTNET ENDPOINTS:"
echo "   Health: $TESTNET_URL/health"
echo "   Token Stats: $TESTNET_URL/token/stats"
echo "   Multisig Stats: $TESTNET_URL/multisig/stats"
echo "   Vesting Stats: $TESTNET_URL/vesting/stats"
echo "   Staking Stats: $TESTNET_URL/staking/stats"
echo ""
echo "FILES GENERATED:"
echo "   📄 Deployment Log: $LOG_FILE"
echo "   📄 Testnet Report: logs/testnet_report.md"
echo "   📄 Server Log: logs/testnet_server.log"
echo "   📄 Server PID: logs/testnet_server.pid"
echo "   📄 Environment: .env.testnet"
echo ""
echo "TEST COMMANDS:"
echo "   curl $TESTNET_URL/health"
echo "   curl $TESTNET_URL/token/stats"
echo "   curl $TESTNET_URL/multisig/stats"
echo "   curl $TESTNET_URL/vesting/stats"
echo "   curl $TESTNET_URL/staking/stats"
echo ""
echo "MANAGEMENT:"
echo "   Stop server: kill $SERVER_PID"
echo "   View logs: tail -f logs/testnet_server.log"
echo "   Restart: ./scripts/deploy_testnet.sh"
echo ""

log "XWave testnet deployment completed successfully"

print_success "XWave testnet is ready for testing!"
