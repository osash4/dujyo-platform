#!/bin/bash

# Script para iniciar el servidor y ejecutar el test MVP
# Uso: ./scripts/start_server_and_test.sh

set -e

echo "🚀 XWave - Iniciar Servidor y Ejecutar Test MVP"
echo "================================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "xwave-backend/Cargo.toml" ]; then
    echo -e "${RED}❌ Error: No se encontró xwave-backend/Cargo.toml${NC}"
    echo "   Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
fi

# Verificar que PostgreSQL esté corriendo
echo -e "${YELLOW}📊 Verificando PostgreSQL...${NC}"
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL no está corriendo${NC}"
    echo "   Inicia PostgreSQL antes de continuar"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL está corriendo${NC}"
echo ""

# Verificar variables de entorno
echo -e "${YELLOW}📋 Verificando variables de entorno...${NC}"
if [ -z "$JWT_SECRET" ]; then
    echo -e "${YELLOW}⚠️  JWT_SECRET no está configurado${NC}"
    echo "   Configurando JWT_SECRET temporal..."
    export JWT_SECRET="xwave_mvp_test_secret_key_2024_minimum_32_chars"
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL no está configurado${NC}"
    echo "   Configurando DATABASE_URL por defecto..."
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/xwave"
fi

echo -e "${GREEN}✅ Variables de entorno configuradas${NC}"
echo ""

# Compilar el proyecto
echo -e "${YELLOW}🔨 Compilando proyecto...${NC}"
cd xwave-backend
cargo build --release 2>&1 | grep -E "(Finished|error|warning)" | head -5
echo -e "${GREEN}✅ Compilación completada${NC}"
echo ""

# Iniciar servidor en background
echo -e "${YELLOW}🌐 Iniciando servidor backend...${NC}"
echo "   URL: http://localhost:8083"
echo ""

# Ejecutar servidor en background y capturar PID
cargo run --release --bin xwavve-backend > ../server.log 2>&1 &
SERVER_PID=$!

echo -e "${GREEN}✅ Servidor iniciado (PID: $SERVER_PID)${NC}"
echo ""

# Esperar a que el servidor esté listo
echo -e "${YELLOW}⏳ Esperando a que el servidor esté listo...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:8083/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Servidor está listo!${NC}"
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    echo "   Intento $ATTEMPT/$MAX_ATTEMPTS..."
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ El servidor no respondió después de $MAX_ATTEMPTS intentos${NC}"
    echo "   Revisa los logs en server.log"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo ""

# Ejecutar test MVP
echo -e "${YELLOW}🧪 Ejecutando test MVP flow...${NC}"
echo ""

cd ..
cargo run --bin test-mvp-flow --manifest-path xwave-backend/Cargo.toml

TEST_EXIT_CODE=$?

echo ""
echo "================================================"

# Detener servidor
echo -e "${YELLOW}🛑 Deteniendo servidor...${NC}"
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
echo -e "${GREEN}✅ Servidor detenido${NC}"

# Mostrar resultado
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ¡Todos los tests pasaron!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Algunos tests fallaron${NC}"
    echo "   Revisa la salida anterior para más detalles"
    exit $TEST_EXIT_CODE
fi

