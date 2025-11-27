#!/bin/bash

# XWave Database Performance Benchmark Script
# Tests the optimized database performance under load

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:8083"
CONCURRENT_USERS=100
REQUESTS_PER_USER=100
TEST_DURATION=60

echo -e "${BLUE}🚀 XWave Database Performance Benchmark${NC}"
echo "================================================"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if server is running
check_server() {
    echo -e "\n${BLUE}🔍 Checking server status...${NC}"
    
    if curl -s "$BASE_URL/health" > /dev/null; then
        print_status "Server is running"
    else
        print_error "Server is not running. Please start the server first."
        exit 1
    fi
}

# Test basic endpoints
test_basic_endpoints() {
    echo -e "\n${BLUE}🧪 Testing basic endpoints...${NC}"
    
    # Test health endpoint
    echo "Testing health endpoint..."
    response_time=$(curl -o /dev/null -s -w '%{time_total}' "$BASE_URL/health")
    echo "Health endpoint response time: ${response_time}s"
    
    # Test detailed health endpoint
    echo "Testing detailed health endpoint..."
    response_time=$(curl -o /dev/null -s -w '%{time_total}' "$BASE_URL/health/detailed")
    echo "Detailed health endpoint response time: ${response_time}s"
    
    # Test metrics endpoint
    echo "Testing metrics endpoint..."
    response_time=$(curl -o /dev/null -s -w '%{time_total}' "$BASE_URL/metrics")
    echo "Metrics endpoint response time: ${response_time}s"
}

# Test balance endpoints
test_balance_endpoints() {
    echo -e "\n${BLUE}💰 Testing balance endpoints...${NC}"
    
    # Test addresses
    test_addresses=(
        "XW1111111111111111111111111111111111111111"
        "XW2222222222222222222222222222222222222222"
        "XW3333333333333333333333333333333333333333"
    )
    
    for address in "${test_addresses[@]}"; do
        echo "Testing balance for $address..."
        response_time=$(curl -o /dev/null -s -w '%{time_total}' "$BASE_URL/balance/$address")
        echo "Balance endpoint response time: ${response_time}s"
        
        echo "Testing token balance for $address..."
        response_time=$(curl -o /dev/null -s -w '%{time_total}' "$BASE_URL/balance-detail/$address")
        echo "Token balance endpoint response time: ${response_time}s"
    done
}

# Test blockchain endpoints
test_blockchain_endpoints() {
    echo -e "\n${BLUE}⛓️ Testing blockchain endpoints...${NC}"
    
    echo "Testing blocks endpoint..."
    response_time=$(curl -o /dev/null -s -w '%{time_total}' "$BASE_URL/blocks")
    echo "Blocks endpoint response time: ${response_time}s"
}

# Load testing with Apache Bench
run_load_tests() {
    echo -e "\n${BLUE}🔥 Running load tests...${NC}"
    
    if ! command -v ab &> /dev/null; then
        print_warning "Apache Bench (ab) not found. Installing..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install httpd
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get install -y apache2-utils
        fi
    fi
    
    # Test health endpoint under load
    echo "Load testing health endpoint..."
    ab -n 1000 -c 50 "$BASE_URL/health" > /tmp/health_load_test.txt
    echo "Health endpoint load test results:"
    grep "Requests per second" /tmp/health_load_test.txt
    grep "Time per request" /tmp/health_load_test.txt
    grep "Failed requests" /tmp/health_load_test.txt
    
    # Test balance endpoint under load
    echo "Load testing balance endpoint..."
    ab -n 1000 -c 50 "$BASE_URL/balance/XW1111111111111111111111111111111111111111" > /tmp/balance_load_test.txt
    echo "Balance endpoint load test results:"
    grep "Requests per second" /tmp/balance_load_test.txt
    grep "Time per request" /tmp/balance_load_test.txt
    grep "Failed requests" /tmp/balance_load_test.txt
}

# Test database performance directly
test_database_performance() {
    echo -e "\n${BLUE}🗄️ Testing database performance...${NC}"
    
    # Set database URL
    export DATABASE_URL="postgresql://xwave_user:xwave_master_2024@localhost:5432/xwave_blockchain"
    
    # Test balance query performance
    echo "Testing balance query performance..."
    time psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM balances;" > /dev/null
    
    # Test transaction query performance
    echo "Testing transaction query performance..."
    time psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM transactions;" > /dev/null
    
    # Test token balance query performance
    echo "Testing token balance query performance..."
    time psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM token_balances;" > /dev/null
    
    # Test complex query performance
    echo "Testing complex query performance..."
    time psql "$DATABASE_URL" -c "SELECT address, balance FROM balances WHERE balance > 0 ORDER BY balance DESC LIMIT 10;" > /dev/null
}

