#!/bin/bash

# XWave Blockchain Deployment Script
# This script deploys the complete XWave blockchain ecosystem

set -e

echo "🚀 XWave Blockchain Deployment Script"
echo "======================================"

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

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if required tools are installed
check_tools() {
    print_status "Checking required tools..."
    
    # Check Rust
    if ! command -v cargo &> /dev/null; then
        print_error "Rust is not installed. Please install Rust first."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    print_success "All required tools are installed"
}

# Build backend
build_backend() {
    print_status "Building XWave Backend..."
    cd xwave-backend
    
    # Check if Cargo.toml exists
    if [ ! -f "Cargo.toml" ]; then
        print_error "Cargo.toml not found in xwave-backend directory"
        exit 1
    fi
    
    # Build the backend
    cargo build --release
    
    if [ $? -eq 0 ]; then
        print_success "Backend built successfully"
    else
        print_error "Backend build failed"
        exit 1
    fi
    
    cd ..
}

# Build blockchain node
build_blockchain() {
    print_status "Building XWave Blockchain Node..."
    cd blockchain
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in blockchain directory"
        exit 1
    fi
    
    # Install dependencies
    npm install
    
    if [ $? -eq 0 ]; then
        print_success "Blockchain node dependencies installed"
    else
        print_error "Blockchain node dependency installation failed"
        exit 1
    fi
    
    cd ..
}

# Build frontend
build_frontend() {
    print_status "Building XWave Frontend..."
    cd xwave-frontend
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in xwave-frontend directory"
        exit 1
    fi
    
    # Install dependencies
    npm install
    
    if [ $? -eq 0 ]; then
        print_success "Frontend dependencies installed"
    else
        print_error "Frontend dependency installation failed"
        exit 1
    fi
    
    cd ..
}

# Start services with Docker Compose
start_services() {
    print_status "Starting XWave services with Docker Compose..."
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found"
        exit 1
    fi
    
    # Start services
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        print_success "Services started successfully"
    else
        print_error "Failed to start services"
        exit 1
    fi
}

# Check service health
check_health() {
    print_status "Checking service health..."
    
    # Wait for services to be ready
    sleep 10
    
    # Check backend health
    if curl -f http://localhost:8083/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed"
    fi
    
    # Check blockchain node health
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        print_success "Blockchain node is healthy"
    else
        print_warning "Blockchain node health check failed"
    fi
    
    # Check frontend
    if curl -f http://localhost:5173 > /dev/null 2>&1; then
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
    echo "PostgreSQL:   localhost:5432"
    echo "Redis:        localhost:6379"
    echo ""
    echo "🔧 Management Commands"
    echo "======================"
    echo "View logs:    docker-compose logs -f"
    echo "Stop services: docker-compose down"
    echo "Restart:      docker-compose restart"
    echo ""
}

# Main deployment function
main() {
    echo "Starting XWave Blockchain deployment..."
    echo ""
    
    # Check prerequisites
    check_docker
    check_tools
    
    # Build components
    build_backend
    build_blockchain
    build_frontend
    
    # Start services
    start_services
    
    # Check health
    check_health
    
    # Show URLs
    show_urls
    
    print_success "XWave Blockchain deployment completed successfully!"
    echo ""
    echo "🎉 Your XWave blockchain is now running!"
    echo "   Visit http://localhost:5173 to access the frontend"
    echo "   API documentation available at http://localhost:8083/docs"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    "build")
        check_tools
        build_backend
        build_blockchain
        build_frontend
        print_success "Build completed successfully!"
        ;;
    "start")
        start_services
        check_health
        show_urls
        ;;
    "stop")
        print_status "Stopping XWave services..."
        docker-compose down
        print_success "Services stopped"
        ;;
    "restart")
        print_status "Restarting XWave services..."
        docker-compose restart
        check_health
        print_success "Services restarted"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "health")
        check_health
        ;;
    *)
        main
        ;;
esac
