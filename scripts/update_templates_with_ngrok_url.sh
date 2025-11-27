#!/bin/bash

# Script para actualizar templates con URL de ngrok
# Uso: ./scripts/update_templates_with_ngrok_url.sh https://xxxx.ngrok.io

if [ -z "$1" ]; then
    echo "❌ Error: Proporciona la URL de ngrok"
    echo ""
    echo "Uso: $0 https://xxxx.ngrok.io"
    echo ""
    echo "O lee la URL desde ngrok_url.txt:"
    echo "  $0 \$(cat ngrok_url.txt)"
    exit 1
fi

NGROK_URL=$1

echo "🔄 Actualizando templates con URL de ngrok..."
echo "URL: $NGROK_URL"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

UPDATED=0

# Actualizar TEMPLATES/invitation_whatsapp.txt
if [ -f "TEMPLATES/invitation_whatsapp.txt" ]; then
    sed -i.bak "s|http://localhost:8083|$NGROK_URL|g" TEMPLATES/invitation_whatsapp.txt
    echo -e "${GREEN}✅ TEMPLATES/invitation_whatsapp.txt actualizado${NC}"
    UPDATED=$((UPDATED + 1))
fi

# Actualizar QUICK_START_ARTIST.md
if [ -f "QUICK_START_ARTIST.md" ]; then
    sed -i.bak "s|http://localhost:8083|$NGROK_URL|g" QUICK_START_ARTIST.md
    echo -e "${GREEN}✅ QUICK_START_ARTIST.md actualizado${NC}"
    UPDATED=$((UPDATED + 1))
fi

# Actualizar ONBOARDING_ACTION_PLAN.md
if [ -f "ONBOARDING_ACTION_PLAN.md" ]; then
    sed -i.bak "s|http://localhost:8083|$NGROK_URL|g" ONBOARDING_ACTION_PLAN.md
    echo -e "${GREEN}✅ ONBOARDING_ACTION_PLAN.md actualizado${NC}"
    UPDATED=$((UPDATED + 1))
fi

# Actualizar ONBOARDING_ARTISTS.md
if [ -f "ONBOARDING_ARTISTS.md" ]; then
    sed -i.bak "s|http://localhost:8083|$NGROK_URL|g" ONBOARDING_ARTISTS.md
    echo -e "${GREEN}✅ ONBOARDING_ARTISTS.md actualizado${NC}"
    UPDATED=$((UPDATED + 1))
fi

# Actualizar ARTIST_TROUBLESHOOTING.md
if [ -f "ARTIST_TROUBLESHOOTING.md" ]; then
    sed -i.bak "s|http://localhost:8083|$NGROK_URL|g" ARTIST_TROUBLESHOOTING.md
    echo -e "${GREEN}✅ ARTIST_TROUBLESHOOTING.md actualizado${NC}"
    UPDATED=$((UPDATED + 1))
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ $UPDATED archivo(s) actualizado(s)${NC}"
echo ""
echo -e "${YELLOW}⚠️  Nota: Se crearon backups (.bak) de los archivos originales${NC}"
echo "   Puedes restaurarlos si es necesario"
echo ""
echo "URL de ngrok guardada en: ngrok_url.txt"
echo "$NGROK_URL" > ngrok_url.txt

