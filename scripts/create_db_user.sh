#!/bin/bash
# Script para crear usuario y base de datos de Dujyo
# Uso: ./scripts/create_db_user.sh

set -e

DB_USER="yare"
DB_NAME="dujyo_blockchain"
DB_PASSWORD="${DB_PASSWORD:-yare123}"  # Cambiar por una contraseña segura

echo "🔧 Creando usuario y base de datos para Dujyo..."
echo ""

# Intentar conectar como postgres primero
if psql -U postgres -c "SELECT 1;" > /dev/null 2>&1; then
    ADMIN_USER="postgres"
elif psql -U $(whoami) -c "SELECT 1;" > /dev/null 2>&1; then
    ADMIN_USER=$(whoami)
    echo "⚠️  Usando usuario actual ($ADMIN_USER) como administrador"
else
    echo "❌ No se pudo conectar a PostgreSQL"
    echo "   Por favor, asegúrate de que PostgreSQL esté corriendo"
    exit 1
fi

echo "✅ Conectado como: $ADMIN_USER"
echo ""

# Verificar si el usuario ya existe
if psql -U $ADMIN_USER -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    echo "✅ Usuario '$DB_USER' ya existe"
else
    echo "📝 Creando usuario '$DB_USER'..."
    psql -U $ADMIN_USER -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || {
        echo "⚠️  Error al crear usuario. Intentando sin contraseña..."
        psql -U $ADMIN_USER -c "CREATE USER $DB_USER;" || {
            echo "❌ No se pudo crear el usuario"
            exit 1
        }
    }
    echo "✅ Usuario '$DB_USER' creado"
fi

# Dar permisos al usuario
echo "📝 Otorgando permisos al usuario..."
psql -U $ADMIN_USER -c "ALTER USER $DB_USER CREATEDB;" || true
psql -U $ADMIN_USER -c "GRANT ALL PRIVILEGES ON DATABASE postgres TO $DB_USER;" || true

# Verificar si la base de datos ya existe
if psql -U $ADMIN_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "✅ Base de datos '$DB_NAME' ya existe"
else
    echo "📝 Creando base de datos '$DB_NAME'..."
    psql -U $ADMIN_USER -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || {
        echo "❌ No se pudo crear la base de datos"
        exit 1
    }
    echo "✅ Base de datos '$DB_NAME' creada"
fi

# Dar permisos en la base de datos
echo "📝 Otorgando permisos en la base de datos..."
psql -U $ADMIN_USER -d $DB_NAME -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true
psql -U $ADMIN_USER -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" || true

echo ""
echo "✅ ¡Configuración completada!"
echo ""
echo "📋 Resumen:"
echo "   Usuario: $DB_USER"
echo "   Base de datos: $DB_NAME"
if [ -n "$DB_PASSWORD" ]; then
    echo "   Contraseña: $DB_PASSWORD"
    echo ""
    echo "🔗 DATABASE_URL actualizado:"
    echo "   postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME?sslmode=disable"
else
    echo "   Sin contraseña (trust authentication)"
    echo ""
    echo "🔗 DATABASE_URL:"
    echo "   postgresql://$DB_USER@127.0.0.1:5432/$DB_NAME?sslmode=disable"
fi
echo ""
echo "💡 Para actualizar tu .env, ejecuta:"
echo "   echo 'DATABASE_URL=postgresql://$DB_USER${DB_PASSWORD:+:$DB_PASSWORD}@127.0.0.1:5432/$DB_NAME?sslmode=disable' > dujyo-backend/.env"

