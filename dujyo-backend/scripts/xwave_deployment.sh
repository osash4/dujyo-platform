#!/bin/bash

# ============================================================================
# XWAVE BLOCKCHAIN - MASTER DEPLOYMENT SCRIPT
# ============================================================================
# Este script orquesta todo el proceso de deployment de XWave
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

# Function for printing with colors
print_step() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
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

# Check if we are in the correct directory
if [ ! -f "Cargo.toml" ]; then
    print_error "This script must be run from the xwave-backend directory"
    exit 1
fi

# Create directory for logs
mkdir -p logs

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Function for showing help
show_help() {
    print_header "XWAVE BLOCKCHAIN - MASTER DEPLOYMENT SCRIPT"
    echo ""
    echo "Usage: $0 <command> [environment] [options]"
    echo ""
    echo "Commands:"
    echo "  setup           Setup XWave blockchain from scratch (initial setup)"
    echo "  deploy <env>    Deploy to environment (testnet/mainnet)"
    echo "  test <env>      Test deployment (testnet/mainnet)"
    echo "  verify <env>    Verify deployment (testnet/mainnet)"
    echo "  manage <cmd>    Manage deployment (start/stop/restart/status)"
    echo "  compile         Compile and test code"
    echo "  clean           Clean build artifacts and logs"
    echo "  help            Show this help"
    echo ""
    echo "Environments:"
    echo "  testnet         Testnet environment"
    echo "  mainnet         Mainnet environment"
    echo ""
    echo "Management Commands:"
    echo "  start <env>     Start server (testnet/mainnet)"
    echo "  stop <env>      Stop server (testnet/mainnet)"
    echo "  restart <env>   Restart server (testnet/mainnet)"
    echo "  status [env]    Show server status (testnet/mainnet/all)"
    echo "  logs <env>      Show server logs (testnet/mainnet)"
    echo ""
    echo "Options:"
    echo "  --force         Force operation (skip confirmations)"
    echo "  --verbose       Verbose output"
    echo "  --dry-run       Show what would be done without executing"
    echo ""
    echo "Examples:"
    echo "  $0 setup"
    echo "  $0 deploy testnet"
    echo "  $0 test testnet"
    echo "  $0 verify mainnet"
    echo "  $0 manage start testnet"
    echo "  $0 manage status all"
    echo "  $0 compile"
    echo "  $0 clean"
    echo ""
}

# Function for checking prerequisites
check_prerequisites() {
    print_step "Checking Prerequisites"
    
    # Check if Rust/Cargo is installed
    if ! command -v cargo &> /dev/null; then
        print_error "Rust/Cargo is not installed"
        exit 1
    fi
    print_success "Rust/Cargo is available"
    
    # Check if PostgreSQL is installed
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL is not installed or not in PATH"
        exit 1
    fi
    
    # Check if PostgreSQL is ready
    # Check if PostgreSQL is running
    if ! pg_isready -q; then
        print_error "PostgreSQL is not ready"
        print_error "PostgreSQL is not running"
        exit 1
        exit 1
    fi
    print_success "PostgreSQL is running"
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed (required for JSON processing)"
        exit 1
    fi
    print_success "jq is available"
    
    # Check if bc is installed
    if ! command -v bc &> /dev/null; then
        print_error "bc is not installed (required for calculations)"
        exit 1
    fi
    print_success "bc is available"
}

# Function for initial setup
setup_xwave() {
    print_header "XWAVE BLOCKCHAIN INITIAL SETUP"
    
    check_prerequisites
    
    print_step "Configuring XWave Blockchain Initial Setup"
    
    # Create blockchain database
    print_info "Creating database..."
    if psql -c "CREATE DATABASE xwave_blockchain;" 2>/dev/null || true; then
        print_success "Database created/verified"
    fi
    
    # Execute blockchain database configuration script
    print_info "Setting up database schema..."
    if psql -d xwave_blockchain -f scripts/setup_native_token_database.sql; then
        print_success "Database schema created"
    else
        print_error "Failed to create database schema"
        exit 1
    fi
    
    # Compile blockchain code
    print_info "Compiling XWave backend..."
    if cargo build --release; then
        print_success "Backend compiled successfully"
    else
        print_error "Failed to compile backend"
        exit 1
    fi
    
    print_success "XWave blockchain initial setup completed!"
}

