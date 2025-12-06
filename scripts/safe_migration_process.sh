#!/bin/bash

# DUJYO Safe Migration Process
# Executes the complete migration process with backups and verifications
# Usage: ./scripts/safe_migration_process.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 DUJYO SAFE MIGRATION PROCESS"
echo "==============================="
echo ""
echo "This script will:"
echo "  1. Verify database state (pre-migration)"
echo "  2. Create full backup"
echo "  3. Run migrations"
echo "  4. Verify migrations (post-migration)"
echo ""
read -p "Continue? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "=========================================================="
echo "STEP 1: PRE-MIGRATION VERIFICATION"
echo "=========================================================="
if ./scripts/verify_before_migrations.sh; then
    echo -e "${GREEN}✅ Pre-migration verification passed${NC}"
else
    echo -e "${RED}❌ Pre-migration verification failed!${NC}"
    echo "Please fix issues before continuing."
    exit 1
fi

echo ""
read -p "Continue to backup? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "=========================================================="
echo "STEP 2: DATABASE BACKUP"
echo "=========================================================="
if ./scripts/backup_database.sh; then
    echo -e "${GREEN}✅ Backup created successfully${NC}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    echo "Cannot proceed without backup."
    exit 1
fi

echo ""
read -p "Continue to migrations? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled. Backup is safe."
    exit 0
fi

echo ""
echo "=========================================================="
echo "STEP 3: RUNNING MIGRATIONS"
echo "=========================================================="
if ./scripts/run_migrations.sh; then
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${RED}❌ Migrations failed!${NC}"
    echo ""
    echo "RESTORE OPTION:"
    echo "  ./scripts/restore_database.sh <backup_file>"
    exit 1
fi

echo ""
echo "=========================================================="
echo "STEP 4: POST-MIGRATION VERIFICATION"
echo "=========================================================="
if ./scripts/verify_after_migrations.sh; then
    echo -e "${GREEN}✅ Post-migration verification passed${NC}"
    echo ""
    echo "🎉 MIGRATION PROCESS COMPLETE!"
    echo ""
    echo "NEXT STEPS:"
    echo "  1. Populate beta users: psql -U dujyo_user -d dujyo_db -f scripts/populate_beta_users.sql"
    echo "  2. Test endpoints: ./scripts/test_mvp.sh"
else
    echo -e "${RED}❌ Post-migration verification failed!${NC}"
    echo ""
    echo "RESTORE OPTION:"
    echo "  ./scripts/restore_database.sh <backup_file>"
    exit 1
fi

