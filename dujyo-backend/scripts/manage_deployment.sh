#!/bin/bash

# ============================================================================
# XWAVE BLOCKCHAIN - DEPLOYMENT MANAGEMENT SCRIPT
# ============================================================================
# Este script gestiona el deployment de XWave (start, stop, restart, status)
# ============================================================================

set -e  # Exit on any error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para imprimir con colores
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
# CONFIGURACIÓN INICIAL
# ============================================================================

# Verificar que estamos en el directorio correcto
if [ ! -f "Cargo.toml" ]; then
    print_error "This script must be run from the xwave-backend directory"
    exit 1
fi

# Crear directorio para logs
mkdir -p logs

# Configuración por defecto
DEFAULT_HOST="localhost"
DEFAULT_PORT="8083"
DEFAULT_URL="http://$DEFAULT_HOST:$DEFAULT_PORT"

# Permitir override de configuración
HOST=${XWAVE_HOST:-$DEFAULT_HOST}
PORT=${XWAVE_PORT:-$DEFAULT_PORT}
URL="http://$HOST:$PORT"

# Archivos de PID
TESTNET_PID_FILE="logs/testnet_server.pid"
MAINNET_PID_FILE="logs/mainnet_server.pid"

# ============================================================================
# FUNCIONES DE UTILIDAD
# ============================================================================

# Función para obtener PID del servidor
get_server_pid() {
    local env=$1
    local pid_file=""
    
    case $env in
        "testnet")
            pid_file=$TESTNET_PID_FILE
            ;;
        "mainnet")
            pid_file=$MAINNET_PID_FILE
            ;;
        *)
            # Buscar cualquier proceso de xwavve-backend
            pgrep -f "xwavve-backend" || echo ""
            return
            ;;
    esac
    
    if [ -f "$pid_file" ]; then
        cat "$pid_file"
    else
        echo ""
    fi
}

# Función para verificar si el servidor está corriendo
is_server_running() {
    local env=$1
    local pid=$(get_server_pid "$env")
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Función para verificar salud del servidor
check_server_health() {
    local env=$1
    local url=""
    
    case $env in
        "testnet")
            url="http://localhost:8083"
            ;;
        "mainnet")
            url="http://localhost:8083"
            ;;
        *)
            url=$URL
            ;;
    esac
    
    if curl -s --connect-timeout 5 "$url/health" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Función para mostrar estado del servidor
show_server_status() {
    local env=$1
    local pid=$(get_server_pid "$env")
    
    if [ -n "$pid" ] && is_server_running "$env"; then
        if check_server_health "$env"; then
            print_success "Server ($env) is running (PID: $pid) and healthy"
        else
            print_warning "Server ($env) is running (PID: $pid) but not responding"
        fi
    else
        print_error "Server ($env) is not running"
    fi
}

# ============================================================================
# FUNCIONES DE GESTIÓN
# ============================================================================

# Función para iniciar servidor
start_server() {
    local env=$1
    local pid_file=""
    local log_file=""
    
    case $env in
        "testnet")
            pid_file=$TESTNET_PID_FILE
            log_file="logs/testnet_server.log"
            ;;
        "mainnet")
            pid_file=$MAINNET_PID_FILE
            log_file="logs/mainnet_server.log"
            ;;
        *)
            print_error "Invalid environment: $env. Use 'testnet' or 'mainnet'"
            exit 1
            ;;
    esac
    
    print_step "Starting XWave server ($env)..."
    
    # Verificar si ya está corriendo
    if is_server_running "$env"; then
        print_warning "Server ($env) is already running"
        show_server_status "$env"
        return 0
    fi
    
    # Compilar si es necesario
    print_info "Compiling backend..."
    if ! cargo build --release; then
        print_error "Failed to compile backend"
        exit 1
    fi
    
    # Iniciar servidor
    print_info "Starting server..."
    nohup cargo run --release > "$log_file" 2>&1 &
    local server_pid=$!
    echo $server_pid > "$pid_file"
    
    # Esperar a que el servidor esté listo
    print_info "Waiting for server to start..."
    sleep 10
    
    # Verificar que el servidor esté corriendo
    if is_server_running "$env"; then
        if check_server_health "$env"; then
            print_success "Server ($env) started successfully (PID: $server_pid)"
        else
            print_warning "Server ($env) started but not responding yet"
        fi
    else
        print_error "Failed to start server ($env)"
        print_info "Check logs: $log_file"
        exit 1
    fi
}

