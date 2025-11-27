#!/bin/bash
# ✅ Script de Setup de Redis para Desarrollo Local
# Configura Redis para testing y desarrollo

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 ==========================================${NC}"
echo -e "${BLUE}🔧 SETUP DE REDIS PARA DESARROLLO${NC}"
echo -e "${BLUE}🔧 ==========================================${NC}"
echo ""

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo -e "${YELLOW}⚠️  Redis no está instalado${NC}"
    echo ""
    echo "Instalación:"
    echo "  macOS:   brew install redis"
    echo "  Ubuntu:  sudo apt-get install redis-server"
    echo "  Docker:  docker run -d -p 6379:6379 redis:latest"
    echo ""
    exit 1
fi

# Check if Redis is running
if redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✅ Redis ya está corriendo${NC}"
else
    echo -e "${YELLOW}⚠️  Redis no está corriendo, iniciando...${NC}"
    
    # Try to start Redis
    if command -v brew &> /dev/null; then
        # macOS with Homebrew
        brew services start redis
    elif command -v systemctl &> /dev/null; then
        # Linux with systemd
        sudo systemctl start redis
    else
        # Manual start
        redis-server --daemonize yes
    fi
    
    # Wait for Redis to start
    sleep 2
    
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✅ Redis iniciado exitosamente${NC}"
    else
        echo -e "${RED}❌ Error al iniciar Redis${NC}"
        exit 1
    fi
fi

# Test connection
echo ""
echo -e "${BLUE}📋 Verificando conexión...${NC}"
if redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}✅ Conexión exitosa${NC}"
else
    echo -e "${RED}❌ Error de conexión${NC}"
    exit 1
fi

# Get Redis info
echo ""
echo -e "${BLUE}📊 Información de Redis:${NC}"
redis-cli INFO server | grep -E "redis_version|redis_mode|os"
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human"

# Setup test keys cleanup (optional)
echo ""
echo -e "${BLUE}🧹 Limpiando keys de test anteriores...${NC}"
redis-cli --scan --pattern "test:*" | xargs -r redis-cli DEL 2>/dev/null || true
redis-cli --scan --pattern "rate_limit:*" | xargs -r redis-cli DEL 2>/dev/null || true
echo -e "${GREEN}✅ Limpieza completada${NC}"

# Set recommended configuration
echo ""
echo -e "${BLUE}⚙️  Configurando Redis para desarrollo...${NC}"

# Set maxmemory (optional, for development)
# redis-cli CONFIG SET maxmemory 256mb
# redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Enable persistence (optional)
# redis-cli CONFIG SET save "900 1 300 10 60 10000"

echo -e "${GREEN}✅ Configuración completada${NC}"

# Display connection info
echo ""
echo -e "${BLUE}📋 Información de Conexión:${NC}"
echo "  Host:     localhost"
echo "  Port:     6379"
echo "  URL:      redis://127.0.0.1:6379"
echo ""
echo -e "${GREEN}✅ Redis está listo para usar${NC}"
echo ""
echo "Para verificar:"
echo "  redis-cli ping"
echo ""
echo "Para monitorear:"
echo "  redis-cli monitor"
echo ""

