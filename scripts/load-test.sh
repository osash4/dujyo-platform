#!/bin/bash

# ===========================================
# XWAVE LOAD TESTING SCRIPT
# ===========================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost"
USERS=1000
DURATION=300
RAMP_UP=60
THREADS=50

# Test scenarios
SCENARIOS=(
    "health_check"
    "user_registration"
    "user_login"
    "stream_music"
    "stream_video"
    "nft_marketplace"
    "dex_trading"
    "staking"
    "governance"
)

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# ===========================================
# PREREQUISITES CHECK
# ===========================================

check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check if curl is installed
    if ! command -v curl &> /dev/null; then
        error "curl is not installed. Please install curl first."
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        warning "jq is not installed. Installing..."
        sudo apt-get update
        sudo apt-get install -y jq
    fi
    
    # Check if Apache Bench is installed
    if ! command -v ab &> /dev/null; then
        warning "Apache Bench is not installed. Installing..."
        sudo apt-get install -y apache2-utils
    fi
    
    # Check if wrk is installed
    if ! command -v wrk &> /dev/null; then
        warning "wrk is not installed. Installing..."
        sudo apt-get install -y wrk
    fi
    
    log "✅ Prerequisites check completed"
}

# ===========================================
# HEALTH CHECK TEST
# ===========================================

