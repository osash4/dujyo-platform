#!/bin/bash
# ✅ P0.4: Uploaded Files Backup Script
# Backs up uploaded content files
# Usage: ./backup-uploads.sh [backup_directory] [uploads_directory]

set -e

BACKUP_DIR="${1:-./backups}"
UPLOADS_DIR="${2:-./uploads}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/xwave_uploads_${TIMESTAMP}.tar.gz"

echo "📁 Starting uploads backup..."
echo "   Source: $UPLOADS_DIR"
echo "   Backup: $BACKUP_FILE"

if [ ! -d "$UPLOADS_DIR" ]; then
    echo "⚠️  Uploads directory not found: $UPLOADS_DIR"
    echo "   Creating empty backup..."
    tar -czf "$BACKUP_FILE" -T /dev/null 2>/dev/null || touch "${BACKUP_FILE%.gz}"
    gzip -f "${BACKUP_FILE%.gz}" 2>/dev/null || true
else
    tar -czf "$BACKUP_FILE" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")" 2>/dev/null || {
        echo "❌ Backup failed!"
        exit 1
    }
fi

if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Uploads backup completed!"
    echo "   Size: $BACKUP_SIZE"
    echo "   File: $BACKUP_FILE"
    
    # Clean up old backups
    find "$BACKUP_DIR" -name "xwave_uploads_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    exit 0
else
    echo "❌ Backup file not created!"
    exit 1
fi

