#!/bin/bash
# ✅ P0.4: Database Backup Script
# Backs up PostgreSQL database for XWave
# Usage: ./backup-database.sh [backup_directory]

set -e  # Exit on error

# Configuration
BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30  # Keep backups for 30 days

# Load environment variables (safely)
if [ -f .env ]; then
    set -a
    source <(cat .env | grep -v '^#' | grep -v '^$' | sed 's/^/export /')
    set +a
fi

# Database configuration from environment
DB_NAME="${POSTGRES_DB:-xwave_blockchain}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/xwave_db_${TIMESTAMP}.sql.gz"

echo "🗄️  Starting database backup..."
echo "   Database: $DB_NAME"
echo "   Host: $DB_HOST:$DB_PORT"
echo "   Backup file: $BACKUP_FILE"

# Perform backup
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup completed successfully!"
    echo "   Size: $BACKUP_SIZE"
    echo "   File: $BACKUP_FILE"
    
    # Clean up old backups
    echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "xwave_db_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    echo "✅ Cleanup completed"
    
    exit 0
else
    echo "❌ Backup failed!"
    exit 1
fi

