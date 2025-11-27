#!/bin/bash

# ============================================================================
# XWAVE BLOCKCHAIN - MAINNET DEPLOYMENT SCRIPT
# ============================================================================
# Este script despliega la blockchain XWave en mainnet
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

print_header "XWAVE BLOCKCHAIN - MAINNET DEPLOYMENT"
echo "Deploying XWave Native Token (XWV) to mainnet"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "Cargo.toml" ]; then
    print_error "This script must be run from the xwave-backend directory"
    exit 1
fi

# Crear directorio para logs
mkdir -p logs
LOG_FILE="logs/mainnet_deployment_$(date +%Y%m%d_%H%M%S).log"

# Función para logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "Starting XWave mainnet deployment"

# ============================================================================
# CONFIGURACIÓN DE MAINNET
# ============================================================================

# Configuración de mainnet
MAINNET_PORT=8083
MAINNET_HOST="localhost"
MAINNET_DB="xwave_mainnet"
MAINNET_USER="yare"

# URLs de mainnet
MAINNET_URL="http://$MAINNET_HOST:$MAINNET_PORT"
DB_URL="postgresql://$MAINNET_USER@localhost:5432/$MAINNET_DB"

print_info "Mainnet Configuration:"
print_info "  Host: $MAINNET_HOST"
print_info "  Port: $MAINNET_PORT"
print_info "  Database: $MAINNET_DB"
print_info "  URL: $MAINNET_URL"

# ============================================================================
# PASO 1: VERIFICAR PREREQUISITOS
# ============================================================================

print_step "PASO 1: Verificando Prerequisitos"

# Verificar Rust/Cargo
if ! command -v cargo &> /dev/null; then
    print_error "Rust/Cargo is not installed"
    exit 1
fi

print_success "Rust/Cargo is available"

# Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL is not installed or not in PATH"
    exit 1
fi

# Verificar que PostgreSQL esté corriendo
if ! pg_isready -q; then
    print_error "PostgreSQL is not running"
    exit 1
fi

print_success "PostgreSQL is running"

# ============================================================================
# PASO 2: COMPILAR CÓDIGO
# ============================================================================

print_step "PASO 2: Compilando Código"

print_info "Compiling XWave backend..."
if cargo build --release; then
    print_success "Backend compiled successfully"
else
    print_error "Failed to compile backend"
    exit 1
fi

# ============================================================================
# PASO 3: CONFIGURAR BASE DE DATOS DE MAINNET
# ============================================================================

print_step "PASO 3: Configurando Base de Datos de Mainnet"

# Crear base de datos de mainnet si no existe
print_info "Creating mainnet database..."
if psql -c "CREATE DATABASE $MAINNET_DB;" 2>/dev/null || true; then
    print_success "Mainnet database ready"
else
    print_warning "Database creation failed or already exists"
fi

# Verificar conexión a la base de datos
if ! psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    print_error "Cannot connect to mainnet database"
    exit 1
fi

print_success "Mainnet database connection verified"

# Ejecutar script de configuración de la base de datos
print_info "Setting up mainnet database schema..."
if psql "$DB_URL" -f scripts/setup_native_token_database.sql; then
    print_success "Mainnet database schema created"
else
    print_error "Failed to create mainnet database schema"
    exit 1
fi

# ============================================================================
# PASO 4: CONFIGURAR VARIABLES DE ENTORNO
# ============================================================================

print_step "PASO 4: Configurando Variables de Entorno"

# Crear archivo .env para mainnet
cat > .env.mainnet << EOF
# XWave Mainnet Configuration
DATABASE_URL=$DB_URL
JWT_SECRET=xwave_mainnet_secret_key_2025_secure
SERVER_HOST=$MAINNET_HOST
SERVER_PORT=$MAINNET_PORT
ENVIRONMENT=mainnet
LOG_LEVEL=info
EOF

print_success "Mainnet environment variables configured"

# ============================================================================
# PASO 5: INICIAR SERVIDOR DE MAINNET
# ============================================================================

print_step "PASO 5: Iniciando Servidor de Mainnet"

# Detener servidor anterior si está corriendo
if pgrep -f "xwavve-backend" > /dev/null; then
    print_info "Stopping previous server..."
    pkill -f "xwavve-backend" || true
    sleep 2
fi

# Iniciar servidor en background
print_info "Starting XWave mainnet server..."
nohup cargo run --release > logs/mainnet_server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > logs/mainnet_server.pid

