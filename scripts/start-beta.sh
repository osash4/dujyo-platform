#!/bin/bash

# ✅ Script de Inicio para Beta - XWave
# Inicia el servidor backend con configuración beta

set -e

echo "🚀 Iniciando XWave Beta Server"
echo "=============================="
echo ""

# Configuration
ENV_FILE="${1:-.env.beta}"
BUILD_MODE="${2:-release}"

# Cargar variables de entorno
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Archivo ${ENV_FILE} no encontrado."
    echo "Crea el archivo basado en env.beta.example"
    exit 1
fi

export $(cat "$ENV_FILE" | grep -v '^#' | grep -v '^$' | xargs)

# Determinar binario
cd "$(dirname "$0")/../xwave-backend"

if [ "$BUILD_MODE" = "release" ]; then
    BINARY_PATH="./target/release/xwavve-backend"
else
    BINARY_PATH="./target/debug/xwavve-backend"
fi

if [ ! -f "$BINARY_PATH" ]; then
    echo "❌ Binario no encontrado: ${BINARY_PATH}"
    echo "Ejecuta primero: ./scripts/deploy-beta.sh"
    exit 1
fi

echo "✅ Iniciando servidor..."
echo "   - Environment: ${ENV_FILE}"
echo "   - Binary: ${BINARY_PATH}"
echo "   - Port: ${PORT:-8083}"
echo ""

# Iniciar servidor
exec "$BINARY_PATH"

