#!/bin/bash

# Script de verificación rápida del sistema antes de onboarding
# Ejecutar antes de comenzar el onboarding de artistas

echo "🔍 Verificando sistema XWave antes de onboarding..."
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. Verificar que el servidor está corriendo
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:8083/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Servidor backend está corriendo en http://localhost:8083${NC}"
else
    echo -e "${RED}❌ Servidor backend NO está corriendo${NC}"
    echo "   Ejecuta: cd xwave-backend && cargo run --bin xwavve-backend"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. Verificar que PostgreSQL está corriendo
echo "2️⃣ Verificando base de datos PostgreSQL..."
if psql -U $(whoami) -d xwave_blockchain -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Base de datos PostgreSQL está accesible${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudo verificar PostgreSQL (puede requerir configuración)${NC}"
fi
echo ""

# 3. Verificar que el directorio uploads existe
echo "3️⃣ Verificando directorio de uploads..."
if [ -d "xwave-backend/uploads" ]; then
    echo -e "${GREEN}✅ Directorio ./uploads/ existe${NC}"
    if [ -w "xwave-backend/uploads" ]; then
        echo -e "${GREEN}✅ Directorio ./uploads/ tiene permisos de escritura${NC}"
    else
        echo -e "${RED}❌ Directorio ./uploads/ NO tiene permisos de escritura${NC}"
        echo "   Ejecuta: chmod -R 755 xwave-backend/uploads"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Directorio ./uploads/ no existe (se creará automáticamente)${NC}"
fi
echo ""

# 4. Verificar que el archivo .env existe
echo "4️⃣ Verificando variables de entorno..."
if [ -f "xwave-backend/.env" ]; then
    echo -e "${GREEN}✅ Archivo .env existe${NC}"
    if grep -q "JWT_SECRET" xwave-backend/.env && grep -q "DATABASE_URL" xwave-backend/.env; then
        echo -e "${GREEN}✅ Variables JWT_SECRET y DATABASE_URL están configuradas${NC}"
    else
        echo -e "${RED}❌ Variables JWT_SECRET o DATABASE_URL faltan en .env${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ Archivo .env NO existe${NC}"
    echo "   Crea xwave-backend/.env con JWT_SECRET y DATABASE_URL"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 5. Verificar que el test MVP compila
echo "5️⃣ Verificando que el test MVP compila..."
cd xwave-backend
if cargo check --bin test-mvp-flow > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Test MVP compila correctamente${NC}"
else
    echo -e "${RED}❌ Test MVP NO compila${NC}"
    ERRORS=$((ERRORS + 1))
fi
cd ..
echo ""

# 6. Verificar endpoints críticos
echo "6️⃣ Verificando endpoints críticos..."
if curl -s http://localhost:8083/health > /dev/null 2>&1; then
    # Verificar que el endpoint de registro existe
    if curl -s -X POST http://localhost:8083/register -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test123","username":"test"}' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Endpoint /register está accesible${NC}"
    else
        echo -e "${YELLOW}⚠️  Endpoint /register no responde correctamente${NC}"
    fi
else
    echo -e "${RED}❌ No se pueden verificar endpoints (servidor no está corriendo)${NC}"
fi
echo ""

# Resumen
echo "=================================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Sistema listo para onboarding!${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "1. Identificar 3-5 artistas testers"
    echo "2. Personalizar templates de comunicación"
    echo "3. Configurar sistema de feedback"
    echo "4. Comenzar onboarding"
    echo ""
    echo "Revisa: ONBOARDING_ACTION_PLAN.md para el plan completo"
else
    echo -e "${RED}❌ Se encontraron $ERRORS error(es)${NC}"
    echo ""
    echo "Por favor, corrige los errores antes de comenzar el onboarding."
    echo ""
    exit 1
fi

