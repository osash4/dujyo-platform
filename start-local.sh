#!/bin/bash
echo "🚀 Starting DUJYO Platform in Local Development Mode"
echo ""

# Check if backend is already running
if lsof -i :8083 > /dev/null 2>&1; then
    echo "⚠️  Backend is already running on port 8083"
else
    echo "📦 Starting backend..."
    cd dujyo-backend
    cargo run &
    BACKEND_PID=$!
    echo "✅ Backend started (PID: $BACKEND_PID)"
    echo "   Waiting for backend to be ready..."
    sleep 5
    
    # Check if backend is responding
    if curl -s http://localhost:8083/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
    else
        echo "⚠️  Backend may still be starting. Check logs if needed."
    fi
    cd ..
fi

# Check if frontend is already running
if lsof -i :5173 > /dev/null 2>&1; then
    echo "⚠️  Frontend is already running on port 5173"
else
    echo "🎨 Starting frontend..."
    cd dujyo-frontend
    npm run dev &
    FRONTEND_PID=$!
    echo "✅ Frontend started (PID: $FRONTEND_PID)"
    cd ..
fi

echo ""
echo "✅ Development servers are running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8083"
echo ""
echo "Press Ctrl+C to stop all servers"
wait
