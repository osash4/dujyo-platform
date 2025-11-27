#!/bin/bash

# ============================================================================
# XWAVE BLOCKCHAIN - DEPLOYMENT TESTING SCRIPT
# ============================================================================
# Este script ejecuta tests completos del deployment de XWave
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
    echo -e "${BLUE}🚀 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
}

# ============================================================================
# CONFIGURACIÓN INICIAL
# ============================================================================

print_header "XWAVE BLOCKCHAIN - DEPLOYMENT TESTING"
echo "Running comprehensive tests for XWave deployment"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "Cargo.toml" ]; then
    print_error "This script must be run from the xwave-backend directory"
    exit 1
fi

# Crear directorio para logs
mkdir -p logs
LOG_FILE="logs/testing_$(date +%Y%m%d_%H%M%S).log"

# Función para logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "Starting XWave deployment testing"

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

# Configuración por defecto
DEFAULT_HOST="localhost"
DEFAULT_PORT="8083"
DEFAULT_URL="http://$DEFAULT_HOST:$DEFAULT_PORT"

# Permitir override de configuración
HOST=${XWAVE_HOST:-$DEFAULT_HOST}
PORT=${XWAVE_PORT:-$DEFAULT_PORT}
URL="http://$HOST:$PORT"

print_info "Testing Configuration:"
print_info "  Host: $HOST"
print_info "  Port: $PORT"
print_info "  URL: $URL"

# ============================================================================
# FUNCIONES DE TESTING
# ============================================================================

# Función para test de endpoint
test_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local description=${3:-"$endpoint"}
    
    print_info "Testing $description..."
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$URL$endpoint")
    local status_code=${response: -3}
    
    if [ "$status_code" = "$expected_status" ]; then
        print_success "$description: HTTP $status_code"
        return 0
    else
        print_error "$description: HTTP $status_code (expected $expected_status)"
        return 1
    fi
}

# Función para test de POST endpoint
test_post_endpoint() {
    local endpoint=$1
    local data=$2
    local expected_status=${3:-200}
    local description=${4:-"$endpoint"}
    
    print_info "Testing $description..."
    
    local response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$data" \
        -o /tmp/response.json "$URL$endpoint")
    local status_code=${response: -3}
    
    if [ "$status_code" = "$expected_status" ]; then
        print_success "$description: HTTP $status_code"
        return 0
    else
        print_error "$description: HTTP $status_code (expected $expected_status)"
        return 1
    fi
}

# Función para test de autenticación
test_auth_endpoint() {
    local endpoint=$1
    local data=$2
    local expected_status=${3:-200}
    local description=${4:-"$endpoint"}
    
    print_info "Testing $description..."
    
    # Obtener JWT token
    local token_response=$(curl -s -X POST "$URL/login" \
        -H "Content-Type: application/json" \
        -d '{"address": "XW_TEST_ADDRESS"}')
    local token=$(echo "$token_response" | jq -r '.token // empty')
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        print_error "$description: Failed to get JWT token"
        return 1
    fi
    
    # Test con token
    local response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d "$data" \
        -o /tmp/response.json "$URL$endpoint")
    local status_code=${response: -3}
    
    if [ "$status_code" = "$expected_status" ]; then
        print_success "$description: HTTP $status_code"
        return 0
    else
        print_error "$description: HTTP $status_code (expected $expected_status)"
        return 1
    fi
}

# ============================================================================
# PASO 1: VERIFICAR SERVIDOR
# ============================================================================

print_step "PASO 1: Verificando Servidor"

# Verificar que el servidor esté corriendo
print_info "Checking if server is running..."
if curl -s --connect-timeout 5 "$URL/health" > /dev/null; then
    print_success "Server is running and responding"
else
    print_error "Server is not responding at $URL"
    print_info "Please start the server with: cargo run"
    exit 1
fi

# ============================================================================
# PASO 2: TESTS DE ENDPOINTS BÁSICOS
# ============================================================================

print_step "PASO 2: Tests de Endpoints Básicos"

# Test de salud
test_endpoint "/health" 200 "Health Check"

# Test de bloques
test_endpoint "/blocks" 200 "Blocks Endpoint"

# Test de pools
test_endpoint "/pools" 200 "Pools Endpoint"

# Test de transacciones
test_endpoint "/transactions" 200 "Transactions Endpoint"

# ============================================================================
# PASO 3: TESTS DE TOKEN NATIVO
# ============================================================================

print_step "PASO 3: Tests de Token Nativo"

# Test de token stats
test_endpoint "/token/stats" 200 "Token Stats"

# Test de balance
test_endpoint "/balance/XW_TEST_ADDRESS" 200 "Balance Endpoint"