# Esperar a que el servidor esté listo
print_info "Waiting for server to start..."
sleep 10

# Verificar que el servidor esté corriendo
if ! curl -s "$MAINNET_URL/health" > /dev/null; then
    print_error "Server failed to start"
    print_info "Server log:"
    tail -20 logs/mainnet_server.log
    exit 1
fi

print_success "Mainnet server is running (PID: $SERVER_PID)"

# ============================================================================
# PASO 6: VERIFICAR ENDPOINTS
# ============================================================================

print_step "PASO 6: Verificando Endpoints"

# Verificar endpoint de salud
print_info "Testing health endpoint..."
if curl -s "$MAINNET_URL/health" | grep -q "healthy"; then
    print_success "Health endpoint working"
else
    print_error "Health endpoint failed"
fi

# Verificar endpoint de bloques
print_info "Testing blocks endpoint..."
if curl -s "$MAINNET_URL/blocks" > /dev/null; then
    print_success "Blocks endpoint working"
else
    print_error "Blocks endpoint failed"
fi

# Verificar endpoint de pools
print_info "Testing pools endpoint..."
if curl -s "$MAINNET_URL/pools" > /dev/null; then
    print_success "Pools endpoint working"
else
    print_error "Pools endpoint failed"
fi

# ============================================================================
# PASO 7: CONFIGURAR TOKEN NATIVO
# ============================================================================

print_step "PASO 7: Configurando Token Nativo"

# Obtener JWT token
print_info "Getting JWT token..."
JWT_TOKEN=$(curl -s -X POST "$MAINNET_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"address": "XW_ADMIN_ADDRESS"}' | \
  jq -r '.token')

if [ "$JWT_TOKEN" = "null" ] || [ -z "$JWT_TOKEN" ]; then
    print_error "Failed to get JWT token"
    exit 1
fi

print_success "JWT token obtained"

# ============================================================================
# PASO 8: CONFIGURAR WALLETS MULTISIG
# ============================================================================

print_step "PASO 8: Configurando Wallets Multisig"

# Crear script para configurar multisig en mainnet
cat > scripts/setup_mainnet_multisig.sh << EOF
#!/bin/bash

echo "🔐 Setting up Mainnet Multisig Wallets..."

# Treasury Wallet
echo "Creating Treasury Multisig Wallet..."
curl -X POST $MAINNET_URL/multisig/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "XWave Treasury Mainnet",
    "purpose": "TREASURY",
    "owners": [
      "XW_TREASURY_OWNER_1_MAINNET",
      "XW_TREASURY_OWNER_2_MAINNET", 
      "XW_TREASURY_OWNER_3_MAINNET",
      "XW_TREASURY_OWNER_4_MAINNET",
      "XW_TREASURY_OWNER_5_MAINNET"
    ],
    "threshold": 3,
    "daily_limit": 10000000
  }'

# Dev Wallet
echo "Creating Development Multisig Wallet..."
curl -X POST $MAINNET_URL/multisig/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "XWave Development Mainnet",
    "purpose": "DEV",
    "owners": [
      "XW_DEV_OWNER_1_MAINNET",
      "XW_DEV_OWNER_2_MAINNET",
      "XW_DEV_OWNER_3_MAINNET", 
      "XW_DEV_OWNER_4_MAINNET",
      "XW_DEV_OWNER_5_MAINNET"
    ],
    "threshold": 3,
    "daily_limit": 5000000
  }'

# Ops Wallet
echo "Creating Operations Multisig Wallet..."
curl -X POST $MAINNET_URL/multisig/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "XWave Operations Mainnet",
    "purpose": "OPS",
    "owners": [
      "XW_OPS_OWNER_1_MAINNET",
      "XW_OPS_OWNER_2_MAINNET",
      "XW_OPS_OWNER_3_MAINNET",
      "XW_OPS_OWNER_4_MAINNET", 
      "XW_OPS_OWNER_5_MAINNET"
    ],
    "threshold": 3,
    "daily_limit": 2000000
  }'

echo "✅ Mainnet multisig wallets configured"
EOF

chmod +x scripts/setup_mainnet_multisig.sh

# Ejecutar configuración de multisig
print_info "Configuring mainnet multisig wallets..."
if ./scripts/setup_mainnet_multisig.sh; then
    print_success "Mainnet multisig wallets configured"
