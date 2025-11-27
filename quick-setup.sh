#!/bin/bash

# ===========================================
# XWAVE QUICK SETUP SCRIPT
# ===========================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# ===========================================
# QUICK SETUP FUNCTION
# ===========================================

quick_setup() {
    log "🚀 Starting XWave Quick Setup"
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker first."
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p data
    mkdir -p backups
    
    # Set proper permissions
    chmod 755 logs
    chmod 755 data
    chmod 755 backups
    
    # Copy environment file
    if [ -f "env.production" ]; then
        cp env.production .env
        log "✅ Environment file copied"
    else
        warning "Environment file not found. Creating default..."
        cat > .env << EOF
# XWave Development Environment
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=xwave_dev
POSTGRES_USER=xwave_user
POSTGRES_PASSWORD=xwave_password

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=xwave_redis_password

JWT_SECRET=xwave_jwt_secret_key_development
JWT_EXPIRATION=86400

BLOCKCHAIN_NETWORK=testnet
BLOCKCHAIN_RPC_URL=http://localhost:8080

RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_STREAM_PER_MINUTE=5
RATE_LIMIT_DAILY_STREAMS=1000

MIN_STREAM_DURATION=30
MAX_DAILY_STREAMS=1000

ENVIRONMENT=development
DEBUG_MODE=true
EOF
        log "✅ Default environment file created"
    fi
    
    # Start services with Docker Compose
    log "🐳 Starting XWave services..."
    
    # Check if simple compose file exists
    if [ -f "docker-compose.simple.yml" ]; then
        docker-compose -f docker-compose.simple.yml up -d
    elif [ -f "docker-compose.production.yml" ]; then
        docker-compose -f docker-compose.production.yml up -d
    elif [ -f "docker-compose.yml" ]; then
        docker-compose up -d
    else
        error "No Docker Compose file found. Please create docker-compose.yml first."
    fi
    
    # Wait for services to be ready
    log "⏳ Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    check_service_health
    
    log "🎉 XWave Quick Setup completed successfully!"
    log "🌐 Frontend: http://localhost:3000"
    log "🔌 Backend: http://localhost:8080"
    log "⛓️ Blockchain: http://localhost:9000"
    log "📊 Monitoring: http://localhost:9090"
    log "📈 Grafana: http://localhost:3001"
    
    # Display service status
    log "📋 Service Status:"
    docker-compose ps
}

# ===========================================
# HEALTH CHECK FUNCTION
# ===========================================

check_service_health() {
    log "🏥 Checking service health..."
    
    # Check backend health
    if curl -f http://localhost:8080/health &> /dev/null; then
        log "✅ Backend is healthy"
    else
        warning "❌ Backend is not healthy"
    fi
    
    # Check frontend health
    if curl -f http://localhost:3000 &> /dev/null; then
        log "✅ Frontend is healthy"
    else
        warning "❌ Frontend is not healthy"
    fi
    
    # Check blockchain health
    if curl -f http://localhost:9000/health &> /dev/null; then
        log "✅ Blockchain is healthy"
    else
        warning "❌ Blockchain is not healthy"
    fi
    
    log "✅ Health check completed"
}

# ===========================================
# CLEANUP FUNCTION
# ===========================================

cleanup() {
    log "🧹 Cleaning up XWave services..."
    
    # Stop all services
    if [ -f "docker-compose.simple.yml" ]; then
        docker-compose -f docker-compose.simple.yml down
    elif [ -f "docker-compose.production.yml" ]; then
        docker-compose -f docker-compose.production.yml down
    elif [ -f "docker-compose.yml" ]; then
        docker-compose down
    fi
    
    # Remove containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    log "✅ Cleanup completed"
}

# ===========================================
# STATUS FUNCTION
# ===========================================

status() {
    log "📊 XWave Service Status"
    
    # Check Docker status
    if docker info &> /dev/null; then
        log "✅ Docker is running"
    else
        log "❌ Docker is not running"
        return 1
    fi
    
    # Check service status
    if [ -f "docker-compose.simple.yml" ]; then
        docker-compose -f docker-compose.simple.yml ps
    elif [ -f "docker-compose.production.yml" ]; then
        docker-compose -f docker-compose.production.yml ps
    elif [ -f "docker-compose.yml" ]; then
        docker-compose ps
    else
        log "❌ No Docker Compose file found"
        return 1
    fi
    
    # Check service health
    check_service_health
}

# ===========================================
# LOGS FUNCTION
# ===========================================

logs() {
    log "📝 XWave Service Logs"
    
    # Show logs for all services
    if [ -f "docker-compose.simple.yml" ]; then
        docker-compose -f docker-compose.simple.yml logs -f
    elif [ -f "docker-compose.production.yml" ]; then
        docker-compose -f docker-compose.production.yml logs -f
    elif [ -f "docker-compose.yml" ]; then
        docker-compose logs -f
    else
        log "❌ No Docker Compose file found"
        return 1
    fi
}

# ===========================================
# MAIN FUNCTION
# ===========================================

main() {
    case "${1:-setup}" in
        "setup")
            quick_setup
            ;;
        "cleanup")
            cleanup
            ;;
        "status")
            status
            ;;
        "logs")
            logs
            ;;
        "health")
            check_service_health
            ;;
        "help")
            echo "Usage: $0 [COMMAND]"
            echo "Commands:"
            echo "  setup     Quick setup XWave services (default)"
            echo "  cleanup   Stop and remove all services"
            echo "  status    Show service status"
            echo "  logs      Show service logs"
            echo "  health    Check service health"
            echo "  help      Show this help message"
            ;;
        *)
            error "Unknown command: $1"
            ;;
    esac
}

# ===========================================
# ERROR HANDLING
# ===========================================

trap 'error "Quick setup failed at line $LINENO"' ERR

# ===========================================
# EXECUTION
# ===========================================

# Run main function
main "$@"
