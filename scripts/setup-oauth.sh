#!/bin/bash

# ✅ Script de Configuración de OAuth para XWave
# Este script te guía para configurar Google y Apple OAuth

set -e

echo "🔐 Configuración de OAuth para XWave"
echo "====================================="
echo ""

FRONTEND_ENV="xwave-frontend/.env"

# Verificar si .env existe
if [ ! -f "$FRONTEND_ENV" ]; then
    echo "📝 Creando archivo .env..."
    touch "$FRONTEND_ENV"
    echo "# OAuth Configuration" >> "$FRONTEND_ENV"
    echo "" >> "$FRONTEND_ENV"
fi

echo "📋 PASO 1: Google OAuth"
echo "----------------------"
echo ""
echo "1. Ve a: https://console.cloud.google.com/"
echo "2. Crea un proyecto o selecciona uno existente"
echo "3. Ve a 'APIs & Services' > 'Credentials'"
echo "4. Click en 'Create Credentials' > 'OAuth client ID'"
echo "5. Application type: 'Web application'"
echo "6. Authorized redirect URIs:"
echo "   - http://localhost:5173"
echo "   - http://localhost:5173/callback/google"
echo "7. Copia el 'Client ID'"
echo ""
read -p "Pega tu Google Client ID aquí (o presiona Enter para saltar): " GOOGLE_CLIENT_ID

if [ -n "$GOOGLE_CLIENT_ID" ]; then
    # Agregar o actualizar VITE_GOOGLE_CLIENT_ID
    if grep -q "VITE_GOOGLE_CLIENT_ID" "$FRONTEND_ENV"; then
        sed -i.bak "s|VITE_GOOGLE_CLIENT_ID=.*|VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID|" "$FRONTEND_ENV"
    else
        echo "VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" >> "$FRONTEND_ENV"
    fi
    echo "✅ Google Client ID configurado"
else
    echo "⚠️  Google OAuth no configurado (se puede agregar después)"
fi

echo ""

echo ""
echo "✅ Configuración completada"
echo ""
echo "📝 Variables configuradas en: $FRONTEND_ENV"
echo ""
echo "⚠️  IMPORTANTE: Reinicia el servidor de desarrollo para que los cambios surtan efecto:"
echo "   cd xwave-frontend && npm run dev"
echo ""