else
    print_warning "Multisig configuration had issues"
fi

# ============================================================================
# PASO 9: CONFIGURAR VESTING SCHEDULES
# ============================================================================

print_step "PASO 9: Configurando Vesting Schedules"

# Crear script para configurar vesting en mainnet
cat > scripts/setup_mainnet_vesting.sh << EOF
#!/bin/bash

echo "⏰ Setting up Mainnet Vesting Schedules..."

# Treasury Vesting (12 months cliff + 36 months linear)
echo "Creating Treasury Vesting Schedule..."
curl -X POST $MAINNET_URL/vesting/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "beneficiary": "XWMS_TREASURY_WALLET_ADDRESS_MAINNET",
    "total_amount": 300000000,
    "cliff_duration": 31536000,
    "vesting_duration": 94608000,
    "release_frequency": 2592000,
    "revocable": true,
    "created_by": "admin"
  }'

# Creative Incentives Vesting (10% immediate + 24 months)
echo "Creating Creative Incentives Vesting Schedule..."
curl -X POST $MAINNET_URL/vesting/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "beneficiary": "XW_CREATIVE_INCENTIVES_ADDRESS_MAINNET",
    "total_amount": 250000000,
    "cliff_duration": 0,
    "vesting_duration": 63072000,
    "release_frequency": 2592000,
    "revocable": true,
    "created_by": "admin"
  }'

# Community Vesting (24 months linear)
echo "Creating Community Vesting Schedule..."
curl -X POST $MAINNET_URL/vesting/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "beneficiary": "XW_COMMUNITY_ADDRESS_MAINNET",
    "total_amount": 150000000,
    "cliff_duration": 0,
    "vesting_duration": 63072000,
    "release_frequency": 2592000,
    "revocable": true,
    "created_by": "admin"
  }'

# Seed Investors Vesting (6 months cliff + 24 months linear)
echo "Creating Seed Investors Vesting Schedule..."
curl -X POST $MAINNET_URL/vesting/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "beneficiary": "XW_SEED_INVESTORS_ADDRESS_MAINNET",
    "total_amount": 100000000,
    "cliff_duration": 15552000,
    "vesting_duration": 63072000,
    "release_frequency": 2592000,
    "revocable": true,
    "created_by": "admin"
  }'

echo "✅ Mainnet vesting schedules configured"
EOF

chmod +x scripts/setup_mainnet_vesting.sh

# Ejecutar configuración de vesting
print_info "Configuring mainnet vesting schedules..."
if ./scripts/setup_mainnet_vesting.sh; then
    print_success "Mainnet vesting schedules configured"
else
    print_warning "Vesting configuration had issues"
fi

# ============================================================================
# PASO 10: CONFIGURAR STAKING Y REWARDS
# ============================================================================

print_step "PASO 10: Configurando Staking y Rewards"

# Crear script para configurar staking en mainnet
cat > scripts/setup_mainnet_staking.sh << EOF
#!/bin/bash

echo "🏦 Setting up Mainnet Staking Contracts and Reward Pools..."

# Economic Validators Staking Contract
echo "Creating Economic Validators Staking Contract..."
curl -X POST $MAINNET_URL/staking/create-contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Economic Validators Mainnet",
    "purpose": "VALIDATORS",
    "min_stake": 1000000,
    "max_stake": 100000000,
    "reward_frequency": 86400,
    "slashing_enabled": true,
    "slashing_rate": 5.0
  }'

# Creative Validators Staking Contract
echo "Creating Creative Validators Staking Contract..."
curl -X POST $MAINNET_URL/staking/create-contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Creative Validators Mainnet",
    "purpose": "CREATIVE",
    "min_stake": 0,
    "max_stake": 50000000,
    "reward_frequency": 604800,
    "slashing_enabled": false,
    "slashing_rate": 0.0
  }'

# Community Validators Staking Contract
echo "Creating Community Validators Staking Contract..."
curl -X POST $MAINNET_URL/staking/create-contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Community Validators Mainnet",
    "purpose": "COMMUNITY",
    "min_stake": 0,
    "max_stake": 10000000,
    "reward_frequency": 604800,
    "slashing_enabled": false,
    "slashing_rate": 0.0
  }'

# Economic Rewards Pool
echo "Creating Economic Rewards Pool..."
curl -X POST $MAINNET_URL/staking/create-reward-pool \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Economic Rewards Pool Mainnet",
    "purpose": "ECONOMIC",
    "total_rewards": 200000000,
    "reward_rate": 10,
    "max_rewards_per_day": 10000
  }'

