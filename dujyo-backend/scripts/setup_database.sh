#!/bin/bash

# XWave Database Setup Script
# Purpose: Create database and user for XWave if they don't exist

set -e

echo "🔧 Setting up XWave database..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "❌ PostgreSQL is not running"
    echo ""
    echo "💡 Start PostgreSQL:"
    echo "   macOS (Homebrew): brew services start postgresql@14"
    echo "   Docker: docker-compose up -d postgres"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Detect PostgreSQL user (try postgres database first, then current user)
PG_USER=""
if psql -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    PG_USER="postgres"
    PG_DB="postgres"
elif psql -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    # Default connection to postgres database
    PG_USER=$(psql -d postgres -tAc "SELECT current_user;")
    PG_DB="postgres"
    echo "ℹ️  Using default user: $PG_USER"
elif psql -U $(whoami) -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    PG_USER=$(whoami)
    PG_DB="postgres"
    echo "ℹ️  Using current user: $PG_USER"
else
    echo "❌ Cannot connect to PostgreSQL"
    echo "💡 Try: psql -d postgres -c 'SELECT 1;'"
    exit 1
fi

# Create database if it doesn't exist
echo "📊 Creating database 'xwave' if it doesn't exist..."
psql -U "$PG_USER" -d "$PG_DB" -tc "SELECT 1 FROM pg_database WHERE datname = 'xwave'" | grep -q 1 || psql -U "$PG_USER" -d "$PG_DB" -c "CREATE DATABASE xwave;"
echo "✅ Database 'xwave' ready"

# Create user if it doesn't exist
echo "👤 Creating user 'xwave' if it doesn't exist..."
psql -U "$PG_USER" -d "$PG_DB" -tc "SELECT 1 FROM pg_user WHERE usename = 'xwave'" | grep -q 1 || psql -U "$PG_USER" -d "$PG_DB" -c "CREATE USER xwave WITH PASSWORD 'xwave_password';"
echo "✅ User 'xwave' ready"

# Grant privileges
echo "🔐 Granting privileges..."
psql -U "$PG_USER" -d "$PG_DB" -c "GRANT ALL PRIVILEGES ON DATABASE xwave TO xwave;"
echo "✅ Privileges granted"

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📊 Connection details:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: xwave"
echo "   User: xwave"
echo "   Password: xwave_password"
echo ""
echo "🚀 You can now run: ./apply_seed_data.sh"
