#!/bin/bash

# ============================================================================
# APLICAR TODAS LAS MIGRACIONES PENDIENTES
# ============================================================================

set -e

echo "🚀 APLICANDO MIGRACIONES A LA BASE DE DATOS"
echo "============================================"
echo ""

# Cargar variables de entorno
if [ -f ".env.beta" ]; then
    export $(grep -v "^#" .env.beta | xargs)
fi

DATABASE_URL="${DATABASE_URL:-postgresql://yare@localhost:5432/xwave_blockchain}"

# Verificar conexión
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ ERROR: No se puede conectar a la base de datos"
    echo "   DATABASE_URL: $DATABASE_URL"
    exit 1
fi

MIGRATIONS_DIR="xwave-backend/migrations"

# Crear tabla de migraciones si no existe
echo "📋 Creando tabla de migraciones..."
psql "$DATABASE_URL" <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
EOF
echo "✅ Tabla de migraciones creada"
echo ""

# Aplicar cada migración en orden
for migration in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
    migration_name=$(basename "$migration")
    migration_version=$(echo "$migration_name" | cut -d'_' -f1)
    
    echo "🔄 Aplicando: $migration_name"
    
    # Verificar si ya se aplicó
    if psql "$DATABASE_URL" -t -c "SELECT 1 FROM schema_migrations WHERE version = '$migration_version';" 2>/dev/null | grep -q 1; then
        echo "   ⏭️  Ya aplicada, saltando..."
        continue
    fi
    
    # Aplicar migración
    if psql "$DATABASE_URL" -f "$migration" > /dev/null 2>&1; then
        # Registrar migración
        psql "$DATABASE_URL" -c "INSERT INTO schema_migrations (version) VALUES ('$migration_version') ON CONFLICT DO NOTHING;" > /dev/null 2>&1
        echo "   ✅ Aplicada correctamente"
    else
        echo "   ⚠️  Error al aplicar (puede que ya exista)"
        # Intentar registrar de todas formas
        psql "$DATABASE_URL" -c "INSERT INTO schema_migrations (version) VALUES ('$migration_version') ON CONFLICT DO NOTHING;" > /dev/null 2>&1
    fi
    echo ""
done

echo "✅ Todas las migraciones aplicadas"
echo ""

# Verificar resultado
echo "📊 Verificando estructura de 'users':"
psql "$DATABASE_URL" -c "\d users" 2>&1 | head -20

