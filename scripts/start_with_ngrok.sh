#!/bin/bash

# Script completo para iniciar XWave con ngrok
# Inicia backend, frontend y expone ambos con ngrok

echo "🚀 Iniciando XWave con ngrok (Backend + Frontend)"
echo "=================================================="
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
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✅ Backend detenido"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "✅ Frontend detenido"
    fi
    if [ ! -z "$NGROK_BACKEND_PID" ]; then
        kill $NGROK_BACKEND_PID 2>/dev/null
        echo "✅ ngrok (backend) detenido"
    fi
    if [ ! -z "$NGROK_FRONTEND_PID" ]; then
        kill $NGROK_FRONTEND_PID 2>/dev/null
        echo "✅ ngrok (frontend) detenido"
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

# Verificar que Rust/Cargo está instalado
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Rust/Cargo no está instalado${NC}"
    exit 1
fi

# Iniciar backend
echo "1️⃣ Iniciando servidor backend..."
cd xwave-backend

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Iniciar servidor backend en segundo plano
cargo run --release --bin xwavve-backend > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "✅ Backend iniciado (PID: $BACKEND_PID)"
echo "   Logs: backend.log"
echo ""

# Esperar a que el servidor backend esté listo
echo "⏳ Esperando a que el backend esté listo..."
for i in {1..30}; do
    if curl -s http://localhost:8083/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend está corriendo en localhost:8083${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ El backend no respondió después de 30 segundos${NC}"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

echo ""

# Iniciar ngrok para backend
echo "2️⃣ Iniciando ngrok para backend (puerto 8083)..."
echo -e "${YELLOW}⚠️  Nota: En plan gratuito de ngrok, solo puedes tener un túnel a la vez${NC}"
echo "   Usaremos ngrok solo para el frontend, y el frontend se conectará al backend local"
echo ""

# Por ahora, no iniciaremos ngrok para el backend
# El frontend usará el proxy de Vite para conectarse al backend local
BACKEND_NGROK_URL=""
NGROK_BACKEND_PID=""

echo -e "${BLUE}ℹ️  Backend accesible localmente en http://localhost:8083${NC}"
echo "   El frontend se conectará al backend a través del proxy de Vite"
echo ""

# Configurar frontend
echo "3️⃣ Configurando frontend..."
cd xwave-frontend

# Verificar que node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias del frontend..."
    npm install
fi

# El frontend usará el proxy de Vite para conectarse al backend local
# No necesitamos configurar .env para ngrok del backend
echo -e "${GREEN}✅ Frontend configurado${NC}"
cd ..

echo ""

# Iniciar frontend
echo "4️⃣ Iniciando frontend..."
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
echo "5️⃣ Iniciando ngrok para frontend (puerto 5173)..."
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
NGROK_FRONTEND_PID=$!

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
echo -e "${GREEN}✅ XWave con ngrok iniciado!${NC}"
echo "============================================================"
echo ""
echo "📍 URLs:"
echo "   Frontend local: http://localhost:5173"
if [ ! -z "$FRONTEND_NGROK_URL" ] && [ "$FRONTEND_NGROK_URL" != "http://localhost:5173" ]; then
    echo -e "   ${GREEN}Frontend público: $FRONTEND_NGROK_URL${NC}"
fi
echo "   Backend local: http://localhost:8083"
echo -e "   ${BLUE}El frontend se conecta al backend a través del proxy de Vite${NC}"
echo ""
echo "📊 Dashboards:"
echo "   ngrok: http://localhost:4040"
echo ""
echo "📋 Logs:"
echo "   Backend: tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo "   ngrok: tail -f ngrok_frontend.log"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "   - Comparte la URL pública del frontend con los artistas testers"
echo "   - El frontend se conecta al backend localmente a través del proxy de Vite"
echo "   - Esto funciona porque Vite actúa como proxy entre el navegador y el backend"
echo "   - Presiona Ctrl+C para detener todo"
echo ""

# Guardar URL principal
if [ ! -z "$FRONTEND_NGROK_URL" ]; then
    echo "$FRONTEND_NGROK_URL" > ngrok_url.txt
fi

# Mantener el script corriendo
wait