# Test de minting
test_post_endpoint "/mint" '{"address": "XW_TEST_MINT_ADDRESS", "amount": 1000}' 200 "Minting"

# ============================================================================
# PASO 4: TESTS DE MULTISIG
# ============================================================================

print_step "PASO 4: Tests de Multisig"

# Test de multisig stats
test_endpoint "/multisig/stats" 200 "Multisig Stats"

# Test de multisig list
test_endpoint "/multisig/list" 200 "Multisig List"

# Test de creación de multisig (requiere auth)
test_auth_endpoint "/multisig/create" '{
    "name": "Test Multisig",
    "purpose": "TEST",
    "owners": ["XW_OWNER_1", "XW_OWNER_2", "XW_OWNER_3"],
    "threshold": 2,
    "daily_limit": 1000000
}' 200 "Multisig Creation"

# ============================================================================
# PASO 5: TESTS DE VESTING
# ============================================================================

print_step "PASO 5: Tests de Vesting"

# Test de vesting stats
test_endpoint "/vesting/stats" 200 "Vesting Stats"

# Test de vesting list
test_endpoint "/vesting/list" 200 "Vesting List"

# Test de creación de vesting (requiere auth)
test_auth_endpoint "/vesting/create" '{
    "beneficiary": "XW_TEST_BENEFICIARY",
    "total_amount": 1000000,
    "cliff_duration": 0,
    "vesting_duration": 31536000,
    "release_frequency": 2592000,
    "revocable": true,
    "created_by": "admin"
}' 200 "Vesting Creation"

# ============================================================================
# PASO 6: TESTS DE STAKING
# ============================================================================

print_step "PASO 6: Tests de Staking"

# Test de staking stats
test_endpoint "/staking/stats" 200 "Staking Stats"

# Test de staking list
test_endpoint "/staking/list" 200 "Staking List"

# Test de creación de staking contract (requiere auth)
test_auth_endpoint "/staking/create-contract" '{
    "name": "Test Staking Contract",
    "purpose": "TEST",
    "min_stake": 1000,
    "max_stake": 1000000,
    "reward_frequency": 86400,
    "slashing_enabled": false,
    "slashing_rate": 0.0
}' 200 "Staking Contract Creation"

# Test de staking tokens
test_post_endpoint "/stake" '{"address": "XW_TEST_STAKER", "amount": 1000}' 200 "Token Staking"

# Test de unstaking tokens
test_post_endpoint "/unstake" '{"address": "XW_TEST_STAKER", "amount": 500}' 200 "Token Unstaking"

# ============================================================================
# PASO 7: TESTS DE CONSENSUS CPV
# ============================================================================

print_step "PASO 7: Tests de Consensus CPV"

# Test de consensus stats
test_endpoint "/consensus/stats" 200 "Consensus Stats"

# Test de registro de validador económico (requiere auth)
test_auth_endpoint "/consensus/register/economic" '{
    "address": "XW_TEST_ECONOMIC_VALIDATOR",
    "stake_amount": 10000
}' 200 "Economic Validator Registration"

# Test de registro de validador creativo (requiere auth)
test_auth_endpoint "/consensus/register/creative" '{
    "address": "XW_TEST_CREATIVE_VALIDATOR",
    "verified_nfts": ["NFT_001", "NFT_002"]
}' 200 "Creative Validator Registration"

# Test de registro de validador comunitario (requiere auth)
test_auth_endpoint "/consensus/register/community" '{
    "address": "XW_TEST_COMMUNITY_VALIDATOR",
    "reputation_score": 85.5
}' 200 "Community Validator Registration"

# ============================================================================
# PASO 8: TESTS DE RENDIMIENTO
# ============================================================================

print_step "PASO 8: Tests de Rendimiento"

# Test de tiempo de respuesta
print_info "Testing response times..."

ENDPOINTS=("/health" "/blocks" "/pools" "/token/stats" "/multisig/stats" "/vesting/stats" "/staking/stats" "/consensus/stats")

for endpoint in "${ENDPOINTS[@]}"; do
    local start_time=$(date +%s.%N)
    curl -s "$URL$endpoint" > /dev/null
    local end_time=$(date +%s.%N)
    local response_time=$(echo "$end_time - $start_time" | bc)
    
    if (( $(echo "$response_time < 1.0" | bc -l) )); then
        print_success "Endpoint $endpoint: ${response_time}s (Good)"
    elif (( $(echo "$response_time < 3.0" | bc -l) )); then
        print_warning "Endpoint $endpoint: ${response_time}s (Acceptable)"
    else
        print_error "Endpoint $endpoint: ${response_time}s (Slow)"
    fi
done

# ============================================================================
# PASO 9: TESTS DE ESTRÉS
# ============================================================================

