#!/bin/bash

# XWave Blockchain Services Stop Script
# This script stops all running services

set -e

echo "XWave Blockchain Services Stop"
echo "================================="

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

# Function to stop service by PID
stop_service() {
    local service_name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            print_status "Stopping $service_name (PID: $pid)..."
            kill "$pid"
            sleep 2
            
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                print_warning "Force killing $service_name..."
                kill -9 "$pid"
            fi
            
            print_success "$service_name stopped"
        else
            print_warning "$service_name was not running"
        fi
        rm -f "$pid_file"
    else
        print_warning "No PID file found for $service_name"
    fi
}

# Function to stop service by port
stop_service_by_port() {
    local port=$1
    local service_name=$2
    
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        print_status "Stopping $service_name on port $port (PID: $pid)..."
        kill "$pid"
        sleep 2
        
        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            print_warning "Force killing $service_name..."
            kill -9 "$pid"
        fi
        
        print_success "$service_name stopped"
    else
        print_warning "$service_name was not running on port $port"
    fi
}

# Stop all services
stop_all_services() {
    print_status "Stopping all XWave services..."
    
    # Stop by PID files first
    stop_service "Backend" "logs/backend.pid"
    stop_service "Blockchain Node" "logs/blockchain.pid"
    stop_service "Frontend" "logs/frontend.pid"
    
    # Stop by ports as backup
    stop_service_by_port 8083 "Backend"
    stop_service_by_port 8080 "Blockchain Node"
    stop_service_by_port 3000 "Frontend"
    
    # Stop any remaining Node.js processes related to XWave
    print_status "Stopping any remaining XWave Node.js processes..."
    pkill -f "xwave" 2>/dev/null || true
    pkill -f "blockchain" 2>/dev/null || true
    
    print_success "All services stopped"
}

# Clean up logs
cleanup_logs() {
    if [ -d "logs" ]; then
        print_status "Cleaning up log files..."
        rm -f logs/*.pid
        print_success "Log files cleaned up"
    fi
}

# Main stop function
main() {
    echo "Stopping XWave Blockchain services..."
    echo ""
    
    stop_all_services
    cleanup_logs
    
    print_success "XWave Blockchain services stopped successfully!"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    "backend")
        stop_service "Backend" "logs/backend.pid"
        stop_service_by_port 8083 "Backend"
        ;;
    "blockchain")
        stop_service "Blockchain Node" "logs/blockchain.pid"
        stop_service_by_port 8080 "Blockchain Node"
        ;;
    "frontend")
        stop_service "Frontend" "logs/frontend.pid"
        stop_service_by_port 3000 "Frontend"
        ;;
    "clean")
        stop_all_services
        cleanup_logs
        ;;
    *)
        main
        ;;
esac
