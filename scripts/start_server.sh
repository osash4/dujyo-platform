#!/bin/bash
# ✅ Iniciar servidor DUJYO Backend

set -e

# Obtener directorio del script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/dujyo-backend"

# Cambiar al directorio del backend
cd "$BACKEND_DIR"

echo "🚀 Iniciando servidor DUJYO Backend..."
echo "   Directorio: $BACKEND_DIR"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "Cargo.toml" ]; then
    echo "❌ Error: No se encontró Cargo.toml en $BACKEND_DIR"
    echo "Por favor, verifica que el directorio dujyo-backend existe"
    exit 1
fi

# Verificar que cargo está instalado
if ! command -v cargo &> /dev/null; then
    echo "❌ Error: cargo no está instalado"
    exit 1
fi

# Iniciar servidor
echo "📦 Compilando e iniciando servidor..."
echo "   Binario: xwavve-backend"
echo "   Puerto: 8083"
echo ""

cargo run --bin xwavve-backend
