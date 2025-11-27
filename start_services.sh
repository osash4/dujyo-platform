#!/bin/bash

# XWave Blockchain Services Startup Script
# This script starts all services without Docker

set -e

echo "🚀 XWave Blockchain Services Startup"
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

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_warning "$service_name is not responding after $max_attempts attempts"
    return 1
}

# Start Backend
start_backend() {
    print_status "Starting XWave Backend..."
    
    if check_port 8083; then
        print_warning "Port 8083 is already in use. Backend might already be running."
    else
        cd xwave-backend
        nohup cargo run --release > ../logs/backend.log 2>&1 &
        BACKEND_PID=$!
        echo $BACKEND_PID > ../logs/backend.pid
        cd ..
        print_success "Backend started with PID: $BACKEND_PID"
    fi
}

# Start Blockchain Node
start_blockchain() {
    print_status "Starting XWave Blockchain Node..."
    
    if check_port 8080; then
        print_warning "Port 8080 is already in use. Blockchain node might already be running."
    else
        cd blockchain
        nohup node simple_blockchain.js > ../logs/blockchain.log 2>&1 &
        BLOCKCHAIN_PID=$!
        echo $BLOCKCHAIN_PID > ../logs/blockchain.pid
        cd ..
        print_success "Blockchain node started with PID: $BLOCKCHAIN_PID"
    fi
}

# Start Frontend
start_frontend() {
    print_status "Starting XWave Frontend..."
    
    if check_port 5173; then
        print_warning "Port 5173 is already in use. Frontend might already be running."
    else
        cd xwave-frontend
        nohup npm run dev > ../logs/frontend.log 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID > ../logs/frontend.pid
        cd ..
        print_success "Frontend started with PID: $FRONTEND_PID"
    fi
}

# Create logs directory
create_logs_dir() {
    if [ ! -d "logs" ]; then
        mkdir -p logs
        print_status "Created logs directory"
    fi
}

# Check services health
check_services() {
    print_status "Checking services health..."
    
    # Wait a bit for services to start
    sleep 5
    
    # Check backend
    if wait_for_service "http://localhost:8083/health" "Backend"; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed"
    fi
    
    # Check blockchain
    if wait_for_service "http://localhost:8080/health" "Blockchain Node"; then
        print_success "Blockchain node is healthy"
    else
        print_warning "Blockchain node health check failed"
    fi
    
    # Check frontend
    if wait_for_service "http://localhost:5173" "Frontend"; then
        print_success "Frontend is accessible"
    else
        print_warning "Frontend accessibility check failed"
    fi
}

# Display service URLs
show_urls() {
    echo ""
    echo "🌐 XWave Blockchain Services"
    echo "============================"
    echo "Frontend:     http://localhost:5173"
    echo "Backend API:  http://localhost:8083"
    echo "Blockchain:   http://localhost:8080"
    echo "WebSocket:    ws://localhost:8081"
    echo ""
    echo "📊 Service Status"
    echo "================="
    echo "Backend PID:  $(cat logs/backend.pid 2>/dev/null || echo 'Not running')"
    echo "Blockchain:   $(cat logs/blockchain.pid 2>/dev/null || echo 'Not running')"
    echo "Frontend:     $(cat logs/frontend.pid 2>/dev/null || echo 'Not running')"
    echo ""
    echo "🔧 Management Commands"
    echo "======================"
    echo "View logs:    tail -f logs/*.log"
    echo "Stop services: ./stop_services.sh"
    echo "Restart:      ./restart_services.sh"
    echo ""
}

# Main startup function
main() {
    echo "Starting XWave Blockchain services..."
    echo ""
    
    # Create logs directory
    create_logs_dir
    
    # Start services
    start_backend
    start_blockchain
    start_frontend
    
    # Check health
    check_services
    
    # Show URLs
    show_urls
    
    print_success "XWave Blockchain services started successfully!"
    echo ""
    echo "🎉 Your XWave blockchain is now running!"
    echo "   Visit http://localhost:5173 to access the frontend"
    echo "   API documentation available at http://localhost:8083/docs"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    "backend")
        create_logs_dir
        start_backend
        ;;
    "blockchain")
        create_logs_dir
        start_blockchain
        ;;
    "frontend")
        create_logs_dir
        start_frontend
        ;;
    "health")
        check_services
        ;;
    "status")
        show_urls
        ;;
    *)
        main
        ;;
esac