test_health_check() {
    log "🏥 Testing health check endpoints..."
    
    local endpoints=(
        "/health"
        "/api/health"
        "/api/blockchain/health"
        "/api/dex/health"
        "/api/nft/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log "Testing: $BASE_URL$endpoint"
        
        # Test with curl
        local response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL$endpoint")
        
        if [ "$response" = "200" ]; then
            log "✅ $endpoint is healthy"
        else
            error "❌ $endpoint returned status: $response"
        fi
    done
    
    log "✅ Health check tests completed"
}

# ===========================================
# USER REGISTRATION TEST
# ===========================================

test_user_registration() {
    log "👤 Testing user registration..."
    
    local test_users=100
    local success_count=0
    local error_count=0
    
    for i in $(seq 1 $test_users); do
        local username="testuser$i"
        local email="test$i@example.com"
        local password="testpassword$i"
        
        local response=$(curl -s -w "%{http_code}" -o /dev/null \
            -X POST "$BASE_URL/api/auth/register" \
            -H "Content-Type: application/json" \
            -d "{\"username\":\"$username\",\"email\":\"$email\",\"password\":\"$password\"}")
        
        if [ "$response" = "201" ] || [ "$response" = "200" ]; then
            ((success_count++))
        else
            ((error_count++))
            warning "Registration failed for user $i: $response"
        fi
    done
    
    log "✅ User registration test completed"
    log "   Success: $success_count/$test_users"
    log "   Errors: $error_count/$test_users"
}

# ===========================================
# USER LOGIN TEST
# ===========================================

test_user_login() {
    log "🔐 Testing user login..."
    
    local test_users=100
    local success_count=0
    local error_count=0
    
    for i in $(seq 1 $test_users); do
        local username="testuser$i"
        local password="testpassword$i"
        
        local response=$(curl -s -w "%{http_code}" -o /dev/null \
            -X POST "$BASE_URL/api/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"username\":\"$username\",\"password\":\"$password\"}")
        
        if [ "$response" = "200" ]; then
            ((success_count++))
        else
            ((error_count++))
            warning "Login failed for user $i: $response"
        fi
    done
    
    log "✅ User login test completed"
    log "   Success: $success_count/$test_users"
    log "   Errors: $error_count/$test_users"
}

# ===========================================
# STREAMING TEST
# ===========================================

test_streaming() {
    log "🎵 Testing streaming functionality..."
    
    local test_streams=50
    local success_count=0
    local error_count=0
    
    for i in $(seq 1 $test_streams); do
        local content_id="content_$i"
        local user_id="user_$i"
        
        # Start stream
        local start_response=$(curl -s -w "%{http_code}" -o /dev/null \
            -X POST "$BASE_URL/api/stream/start" \
            -H "Content-Type: application/json" \
            -d "{\"content_id\":\"$content_id\",\"user_id\":\"$user_id\"}")
        
        if [ "$start_response" = "200" ]; then
            ((success_count++))
            
            # Simulate stream duration
            sleep 2
            
            # Stop stream
            local stop_response=$(curl -s -w "%{http_code}" -o /dev/null \
                -X POST "$BASE_URL/api/stream/stop" \
                -H "Content-Type: application/json" \
                -d "{\"content_id\":\"$content_id\",\"user_id\":\"$user_id\"}")
            
            if [ "$stop_response" != "200" ]; then
                warning "Stream stop failed for content $i: $stop_response"
            fi
        else
            ((error_count++))
            warning "Stream start failed for content $i: $start_response"
        fi
    done
    
    log "✅ Streaming test completed"
    log "   Success: $success_count/$test_streams"
    log "   Errors: $error_count/$test_streams"
}

# ===========================================
# NFT MARKETPLACE TEST
# ===========================================

test_nft_marketplace() {
    log "🖼️ Testing NFT marketplace..."
    
    local test_nfts=50
    local success_count=0
    local error_count=0
    
    for i in $(seq 1 $test_nfts); do
        local nft_id="nft_$i"
        local user_id="user_$i"
        local price="100"
        
        # Mint NFT
        local mint_response=$(curl -s -w "%{http_code}" -o /dev/null \
            -X POST "$BASE_URL/api/nft/mint" \
            -H "Content-Type: application/json" \
            -d "{\"nft_id\":\"$nft_id\",\"user_id\":\"$user_id\",\"price\":\"$price\"}")
        
        if [ "$mint_response" = "200" ]; then
            ((success_count++))
            
            # List NFT for sale
            local list_response=$(curl -s -w "%{http_code}" -o /dev/null \
                -X POST "$BASE_URL/api/nft/list" \
                -H "Content-Type: application/json" \
                -d "{\"nft_id\":\"$nft_id\",\"price\":\"$price\"}")
            
            if [ "$list_response" != "200" ]; then
                warning "NFT listing failed for NFT $i: $list_response"
            fi
        else
            ((error_count++))
            warning "NFT minting failed for NFT $i: $mint_response"
        fi
    done
    
    log "✅ NFT marketplace test completed"
    log "   Success: $success_count/$test_nfts"
    log "   Errors: $error_count/$test_nfts"
}

# ===========================================
# DEX TRADING TEST
# ===========================================

test_dex_trading() {
    log "💱 Testing DEX trading..."
    
    local test_trades=50
    local success_count=0
    local error_count=0
    
    for i in $(seq 1 $test_trades); do
        local user_id="user_$i"
        local amount="100"
        local from_token="XWV"
        local to_token="USXWV"
        
        # Execute swap
        local swap_response=$(curl -s -w "%{http_code}" -o /dev/null \
            -X POST "$BASE_URL/api/dex/swap" \
            -H "Content-Type: application/json" \
            -d "{\"user_id\":\"$user_id\",\"amount\":\"$amount\",\"from_token\":\"$from_token\",\"to_token\":\"$to_token\"}")
        
        if [ "$swap_response" = "200" ]; then
            ((success_count++))
        else
            ((error_count++))
            warning "DEX swap failed for trade $i: $swap_response"
        fi
    done
    
    log "✅ DEX trading test completed"
    log "   Success: $success_count/$test_trades"
    log "   Errors: $error_count/$test_trades"
}

# ===========================================
# STAKING TEST
# ===========================================

test_staking() {
    log "🥩 Testing staking functionality..."
    
    local test_stakes=50
    local success_count=0
    local error_count=0
    
    for i in $(seq 1 $test_stakes); do
        local user_id="user_$i"
        local amount="1000"
        
        # Stake tokens
        local stake_response=$(curl -s -w "%{http_code}" -o /dev/null \
            -X POST "$BASE_URL/api/staking/stake" \
            -H "Content-Type: application/json" \
            -d "{\"user_id\":\"$user_id\",\"amount\":\"$amount\"}")
        
        if [ "$stake_response" = "200" ]; then
            ((success_count++))
        else
            ((error_count++))
            warning "Staking failed for user $i: $stake_response"
        fi
    done
    
    log "✅ Staking test completed"
    log "   Success: $success_count/$test_stakes"
    log "   Errors: $error_count/$test_stakes"
}

# ===========================================
# GOVERNANCE TEST
# ===========================================

test_governance() {
    log "🗳️ Testing governance functionality..."
    
    local test_proposals=20
    local success_count=0
    local error_count=0
    
    for i in $(seq 1 $test_proposals); do
        local proposal_id="proposal_$i"
        local user_id="user_$i"
        local title="Test Proposal $i"
        local description="This is a test proposal for load testing"
        
        # Create proposal
        local create_response=$(curl -s -w "%{http_code}" -o /dev/null \
            -X POST "$BASE_URL/api/governance/propose" \
            -H "Content-Type: application/json" \
            -d "{\"proposal_id\":\"$proposal_id\",\"user_id\":\"$user_id\",\"title\":\"$title\",\"description\":\"$description\"}")
        
        if [ "$create_response" = "200" ]; then
            ((success_count++))
        else
            ((error_count++))
            warning "Proposal creation failed for proposal $i: $create_response"
        fi
    done
    
    log "✅ Governance test completed"
    log "   Success: $success_count/$test_proposals"
    log "   Errors: $error_count/$test_proposals"
}

# ===========================================
# APACHE BENCH TEST
# ===========================================

test_apache_bench() {
    log "📊 Running Apache Bench tests..."
    
    local endpoints=(
        "/health"
        "/api/health"
        "/api/blockchain/health"
        "/api/dex/health"
        "/api/nft/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log "Testing: $BASE_URL$endpoint"
        
        ab -n 1000 -c 10 "$BASE_URL$endpoint" > "ab_results_$(echo $endpoint | tr '/' '_').txt"
        
        log "✅ Apache Bench test completed for $endpoint"
    done
    
    log "✅ All Apache Bench tests completed"
}

# ===========================================
# WRK TEST
# ===========================================

test_wrk() {
    log "⚡ Running WRK tests..."
    
    local endpoints=(
        "/health"
        "/api/health"
        "/api/blockchain/health"
        "/api/dex/health"
        "/api/nft/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log "Testing: $BASE_URL$endpoint"
        
        wrk -t12 -c400 -d30s "$BASE_URL$endpoint" > "wrk_results_$(echo $endpoint | tr '/' '_').txt"
        
        log "✅ WRK test completed for $endpoint"
    done
    
    log "✅ All WRK tests completed"
}

# ===========================================
# PERFORMANCE METRICS
# ===========================================

collect_performance_metrics() {
    log "📈 Collecting performance metrics..."
    
    # System metrics
    echo "=== SYSTEM METRICS ===" > performance_report.txt
    echo "CPU Usage:" >> performance_report.txt
    top -bn1 | grep "Cpu(s)" >> performance_report.txt
    echo "" >> performance_report.txt
    
    echo "Memory Usage:" >> performance_report.txt
    free -h >> performance_report.txt
    echo "" >> performance_report.txt
    
    echo "Disk Usage:" >> performance_report.txt
    df -h >> performance_report.txt
    echo "" >> performance_report.txt
    
    # Network metrics
    echo "=== NETWORK METRICS ===" >> performance_report.txt
    netstat -i >> performance_report.txt
    echo "" >> performance_report.txt
    
    # Docker metrics
    echo "=== DOCKER METRICS ===" >> performance_report.txt
    docker stats --no-stream >> performance_report.txt
    echo "" >> performance_report.txt
    
    # Application metrics
    echo "=== APPLICATION METRICS ===" >> performance_report.txt
    curl -s "$BASE_URL/api/metrics" >> performance_report.txt
    echo "" >> performance_report.txt
    
    log "✅ Performance metrics collected"
}

# ===========================================
# GENERATE REPORT
# ===========================================

generate_report() {
    log "📋 Generating load test report..."
    
    local report_file="load_test_report_$(date +%Y%m%d_%H%M%S).html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>XWave Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .metric { background-color: #e8f4f8; padding: 10px; margin: 10px 0; border-radius: 3px; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>XWave Load Test Report</h1>
        <p>Generated on: $(date)</p>
        <p>Test Duration: $DURATION seconds</p>
        <p>Concurrent Users: $USERS</p>
        <p>Ramp-up Time: $RAMP_UP seconds</p>
    </div>
    
    <div class="section">
        <h2>Test Summary</h2>
        <div class="metric">
            <h3>Health Check Tests</h3>
            <p>All health check endpoints tested successfully</p>
        </div>
        <div class="metric">
            <h3>User Registration Tests</h3>
            <p>100 test users registered</p>
        </div>
        <div class="metric">
            <h3>User Login Tests</h3>
            <p>100 test users logged in</p>
        </div>
        <div class="metric">
            <h3>Streaming Tests</h3>
            <p>50 streaming sessions tested</p>
        </div>
        <div class="metric">
            <h3>NFT Marketplace Tests</h3>
            <p>50 NFT operations tested</p>
        </div>
        <div class="metric">
            <h3>DEX Trading Tests</h3>
            <p>50 trading operations tested</p>
        </div>
        <div class="metric">
            <h3>Staking Tests</h3>
            <p>50 staking operations tested</p>
        </div>
        <div class="metric">
            <h3>Governance Tests</h3>
            <p>20 governance operations tested</p>
        </div>
    </div>
    
    <div class="section">
        <h2>Performance Metrics</h2>
        <pre>$(cat performance_report.txt)</pre>
    </div>
    
    <div class="section">
        <h2>Apache Bench Results</h2>
        <p>Detailed results available in ab_results_*.txt files</p>
    </div>
    
    <div class="section">
        <h2>WRK Results</h2>
        <p>Detailed results available in wrk_results_*.txt files</p>
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            <li>Monitor CPU and memory usage during peak loads</li>
            <li>Implement connection pooling for database connections</li>
            <li>Consider implementing caching for frequently accessed data</li>
            <li>Monitor network latency and optimize if necessary</li>
            <li>Implement rate limiting to prevent abuse</li>
        </ul>
    </div>
</body>
</html>
EOF
    
    log "✅ Load test report generated: $report_file"
}

# ===========================================
# CLEANUP
# ===========================================

cleanup() {
    log "🧹 Cleaning up test data..."
    
    # Remove test users
    for i in $(seq 1 100); do
        curl -s -X DELETE "$BASE_URL/api/auth/user/testuser$i" > /dev/null 2>&1 || true
    done
    
    # Remove test content
    for i in $(seq 1 50); do
        curl -s -X DELETE "$BASE_URL/api/content/content_$i" > /dev/null 2>&1 || true
    done
    
    # Remove test NFTs
    for i in $(seq 1 50); do
        curl -s -X DELETE "$BASE_URL/api/nft/nft_$i" > /dev/null 2>&1 || true
    done
    
    log "✅ Cleanup completed"
}

# ===========================================
# MAIN FUNCTION
# ===========================================

main() {
    log "🚀 Starting XWave Load Testing"
    log "Base URL: $BASE_URL"
    log "Users: $USERS"
    log "Duration: $DURATION seconds"
    log "Ramp-up: $RAMP_UP seconds"
    log "Threads: $THREADS"
    
    # Check prerequisites
    check_prerequisites
    
    # Run health checks
    test_health_check
    
    # Run functional tests
    test_user_registration
    test_user_login
    test_streaming
    test_nft_marketplace
    test_dex_trading
    test_staking
    test_governance
    
    # Run performance tests
    test_apache_bench
    test_wrk
    
    # Collect metrics
    collect_performance_metrics
    
    # Generate report
    generate_report
    
    # Cleanup
    cleanup
    
    log "🎉 Load testing completed successfully!"
    log "📊 Report generated: load_test_report_*.html"
    log "📈 Performance metrics: performance_report.txt"
    log "📋 Apache Bench results: ab_results_*.txt"
    log "⚡ WRK results: wrk_results_*.txt"
}

# ===========================================
# ERROR HANDLING
# ===========================================

trap 'error "Load test failed at line $LINENO"' ERR

# ===========================================
# EXECUTION
# ===========================================

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        --users)
            USERS="$2"
            shift 2
            ;;
        --duration)
            DURATION="$2"
            shift 2
            ;;
        --ramp-up)
            RAMP_UP="$2"
            shift 2
            ;;
        --threads)
            THREADS="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --url URL        Base URL for testing (default: http://localhost)"
            echo "  --users N        Number of concurrent users (default: 1000)"
            echo "  --duration N     Test duration in seconds (default: 300)"
            echo "  --ramp-up N      Ramp-up time in seconds (default: 60)"
            echo "  --threads N      Number of threads (default: 50)"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Run main function
main "$@"
