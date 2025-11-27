#!/bin/bash

# XWave Local Development Services Startup Script
# This script starts all services without Docker for local development

set -e

echo "🚀 Starting XWave Services Locally (No Docker Required)"
echo "=========================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo -e "${YELLOW}[INFO] Killing process on port $port...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Check if PostgreSQL is running
echo -e "${YELLOW}[INFO] Checking PostgreSQL...${NC}"
if ! psql -h localhost -U $USER -d xwave_blockchain -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${RED}[WARNING] PostgreSQL is not running or database doesn't exist${NC}"
    echo -e "${YELLOW}[INFO] Creating database...${NC}"
    createdb xwave_blockchain 2>/dev/null || true
    
    # Run migrations
    cd xwave-backend
    ./scripts/setup_database.sh || true
    cd ..
fi
echo -e "${GREEN}[SUCCESS] PostgreSQL is ready${NC}"

# Kill any existing processes
echo -e "${YELLOW}[INFO] Cleaning up existing processes...${NC}"
kill_port 8083 # Backend
kill_port 8080 # Blockchain node
kill_port 5173 # Frontend (Vite default)
kill_port 3000 # Frontend (alternative)
kill_port 8081 # WebSocket

# Create logs directory
mkdir -p logs

# Start Backend
echo -e "${YELLOW}[INFO] Starting Backend on port 8083...${NC}"
cd xwave-backend
cargo run --release --bin xwavve-backend > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid
cd ..
echo -e "${GREEN}[SUCCESS] Backend started (PID: $BACKEND_PID)${NC}"

# Wait for backend to be ready
echo -e "${YELLOW}[INFO] Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8083/health >/dev/null 2>&1; then
        echo -e "${GREEN}[SUCCESS] Backend is ready!${NC}"
        break
    fi
    sleep 1
done

# Start Blockchain Node
echo -e "${YELLOW}[INFO] Starting Blockchain Node on port 8080...${NC}"
cd blockchain
npm run dev > ../logs/blockchain.log 2>&1 &
BLOCKCHAIN_PID=$!
echo $BLOCKCHAIN_PID > ../logs/blockchain.pid
cd ..
echo -e "${GREEN}[SUCCESS] Blockchain Node started (PID: $BLOCKCHAIN_PID)${NC}"

# Wait for blockchain to be ready
echo -e "${YELLOW}[INFO] Waiting for blockchain node to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8080/health >/dev/null 2>&1; then
        echo -e "${GREEN}[SUCCESS] Blockchain Node is ready!${NC}"
        break
    fi
    sleep 1
done

# Start Frontend
echo -e "${YELLOW}[INFO] Starting Frontend on port 3000...${NC}"
cd xwave-frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid
cd ..
echo -e "${GREEN}[SUCCESS] Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait for frontend to be ready
echo -e "${YELLOW}[INFO] Waiting for frontend to be ready...${NC}"
for i in {1..60}; do
    if curl -s http://localhost:5173 >/dev/null 2>&1 || curl -s http://localhost:5174 >/dev/null 2>&1; then
        FRONTEND_PORT=$(lsof -ti:5173 >/dev/null 2>&1 && echo "5173" || echo "5174")
        echo -e "${GREEN}[SUCCESS] Frontend is ready on port $FRONTEND_PORT!${NC}"
        break
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}=========================================================="
echo "🎉 XWave Services Started Successfully!"
echo "==========================================================${NC}"
echo ""
echo "📊 Service URLs:"
FRONTEND_PORT=$(lsof -ti:5173 >/dev/null 2>&1 && echo "5173" || lsof -ti:5174 >/dev/null 2>&1 && echo "5174" || echo "5173")
echo "  - Frontend:        http://localhost:$FRONTEND_PORT"
echo "  - Backend API:     http://localhost:8083"
echo "  - Blockchain Node: http://localhost:8080"
echo "  - WebSocket:       ws://localhost:8083/ws"
echo ""
echo "📝 Process IDs:"
echo "  - Backend:    $BACKEND_PID"
echo "  - Blockchain: $BLOCKCHAIN_PID"
echo "  - Frontend:   $FRONTEND_PID"
echo ""
echo "📋 Logs:"
echo "  - Backend:    logs/backend.log"
echo "  - Blockchain: logs/blockchain.log"
echo "  - Frontend:   logs/frontend.log"
echo ""
echo "🛑 To stop all services, run: ./stop_services.sh"
echo ""
