#!/bin/bash

# Script para actualizar archivos .env con los nuevos nombres de Dujyo
# Ejecuta este script para actualizar todas las referencias de XWave a Dujyo

set -e

echo "🔄 Actualizando archivos .env con nuevos nombres de Dujyo..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Lista de archivos .env a actualizar
ENV_FILES=(
    ".env"
    ".env.beta"
    "dujyo-backend/.env"
    "dujyo-backend/.env.testnet"
    "dujyo-frontend/.env"
)

# Función para actualizar un archivo .env
update_env_file() {
    local file=$1
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⚠️  Archivo no encontrado: $file${NC}"
        return
    fi
    
    echo -e "${GREEN}📝 Actualizando: $file${NC}"
    
    # Crear backup
    cp "$file" "${file}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Actualizar referencias
    sed -i '' \
        -e 's/xwave/dujyo/g' \
        -e 's/XWave/Dujyo/g' \
        -e 's/XWAVE/DUJYO/g' \
        -e 's/xwave_password/dujyo_password/g' \
        -e 's/noreply@xwave\.com/noreply@dujyo.com/g' \
        "$file"
    
    echo -e "${GREEN}✅ Actualizado: $file${NC}"
}

# Actualizar cada archivo
for env_file in "${ENV_FILES[@]}"; do
    update_env_file "$env_file"
done

echo ""
echo -e "${GREEN}✅ Actualización completada!${NC}"
echo ""
echo "📋 Archivos actualizados:"
for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        echo "  - $env_file"
    fi
done
echo ""
echo "💾 Se crearon backups de los archivos originales (.backup.*)"
echo ""
echo "⚠️  IMPORTANTE: Revisa los archivos .env actualizados antes de usarlos en producción"
echo "   Algunos valores pueden necesitar ajuste manual."

