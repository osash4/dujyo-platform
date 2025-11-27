#!/bin/bash
# ✅ Script de Health Check para DUJYO Backend
# Verifica el estado de todos los servicios críticos

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8083}"
REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
TIMEOUT=5

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to check service
check_service() {
    local name=$1
    local command=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "Checking $name... "
    
    if eval "$command" &> /dev/null; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

echo -e "${BLUE}🏥 ==========================================${NC}"
echo -e "${BLUE}🏥 HEALTH CHECK - DUJYO BACKEND${NC}"
echo -e "${BLUE}🏥 ==========================================${NC}"
echo ""

# 1. Backend Health Check
echo -e "${BLUE}📋 Backend Services${NC}"
check_service "Backend HTTP" "curl -f -s --max-time $TIMEOUT $BACKEND_URL/health"
check_service "Backend Detailed Health" "curl -f -s --max-time $TIMEOUT $BACKEND_URL/health/detailed"

# 2. Redis Health Check
echo ""
echo -e "${BLUE}📋 Redis Services${NC}"
if command -v redis-cli &> /dev/null; then
    check_service "Redis Connection" "redis-cli -u \"$REDIS_URL\" ping"
    check_service "Redis Info" "redis-cli -u \"$REDIS_URL\" info server"
else
    echo -e "${YELLOW}⚠️  redis-cli no disponible, saltando checks de Redis${NC}"
fi

# 3. Database Health Check (if available)
echo ""
echo -e "${BLUE}📋 Database Services${NC}"
if [ -n "$DATABASE_URL" ]; then
    # Try to connect to PostgreSQL
    if command -v psql &> /dev/null; then
        check_service "PostgreSQL Connection" "psql \"$DATABASE_URL\" -c 'SELECT 1'"
    else
        echo -e "${YELLOW}⚠️  psql no disponible, saltando check de PostgreSQL${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  DATABASE_URL no configurado${NC}"
fi

# 4. API Endpoints Check
echo ""
echo -e "${BLUE}📋 API Endpoints${NC}"
check_service "Health Endpoint" "curl -f -s --max-time $TIMEOUT $BACKEND_URL/health"
check_service "Metrics Endpoint" "curl -f -s --max-time $TIMEOUT $BACKEND_URL/metrics"

# 5. Rate Limiting Check
echo ""
echo -e "${BLUE}📋 Rate Limiting${NC}"
# Make a request and check for rate limit headers
RESPONSE=$(curl -s -i --max-time $TIMEOUT "$BACKEND_URL/health" 2>/dev/null || echo "")
if echo "$RESPONSE" | grep -q "X-RateLimit-Limit"; then
    echo -e "${GREEN}✅ Rate limit headers presentes${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  Rate limit headers no encontrados${NC}"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Summary
echo ""
echo -e "${BLUE}📊 ==========================================${NC}"
echo -e "${BLUE}📊 RESUMEN${NC}"
echo -e "${BLUE}📊 ==========================================${NC}"
echo ""
echo "Total checks:    $TOTAL_CHECKS"
echo -e "Passed:          ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed:          ${RED}$FAILED_CHECKS${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ Todos los checks pasaron${NC}"
    exit 0
else
    echo -e "${RED}❌ Algunos checks fallaron${NC}"
    exit 1
fi

