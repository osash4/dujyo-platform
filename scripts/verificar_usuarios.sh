#!/bin/bash
# ✅ Verificar Usuarios Existentes en la Base de Datos

set -e

echo "🔍 VERIFICAR USUARIOS EXISTENTES"
echo "================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar si hay archivo de credenciales
if [ -f "/tmp/dujyo_test_credentials.txt" ]; then
    echo -e "${GREEN}✅ Credenciales de prueba encontradas:${NC}"
    cat /tmp/dujyo_test_credentials.txt
    echo ""
    echo "Para usar estas credenciales:"
    echo "  source /tmp/dujyo_test_credentials.txt"
    echo "  export TEST_EMAIL=\$EMAIL"
    echo "  export TEST_PASSWORD=\$PASSWORD"
    echo ""
fi

echo "💡 OPCIONES:"
echo ""
echo "1️⃣  Crear nuevo usuario de prueba:"
echo "   ./scripts/crear_usuario_test.sh"
echo ""
echo "2️⃣  Verificar usuarios en la base de datos:"
echo "   psql -h localhost -U yare -d dujyo_blockchain -c \"SELECT email, username FROM users LIMIT 10;\""
echo ""
echo "3️⃣  Si tienes acceso a la base de datos, puedes ver todos los usuarios:"
echo "   psql -h localhost -U yare -d dujyo_blockchain -c \"SELECT id, email, username, created_at FROM users ORDER BY created_at DESC LIMIT 20;\""
echo ""

