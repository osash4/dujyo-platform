#!/bin/bash

# XWave Seed Data Application Script
# Purpose: Apply seed data for testing with artists

set -e

echo "🌱 Applying seed data for XWave testing..."

# Get database connection from environment or use defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-xwave}"
DB_USER="${DB_USER:-xwave}"  # ✅ Default to 'xwave' (XWave database user)
DB_PASSWORD="${DB_PASSWORD:-xwave_password}"

# Check if running in Docker
if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "postgres"; then
    echo "🐳 Detected Docker PostgreSQL container"
    echo "📊 Using Docker exec to apply seed data..."
    
    # Find postgres container
    POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i postgres | head -1)
    
    if [ -z "$POSTGRES_CONTAINER" ]; then
        echo "❌ PostgreSQL container not found"
        exit 1
    fi
    
    echo "📦 Container: $POSTGRES_CONTAINER"
    
    # Copy SQL file to container and execute
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    docker cp "$SCRIPT_DIR/seed_test_data.sql" "$POSTGRES_CONTAINER:/tmp/seed_test_data.sql"
    docker exec -i "$POSTGRES_CONTAINER" psql -U xwave -d xwave -f /tmp/seed_test_data.sql
    
    echo "✅ Seed data applied via Docker!"
else
    # Direct connection (local PostgreSQL)
    echo "📊 Connecting to local PostgreSQL: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
    
    # Construct database URL
    if [ -z "$DB_PASSWORD" ]; then
        # No password (trust authentication)
        DB_URL="postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    else
        DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    fi
    
    # Get script directory
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    
    # Try to connect and apply seed data
    if psql "${DB_URL}" -f "$SCRIPT_DIR/seed_test_data.sql" 2>/dev/null; then
        echo "✅ Seed data applied successfully!"
    else
        echo "⚠️  Direct connection failed. Trying with default postgres user..."
        # Try with postgres user (most common default)
        if psql -U postgres -d xwave -f "$SCRIPT_DIR/seed_test_data.sql" 2>/dev/null; then
            echo "✅ Seed data applied with postgres user!"
        else
            echo "❌ Failed to connect to PostgreSQL"
            echo ""
            echo "💡 Options:"
            echo "  1. Start PostgreSQL with Docker: docker-compose up -d postgres"
            echo "  2. Create user 'xwave': createuser -U postgres xwave"
            echo "  3. Set environment variables: DB_USER=postgres DB_PASSWORD=your_password"
            exit 1
        fi
    fi
fi

echo "✅ Seed data applied successfully!"
echo ""
echo "📊 Summary:"
echo "  - 3 artist verifications"
echo "  - 3 artist balances"
echo "  - 8 content items"
echo "  - 9 stream logs"
echo "  - 8 royalty payments"
echo "  - 5 external royalty reports"
echo ""
echo "🎵 Test artists ready:"
echo "  - XW2912A395F2F37BF3980E09296A139227764DECED (Test Artist 1)"
echo "  - XW2222222222222222222222222222222222222222 (Test Artist 2)"
echo "  - XW3333333333333333333333333333333333333333 (Test Artist 3)"

