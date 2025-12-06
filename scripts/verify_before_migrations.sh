#!/bin/bash

# DUJYO Pre-Migration Verification Script
# Verifies database state before applying migrations
# Usage: ./scripts/verify_before_migrations.sh

set -e

# Configuration
DB_USER="${DB_USER:-dujyo_user}"
DB_NAME="${DB_NAME:-dujyo_db}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 PRE-MIGRATION VERIFICATION"
echo "============================="
echo ""

# 1. Verify database connection
echo "1. Checking database connection..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Database connection OK${NC}"
else
    echo -e "   ${RED}❌ Database connection failed!${NC}"
    exit 1
fi

# 2. List existing tables
echo ""
echo "2. Checking existing tables..."
EXISTING_TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
" -t)

TABLE_COUNT=$(echo "$EXISTING_TABLES" | grep -v '^$' | wc -l | xargs)
echo "   📊 Found $TABLE_COUNT existing tables:"

echo "$EXISTING_TABLES" | while read table; do
    if [ -n "$table" ]; then
        echo "   - $table"
    fi
done

# 3. Check for migration conflicts
echo ""
echo "3. Checking for migration conflicts..."

CONFLICT_TABLES=""
NEW_TABLES="content_listings content_purchases content_licenses tips artist_tip_stats user_tip_stats"

for table in $NEW_TABLES; do
    if echo "$EXISTING_TABLES" | grep -q "^$table$"; then
        CONFLICT_TABLES="$CONFLICT_TABLES $table"
    fi
done

if [ -n "$CONFLICT_TABLES" ]; then
    echo -e "   ${RED}❌ CONFLICT: Tables already exist:$CONFLICT_TABLES${NC}"
    echo "   💡 Solution: Check if migrations were already applied"
    echo "   💡 Or drop these tables if you want to re-apply migrations"
    exit 1
else
    echo -e "   ${GREEN}✅ No table conflicts detected${NC}"
fi

# 4. Verify migration files exist
echo ""
echo "4. Checking migration files..."

MIGRATION_FILES="dujyo-backend/migrations/024_content_marketplace.sql dujyo-backend/migrations/025_tips_system.sql"
MISSING_FILES=""

for file in $MIGRATION_FILES; do
    if [ -f "$file" ]; then
        echo -e "   ${GREEN}✅ Migration file exists: $(basename $file)${NC}"
    else
        echo -e "   ${RED}❌ Migration file missing: $file${NC}"
        MISSING_FILES="$MISSING_FILES $file"
    fi
done

if [ -n "$MISSING_FILES" ]; then
    echo -e "   ${RED}❌ Missing migration files!${NC}"
    exit 1
fi

# 5. Validate migration content
echo ""
echo "5. Validating migration content..."

for file in $MIGRATION_FILES; do
    # Count CREATE TABLE statements
    TABLE_COUNT=$(grep -i "CREATE TABLE" "$file" | wc -l | xargs)
    # Count CREATE INDEX statements
    INDEX_COUNT=$(grep -i "CREATE.*INDEX" "$file" | wc -l | xargs)
    # Check for syntax errors (basic check)
    if grep -q "CREATE TABLE" "$file"; then
        echo "   📋 $(basename $file):"
        echo "      - Creates $TABLE_COUNT tables"
        echo "      - Creates $INDEX_COUNT indexes"
    else
        echo -e "   ${YELLOW}⚠️  $(basename $file): No CREATE TABLE statements found${NC}"
    fi
done

# 6. Check database size
echo ""
echo "6. Checking database size..."
DB_SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT pg_size_pretty(pg_database_size('$DB_NAME'));
" -t | xargs)
echo "   📊 Current database size: $DB_SIZE"

# 7. Check for active connections
echo ""
echo "7. Checking for active connections..."
ACTIVE_CONNECTIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT COUNT(*) FROM pg_stat_activity WHERE datname = '$DB_NAME';
" -t | xargs)
echo "   🔌 Active connections: $ACTIVE_CONNECTIONS"

if [ "$ACTIVE_CONNECTIONS" -gt 5 ]; then
    echo -e "   ${YELLOW}⚠️  High number of connections. Consider closing some.${NC}"
fi

echo ""
echo "=========================================================="
echo -e "${GREEN}🎉 PRE-MIGRATION VERIFICATION COMPLETE${NC}"
echo -e "${GREEN}✅ All checks passed${NC}"
echo ""
echo "NEXT STEPS:"
echo "1. Run backup: ./scripts/backup_database.sh"
echo "2. Run migrations: ./scripts/run_migrations.sh"
echo "3. Verify: ./scripts/verify_after_migrations.sh"

