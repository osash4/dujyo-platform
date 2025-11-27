#!/bin/bash

# XWave Blockchain Setup Script
# This script sets up the complete XWave blockchain with main wallet, token distribution, and CPV rewards

set -e  # Exit on any error

echo "🚀 XWAVE BLOCKCHAIN SETUP"
echo "═══════════════════════════════════════════════════════════════"
echo "This script will:"
echo "1. Create the main XWave wallet"
echo "2. Set up initial token distribution"
echo "3. Configure CPV rewards pools"
echo "4. Initialize the blockchain database"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL status..."
if ! pg_isready -q; then
    print_error "PostgreSQL is not running. Please start it first:"
    echo "  brew services start postgresql@14"
    exit 1
fi
print_status "PostgreSQL is running"

# Check if database exists
echo "🔍 Checking XWave database..."
if ! psql -lqt | cut -d \| -f 1 | grep -qw xwave_blockchain; then
    print_warning "Database xwave_blockchain does not exist. Creating it..."
    createdb xwave_blockchain
    print_status "Database created"
else
    print_status "Database exists"
fi

# Step 1: Create Main Wallet
echo ""
echo "🔐 STEP 1: Creating XWave Main Wallet"
echo "═══════════════════════════════════════════════════════════════"
if [ -f "create_main_wallet_simple.rs" ]; then
    print_info "Compiling wallet generator..."
    rustc create_main_wallet_simple.rs -o create_main_wallet
    
    print_info "Generating main wallet..."
    ./create_main_wallet
    
    if [ -f "xwave_main_wallet.txt" ]; then
        print_status "Main wallet created successfully"
        print_warning "IMPORTANT: Move xwave_main_wallet.txt to a secure location!"
    else
        print_error "Failed to create main wallet"
        exit 1
    fi
else
    print_error "create_main_wallet.rs not found"
    exit 1
fi

# Step 2: Token Distribution Setup
echo ""
echo "🪙 STEP 2: Setting up Token Distribution"
echo "═══════════════════════════════════════════════════════════════"

if [ -f "initial_token_distribution_simple.rs" ]; then
    print_info "Compiling token distribution generator..."
    rustc initial_token_distribution_simple.rs -o initial_token_distribution
    
    print_info "Generating token distribution..."
    ./initial_token_distribution
    
    if [ -f "xwave_distribution.sql" ]; then
        print_status "Token distribution configuration created"
    else
        print_error "Failed to create token distribution"
        exit 1
    fi
else
    print_error "initial_token_distribution.rs not found"
    exit 1
fi

# Step 3: CPV Rewards Setup
echo ""
echo "🎯 STEP 3: Setting up CPV Rewards"
echo "═══════════════════════════════════════════════════════════════"

if [ -f "setup_cpv_rewards_simple.rs" ]; then
    print_info "Compiling CPV rewards generator..."
    rustc setup_cpv_rewards_simple.rs -o setup_cpv_rewards
    
    print_info "Generating CPV rewards configuration..."
    ./setup_cpv_rewards
    
    if [ -f "xwave_cpv_setup.sql" ]; then
        print_status "CPV rewards configuration created"
    else
        print_error "Failed to create CPV rewards configuration"
        exit 1
    fi
else
    print_error "setup_cpv_rewards.rs not found"
    exit 1
fi

# Step 4: Database Setup
echo ""
echo "🗄️  STEP 4: Setting up Database"
echo "═══════════════════════════════════════════════════════════════"

print_info "Running token distribution SQL..."
psql xwave_blockchain -f xwave_distribution.sql

print_info "Running CPV setup SQL..."
psql xwave_blockchain -f xwave_cpv_setup.sql

print_status "Database setup completed"

# Step 5: Verify Setup
echo ""
echo "🔍 STEP 5: Verifying Setup"
echo "═══════════════════════════════════════════════════════════════"

print_info "Checking balances..."
psql xwave_blockchain -c "SELECT address, balance, updated_at FROM balances ORDER BY balance DESC;"

print_info "Checking CPV pools..."
psql xwave_blockchain -c "SELECT pool_id, pool_name, validator_type, reward_rate FROM cpv_reward_pools;"

print_status "Setup verification completed"

# Step 6: Generate Final Commands
echo ""
echo "🔧 STEP 6: Final Setup Commands"
echo "═══════════════════════════════════════════════════════════════"

echo "To complete the setup, you need to:"
echo ""
echo "1. Start the XWave backend server:"
echo "   cd .. && cargo run"
echo ""
echo "2. Get a JWT token by logging in:"
echo "   curl -X POST http://localhost:8083/login \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"address\": \"YOUR_WALLET_ADDRESS\"}'"
echo ""
echo "3. Mint tokens to each distribution address:"
echo "   # Replace YOUR_JWT_TOKEN_HERE with the actual token"
echo "   chmod +x xwave_mint_commands.sh"
echo "   # Edit xwave_mint_commands.sh to replace YOUR_JWT_TOKEN_HERE"
echo "   ./xwave_mint_commands.sh"
echo ""
echo "4. Register validators:"
echo "   chmod +x xwave_cpv_api_commands.sh"
echo "   # Edit xwave_cpv_api_commands.sh to replace YOUR_JWT_TOKEN_HERE"
echo "   ./xwave_cpv_api_commands.sh"
echo ""
echo "5. Verify final balances:"
echo "   curl -X GET http://localhost:8083/balance/XW0000000000000000000000000000000000000001"
echo ""

# Cleanup
echo "🧹 Cleaning up temporary files..."
rm -f create_main_wallet initial_token_distribution setup_cpv_rewards
print_status "Cleanup completed"

echo ""
echo "🎉 XWAVE BLOCKCHAIN SETUP COMPLETED!"
echo "═══════════════════════════════════════════════════════════════"
echo "📁 Generated files:"
echo "   • xwave_main_wallet.txt (SECURE THIS FILE!)"
echo "   • xwave_token_config.json"
echo "   • xwave_cpv_config.json"
echo "   • xwave_distribution.sql"
echo "   • xwave_cpv_setup.sql"
echo "   • xwave_mint_commands.sh"
echo "   • xwave_cpv_api_commands.sh"
echo ""
echo "⚠️  SECURITY REMINDER:"
echo "   • Move xwave_main_wallet.txt to a secure location"
echo "   • Delete it from this directory after securing it"
echo "   • Never share your private keys or seed phrases"
echo ""
echo "🚀 Your XWave blockchain is ready to launch!"
echo "═══════════════════════════════════════════════════════════════"
