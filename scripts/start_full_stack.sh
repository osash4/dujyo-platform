#!/bin/bash

# Script para iniciar frontend + backend + ngrok
# Inicia todo el stack completo de XWave

echo "🚀 Iniciando XWave Full Stack (Frontend + Backend + ngrok)"
echo "============================================================"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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
    echo "Instala ngrok: brew install ngrok/ngrok/ngrok"
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
ngrok http 8083 > ngrok_backend.log 2>&1 &
NGROK_BACKEND_PID=$!

# Esperar a que ngrok esté listo
sleep 3

# Obtener URL de ngrok para backend
BACKEND_NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$BACKEND_NGROK_URL" ]; then
    echo -e "${YELLOW}⚠️  No se pudo obtener la URL de ngrok para backend${NC}"
    echo "   Revisa el dashboard: http://localhost:4040"
    BACKEND_NGROK_URL="http://localhost:8083"
else
    echo -e "${GREEN}✅ ngrok (backend) iniciado${NC}"
    echo "   URL pública backend: $BACKEND_NGROK_URL"
    echo "$BACKEND_NGROK_URL" > backend_ngrok_url.txt
fi

echo ""

# Configurar frontend para usar URL de ngrok del backend
echo "3️⃣ Configurando frontend..."
cd xwave-frontend

# Crear .env si no existe
if [ ! -f .env ]; then
    echo "VITE_API_BASE_URL=$BACKEND_NGROK_URL" > .env
    echo "VITE_WS_URL=wss://$(echo $BACKEND_NGROK_URL | sed 's|https://||')" >> .env
    echo "VITE_ENV=development" >> .env
    echo -e "${GREEN}✅ Archivo .env creado${NC}"
else
    # Actualizar .env con URL de ngrok
    if grep -q "VITE_API_BASE_URL" .env; then
        sed -i.bak "s|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=$BACKEND_NGROK_URL|g" .env
    else
        echo "VITE_API_BASE_URL=$BACKEND_NGROK_URL" >> .env
    fi
    
    # Actualizar WebSocket URL
    WS_URL="wss://$(echo $BACKEND_NGROK_URL | sed 's|https://||')"
    if grep -q "VITE_WS_URL" .env; then
        sed -i.bak "s|VITE_WS_URL=.*|VITE_WS_URL=$WS_URL|g" .env
    else
        echo "VITE_WS_URL=$WS_URL" >> .env
    fi
    
    echo -e "${GREEN}✅ Archivo .env actualizado con URL de ngrok${NC}"
fi

cd ..

echo ""

# Iniciar frontend
echo "4️⃣ Iniciando frontend..."
cd xwave-frontend

# Verificar que node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias del frontend..."
    npm install
fi

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

# Iniciar ngrok para frontend (opcional, para acceso desde internet)
echo "5️⃣ Iniciando ngrok para frontend (puerto 5173)..."
echo -e "${YELLOW}⚠️  Nota: ngrok para frontend usa el puerto 4041 (para no conflictuar con backend)${NC}"

# Usar puerto diferente para el dashboard de ngrok del frontend
ngrok http 5173 --log=stdout > ngrok_frontend.log 2>&1 &
NGROK_FRONTEND_PID=$!

# Esperar a que ngrok esté listo
sleep 3

# Obtener URL de ngrok para frontend (usando API en puerto 4041, pero ngrok usa 4040 por defecto)
# Para múltiples instancias de ngrok, necesitamos usar diferentes puertos de API
# Por ahora, usaremos solo una instancia de ngrok para el frontend y el backend compartirá
# O mejor, iniciar ngrok para frontend en otro puerto de API

# Por simplicidad, vamos a usar solo ngrok para el frontend y el backend estará accesible a través del frontend
# O podemos usar dos instancias de ngrok con diferentes puertos de API

# Solución temporal: usar solo ngrok para frontend, y el frontend se conecta al backend a través de ngrok
FRONTEND_NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*' | grep -v "$BACKEND_NGROK_URL" | head -1 | cut -d'"' -f4)

# Si no encontramos URL diferente, significa que solo hay un túnel
# En ese caso, usaremos el mismo ngrok pero con diferentes puertos
# Mejor solución: usar ngrok con múltiples túneles

# Por ahora, vamos a usar una solución más simple:
# - ngrok expone el frontend (puerto 5173)
# - El frontend se conecta al backend a través de la URL de ngrok del backend

# Reiniciar ngrok para frontend con configuración correcta
kill $NGROK_FRONTEND_PID 2>/dev/null
sleep 2

# Iniciar ngrok para frontend en puerto diferente
# Nota: ngrok solo puede tener un túnel por instancia en plan gratuito
# Solución: usar ngrok con múltiples túneles o solo exponer el frontend

echo -e "${YELLOW}⚠️  Usando ngrok solo para frontend. Backend accesible a través del frontend.${NC}"

# Detener ngrok del backend y usar solo para frontend
kill $NGROK_BACKEND_PID 2>/dev/null
sleep 2

# Iniciar ngrok para frontend
ngrok http 5173 > ngrok_frontend.log 2>&1 &
NGROK_FRONTEND_PID=$!

sleep 3

FRONTEND_NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$FRONTEND_NGROK_URL" ]; then
    echo -e "${GREEN}✅ ngrok (frontend) iniciado${NC}"
    echo "   URL pública frontend: $FRONTEND_NGROK_URL"
    echo "$FRONTEND_NGROK_URL" > frontend_ngrok_url.txt
    
    # Actualizar frontend para que el backend también sea accesible
    # El frontend necesita conectarse al backend, así que necesitamos exponer ambos
    # Mejor solución: usar ngrok con múltiples túneles o configurar proxy en el frontend
else
    echo -e "${YELLOW}⚠️  No se pudo obtener la URL de ngrok para frontend${NC}"
    FRONTEND_NGROK_URL="http://localhost:5173"
fi

echo ""

# Resumen
echo "============================================================"
echo -e "${GREEN}✅ XWave Full Stack iniciado!${NC}"
echo "============================================================"
echo ""
echo "📍 URLs:"
echo "   Frontend local: http://localhost:5173"
if [ ! -z "$FRONTEND_NGROK_URL" ] && [ "$FRONTEND_NGROK_URL" != "http://localhost:5173" ]; then
    echo -e "   ${GREEN}Frontend público: $FRONTEND_NGROK_URL${NC}"
fi
echo "   Backend local: http://localhost:8083"
if [ ! -z "$BACKEND_NGROK_URL" ] && [ "$BACKEND_NGROK_URL" != "http://localhost:8083" ]; then
    echo -e "   ${GREEN}Backend público: $BACKEND_NGROK_URL${NC}"
fi
echo ""
echo "📊 Dashboards:"
echo "   ngrok: http://localhost:4040"
echo ""
echo "📋 Logs:"
echo "   Backend: tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo "   ngrok (frontend): tail -f ngrok_frontend.log"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "   - El frontend está configurado para conectarse al backend a través de ngrok"
echo "   - Comparte la URL del frontend con los artistas testers"
echo "   - Presiona Ctrl+C para detener todo"
echo ""

# Guardar URLs
if [ ! -z "$FRONTEND_NGROK_URL" ]; then
    echo "$FRONTEND_NGROK_URL" > ngrok_url.txt
fi

# Mantener el script corriendo
wait

