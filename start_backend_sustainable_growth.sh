#!/bin/bash

# Script para iniciar el backend con el modelo Sustainable Growth

echo "🚀 Iniciando XWAVE Backend con modelo Sustainable Growth..."
echo ""

# Ir al directorio del backend
cd "$(dirname "$0")/xwave-backend" || exit 1

# Detener cualquier proceso anterior en el puerto 8083
echo "🔍 Verificando puerto 8083..."
PID=$(lsof -ti:8083 2>/dev/null)
if [ -n "$PID" ]; then
    echo "⏸️  Deteniendo backend antiguo (PID: $PID)..."
    kill "$PID" 2>/dev/null
    sleep 2
    echo "✅ Backend antiguo detenido"
fi

# Iniciar el backend nuevo
echo ""
echo "▶️  Iniciando backend nuevo..."
echo "📁 Directorio: $(pwd)"
echo ""

cargo run --bin xwavve-backend

# El backend se mantendrá corriendo aquí