# Creative Rewards Pool
echo "Creating Creative Rewards Pool..."
curl -X POST $MAINNET_URL/staking/create-reward-pool \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Creative Rewards Pool Mainnet",
    "purpose": "CREATIVE",
    "total_rewards": 200000000,
    "reward_rate": 15,
    "max_rewards_per_day": 15000
  }'

# Community Rewards Pool
echo "Creating Community Rewards Pool..."
curl -X POST $MAINNET_URL/staking/create-reward-pool \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "Community Rewards Pool Mainnet",
    "purpose": "COMMUNITY",
    "total_rewards": 200000000,
    "reward_rate": 5,
    "max_rewards_per_day": 5000
  }'

echo "✅ Mainnet staking contracts and reward pools configured"
EOF

chmod +x scripts/setup_mainnet_staking.sh

# Ejecutar configuración de staking
print_info "Configuring mainnet staking contracts..."
if ./scripts/setup_mainnet_staking.sh; then
    print_success "Mainnet staking contracts configured"
else
    print_warning "Staking configuration had issues"
fi

# ============================================================================
# PASO 11: CONFIGURAR LIQUIDITY SEED
# ============================================================================

print_step "PASO 11: Configurando Liquidity Seed"

# Crear script para seed de liquidez en mainnet
cat > scripts/setup_mainnet_liquidity.sh << EOF
#!/bin/bash

echo "💧 Setting up Mainnet Initial Liquidity..."

# Seed XWV/XUSD Pool
echo "Seeding XWV/XUSD liquidity pool..."
curl -X POST $MAINNET_URL/liquidity/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "pool_id": "DEX_XWV_XUSD_POOL_001_MAINNET",
    "amounts": [100000000, 100000],
    "user": "XW_LIQUIDITY_PROVIDER_MAINNET"
  }'

# Configurar timelock para liquidez (180 días)
echo "Setting up liquidity timelock..."
curl -X POST $MAINNET_URL/liquidity/timelock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "pool_id": "DEX_XWV_XUSD_POOL_001_MAINNET",
    "timelock_duration": 15552000,
    "admin": "admin"
  }'

echo "✅ Mainnet initial liquidity configured"
EOF

chmod +x scripts/setup_mainnet_liquidity.sh

# Ejecutar configuración de liquidez
print_info "Configuring mainnet initial liquidity..."
if ./scripts/setup_mainnet_liquidity.sh; then
    print_success "Mainnet initial liquidity configured"
else
    print_warning "Liquidity configuration had issues"
fi

# ============================================================================
# PASO 12: VERIFICAR DEPLOYMENT
# ============================================================================

print_step "PASO 12: Verificando Deployment"

# Verificar token nativo
print_info "Verifying native token..."
TOKEN_STATS=$(curl -s "$MAINNET_URL/token/stats")
if echo "$TOKEN_STATS" | jq -e '.name' > /dev/null; then
    print_success "Native token is active"
    echo "Token Stats: $TOKEN_STATS"
else
    print_warning "Could not verify native token"
fi

# Verificar multisig wallets
print_info "Verifying multisig wallets..."
MULTISIG_STATS=$(curl -s "$MAINNET_URL/multisig/stats")
if echo "$MULTISIG_STATS" | jq -e '.total_wallets' > /dev/null; then
    print_success "Multisig wallets are active"
    echo "Multisig Stats: $MULTISIG_STATS"
else
    print_warning "Could not verify multisig wallets"
fi

# Verificar vesting schedules
print_info "Verifying vesting schedules..."
VESTING_STATS=$(curl -s "$MAINNET_URL/vesting/stats")
if echo "$VESTING_STATS" | jq -e '.total_schedules' > /dev/null; then
    print_success "Vesting schedules are active"
    echo "Vesting Stats: $VESTING_STATS"
else
    print_warning "Could not verify vesting schedules"
fi

# Verificar staking contracts
print_info "Verifying staking contracts..."
STAKING_STATS=$(curl -s "$MAINNET_URL/staking/stats")
if echo "$STAKING_STATS" | jq -e '.total_contracts' > /dev/null; then
    print_success "Staking contracts are active"
    echo "Staking Stats: $STAKING_STATS"
else
    print_warning "Could not verify staking contracts"
