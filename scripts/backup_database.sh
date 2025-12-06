#!/bin/bash

# DUJYO Database Backup Script
# Creates a full backup BEFORE applying MVP migrations
# Usage: ./scripts/backup_database.sh

set -e  # Exit on error

echo "🚨 CRITICAL: Creating database backup BEFORE MVP migrations"
echo "=========================================================="

# Configuration
DB_USER="${DB_USER:-dujyo_user}"
DB_NAME="${DB_NAME:-dujyo_db}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="database_backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_pre_mvp_${DATE}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Test database connection
echo -n "Testing database connection... "
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed${NC}"
    echo "   Please check database connection settings"
    exit 1
fi
echo -e "${GREEN}✅ Connected${NC}"

# List existing tables BEFORE migrations
echo ""
echo "📊 Tables to backup:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size('\"' || table_name || '\"')) as size
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
"

# Create full backup
echo ""
echo "💾 Creating backup..."
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists > "${BACKUP_FILE}" 2>/dev/null; then
    echo -e "${GREEN}✅ Backup dump created${NC}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi

# Compress backup
echo "🗜️  Compressing backup..."
if gzip "${BACKUP_FILE}"; then
    echo -e "${GREEN}✅ Backup compressed${NC}"
else
    echo -e "${RED}❌ Compression failed!${NC}"
    exit 1
fi

# Verify backup
if [ ! -f "${COMPRESSED_FILE}" ]; then
    echo -e "${RED}❌ Backup file not found!${NC}"
    exit 1
fi

# Get backup info
BACKUP_SIZE=$(du -h "${COMPRESSED_FILE}" | cut -f1)
BACKUP_MD5=$(md5sum "${COMPRESSED_FILE}" | cut -d' ' -f1)

echo ""
echo -e "${GREEN}✅ Backup created successfully!${NC}"
echo "📁 File: ${COMPRESSED_FILE}"
echo "📊 Size: ${BACKUP_SIZE}"
echo "🔒 MD5: ${BACKUP_MD5}"

# Create backup README
README_FILE="${BACKUP_DIR}/README_${DATE}.txt"
cat > "${README_FILE}" << EOF
DUJYO DATABASE BACKUP - PRE MVP MIGRATIONS
==========================================

Date: $(date)
Backup File: ${COMPRESSED_FILE}
MD5: ${BACKUP_MD5}
Size: ${BACKUP_SIZE}

MIGRATIONS TO BE APPLIED:
1. 024_content_marketplace.sql
2. 025_tips_system.sql

TABLES BACKED UP:
$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" -t)

RESTORE COMMAND:
./scripts/restore_database.sh ${COMPRESSED_FILE}

OR MANUALLY:
gunzip -c ${COMPRESSED_FILE} | psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}

WARNING: This is a CRITICAL backup before major migrations.
Keep this backup safe until migrations are verified successful.
EOF

echo "📝 Backup documentation created: ${README_FILE}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Keep this backup safe!${NC}"
echo "   Location: ${COMPRESSED_FILE}"
echo "   MD5: ${BACKUP_MD5}"

