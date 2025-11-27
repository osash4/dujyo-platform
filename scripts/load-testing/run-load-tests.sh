#!/bin/bash
# Run all load tests for XWave

set -e

echo "======================================"
echo "XWave Load Testing Suite"
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Install with: brew install k6"
    exit 1
fi

# Create results directory
mkdir -p "/Volumes/DobleDHD 8/xwave/scripts/load-testing/results"

# Check if services are running
echo -e "${YELLOW}Checking if XWave services are running...${NC}"
if ! curl -s http://localhost:8083/health > /dev/null; then
    echo -e "${RED}Error: Backend is not running on port 8083${NC}"
    echo "Start services with: ./start_services_local.sh"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"

# Get test type from argument
TEST_TYPE=${1:-"all"}

run_test() {
    local test_name=$1
    local test_file=$2
    
    echo ""
    echo -e "${YELLOW}================================================${NC}"
    echo -e "${YELLOW}Running: $test_name${NC}"
    echo -e "${YELLOW}================================================${NC}"
    
    # Run k6 test
    k6 run \
        --out json="/Volumes/DobleDHD 8/xwave/scripts/load-testing/results/${test_name}-$(date +%Y%m%d_%H%M%S).json" \
        "$test_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $test_name completed successfully${NC}"
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        exit 1
    fi
}

case $TEST_TYPE in
    "high-load"|"high")
        run_test "high-load" "/Volumes/DobleDHD 8/xwave/scripts/load-testing/k6-high-load.js"
        ;;
    "stress")
        run_test "stress-test" "/Volumes/DobleDHD 8/xwave/scripts/load-testing/k6-stress-test.js"
        ;;
    "all")
        run_test "high-load" "/Volumes/DobleDHD 8/xwave/scripts/load-testing/k6-high-load.js"
        echo ""
        echo -e "${YELLOW}Waiting 30 seconds before stress test...${NC}"
        sleep 30
        run_test "stress-test" "/Volumes/DobleDHD 8/xwave/scripts/load-testing/k6-stress-test.js"
        ;;
    *)
        echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
        echo "Usage: $0 [high-load|stress|all]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}======================================"
echo -e "All tests completed successfully!"
echo -e "======================================${NC}"
echo ""
echo "Results saved in: /Volumes/DobleDHD 8/xwave/scripts/load-testing/results/"
echo ""
echo "View HTML report at:"
echo "  - High Load: results/high-load-summary.html"
echo "  - Stress Test: results/stress-test-summary.html"

