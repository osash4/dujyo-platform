#!/bin/bash
# Test Backup Scripts

BACKUP_DIR="${1:-./test-backups-$(date +%s)}"

echo "💾 Testing Backup Scripts"
echo "=========================="
echo ""
echo "Backup Directory: $BACKUP_DIR"
echo ""

mkdir -p "$BACKUP_DIR"

echo "1️⃣  Testing Database Backup..."
echo "--------------------------------"
if [ -f "./scripts/backup-database.sh" ]; then
    ./scripts/backup-database.sh "$BACKUP_DIR"
    if [ $? -eq 0 ]; then
        echo "✅ Database backup successful"
    else
        echo "❌ Database backup failed"
    fi
else
    echo "❌ backup-database.sh not found"
fi

echo ""
echo "2️⃣  Testing Blockchain Backup..."
echo "----------------------------------"
if [ -f "./scripts/backup-blockchain.sh" ]; then
    ./scripts/backup-blockchain.sh "$BACKUP_DIR"
    if [ $? -eq 0 ]; then
        echo "✅ Blockchain backup successful"
    else
        echo "❌ Blockchain backup failed"
    fi
else
    echo "❌ backup-blockchain.sh not found"
fi

echo ""
echo "3️⃣  Testing Uploads Backup..."
echo "-------------------------------"
if [ -f "./scripts/backup-uploads.sh" ]; then
    ./scripts/backup-uploads.sh "$BACKUP_DIR"
    if [ $? -eq 0 ]; then
        echo "✅ Uploads backup successful"
    else
        echo "❌ Uploads backup failed"
    fi
else
    echo "❌ backup-uploads.sh not found"
fi

echo ""
echo "4️⃣  Verifying Backup Files..."
echo "-------------------------------"
if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
    echo "✅ Backup files created:"
    ls -lh "$BACKUP_DIR" | head -10
    echo ""
    echo "Total size: $(du -sh $BACKUP_DIR | cut -f1)"
else
    echo "⚠️  No backup files found"
fi

echo ""
echo "✅ Backup Testing Complete"

