#!/bin/bash

# 🎵 Quick Test Script - Upload Endpoint
# Uso: ./QUICK_TEST_UPLOAD.sh [path/to/test.mp3]

set -e

BACKEND_URL="http://localhost:8083"
UPLOAD_ENDPOINT="$BACKEND_URL/api/v1/upload/content"

echo "🧪 Testing Upload Endpoint..."
echo "================================"

# Check if backend is running
if ! curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo "❌ Backend no está corriendo en $BACKEND_URL"
    echo "   Inicia el backend con: cd xwave-backend && cargo run --bin xwavve-backend"
    exit 1
fi

echo "✅ Backend está corriendo"

# Check if file is provided
if [ -z "$1" ]; then
    echo "📝 Uso: $0 [path/to/test.mp3]"
    echo ""
    echo "Ejemplo:"
    echo "  $0 /path/to/mysong.mp3"
    exit 1
fi

TEST_FILE="$1"

if [ ! -f "$TEST_FILE" ]; then
    echo "❌ Archivo no encontrado: $TEST_FILE"
    exit 1
fi

echo "📁 Archivo: $TEST_FILE"
echo "📊 Tamaño: $(ls -lh "$TEST_FILE" | awk '{print $5}')"

# Create uploads directory if it doesn't exist
UPLOAD_DIR="./xwave-backend/uploads/audio"
mkdir -p "$UPLOAD_DIR"

echo ""
echo "📤 Subiendo archivo..."

# Upload file
RESPONSE=$(curl -X POST "$UPLOAD_ENDPOINT" \
  -F "title=Test Song $(date +%s)" \
  -F "artist=Test Artist" \
  -F "description=Test upload from script" \
  -F "genre=Electronic" \
  -F "type=audio" \
  -F "price=0.00" \
  -F "file=@$TEST_FILE" \
  2>&1)

echo "📥 Respuesta del servidor:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# Check if upload was successful
if echo "$RESPONSE" | grep -q "success.*true"; then
    echo ""
    echo "✅ Upload exitoso!"
    
    # Extract content_id
    CONTENT_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('content_id', 'N/A'))" 2>/dev/null || echo "N/A")
    echo "🆔 Content ID: $CONTENT_ID"
    
    # Check if file exists in uploads directory
    if [ -d "$UPLOAD_DIR" ]; then
        echo ""
        echo "📂 Archivos en uploads/audio/:"
        ls -lh "$UPLOAD_DIR" | tail -5
    fi
else
    echo ""
    echo "❌ Upload falló"
    echo "Revisa los logs del backend para más detalles"
    exit 1
fi

echo ""
echo "✨ Test completado!"

