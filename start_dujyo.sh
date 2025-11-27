#!/bin/bash

# Dujyo Project Startup Script
set -e

echo "🚀 LEVANTANDO PROYECTO DUJYO"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Start PostgreSQL
echo -e "${BLUE}[1/3]${NC} Iniciando PostgreSQL..."
cd "$(dirname "$0")"
docker-compose up -d postgres
sleep 3
echo -e "${GREEN}✅${NC} PostgreSQL iniciado"
echo ""

# 2. Start Backend
echo -e "${BLUE}[2/3]${NC} Iniciando Backend (Rust)..."
cd dujyo-backend
if [ -f ../backend.pid ]; then
    OLD_PID=$(cat ../backend.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️${NC} Backend ya está corriendo (PID: $OLD_PID)"
    else
        rm ../backend.pid
    fi
fi

if [ ! -f ../backend.pid ]; then
    nohup cargo run --release > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    echo -e "${GREEN}✅${NC} Backend iniciado (PID: $BACKEND_PID)"
    echo "   Log: tail -f ../backend.log"
fi
cd ..
echo ""

# 3. Start Frontend
echo -e "${BLUE}[3/3]${NC} Iniciando Frontend (React/Vite)..."
cd dujyo-frontend
if [ -f ../frontend.pid ]; then
    OLD_PID=$(cat ../frontend.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️${NC} Frontend ya está corriendo (PID: $OLD_PID)"
    else
        rm ../frontend.pid
    fi
fi

if [ ! -f ../frontend.pid ]; then
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    echo -e "${GREEN}✅${NC} Frontend iniciado (PID: $FRONTEND_PID)"
    echo "   Log: tail -f ../frontend.log"
fi
cd ..
echo ""

# Wait a bit for services to start
echo "⏳ Esperando a que los servicios estén listos..."
sleep 8

# Check status
echo ""
echo "📊 ESTADO DE SERVICIOS:"
echo "======================"
echo ""

# PostgreSQL
if docker-compose ps postgres 2>/dev/null | grep -q "Up"; then
    echo -e "${GREEN}✅${NC} PostgreSQL: Corriendo"
else
    echo -e "${YELLOW}⚠️${NC} PostgreSQL: Verificando..."
fi

# Backend
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        if curl -s http://localhost:8083/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅${NC} Backend: Corriendo (http://localhost:8083)"
        else
            echo -e "${YELLOW}⏳${NC} Backend: Iniciando... (espera unos segundos)"
        fi
    else
        echo -e "${YELLOW}⚠️${NC} Backend: Proceso no encontrado"
    fi
else
    echo -e "${YELLOW}⚠️${NC} Backend: No iniciado"
fi

# Frontend
if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            echo -e "${GREEN}✅${NC} Frontend: Corriendo (http://localhost:5173)"
        else
            echo -e "${YELLOW}⏳${NC} Frontend: Iniciando... (espera unos segundos)"
        fi
    else
        echo -e "${YELLOW}⚠️${NC} Frontend: Proceso no encontrado"
    fi
else
    echo -e "${YELLOW}⚠️${NC} Frontend: No iniciado"
fi

echo ""
echo "🌐 URLs:"
echo "========"
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8083"
echo ""
echo "📋 COMANDOS ÚTILES:"
echo "==================="
echo "Ver logs backend:  tail -f backend.log"
echo "Ver logs frontend: tail -f frontend.log"
echo "Detener servicios: ./stop_dujyo.sh"
echo ""
echo -e "${GREEN}🎉 Proyecto DUJYO levantado!${NC}"
echo ""

