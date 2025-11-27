#!/bin/bash

# ============================================================================
# ANÁLISIS EXHAUSTIVO DEL SISTEMA XWAVE
# ============================================================================
# Este script analiza TODO el sistema para identificar problemas de raíz

set -e

echo "🔍 ANÁLISIS EXHAUSTIVO DEL SISTEMA XWAVE"
echo "========================================"
echo ""

# Cargar variables de entorno
if [ -f ".env.beta" ]; then
    export $(grep -v "^#" .env.beta | xargs)
fi

DATABASE_URL="${DATABASE_URL:-postgresql://yare@localhost:5432/xwave_blockchain}"

echo "📊 1. ESTADO DE LA BASE DE DATOS"
echo "--------------------------------"
echo ""

# Verificar conexión
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ ERROR: No se puede conectar a la base de datos"
    echo "   DATABASE_URL: $DATABASE_URL"
    exit 1
fi

echo "✅ Conexión a base de datos: OK"
echo ""

# Verificar tabla users
echo "📋 Estructura de la tabla 'users':"
psql "$DATABASE_URL" -c "\d users" 2>&1 | head -20
echo ""

# Verificar columnas esperadas vs existentes
echo "📋 Columnas esperadas vs existentes:"
EXPECTED_COLUMNS=("user_id" "email" "username" "password_hash" "wallet_address" "user_type" "free_tokens_claimed" "created_at" "updated_at")
EXISTING_COLUMNS=$(psql "$DATABASE_URL" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;" 2>&1 | tr -d ' ')

echo "Columnas esperadas: ${EXPECTED_COLUMNS[*]}"
echo "Columnas existentes: $EXISTING_COLUMNS"
echo ""

# Verificar qué columnas faltan
MISSING_COLUMNS=()
for col in "${EXPECTED_COLUMNS[@]}"; do
    if ! echo "$EXISTING_COLUMNS" | grep -q "$col"; then
        MISSING_COLUMNS+=("$col")
        echo "❌ FALTA: $col"
    else
        echo "✅ EXISTE: $col"
    fi
done
echo ""

# Verificar migraciones
echo "📋 2. ESTADO DE LAS MIGRACIONES"
echo "--------------------------------"
echo ""

MIGRATIONS_DIR="xwave-backend/migrations"
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ ERROR: Directorio de migraciones no encontrado: $MIGRATIONS_DIR"
    exit 1
fi

echo "Migraciones disponibles:"
ls -1 "$MIGRATIONS_DIR"/*.sql | wc -l | xargs echo "   Total:"
echo ""

# Verificar si existe tabla de migraciones
if psql "$DATABASE_URL" -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations';" > /dev/null 2>&1; then
    echo "✅ Tabla schema_migrations existe"
    echo "Migraciones aplicadas:"
    psql "$DATABASE_URL" -c "SELECT version FROM schema_migrations ORDER BY version;" 2>&1
else
    echo "❌ Tabla schema_migrations NO existe"
    echo "   Las migraciones no se están rastreando"
fi
echo ""

# Verificar tablas esperadas
echo "📋 3. TABLAS ESPERADAS VS EXISTENTES"
echo "------------------------------------"
echo ""

EXPECTED_TABLES=("users" "blocks" "transactions" "balances" "content" "user_daily_usage" "blockchain_validators" "audit_logs")
EXISTING_TABLES=$(psql "$DATABASE_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>&1 | tr -d ' ')

echo "Tablas esperadas: ${EXPECTED_TABLES[*]}"
echo ""

for table in "${EXPECTED_TABLES[@]}"; do
    if echo "$EXISTING_TABLES" | grep -q "^${table}$"; then
        echo "✅ EXISTE: $table"
    else
        echo "❌ FALTA: $table"
    fi
done
echo ""

# Verificar código que usa user_type
echo "📋 4. CÓDIGO QUE USA user_type"
echo "-------------------------------"
echo ""

echo "Archivos que referencian user_type:"
grep -r "user_type" xwave-backend/src --include="*.rs" | wc -l | xargs echo "   Total referencias:"
echo ""

# Resumen
echo "📊 RESUMEN DEL ANÁLISIS"
echo "======================="
echo ""

if [ ${#MISSING_COLUMNS[@]} -eq 0 ]; then
    echo "✅ Todas las columnas esperadas existen"
else
    echo "❌ Columnas faltantes: ${MISSING_COLUMNS[*]}"
    echo ""
    echo "💡 SOLUCIÓN: Ejecutar migraciones pendientes"
    echo "   ./scripts/aplicar-migraciones.sh"
fi

echo ""
echo "✅ Análisis completado"

