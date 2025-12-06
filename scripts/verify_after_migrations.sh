#!/bin/bash

# DUJYO Post-Migration Verification Script
# Verifies that migrations were applied successfully
# Usage: ./scripts/verify_after_migrations.sh

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

echo "🔍 POST-MIGRATION VERIFICATION"
echo "=============================="
echo ""

# Tables that SHOULD exist after migrations
EXPECTED_TABLES="content_listings content_purchases content_licenses tips artist_tip_stats user_tip_stats"
ALL_PASSED=true

echo "1. Verifying new tables were created..."
echo ""

for table in $EXPECTED_TABLES; do
    EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '$table'
    );
    " -t | xargs)
    
    if [ "$EXISTS" = "t" ]; then
        echo -e "   ${GREEN}✅ Table created: $table${NC}"
        
        # Count rows
        COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM $table;" -t | xargs)
        echo "      Rows: $COUNT"
        
        # Get table size
        SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT pg_size_pretty(pg_total_relation_size('$table'));
        " -t | xargs)
        echo "      Size: $SIZE"
    else
        echo -e "   ${RED}❌ Table missing: $table${NC}"
        ALL_PASSED=false
    fi
done

# 2. Check table structures
echo ""
echo "2. Checking table structures..."
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('content_listings', 'tips', 'content_purchases', 'content_licenses')
GROUP BY table_name
ORDER BY table_name;
"

# 3. Check indexes
echo ""
echo "3. Verifying indexes..."
echo ""

INDEX_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT COUNT(*) 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('content_listings', 'tips', 'content_purchases', 'content_licenses');
" -t | xargs)

echo "   📊 Indexes created: $INDEX_COUNT"

# 4. Check foreign keys
echo ""
echo "4. Verifying foreign keys..."
echo ""

FK_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT COUNT(*) 
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
AND table_schema = 'public'
AND table_name IN ('content_listings', 'content_purchases', 'content_licenses', 'tips');
" -t | xargs)

echo "   🔗 Foreign keys: $FK_COUNT"

# 5. Check materialized view (for tips leaderboard)
echo ""
echo "5. Checking materialized views..."
echo ""

MV_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT EXISTS (
    SELECT FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname = 'tip_leaderboard'
);
" -t | xargs)

if [ "$MV_EXISTS" = "t" ]; then
    echo -e "   ${GREEN}✅ Materialized view created: tip_leaderboard${NC}"
else
    echo -e "   ${YELLOW}⚠️  Materialized view missing: tip_leaderboard${NC}"
fi

# 6. Test basic queries
echo ""
echo "6. Testing basic queries..."
echo ""

# Test content_listings query
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM content_listings;" > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ content_listings query works${NC}"
else
    echo -e "   ${RED}❌ content_listings query failed${NC}"
    ALL_PASSED=false
fi

# Test tips query
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM tips;" > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ tips query works${NC}"
else
    echo -e "   ${RED}❌ tips query failed${NC}"
    ALL_PASSED=false
fi

# 7. Check for errors in recent logs (if available)
echo ""
echo "7. Summary..."
echo ""

TOTAL_TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'public';
" -t | xargs)

echo "   📊 Total tables in database: $TOTAL_TABLES"

echo ""
echo "=========================================================="

if [ "$ALL_PASSED" = true ]; then
    echo -e "${GREEN}🎉 POST-MIGRATION VERIFICATION COMPLETE${NC}"
    echo -e "${GREEN}✅ All migrations applied successfully!${NC}"
    echo ""
    echo "NEXT STEPS:"
    echo "1. Populate beta users: psql -U $DB_USER -d $DB_NAME -f scripts/populate_beta_users.sql"
    echo "2. Test endpoints: ./scripts/test_mvp.sh"
    exit 0
else
    echo -e "${RED}❌ POST-MIGRATION VERIFICATION FAILED${NC}"
    echo -e "${RED}   Some tables or features are missing!${NC}"
    echo ""
    echo "TROUBLESHOOTING:"
    echo "1. Check migration logs for errors"
    echo "2. Verify migration files were executed correctly"
    echo "3. Consider restoring from backup: ./scripts/restore_database.sh <backup_file>"
    exit 1
fi

