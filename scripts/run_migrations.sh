#!/bin/bash

# Run all critical migrations for MVP launch
# Usage: ./scripts/run_migrations.sh

set -e

DB_USER="${DB_USER:-dujyo_user}"
DB_NAME="${DB_NAME:-dujyo_db}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "📦 Running DUJYO MVP Migrations..."
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql not found. Please install PostgreSQL client.${NC}"
    exit 1
fi

# Test database connection
echo -n "Testing database connection... "
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Failed to connect${NC}"
    echo "   Please check:"
    echo "   - Database is running"
    echo "   - Credentials are correct"
    echo "   - Environment variables: DB_USER, DB_NAME, DB_HOST, DB_PORT"
    exit 1
fi

# Run migrations
MIGRATIONS=(
    "024_content_marketplace.sql"
    "025_tips_system.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    migration_path="dujyo-backend/migrations/$migration"
    if [ -f "$migration_path" ]; then
        echo -n "Running $migration... "
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_path" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Success${NC}"
        else
            echo -e "${YELLOW}⚠️  Warning (may already exist)${NC}"
        fi
    else
        echo -e "${RED}❌ Migration not found: $migration_path${NC}"
    fi
done

# Verify tables
echo ""
echo "Verifying tables..."
TABLES=(
    "content_listings"
    "content_purchases"
    "content_licenses"
    "tips"
    "artist_tip_stats"
    "user_tip_stats"
    "s2e_monthly_pools"
)

for table in "${TABLES[@]}"; do
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\d $table" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ $table${NC}"
    else
        echo -e "  ${RED}❌ $table (missing)${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ Migrations complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Populate beta users: psql -U $DB_USER -d $DB_NAME -f scripts/populate_beta_users.sql"
echo "  2. Verify S2E pool: psql -U $DB_USER -d $DB_NAME -c \"SELECT * FROM s2e_monthly_pools;\""

