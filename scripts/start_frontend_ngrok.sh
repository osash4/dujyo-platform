#!/bin/bash

# Script para iniciar el frontend de XWave con ngrok
# Expone el frontend públicamente para acceso desde internet

echo "🚀 Iniciando XWave Frontend con ngrok"
echo "======================================"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo procesos..."
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "✅ Frontend detenido"
    fi
    if [ ! -z "$NGROK_PID" ]; then
        kill $NGROK_PID 2>/dev/null
        echo "✅ ngrok detenido"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

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

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi

# Verificar que el backend está corriendo (opcional pero recomendado)
echo "🔍 Verificando backend..."
if curl -s http://localhost:8083/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend está corriendo en localhost:8083${NC}"
    BACKEND_RUNNING=true
else
    echo -e "${YELLOW}⚠️  Backend no está corriendo en localhost:8083${NC}"
    echo "   El frontend funcionará, pero las llamadas al API fallarán"
    echo "   Para iniciar el backend, ejecuta: ./scripts/start_server_and_ngrok.sh"
    BACKEND_RUNNING=false
    read -p "¿Deseas continuar de todas formas? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# Configurar frontend
echo "1️⃣ Configurando frontend..."
cd xwave-frontend

# Verificar que node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias del frontend..."
    npm install
fi

# El frontend usará el proxy de Vite para conectarse al backend local
# No necesitamos configurar .env para ngrok del backend si el backend está local
echo -e "${GREEN}✅ Frontend configurado${NC}"
cd ..

echo ""

# Iniciar frontend
echo "2️⃣ Iniciando frontend..."
cd xwave-frontend

# Iniciar frontend en segundo plano
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "✅ Frontend iniciado (PID: $FRONTEND_PID)"
echo "   Logs: frontend.log"
echo ""

# Esperar a que el frontend esté listo
echo "⏳ Esperando a que el frontend esté listo..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend está corriendo en localhost:5173${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  El frontend no respondió después de 30 segundos${NC}"
        echo "   Revisa frontend.log para más detalles"
        break
    fi
    sleep 1
done

echo ""

# Iniciar ngrok para frontend
echo "3️⃣ Iniciando ngrok para frontend (puerto 5173)..."
echo ""

# Verificar si hay una instancia de ngrok corriendo
if pgrep -x "ngrok" > /dev/null; then
    echo -e "${YELLOW}⚠️  Ya hay una instancia de ngrok corriendo${NC}"
    echo "   Deteniendo instancia anterior..."
    pkill ngrok
    sleep 2
fi

# Iniciar ngrok en segundo plano
ngrok http 5173 > ngrok_frontend.log 2>&1 &
NGROK_PID=$!

# Esperar a que ngrok esté listo
echo "⏳ Esperando a que ngrok esté listo..."
sleep 5

# Obtener URL de ngrok para frontend
FRONTEND_NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$FRONTEND_NGROK_URL" ]; then
    echo -e "${GREEN}✅ ngrok iniciado${NC}"
    echo ""
    echo "=========================================="
    echo -e "${GREEN}🌐 URL PÚBLICA DEL FRONTEND:${NC}"
    echo -e "${GREEN}   $FRONTEND_NGROK_URL${NC}"
    echo "=========================================="
    echo ""
    
    # Guardar URL en archivo
    echo "$FRONTEND_NGROK_URL" > frontend_ngrok_url.txt
    echo "URL guardada en: frontend_ngrok_url.txt"
else
    echo -e "${YELLOW}⚠️  No se pudo obtener la URL de ngrok automáticamente${NC}"
    echo "   Revisa el dashboard: http://localhost:4040"
    echo "   O revisa ngrok_frontend.log"
    FRONTEND_NGROK_URL="http://localhost:5173"
fi

echo ""

# Resumen
echo "============================================================"
echo -e "${GREEN}✅ XWave Frontend con ngrok iniciado!${NC}"
echo "============================================================"
echo ""
echo "📍 URLs:"
echo "   Frontend local: http://localhost:5173"
if [ ! -z "$FRONTEND_NGROK_URL" ] && [ "$FRONTEND_NGROK_URL" != "http://localhost:5173" ]; then
    echo -e "   ${GREEN}Frontend público: $FRONTEND_NGROK_URL${NC}"
fi
if [ "$BACKEND_RUNNING" = true ]; then
    echo "   Backend local: http://localhost:8083"
    echo -e "   ${BLUE}El frontend se conecta al backend a través del proxy de Vite${NC}"
else
    echo -e "   ${YELLOW}Backend: No está corriendo${NC}"
fi
echo ""
echo "📊 Dashboards:"
echo "   ngrok: http://localhost:4040"
echo ""
echo "📋 Logs:"
echo "   Frontend: tail -f frontend.log"
echo "   ngrok: tail -f ngrok_frontend.log"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "   - Comparte la URL pública del frontend con los artistas testers"
echo "   - El frontend se conecta al backend localmente (puerto 8083)"
echo "   - Si necesitas exponer también el backend, inicia ngrok para el backend en otra terminal"
echo "   - Presiona Ctrl+C para detener todo"
echo ""

# Mantener el script corriendo
wait

