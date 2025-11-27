#!/bin/bash

# Script para iniciar ngrok y exponer el servidor XWave
# Puerto: 8083

echo "🌐 Iniciando ngrok para XWave..."
echo "=================================="
echo ""

# Verificar que ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok no está instalado"
    echo ""
    echo "Instalación:"
    echo "1. macOS: brew install ngrok/ngrok/ngrok"
    echo "2. O descarga desde: https://ngrok.com/download"
    echo ""
    echo "Después de instalar, ejecuta: ngrok config add-authtoken TU_TOKEN"
    exit 1
fi

# Verificar que el servidor está corriendo
if ! curl -s http://localhost:8083/health > /dev/null 2>&1; then
    echo "⚠️  El servidor backend NO está corriendo en localhost:8083"
    echo ""
    echo "Iniciando servidor en segundo plano..."
    cd xwave-backend
    cargo run --release --bin xwavve-backend > ../server.log 2>&1 &
    SERVER_PID=$!
    echo "Servidor iniciado (PID: $SERVER_PID)"
    echo "Esperando 5 segundos para que el servidor inicie..."
    sleep 5
    cd ..
fi

# Verificar que el servidor responde
if ! curl -s http://localhost:8083/health > /dev/null 2>&1; then
    echo "❌ El servidor no responde. Por favor, inicia el servidor manualmente:"
    echo "   cd xwave-backend && cargo run --bin xwavve-backend"
    exit 1
fi

echo "✅ Servidor backend está corriendo en localhost:8083"
echo ""

# Iniciar ngrok
echo "🚀 Iniciando ngrok en puerto 8083..."
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - ngrok generará una URL pública (ej: https://xxxx.ngrok.io)"
echo "   - Esta URL cambiará cada vez que reinicies ngrok (a menos que uses plan pago)"
echo "   - Copia la URL y actualiza los templates con ella"
echo ""
echo "Presiona Ctrl+C para detener ngrok"
echo ""

# Iniciar ngrok y mostrar la URL
ngrok http 8083