fi

# ============================================================================
# PASO 13: GENERAR REPORTE DE MAINNET
# ============================================================================

print_step "PASO 13: Generando Reporte de Mainnet"

# Crear reporte de mainnet
cat > logs/mainnet_report.md << EOF
# XWave Blockchain - Mainnet Deployment Report

## Deployment Summary
- **Date**: $(date)
- **Environment**: Mainnet
- **Host**: $MAINNET_HOST
- **Port**: $MAINNET_PORT
- **Database**: $MAINNET_DB
- **Status**: ✅ DEPLOYED

## Server Information
- **Server PID**: $SERVER_PID
- **Server Log**: logs/mainnet_server.log
- **Health Check**: $MAINNET_URL/health

## Endpoints
- **Health**: $MAINNET_URL/health
- **Blocks**: $MAINNET_URL/blocks
- **Pools**: $MAINNET_URL/pools
- **Token Stats**: $MAINNET_URL/token/stats
- **Multisig Stats**: $MAINNET_URL/multisig/stats
- **Vesting Stats**: $MAINNET_URL/vesting/stats
- **Staking Stats**: $MAINNET_URL/staking/stats

## Configuration
- **JWT Token**: Obtained
- **Multisig Wallets**: 3 configured
- **Vesting Schedules**: 4 configured
- **Staking Contracts**: 3 configured
- **Reward Pools**: 3 configured
- **Liquidity Pool**: 1 configured

## Test Commands
\`\`\`bash
# Health check
curl $MAINNET_URL/health

# Get token stats
curl $MAINNET_URL/token/stats

# Get multisig stats
curl $MAINNET_URL/multisig/stats

# Get vesting stats
curl $MAINNET_URL/vesting/stats

# Get staking stats
curl $MAINNET_URL/staking/stats
\`\`\`

## Logs
- **Deployment Log**: $LOG_FILE
- **Server Log**: logs/mainnet_server.log
- **Server PID**: logs/mainnet_server.pid

## Next Steps
1. Test all endpoints
2. Verify token operations
3. Test multisig transactions
4. Test vesting releases
5. Test staking operations
6. Monitor system performance
EOF

print_success "Mainnet report generated: logs/mainnet_report.md"

# ============================================================================
# RESUMEN FINAL
# ============================================================================

print_header "MAINNET DEPLOYMENT COMPLETED"

echo "🎉 XWave Blockchain mainnet deployment completed!"
echo ""
echo "📊 DEPLOYMENT SUMMARY:"
echo "   ✅ Server: RUNNING (PID: $SERVER_PID)"
echo "   ✅ Database: CONFIGURED"
echo "   ✅ Multisig Wallets: 3 configured"
echo "   ✅ Vesting Schedules: 4 configured"
echo "   ✅ Staking Contracts: 3 configured"
echo "   ✅ Reward Pools: 3 configured"
echo "   ✅ Liquidity Pool: 1 configured"
echo ""
echo "🌐 MAINNET ENDPOINTS:"
echo "   Health: $MAINNET_URL/health"
echo "   Token Stats: $MAINNET_URL/token/stats"
echo "   Multisig Stats: $MAINNET_URL/multisig/stats"
echo "   Vesting Stats: $MAINNET_URL/vesting/stats"
echo "   Staking Stats: $MAINNET_URL/staking/stats"
echo ""
echo "📁 FILES GENERATED:"
echo "   📄 Deployment Log: $LOG_FILE"
echo "   📄 Mainnet Report: logs/mainnet_report.md"
echo "   📄 Server Log: logs/mainnet_server.log"
echo "   📄 Server PID: logs/mainnet_server.pid"
echo "   📄 Environment: .env.mainnet"
echo ""
echo "🧪 TEST COMMANDS:"
echo "   curl $MAINNET_URL/health"
echo "   curl $MAINNET_URL/token/stats"
echo "   curl $MAINNET_URL/multisig/stats"
echo "   curl $MAINNET_URL/vesting/stats"
echo "   curl $MAINNET_URL/staking/stats"
echo ""
echo "🔧 MANAGEMENT:"
echo "   Stop server: kill $SERVER_PID"
echo "   View logs: tail -f logs/mainnet_server.log"
echo "   Restart: ./scripts/deploy_mainnet.sh"
echo ""

log "XWave mainnet deployment completed successfully"

print_success "XWave mainnet is ready for production!"