# Función para detener servidor
stop_server() {
    local env=$1
    local pid=$(get_server_pid "$env")
    
    print_step "Stopping XWave server ($env)..."
    
    if [ -n "$pid" ] && is_server_running "$env"; then
        print_info "Stopping server (PID: $pid)..."
        kill "$pid"
        
        # Esperar a que el proceso termine
        local count=0
        while is_server_running "$env" && [ $count -lt 30 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        if is_server_running "$env"; then
            print_warning "Server didn't stop gracefully, forcing..."
            kill -9 "$pid" 2>/dev/null || true
        fi
        
        # Limpiar archivo PID
        case $env in
            "testnet")
                rm -f "$TESTNET_PID_FILE"
                ;;
            "mainnet")
                rm -f "$MAINNET_PID_FILE"
                ;;
        esac
        
        print_success "Server ($env) stopped"
    else
        print_warning "Server ($env) is not running"
    fi
}

# Función para reiniciar servidor
restart_server() {
    local env=$1
    
    print_step "Restarting XWave server ($env)..."
    
    stop_server "$env"
    sleep 2
    start_server "$env"
}

# Función para mostrar estado
show_status() {
    local env=$1
    
    print_header "XWAVE SERVER STATUS"
    
    if [ "$env" = "all" ]; then
        show_server_status "testnet"
        show_server_status "mainnet"
    else
        show_server_status "$env"
    fi
    
    echo ""
    print_info "Server URLs:"
    echo "  Testnet: http://localhost:8083"
    echo "  Mainnet: http://localhost:8083"
    echo ""
    print_info "Log files:"
    echo "  Testnet: logs/testnet_server.log"
    echo "  Mainnet: logs/mainnet_server.log"
    echo ""
    print_info "PID files:"
    echo "  Testnet: $TESTNET_PID_FILE"
    echo "  Mainnet: $MAINNET_PID_FILE"
}

# Función para mostrar logs
show_logs() {
    local env=$1
    local lines=${2:-50}
    local log_file=""
    
    case $env in
        "testnet")
            log_file="logs/testnet_server.log"
            ;;
        "mainnet")
            log_file="logs/mainnet_server.log"
            ;;
        *)
            print_error "Invalid environment: $env. Use 'testnet' or 'mainnet'"
            exit 1
            ;;
    esac
    
    if [ -f "$log_file" ]; then
        print_info "Showing last $lines lines of $env server log:"
        echo ""
        tail -n "$lines" "$log_file"
    else
        print_error "Log file not found: $log_file"
    fi
}

# Función para verificar deployment
verify_deployment() {
    local env=$1
    
    print_step "Verifying XWave deployment ($env)..."
    
    if [ -f "scripts/verify_deployment.sh" ]; then
        ./scripts/verify_deployment.sh
    else
        print_error "Verification script not found"
        exit 1
    fi
}

# Función para mostrar ayuda
show_help() {
    print_header "XWAVE DEPLOYMENT MANAGEMENT"
    echo ""
    echo "Usage: $0 <command> [environment] [options]"
    echo ""
    echo "Commands:"
    echo "  start <env>     Start server (testnet/mainnet)"
    echo "  stop <env>      Stop server (testnet/mainnet)"
    echo "  restart <env>   Restart server (testnet/mainnet)"
    echo "  status [env]    Show server status (testnet/mainnet/all)"
    echo "  logs <env>      Show server logs (testnet/mainnet)"
    echo "  verify [env]    Verify deployment"
    echo "  help            Show this help"
    echo ""
    echo "Environments:"
    echo "  testnet         Testnet environment"
    echo "  mainnet         Mainnet environment"
    echo "  all             All environments (for status only)"
    echo ""
    echo "Options:"
    echo "  --lines N       Number of log lines to show (default: 50)"
    echo ""
    echo "Examples:"
    echo "  $0 start testnet"
    echo "  $0 stop mainnet"
    echo "  $0 restart testnet"
    echo "  $0 status all"
    echo "  $0 logs testnet --lines 100"
    echo "  $0 verify testnet"
    echo ""
}

# ============================================================================
# FUNCIÓN PRINCIPAL
# ============================================================================

main() {
    local command=$1
    local environment=$2
    local option=$3
    local value=$4
    
    case $command in
        "start")
            if [ -z "$environment" ]; then
                print_error "Environment required for start command"
                show_help
                exit 1
            fi
            start_server "$environment"
            ;;
        "stop")
            if [ -z "$environment" ]; then
                print_error "Environment required for stop command"
                show_help
                exit 1
            fi
            stop_server "$environment"
            ;;
        "restart")
            if [ -z "$environment" ]; then
                print_error "Environment required for restart command"
                show_help
                exit 1
            fi
            restart_server "$environment"
            ;;
        "status")
            show_status "${environment:-all}"
            ;;
        "logs")
            if [ -z "$environment" ]; then
                print_error "Environment required for logs command"
                show_help
                exit 1
            fi
            local lines=50
            if [ "$option" = "--lines" ] && [ -n "$value" ]; then
                lines=$value
            fi
            show_logs "$environment" "$lines"
            ;;
        "verify")
            verify_deployment "${environment:-testnet}"
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
# EJECUTAR SCRIPT
# ============================================================================

main "$@"
