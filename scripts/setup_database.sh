#!/bin/bash

# Quick Database Setup Script
# Creates user and database for DUJYO

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🗄️  DUJYO DATABASE SETUP"
echo "========================"
echo ""

# Check if PostgreSQL is running
if ! pg_isready > /dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL is not running!${NC}"
    echo ""
    echo "Start PostgreSQL:"
    echo "  macOS: brew services start postgresql@14"
    echo "  Linux: sudo systemctl start postgresql"
    echo "  Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:14"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is running${NC}"
echo ""

# Check if user exists
if psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='dujyo_user'" | grep -q 1; then
    echo -e "${GREEN}✅ User 'dujyo_user' already exists${NC}"
else
    echo "Creating user 'dujyo_user'..."
    createuser -s dujyo_user 2>/dev/null || psql -U postgres -c "CREATE USER dujyo_user WITH SUPERUSER PASSWORD 'dujyo_pass';"
    echo -e "${GREEN}✅ User created${NC}"
fi

# Check if database exists
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw dujyo_db; then
    echo -e "${GREEN}✅ Database 'dujyo_db' already exists${NC}"
else
    echo "Creating database 'dujyo_db'..."
    createdb -O dujyo_user dujyo_db 2>/dev/null || psql -U postgres -c "CREATE DATABASE dujyo_db OWNER dujyo_user;"
    echo -e "${GREEN}✅ Database created${NC}"
fi

echo ""
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run migrations: ./scripts/safe_migration_process.sh"
echo "  2. Or manually: ./scripts/run_migrations.sh"

