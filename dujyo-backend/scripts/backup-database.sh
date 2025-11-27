#!/bin/bash

# Database Backup Script for XWave
# Automatically backs up PostgreSQL database with rotation

set -e

# Configuration
DB_NAME="${DB_NAME:-xwave_blockchain}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/xwave_backup_${TIMESTAMP}.sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo -e "${GREEN}Starting database backup...${NC}"
echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "Backup file: ${BACKUP_FILE}"

# Check if PostgreSQL is accessible
if ! pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to PostgreSQL${NC}"
    exit 1
fi

# Perform backup
echo -e "${YELLOW}Creating backup...${NC}"
PGPASSWORD="${DB_PASSWORD}" pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=custom \
    --file="${BACKUP_FILE%.gz}" 2>&1 | grep -v "NOTICE"

# Compress backup
if [ -f "${BACKUP_FILE%.gz}" ]; then
    echo -e "${YELLOW}Compressing backup...${NC}"
    gzip "${BACKUP_FILE%.gz}"
    
    if [ -f "${BACKUP_FILE}" ]; then
        BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        echo -e "${GREEN}✓ Backup created successfully: ${BACKUP_FILE} (${BACKUP_SIZE})${NC}"
    else
        echo -e "${RED}Error: Backup compression failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: Backup file was not created${NC}"
    exit 1
fi

# Clean up old backups
echo -e "${YELLOW}Cleaning up old backups (older than ${RETENTION_DAYS} days)...${NC}"
find "${BACKUP_DIR}" -name "xwave_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

REMAINING_BACKUPS=$(find "${BACKUP_DIR}" -name "xwave_backup_*.sql.gz" -type f | wc -l)
echo -e "${GREEN}✓ Cleanup complete. ${REMAINING_BACKUPS} backup(s) remaining${NC}"

# Optional: Upload to S3 or other storage
if [ -n "${S3_BUCKET}" ]; then
    echo -e "${YELLOW}Uploading to S3...${NC}"
    if command -v aws &> /dev/null; then
        aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/database-backups/" || echo -e "${RED}Warning: S3 upload failed${NC}"
    else
        echo -e "${YELLOW}Warning: AWS CLI not found, skipping S3 upload${NC}"
    fi
fi

# Optional: Send notification
if [ -n "${NOTIFICATION_WEBHOOK}" ]; then
    curl -X POST "${NOTIFICATION_WEBHOOK}" \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"Database backup completed: ${BACKUP_FILE} (${BACKUP_SIZE})\"}" \
        || echo -e "${YELLOW}Warning: Notification failed${NC}"
fi

echo -e "${GREEN}Backup process completed successfully!${NC}"

