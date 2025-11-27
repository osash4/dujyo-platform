#!/bin/bash

# XWave Production Startup Script
# This script starts all XWave services in production mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.production"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.production.yml"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env.production exists
    if [ ! -f "$ENV_FILE" ]; then
        log_warn ".env.production not found. Creating from .env.production.example..."
        if [ -f "$PROJECT_ROOT/.env.production.example" ]; then
            cp "$PROJECT_ROOT/.env.production.example" "$ENV_FILE"
            log_warn "Please update .env.production with your actual values before continuing."
            exit 1
        else
            log_error ".env.production.example not found. Please create .env.production manually."
            exit 1
        fi
    fi
    
    log_info "Requirements check passed."
}

check_health() {
    log_info "Checking service health..."
    
    local services=("backend" "frontend" "postgres" "redis")
    local healthy=true
    
    for service in "${services[@]}"; do
        if docker ps | grep -q "xwave-$service"; then
            log_info "$service is running"
        else
            log_warn "$service is not running"
            healthy=false
        fi
    done
    
    if [ "$healthy" = false ]; then
        log_warn "Some services are not healthy. Check logs with: docker compose -f $COMPOSE_FILE logs"
    else
        log_info "All services are healthy."
    fi
}

start_services() {
    log_info "Starting XWave production services..."
    
    cd "$PROJECT_ROOT"
    
    # Load environment variables
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    
    # Build and start services
    log_info "Building Docker images..."
    docker compose -f "$COMPOSE_FILE" build --no-cache
    
    log_info "Starting services..."
    docker compose -f "$COMPOSE_FILE" up -d
    
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check health
    check_health
    
    log_info "XWave production services started successfully!"
    log_info "Backend: http://localhost:8083"
    log_info "Frontend: http://localhost:5173"
    log_info "View logs: docker compose -f $COMPOSE_FILE logs -f"
}

stop_services() {
    log_info "Stopping XWave production services..."
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" down
    log_info "Services stopped."
}

restart_services() {
    log_info "Restarting XWave production services..."
    stop_services
    sleep 2
    start_services
}

show_status() {
    log_info "XWave Production Services Status:"
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" ps
}

show_logs() {
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" logs -f "$@"
}

# Main script
main() {
    case "${1:-}" in
        start)
            check_requirements
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            check_requirements
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "${@:2}"
            ;;
        health)
            check_health
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|status|logs|health}"
            echo ""
            echo "Commands:"
            echo "  start   - Start all production services"
            echo "  stop    - Stop all production services"
            echo "  restart - Restart all production services"
            echo "  status  - Show status of all services"
            echo "  logs    - Show logs (optionally specify service name)"
            echo "  health  - Check health of all services"
            exit 1
            ;;
    esac
}

main "$@"