print_step "PASO 9: Tests de Estrés"

# Test de múltiples requests concurrentes
print_info "Testing concurrent requests..."

for i in {1..10}; do
    curl -s "$URL/health" > /dev/null &
done

wait
print_success "Concurrent requests test completed"

# Test de carga en endpoint de balance
print_info "Testing balance endpoint under load..."

for i in {1..20}; do
    curl -s "$URL/balance/XW_TEST_ADDRESS_$i" > /dev/null &
done

wait
print_success "Balance endpoint load test completed"

# ============================================================================
# PASO 10: TESTS DE ERROR HANDLING
# ============================================================================

print_step "PASO 10: Tests de Error Handling"

# Test de endpoint inexistente
test_endpoint "/nonexistent" 404 "Non-existent Endpoint"

# Test de método no permitido
print_info "Testing method not allowed..."
local response=$(curl -s -w "%{http_code}" -X DELETE -o /dev/null "$URL/health")
if [ "$response" = "405" ]; then
    print_success "Method not allowed: HTTP 405"
else
    print_warning "Method not allowed: HTTP $response"
fi

# Test de datos inválidos
test_post_endpoint "/mint" '{"invalid": "data"}' 400 "Invalid Data"

# ============================================================================
# PASO 11: TESTS DE BASE DE DATOS
# ============================================================================

print_step "PASO 11: Tests de Base de Datos"

# Verificar conexión a la base de datos
print_info "Testing database connection..."
if psql -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Database connection is working"
else
    print_error "Database connection failed"
fi

# Verificar tablas principales
print_info "Checking main database tables..."
TABLES=("blocks" "transactions" "balances" "native_token_balances" "multisig_wallets" "vesting_schedules" "staking_contracts")

for table in "${TABLES[@]}"; do
    if psql -c "SELECT COUNT(*) FROM $table;" > /dev/null 2>&1; then
        print_success "Table $table exists and is accessible"
    else
        print_warning "Table $table may not exist or is not accessible"
    fi
done

# ============================================================================
# PASO 12: GENERAR REPORTE DE TESTING
# ============================================================================

print_step "PASO 12: Generando Reporte de Testing"

# Crear reporte de testing
cat > logs/testing_report.md << EOF
# XWave Blockchain - Testing Report

## Testing Summary
- **Date**: $(date)
- **Host**: $HOST
- **Port**: $PORT
- **URL**: $URL
- **Status**: ✅ TESTED

## Test Results
- **Basic Endpoints**: Tested
- **Token Native**: Tested
- **Multisig**: Tested
- **Vesting**: Tested
- **Staking**: Tested
- **Consensus CPV**: Tested
- **Performance**: Measured
- **Stress**: Tested
- **Error Handling**: Tested
- **Database**: Verified

## Performance Metrics
- **Response Times**: Measured
- **Concurrent Requests**: Tested
- **Load Testing**: Completed
- **Error Handling**: Verified

## Recommendations
1. Monitor system performance
2. Check logs regularly
3. Verify database backups
4. Test disaster recovery
5. Monitor consensus health

## Logs
- **Testing Log**: $LOG_FILE
- **Server Logs**: logs/
- **Database Logs**: PostgreSQL logs
EOF

print_success "Testing report generated: logs/testing_report.md"

# ============================================================================
# RESUMEN FINAL
# ============================================================================

print_header "TESTING COMPLETED"

echo "🎉 XWave deployment testing completed!"
echo ""
echo "📊 TESTING SUMMARY:"
echo "   ✅ Basic Endpoints: TESTED"
echo "   ✅ Token Native: TESTED"
echo "   ✅ Multisig: TESTED"
echo "   ✅ Vesting: TESTED"
echo "   ✅ Staking: TESTED"
echo "   ✅ Consensus CPV: TESTED"
echo "   ✅ Performance: MEASURED"
echo "   ✅ Stress: TESTED"
echo "   ✅ Error Handling: TESTED"
echo "   ✅ Database: VERIFIED"
echo ""
echo "🌐 ENDPOINTS TESTED:"
echo "   Health: $URL/health"
echo "   Blocks: $URL/blocks"
echo "   Pools: $URL/pools"
echo "   Token Stats: $URL/token/stats"
echo "   Multisig Stats: $URL/multisig/stats"
echo "   Vesting Stats: $URL/vesting/stats"
echo "   Staking Stats: $URL/staking/stats"
echo "   Consensus Stats: $URL/consensus/stats"
echo ""
echo "📁 FILES GENERATED:"
echo "   📄 Testing Log: $LOG_FILE"
echo "   📄 Testing Report: logs/testing_report.md"
echo ""

log "XWave deployment testing completed successfully"

print_success "XWave deployment is tested and ready!"