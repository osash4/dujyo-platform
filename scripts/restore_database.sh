#!/bin/bash

# DUJYO Database Restore Script
# Restores database from a backup file
# Usage: ./scripts/restore_database.sh <backup_file.sql.gz>

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

echo "🔄 DATABASE RESTORE UTILITY"
echo "==========================="

# Check if backup file provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Usage: $0 <backup_file.sql.gz>${NC}"
    echo ""
    echo "Available backups:"
    if [ -d "database_backups" ]; then
        ls -lah database_backups/*.sql.gz 2>/dev/null | tail -5 || echo "No backups found"
    else
        echo "No backups directory found"
    fi
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Display backup info
echo ""
echo "📁 Backup file: $BACKUP_FILE"
echo "📊 Size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo "🔒 MD5: $(md5sum "$BACKUP_FILE" | cut -d' ' -f1)"
echo ""

# Warning
echo -e "${RED}⚠️  WARNING: This will OVERWRITE the current database!${NC}"
echo -e "${YELLOW}   All current data will be lost!${NC}"
echo ""
read -p "❓ Are you sure? Type 'YES' to continue: " confirmation

if [ "$confirmation" != "YES" ]; then
    echo -e "${YELLOW}❌ Restore cancelled${NC}"
    exit 0
fi

# Test database connection
echo ""
echo -n "Testing database connection... "
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed${NC}"
    echo "   Please check database connection settings"
    exit 1
fi
echo -e "${GREEN}✅ Connected${NC}"

# Restore database
echo ""
echo "🔄 Restoring database..."
echo -e "${YELLOW}⏳ This may take several minutes...${NC}"

if gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>&1; then
    echo ""
    echo -e "${GREEN}✅ Database restored successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Restore failed!${NC}"
    exit 1
fi

# Verify restore
echo ""
echo "🔄 Verifying restore..."

TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'public';
" -t | xargs)

echo "   📊 Tables restored: $TABLE_COUNT"

echo ""
echo "📋 Restored tables:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size('\"' || table_name || '\"')) as size
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
" | head -20

echo ""
echo -e "${GREEN}✅ Restore verification complete!${NC}"

