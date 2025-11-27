#!/bin/bash
# ✅ Crear Usuario de Prueba para Testing

set -e

BASE_URL="${BASE_URL:-http://localhost:8083}"

echo "👤 CREAR USUARIO DE PRUEBA"
echo "=========================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Generar datos aleatorios para el usuario
RANDOM_EMAIL="test_$(date +%s)@test.com"
RANDOM_PASSWORD="Test123456!"
RANDOM_USERNAME="testuser_$(date +%s)"

echo "📝 Creando usuario de prueba..."
echo "   Email: $RANDOM_EMAIL"
echo "   Password: $RANDOM_PASSWORD"
echo "   Username: $RANDOM_USERNAME"
echo ""

# Crear usuario
RESPONSE=$(curl -s -X POST "$BASE_URL/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$RANDOM_EMAIL\",
        \"password\": \"$RANDOM_PASSWORD\",
        \"username\": \"$RANDOM_USERNAME\"
    }")

echo "🔍 Respuesta del servidor:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Verificar si fue exitoso
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false' 2>/dev/null)

if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Usuario creado exitosamente${NC}"
    echo ""
    echo "📋 CREDENCIALES:"
    echo "   Email: $RANDOM_EMAIL"
    echo "   Password: $RANDOM_PASSWORD"
    echo ""
    echo "💾 Guardando en archivo..."
    echo "EMAIL=$RANDOM_EMAIL" > /tmp/dujyo_test_credentials.txt
    echo "PASSWORD=$RANDOM_PASSWORD" >> /tmp/dujyo_test_credentials.txt
    echo "USERNAME=$RANDOM_USERNAME" >> /tmp/dujyo_test_credentials.txt
    echo -e "${GREEN}✅ Credenciales guardadas en /tmp/dujyo_test_credentials.txt${NC}"
    echo ""
    echo "🚀 Ahora puedes usar estas credenciales para los tests:"
    echo "   export TEST_EMAIL=$RANDOM_EMAIL"
    echo "   export TEST_PASSWORD=$RANDOM_PASSWORD"
else
    echo -e "${RED}❌ Error al crear usuario${NC}"
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message // "Unknown error"' 2>/dev/null)
    echo "   Mensaje: $MESSAGE"
    exit 1
fi