# Function for deployment
deploy_xwave() {
    local env=$1
    
    if [ -z "$env" ]; then
        print_error "Environment required for deploy command"
        show_help
        exit 1
    fi
    
    print_header "XWAVE BLOCKCHAIN $env DEPLOYMENT"
    
    case $env in
        "testnet")
            if [ -f "scripts/deploy_testnet.sh" ]; then
                print_info "Deploying XWave blockchain to testnet..."
                ./scripts/deploy_testnet.sh
            else
                print_error "Testnet deployment script not found"
                exit 1
            fi
            ;;
        "mainnet")
            if [ -f "scripts/deploy_mainnet.sh" ]; then
                print_info "Deploying XWave blockchain to mainnet..."
                ./scripts/deploy_mainnet.sh
            else
                print_error "Mainnet deployment script not found"
                exit 1
            fi
            ;;
        *)
            print_error "Invalid environment: $env. Use 'testnet' or 'mainnet'"
            exit 1
            ;;
    esac
}

# Function for testing
test_xwave() {
    local env=$1
    
    if [ -z "$env" ]; then
        print_error "Environment required for test command"
        show_help
        exit 1
    fi
    
    print_header "XWAVE BLOCKCHAIN $env TESTING"
    
    if [ -f "scripts/test_deployment.sh" ]; then
        print_info "Testing XWave blockchain $env..."
        ./scripts/test_deployment.sh
    else
        print_error "Testing script not found"
        exit 1
    fi
}

# Function for verification
verify_xwave() {
    local env=$1
    
    if [ -z "$env" ]; then
        print_error "Environment required for verify command"
        show_help
        exit 1
    fi
    
    print_header "XWAVE BLOCKCHAIN $env VERIFICATION"
    
    if [ -f "scripts/verify_deployment.sh" ]; then
        print_info "Verifying XWave blockchain $env..."
        ./scripts/verify_deployment.sh
    else
        print_error "Verification script not found"
        exit 1
    fi
}

# Function for management
manage_xwave() {
    local cmd=$1
    local env=$2
    
    if [ -z "$cmd" ]; then
        print_error "Management command required"
        show_help
        exit 1
    fi
    
    print_header "XWAVE BLOCKCHAIN MANAGEMENT"
    
    if [ -f "scripts/manage_deployment.sh" ]; then
        ./scripts/manage_deployment.sh "$cmd" "$env"
    else
        print_error "Management script not found"
        exit 1
    fi
}

# Function for compilation
compile_xwave() {
    print_header "XWAVE BLOCKCHAIN COMPILATION"
    
    if [ -f "scripts/compile_and_test.sh" ]; then
        ./scripts/compile_and_test.sh
    else
        print_info "Compiling XWave backend..."
        if cargo build --release; then
            print_success "Backend compiled successfully"
        else
            print_error "Failed to compile backend"
            exit 1
        fi
        
        print_info "Running tests..."
        if cargo test; then
            print_success "All tests passed"
        else
            print_error "Tests failed"
            exit 1
        fi
    fi
}

# Function for cleanup
clean_xwave() {
    print_header "XWAVE BLOCKCHAIN CLEANUP"
    
    print_info "Cleaning build artifacts..."
    cargo clean
    
    print_info "Cleaning logs..."
    rm -rf logs/*
    
    print_info "Cleaning temporary files..."
    rm -f scripts/*.tmp
    rm -f scripts/*.log
    
    print_success "Cleanup completed"
}

# ============================================================================
# MAIN FUNCTION
# ============================================================================

main() {
    local command=$1
    local arg1=$2
    local arg2=$3
    
    case $command in
        "setup")
            setup_xwave
            ;;
        "deploy")
            deploy_xwave "$arg1"
            ;;
        "test")
            test_xwave "$arg1"
            ;;
        "verify")
            verify_xwave "$arg1"
            ;;
        "manage")
            manage_xwave "$arg1" "$arg2"
            ;;
        "compile")
            compile_xwave
            ;;
        "clean")
            clean_xwave
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            print_error "Command required"
            show_help
            exit 1
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# ============================================================================
# RUN SCRIPT
# ============================================================================

main "$@"
