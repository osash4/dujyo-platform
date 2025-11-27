#!/bin/bash

# XWave Blockchain Services Restart Script
# This script restarts all services

set -e

echo "🔄 XWave Blockchain Services Restart"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Main restart function
main() {
    echo "Restarting XWave Blockchain services..."
    echo ""
    
    # Stop all services
    print_status "Stopping all services..."
    ./stop_services.sh
    
    # Wait a bit
    sleep 3
    
    # Start all services
    print_status "Starting all services..."
    ./start_services.sh
    
    print_success "XWave Blockchain services restarted successfully!"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    "backend")
        print_status "Restarting backend only..."
        ./stop_services.sh backend
        sleep 2
        ./start_services.sh backend
        ;;
    "blockchain")
        print_status "Restarting blockchain node only..."
        ./stop_services.sh blockchain
        sleep 2
        ./start_services.sh blockchain
        ;;
    "frontend")
        print_status "Restarting frontend only..."
        ./stop_services.sh frontend
        sleep 2
        ./start_services.sh frontend
        ;;
    *)
        main
        ;;
esac
