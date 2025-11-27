#!/bin/bash

# Script para iniciar el servidor backend y ngrok juntos
# Útil para desarrollo y onboarding

echo "🚀 Iniciando XWave Backend + ngrok"
echo "==================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar que ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ ngrok no está instalado${NC}"
    echo ""
    echo "Instalación:"
    echo "1. macOS: brew install ngrok/ngrok/ngrok"
    echo "2. O descarga desde: https://ngrok.com/download"
    echo ""
    echo "Después de instalar, ejecuta: ngrok config add-authtoken TU_TOKEN"
    exit 1
fi

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo procesos..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
        echo "✅ Servidor detenido"
    fi
    if [ ! -z "$NGROK_PID" ]; then
        kill $NGROK_PID 2>/dev/null
        echo "✅ ngrok detenido"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# Iniciar servidor backend
echo "1️⃣ Iniciando servidor backend..."
cd xwave-backend

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Iniciar servidor en segundo plano
cargo run --release --bin xwavve-backend > ../server.log 2>&1 &
SERVER_PID=$!
cd ..

echo "✅ Servidor iniciado (PID: $SERVER_PID)"
echo "   Logs: server.log"
echo ""

# Esperar a que el servidor esté listo
echo "⏳ Esperando a que el servidor esté listo..."
for i in {1..30}; do
    if curl -s http://localhost:8083/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Servidor backend está corriendo en localhost:8083${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ El servidor no respondió después de 30 segundos${NC}"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

echo ""

# Iniciar ngrok
echo "2️⃣ Iniciando ngrok..."
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "   - ngrok generará una URL pública (ej: https://xxxx.ngrok.io)"
echo "   - Esta URL cambiará cada vez que reinicies ngrok"
echo "   - Copia la URL y actualiza los templates con ella"
echo ""
echo "Presiona Ctrl+C para detener todo"
echo ""

# Iniciar ngrok en segundo plano y capturar la URL
ngrok http 8083 > ngrok.log 2>&1 &
NGROK_PID=$!

# Esperar a que ngrok esté listo
sleep 3

# Intentar obtener la URL de ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$NGROK_URL" ]; then
    echo -e "${GREEN}✅ ngrok iniciado${NC}"
    echo ""
    echo "=========================================="
    echo -e "${GREEN}🌐 URL PÚBLICA:${NC}"
    echo -e "${GREEN}   $NGROK_URL${NC}"
    echo "=========================================="
    echo ""
    echo "📋 Próximos pasos:"
    echo "1. Copia esta URL: $NGROK_URL"
    echo "2. Actualiza los templates con esta URL"
    echo "3. Comparte esta URL con los artistas testers"
    echo ""
    echo "📊 Dashboard ngrok: http://localhost:4040"
    echo ""
    echo "Presiona Ctrl+C para detener todo"
    echo ""
    
    # Guardar URL en archivo
    echo "$NGROK_URL" > ngrok_url.txt
    echo "URL guardada en: ngrok_url.txt"
else
    echo -e "${YELLOW}⚠️  No se pudo obtener la URL de ngrok automáticamente${NC}"
    echo "   Revisa el dashboard: http://localhost:4040"
    echo "   O revisa ngrok.log"
fi

# Mantener el script corriendo
wait

