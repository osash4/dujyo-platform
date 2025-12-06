#!/bin/bash
echo "🐛 DUJYO Debugging Session"
echo "=========================="
echo ""

# Kill any existing cargo processes
echo "🧹 Limpiando procesos cargo anteriores..."
pkill -9 -f "cargo run" 2>/dev/null || true
sleep 2

# Start backend
echo "🚀 Iniciando backend..."
cd dujyo-backend
cargo run --bin xwavve-backend &
BACKEND_PID=$!
cd ..
echo "✅ Backend iniciado (PID: $BACKEND_PID)"
echo ""

# Check frontend
if lsof -i :5173 > /dev/null 2>&1; then
    echo "✅ Frontend ya está corriendo en http://localhost:5173"
else
    echo "🎨 Iniciando frontend..."
    cd dujyo-frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    echo "✅ Frontend iniciado (PID: $FRONTEND_PID)"
fi

echo ""
echo "⏳ Esperando a que el backend esté listo..."
for i in {1..30}; do
    if curl -s http://localhost:8083/health > /dev/null 2>&1; then
        echo "✅ Backend está listo!"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

echo ""
echo "✅ Servicios listos para debugging:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8083"
echo ""
echo "Presiona Ctrl+C para detener todos los servicios"
wait
