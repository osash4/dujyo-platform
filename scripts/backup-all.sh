#!/bin/bash
# ✅ P0.4: Complete Backup Script
# Runs all backup scripts in sequence
# Usage: ./backup-all.sh [backup_directory]

set -e

BACKUP_DIR="${1:-./backups}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting complete backup process..."
echo "   Backup directory: $BACKUP_DIR"
echo ""

# Run all backup scripts
echo "1️⃣  Backing up database..."
"$SCRIPT_DIR/backup-database.sh" "$BACKUP_DIR"
echo ""

echo "2️⃣  Backing up blockchain data..."
"$SCRIPT_DIR/backup-blockchain.sh" "$BACKUP_DIR"
echo ""

echo "3️⃣  Backing up uploaded files..."
"$SCRIPT_DIR/backup-uploads.sh" "$BACKUP_DIR"
echo ""

echo "✅ All backups completed successfully!"
echo ""
echo "📊 Backup summary:"
du -sh "$BACKUP_DIR"/* | tail -3

