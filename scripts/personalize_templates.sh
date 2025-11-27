#!/bin/bash

# Script para personalizar templates de onboarding
# Ejecuta este script para reemplazar automáticamente los placeholders

echo "🎨 Personalización de Templates - XWave Onboarding"
echo "=================================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Solicitar información
echo "Por favor, proporciona la siguiente información:"
echo ""

read -p "Tu nombre completo: " TU_NOMBRE
read -p "Tu email: " TU_EMAIL
read -p "Tu número de WhatsApp/Telegram (con código de país): " TU_NUMERO
read -p "URL del sistema (default: http://localhost:8083): " SYSTEM_URL
SYSTEM_URL=${SYSTEM_URL:-http://localhost:8083}

read -p "Link de feedback (Google Forms o Telegram): " FEEDBACK_LINK

echo ""
echo "Personalizando templates..."
echo ""

# Personalizar invitation_whatsapp.txt
if [ -f "TEMPLATES/invitation_whatsapp.txt" ]; then
    sed -i.bak "s|\[NOMBRE\]|{NOMBRE}|g" TEMPLATES/invitation_whatsapp.txt
    sed -i.bak "s|http://localhost:8083|$SYSTEM_URL|g" TEMPLATES/invitation_whatsapp.txt
    echo -e "${GREEN}✅ TEMPLATES/invitation_whatsapp.txt personalizado${NC}"
    echo "   (Nota: Reemplaza {NOMBRE} manualmente con el nombre de cada artista)"
fi

# Personalizar invitation_email.md
if [ -f "TEMPLATES/invitation_email.md" ]; then
    sed -i.bak "s|\[TU_NOMBRE\]|$TU_NOMBRE|g" TEMPLATES/invitation_email.md
    sed -i.bak "s|\[TU_EMAIL\]|$TU_EMAIL|g" TEMPLATES/invitation_email.md
    sed -i.bak "s|\[TU_NUMERO\]|$TU_NUMERO|g" TEMPLATES/invitation_email.md
    echo -e "${GREEN}✅ TEMPLATES/invitation_email.md personalizado${NC}"
fi

# Crear archivo de configuración
cat > TEMPLATES/config.txt << EOF
# Configuración de Onboarding - XWave
# Generado automáticamente el $(date)

TU_NOMBRE=$TU_NOMBRE
TU_EMAIL=$TU_EMAIL
TU_NUMERO=$TU_NUMERO
SYSTEM_URL=$SYSTEM_URL
FEEDBACK_LINK=$FEEDBACK_LINK

# Instrucciones:
# 1. Usa estos valores al personalizar mensajes para cada artista
# 2. Reemplaza {NOMBRE} con el nombre de cada artista en invitation_whatsapp.txt
# 3. Usa el FEEDBACK_LINK en todos los mensajes de feedback
EOF

echo -e "${GREEN}✅ Archivo de configuración creado: TEMPLATES/config.txt${NC}"
echo ""

echo "=================================================="
echo -e "${GREEN}✅ Personalización completada!${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Revisa los templates en TEMPLATES/"
echo "2. Reemplaza {NOMBRE} con el nombre de cada artista"
echo "3. Usa el FEEDBACK_LINK en los mensajes de feedback"
echo ""
echo "Configuración guardada en: TEMPLATES/config.txt"

