#!/bin/bash

# Setup Database Indexes Script
# Runs the SQL script to create all performance indexes

set -e

# Configuration
DB_NAME="${DB_NAME:-xwave_blockchain}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
SQL_FILE="${SQL_FILE:-./scripts/create-indexes.sql}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Setting up database indexes...${NC}"
echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "SQL File: ${SQL_FILE}"

# Check if SQL file exists
if [ ! -f "${SQL_FILE}" ]; then
    echo -e "${RED}Error: SQL file not found: ${SQL_FILE}${NC}"
    exit 1
fi

# Check if PostgreSQL is accessible
if ! pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to PostgreSQL${NC}"
    exit 1
fi

# Run SQL script
echo -e "${YELLOW}Creating indexes...${NC}"
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "${SQL_FILE}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Indexes created successfully!${NC}"
    
    # Show index statistics
    echo -e "${YELLOW}Index statistics:${NC}"
    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "
        SELECT 
            schemaname,
            tablename,
            COUNT(*) as index_count,
            pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_size
        FROM pg_stat_user_indexes
        GROUP BY schemaname, tablename
        ORDER BY tablename;
    "
else
    echo -e "${RED}Error: Failed to create indexes${NC}"
    exit 1
fi

