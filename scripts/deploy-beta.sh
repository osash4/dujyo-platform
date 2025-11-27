#!/bin/bash

# ✅ Script de Deployment Beta - XWave
# Prepara y despliega XWave para beta testing con artistas

set -e

echo "🚀 XWAVE BETA DEPLOYMENT"
echo "========================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
ENV_FILE="${1:-.env.beta}"
BUILD_MODE="${2:-release}"

echo -e "${YELLOW}Configuración:${NC}"
echo "  - Environment file: ${ENV_FILE}"
echo "  - Build mode: ${BUILD_MODE}"
echo ""

# Step 1: Verificar dependencias
echo "📦 PASO 1: Verificando dependencias..."
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Cargo no encontrado. Instala Rust primero.${NC}"
    exit 1
fi

if ! command -v sqlx &> /dev/null; then
    echo -e "${YELLOW}⚠️  sqlx-cli no encontrado. Instalando...${NC}"
    cargo install sqlx-cli --no-default-features --features postgres
fi

if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL client no encontrado. Asegúrate de tener PostgreSQL instalado.${NC}"
fi

echo -e "${GREEN}✅ Dependencias verificadas${NC}"
echo ""

# Step 2: Cargar variables de entorno
echo "🔧 PASO 2: Cargando variables de entorno..."
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Archivo ${ENV_FILE} no encontrado.${NC}"
    echo "Crea el archivo .env.beta basado en env.example"
    exit 1
fi

# Cargar variables de entorno de forma segura
export $(cat "$ENV_FILE" | grep -v '^#' | grep -v '^$' | xargs)
echo -e "${GREEN}✅ Variables de entorno cargadas${NC}"
echo ""

# Step 3: Verificar conexiones
echo "🔌 PASO 3: Verificando conexiones..."

# Verificar PostgreSQL
if [ -n "$DATABASE_URL" ]; then
    echo "  Verificando PostgreSQL..."
    if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ PostgreSQL conectado${NC}"
    else
        echo -e "  ${YELLOW}⚠️  No se pudo conectar a PostgreSQL. Verifica DATABASE_URL.${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  DATABASE_URL no configurado${NC}"
fi

# Verificar Redis (opcional)
if [ -n "$REDIS_URL" ]; then
    echo "  Verificando Redis..."
    if command -v redis-cli &> /dev/null; then
        REDIS_HOST=$(echo "$REDIS_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        REDIS_PORT=$(echo "$REDIS_URL" | sed -n 's/.*:\/\/[^:]*:\([^/]*\).*/\1/p')
        if redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" ping > /dev/null 2>&1; then
            echo -e "  ${GREEN}✅ Redis conectado${NC}"
        else
            echo -e "  ${YELLOW}⚠️  Redis no disponible. El sistema funcionará sin rate limiting distribuido.${NC}"
        fi
    else
        echo -e "  ${YELLOW}⚠️  redis-cli no encontrado. No se puede verificar Redis.${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  REDIS_URL no configurado. Rate limiting usará memoria local.${NC}"
fi

echo ""

# Step 4: Ejecutar migraciones
echo "🗄️  PASO 4: Ejecutando migraciones de base de datos..."
cd "$(dirname "$0")/../xwave-backend"

if [ -n "$DATABASE_URL" ]; then
    export DATABASE_URL
    if sqlx migrate run; then
        echo -e "${GREEN}✅ Migraciones ejecutadas${NC}"
    else
        echo -e "${RED}❌ Error ejecutando migraciones${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  DATABASE_URL no configurado. Saltando migraciones.${NC}"
fi

echo ""

# Step 5: Compilar
echo "🔨 PASO 5: Compilando backend..."
if [ "$BUILD_MODE" = "release" ]; then
    echo "  Modo: release (optimizado)"
    if cargo build --release; then
        echo -e "${GREEN}✅ Compilación exitosa${NC}"
        BINARY_PATH="./target/release/xwavve-backend"
    else
        echo -e "${RED}❌ Error en compilación${NC}"
        exit 1
    fi
else
    echo "  Modo: debug (desarrollo)"
    if cargo build; then
        echo -e "${GREEN}✅ Compilación exitosa${NC}"
        BINARY_PATH="./target/debug/xwavve-backend"
    else
        echo -e "${RED}❌ Error en compilación${NC}"
        exit 1
    fi
fi

echo ""

# Step 6: Verificar binario
echo "✅ PASO 6: Verificando binario..."
if [ -f "$BINARY_PATH" ]; then
    echo -e "${GREEN}✅ Binario encontrado: ${BINARY_PATH}${NC}"
    ls -lh "$BINARY_PATH"
else
    echo -e "${RED}❌ Binario no encontrado${NC}"
    exit 1
fi

echo ""

# Step 7: Preparar directorios
echo "📁 PASO 7: Preparando directorios..."
mkdir -p logs
mkdir -p backups
mkdir -p uploads
echo -e "${GREEN}✅ Directorios preparados${NC}"
echo ""

# Step 8: Resumen final
echo "=============================================="
echo "🎯 DEPLOYMENT PREPARADO"
echo "=============================================="
echo ""
echo "Para iniciar el servidor:"
echo ""
echo "  cd xwave-backend"
echo "  export \$(cat ${ENV_FILE} | grep -v '^#' | grep -v '^$' | xargs)"
echo "  ${BINARY_PATH}"
echo ""
echo "O usar el script de inicio:"
echo "  ./scripts/start-beta.sh"
echo ""
echo -e "${GREEN}✅ Deployment beta preparado exitosamente${NC}"
echo ""

