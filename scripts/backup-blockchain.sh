#!/bin/bash
# ✅ P0.4: Blockchain Data Backup Script
# Backs up blockchain data from database
# Usage: ./backup-blockchain.sh [backup_directory]

set -e  # Exit on error

# Configuration
BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Load environment variables (safely)
if [ -f .env ]; then
    set -a
    source <(cat .env | grep -v '^#' | grep -v '^$' | sed 's/^/export /')
    set +a
fi

# Database configuration
DB_NAME="${POSTGRES_DB:-xwave_blockchain}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/xwave_blockchain_${TIMESTAMP}.json"

echo "⛓️  Starting blockchain backup..."
echo "   Database: $DB_NAME"
echo "   Backup file: $BACKUP_FILE"

# Export blockchain data (blocks, transactions, balances)
PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -A -F"," \
    -c "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM blocks ORDER BY height) t;" \
    > "$BACKUP_FILE.blocks.json" 2>/dev/null || echo "[]" > "$BACKUP_FILE.blocks.json"

PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -A -F"," \
    -c "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM transactions ORDER BY created_at) t;" \
    > "$BACKUP_FILE.transactions.json" 2>/dev/null || echo "[]" > "$BACKUP_FILE.transactions.json"

PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -A -F"," \
    -c "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM balances ORDER BY updated_at) t;" \
    > "$BACKUP_FILE.balances.json" 2>/dev/null || echo "[]" > "$BACKUP_FILE.balances.json"

# Combine into single file
cat > "$BACKUP_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "blocks": $(cat "$BACKUP_FILE.blocks.json"),
  "transactions": $(cat "$BACKUP_FILE.transactions.json"),
  "balances": $(cat "$BACKUP_FILE.balances.json")
}
EOF

# Compress
gzip -f "$BACKUP_FILE"
rm -f "$BACKUP_FILE.blocks.json" "$BACKUP_FILE.transactions.json" "$BACKUP_FILE.balances.json"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    echo "✅ Blockchain backup completed!"
    echo "   Size: $BACKUP_SIZE"
    echo "   File: ${BACKUP_FILE}.gz"
    
    # Clean up old backups
    find "$BACKUP_DIR" -name "xwave_blockchain_*.json.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    exit 0
else
    echo "❌ Blockchain backup failed!"
    exit 1
fi