# Test Redis performance
test_redis_performance() {
    echo -e "\n${BLUE}🔴 Testing Redis performance...${NC}"
    
    # Test Redis connectivity
    if redis-cli -a xwave_redis_2024 ping | grep -q PONG; then
        print_status "Redis is accessible"
    else
        print_error "Redis is not accessible"
        return 1
    fi
    
    # Test Redis performance
    echo "Testing Redis performance..."
    redis-cli -a xwave_redis_2024 --latency-history -i 1 > /tmp/redis_latency.txt &
    REDIS_PID=$!
    sleep 10
    kill $REDIS_PID 2>/dev/null || true
    
    echo "Redis latency test results:"
    tail -5 /tmp/redis_latency.txt
}

# Test cache hit ratio
test_cache_performance() {
    echo -e "\n${BLUE}📊 Testing cache performance...${NC}"
    
    # Get initial cache stats
    echo "Getting initial cache statistics..."
    curl -s "$BASE_URL/admin/cache/stats" | jq '.' > /tmp/initial_cache_stats.json
    
    # Make some requests to populate cache
    echo "Populating cache with requests..."
    for i in {1..100}; do
        curl -s "$BASE_URL/balance/XW1111111111111111111111111111111111111111" > /dev/null
        curl -s "$BASE_URL/balance-detail/XW1111111111111111111111111111111111111111" > /dev/null
    done
    
    # Get final cache stats
    echo "Getting final cache statistics..."
    curl -s "$BASE_URL/admin/cache/stats" | jq '.' > /tmp/final_cache_stats.json
    
    echo "Cache performance comparison:"
    echo "Initial stats:"
    cat /tmp/initial_cache_stats.json
    echo "Final stats:"
    cat /tmp/final_cache_stats.json
}

# Generate performance report
generate_report() {
    echo -e "\n${BLUE}📋 Generating performance report...${NC}"
    
    report_file="performance_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
XWave Database Performance Benchmark Report
Generated: $(date)
===============================================

Server Configuration:
- Base URL: $BASE_URL
- Concurrent Users: $CONCURRENT_USERS
- Requests per User: $REQUESTS_PER_USER
- Test Duration: ${TEST_DURATION}s

Health Check Results:
$(curl -s "$BASE_URL/health/detailed" | jq '.')

Performance Metrics:
$(curl -s "$BASE_URL/metrics" | jq '.')

Database Statistics:
$(curl -s "$BASE_URL/admin/database/stats" | jq '.')

Cache Statistics:
$(curl -s "$BASE_URL/admin/cache/stats" | jq '.')

Load Test Results:
Health Endpoint:
$(grep -E "(Requests per second|Time per request|Failed requests)" /tmp/health_load_test.txt)

Balance Endpoint:
$(grep -E "(Requests per second|Time per request|Failed requests)" /tmp/balance_load_test.txt)

Redis Latency:
$(tail -5 /tmp/redis_latency.txt)

Recommendations:
- Monitor cache hit ratio (target: >85%)
- Monitor response times (target: <50ms)
- Monitor error rates (target: <0.1%)
- Scale resources based on load patterns

EOF

    print_status "Performance report generated: $report_file"
}

# Main execution
main() {
    check_server
    test_basic_endpoints
    test_balance_endpoints
    test_blockchain_endpoints
    run_load_tests
    test_database_performance
    test_redis_performance
    test_cache_performance
    generate_report
    
    echo -e "\n${GREEN}🎉 Performance benchmark completed!${NC}"
    echo "================================================"
    echo ""
    echo -e "${BLUE}📊 Key Performance Indicators:${NC}"
    echo "  • Response times should be < 50ms"
    echo "  • Cache hit ratio should be > 85%"
    echo "  • Error rate should be < 0.1%"
    echo "  • Throughput should be > 1000 RPS"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "  1. Review the generated performance report"
    echo "  2. Monitor metrics during peak usage"
    echo "  3. Scale resources as needed"
    echo "  4. Set up alerting for performance thresholds"
}

# Run main function
main "$@"
