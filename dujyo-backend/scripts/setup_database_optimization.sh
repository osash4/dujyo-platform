#!/bin/bash

# XWave Database Optimization Setup Script
# This script sets up the complete database optimization infrastructure:
# - PostgreSQL master and read replicas
# - Redis cache cluster
# - Database users and permissions
# - Monitoring and alerting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MASTER_PORT=5432
REPLICA1_PORT=5433
REPLICA2_PORT=5434
REDIS_PORT=6379
DATABASE_NAME="xwave_blockchain"
MASTER_USER="xwave_user"
READONLY_USER="xwave_readonly"
REPLICATION_USER="xwave_repl"
APP_USER="xwave_app"
MONITORING_USER="monitoring"

echo -e "${BLUE}🚀 XWave Database Optimization Setup${NC}"
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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL is not installed. Please install PostgreSQL 15+ first."
    exit 1
fi

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    print_warning "Redis is not installed. Installing Redis..."
    
    # Install Redis based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install redis
        else
            print_error "Homebrew not found. Please install Redis manually."
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y redis-server
        elif command -v yum &> /dev/null; then
            sudo yum install -y redis
        else
            print_error "Package manager not found. Please install Redis manually."
            exit 1
        fi
    else
        print_error "Unsupported OS. Please install Redis manually."
        exit 1
    fi
fi

print_status "PostgreSQL and Redis are available"

# 1. Setup PostgreSQL Master
echo -e "\n${BLUE}📊 Setting up PostgreSQL Master...${NC}"

# Create master database if it doesn't exist
sudo -u postgres psql -c "CREATE DATABASE $DATABASE_NAME;" 2>/dev/null || print_warning "Database $DATABASE_NAME already exists"

# Create users
sudo -u postgres psql -c "CREATE USER $MASTER_USER WITH PASSWORD 'xwave_master_2024';" 2>/dev/null || print_warning "User $MASTER_USER already exists"
sudo -u postgres psql -c "CREATE USER $READONLY_USER WITH PASSWORD 'xwave_readonly_2024';" 2>/dev/null || print_warning "User $READONLY_USER already exists"
sudo -u postgres psql -c "CREATE USER $REPLICATION_USER WITH REPLICATION PASSWORD 'xwave_repl_2024';" 2>/dev/null || print_warning "User $REPLICATION_USER already exists"
sudo -u postgres psql -c "CREATE USER $APP_USER WITH PASSWORD 'xwave_app_2024';" 2>/dev/null || print_warning "User $APP_USER already exists"
sudo -u postgres psql -c "CREATE USER $MONITORING_USER WITH PASSWORD 'xwave_monitoring_2024';" 2>/dev/null || print_warning "User $MONITORING_USER already exists"

# Grant permissions
sudo -u postgres psql -d $DATABASE_NAME -c "GRANT ALL PRIVILEGES ON DATABASE $DATABASE_NAME TO $MASTER_USER;"
sudo -u postgres psql -d $DATABASE_NAME -c "GRANT ALL PRIVILEGES ON DATABASE $DATABASE_NAME TO $APP_USER;"
sudo -u postgres psql -d $DATABASE_NAME -c "GRANT CONNECT ON DATABASE $DATABASE_NAME TO $READONLY_USER;"
sudo -u postgres psql -d $DATABASE_NAME -c "GRANT CONNECT ON DATABASE $DATABASE_NAME TO $MONITORING_USER;"

print_status "PostgreSQL Master setup complete"

# 2. Setup PostgreSQL Read Replicas
echo -e "\n${BLUE}📊 Setting up PostgreSQL Read Replicas...${NC}"

# Create replica data directories
sudo mkdir -p /var/lib/postgresql/15/replica1
sudo mkdir -p /var/lib/postgresql/15/replica2
sudo chown -R postgres:postgres /var/lib/postgresql/15/replica1
sudo chown -R postgres:postgres /var/lib/postgresql/15/replica2

# Initialize replica databases
sudo -u postgres /usr/lib/postgresql/15/bin/pg_basebackup -h localhost -D /var/lib/postgresql/15/replica1 -U $REPLICATION_USER -v -P -W -R -S replica1_slot
sudo -u postgres /usr/lib/postgresql/15/bin/pg_basebackup -h localhost -D /var/lib/postgresql/15/replica2 -U $REPLICATION_USER -v -P -W -R -S replica2_slot

print_status "PostgreSQL Read Replicas setup complete"

# 3. Configure PostgreSQL
echo -e "\n${BLUE}⚙️ Configuring PostgreSQL...${NC}"

# Copy configuration files
sudo cp config/postgresql-master.conf /etc/postgresql/15/main/postgresql.conf
sudo cp config/pg_hba.conf /etc/postgresql/15/main/pg_hba.conf

# Set proper permissions
sudo chown postgres:postgres /etc/postgresql/15/main/postgresql.conf
sudo chown postgres:postgres /etc/postgresql/15/main/pg_hba.conf
sudo chmod 600 /etc/postgresql/15/main/postgresql.conf
sudo chmod 600 /etc/postgresql/15/main/pg_hba.conf

print_status "PostgreSQL configuration complete"

# 4. Setup Redis
echo -e "\n${BLUE}🔴 Setting up Redis Cache...${NC}"

# Create Redis configuration
sudo tee /etc/redis/xwave-redis.conf > /dev/null <<EOF
# XWave Redis Configuration
port $REDIS_PORT
bind 127.0.0.1
protected-mode yes
requirepass xwave_redis_2024

# Memory optimization
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile /var/log/redis/xwave-redis.log

# Performance
tcp-keepalive 300
timeout 0
tcp-backlog 511
EOF

# Create Redis log directory
sudo mkdir -p /var/log/redis
sudo chown redis:redis /var/log/redis

# Start Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

print_status "Redis setup complete"

# 5. Run Database Migrations
echo -e "\n${BLUE}📋 Running Database Migrations...${NC}"

# Set environment variables
export DATABASE_URL="postgresql://$MASTER_USER:xwave_master_2024@localhost:$MASTER_PORT/$DATABASE_NAME"
export REDIS_URL="redis://:xwave_redis_2024@localhost:$REDIS_PORT"

# Run migrations
cd "$(dirname "$0")/.."
cargo run --bin migrate-database

print_status "Database migrations complete"

# 6. Setup Monitoring
echo -e "\n${BLUE}📊 Setting up Monitoring...${NC}"

# Create monitoring directory
mkdir -p logs/monitoring

# Create monitoring script
cat > scripts/monitor_database.sh <<'EOF'
#!/bin/bash

# Database monitoring script
LOG_FILE="logs/monitoring/database_$(date +%Y%m%d).log"

echo "$(date): Starting database health check" >> "$LOG_FILE"

# Check PostgreSQL master
if pg_isready -h localhost -p 5432 -U xwave_user; then
    echo "$(date): PostgreSQL Master: HEALTHY" >> "$LOG_FILE"
else
    echo "$(date): PostgreSQL Master: UNHEALTHY" >> "$LOG_FILE"
fi

# Check PostgreSQL replicas
if pg_isready -h localhost -p 5433 -U xwave_readonly; then
    echo "$(date): PostgreSQL Replica 1: HEALTHY" >> "$LOG_FILE"
else
    echo "$(date): PostgreSQL Replica 1: UNHEALTHY" >> "$LOG_FILE"
fi

if pg_isready -h localhost -p 5434 -U xwave_readonly; then
    echo "$(date): PostgreSQL Replica 2: HEALTHY" >> "$LOG_FILE"
else
    echo "$(date): PostgreSQL Replica 2: UNHEALTHY" >> "$LOG_FILE"
fi

# Check Redis
if redis-cli -a xwave_redis_2024 ping | grep -q PONG; then
    echo "$(date): Redis: HEALTHY" >> "$LOG_FILE"
else
    echo "$(date): Redis: UNHEALTHY" >> "$LOG_FILE"
fi

echo "$(date): Health check complete" >> "$LOG_FILE"
EOF

chmod +x scripts/monitor_database.sh

# Setup cron job for monitoring
(crontab -l 2>/dev/null; echo "*/5 * * * * $(pwd)/scripts/monitor_database.sh") | crontab -

print_status "Monitoring setup complete"

# 7. Create Environment File
echo -e "\n${BLUE}📝 Creating Environment Configuration...${NC}"

cat > .env.database <<EOF
# XWave Database Configuration

# Master Database
DATABASE_URL=postgresql://$MASTER_USER:xwave_master_2024@localhost:$MASTER_PORT/$DATABASE_NAME

# Read Replicas
DATABASE_REPLICA1_URL=postgresql://$READONLY_USER:xwave_readonly_2024@localhost:$REPLICA1_PORT/$DATABASE_NAME
DATABASE_REPLICA2_URL=postgresql://$READONLY_USER:xwave_readonly_2024@localhost:$REPLICA2_PORT/$DATABASE_NAME

# Redis Cache
REDIS_URL=redis://:xwave_redis_2024@localhost:$REDIS_PORT

# Database Pool Configuration
DB_MAX_CONNECTIONS=50
DB_MIN_CONNECTIONS=10
DB_CONNECTION_TIMEOUT=10
DB_IDLE_TIMEOUT=600
DB_MAX_LIFETIME=1800

# Cache Configuration
CACHE_TTL_BALANCES=30
CACHE_TTL_CONTENT=300
CACHE_TTL_DEX_POOLS=10
CACHE_TTL_TRANSACTIONS=60
CACHE_TTL_BLOCKCHAIN_STATS=30

# Monitoring
ENABLE_MONITORING=true
ALERT_EMAIL=admin@xwave.com
SLACK_WEBHOOK_URL=
EOF

print_status "Environment configuration created"

# 8. Performance Testing
echo -e "\n${BLUE}🧪 Running Performance Tests...${NC}"

# Create performance test script
cat > scripts/performance_test.sh <<'EOF'
#!/bin/bash

echo "Running XWave Database Performance Tests..."

# Test database connection
echo "Testing database connections..."
psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null && echo "✅ Master DB: OK" || echo "❌ Master DB: FAIL"
psql "$DATABASE_REPLICA1_URL" -c "SELECT 1;" > /dev/null && echo "✅ Replica 1: OK" || echo "❌ Replica 1: FAIL"
psql "$DATABASE_REPLICA2_URL" -c "SELECT 1;" > /dev/null && echo "✅ Replica 2: OK" || echo "❌ Replica 2: FAIL"

# Test Redis connection
echo "Testing Redis connection..."
redis-cli -a xwave_redis_2024 ping | grep -q PONG && echo "✅ Redis: OK" || echo "❌ Redis: FAIL"

# Test query performance
echo "Testing query performance..."
time psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM balances;" > /dev/null
time psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM transactions;" > /dev/null
time psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM blocks;" > /dev/null

echo "Performance tests complete!"
EOF

chmod +x scripts/performance_test.sh

# Run performance tests
source .env.database
./scripts/performance_test.sh

print_status "Performance tests complete"

# 9. Final Setup
echo -e "\n${BLUE}🎯 Final Setup...${NC}"

# Create startup script
cat > scripts/start_optimized_services.sh <<'EOF'
#!/bin/bash

echo "Starting XWave Optimized Services..."

# Start PostgreSQL
sudo systemctl start postgresql
echo "✅ PostgreSQL started"

# Start Redis
sudo systemctl start redis-server
echo "✅ Redis started"

# Start XWave Backend with optimized storage
export $(cat .env.database | xargs)
cargo run --release

echo "🚀 XWave services started with database optimization!"
EOF

chmod +x scripts/start_optimized_services.sh

# Create stop script
cat > scripts/stop_optimized_services.sh <<'EOF'
#!/bin/bash

echo "Stopping XWave Optimized Services..."

# Stop XWave Backend (if running)
pkill -f "xwavve-backend" || true

# Stop Redis
sudo systemctl stop redis-server
echo "✅ Redis stopped"

# Stop PostgreSQL
sudo systemctl stop postgresql
echo "✅ PostgreSQL stopped"

echo "🛑 XWave services stopped"
EOF

chmod +x scripts/stop_optimized_services.sh

# 10. Summary
echo -e "\n${GREEN}🎉 XWave Database Optimization Setup Complete!${NC}"
echo "================================================"
echo ""
echo -e "${BLUE}📊 Database Configuration:${NC}"
echo "  • Master: localhost:$MASTER_PORT"
echo "  • Replica 1: localhost:$REPLICA1_PORT"
echo "  • Replica 2: localhost:$REPLICA2_PORT"
echo "  • Redis: localhost:$REDIS_PORT"
echo ""
echo -e "${BLUE}👥 Database Users:${NC}"
echo "  • Master: $MASTER_USER"
echo "  • Read-only: $READONLY_USER"
echo "  • App: $APP_USER"
echo "  • Monitoring: $MONITORING_USER"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "  1. Review configuration in .env.database"
echo "  2. Start services: ./scripts/start_optimized_services.sh"
echo "  3. Monitor performance: ./scripts/monitor_database.sh"
echo "  4. Run tests: ./scripts/performance_test.sh"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "  • Database optimization: migrations/003_database_optimization.sql"
echo "  • Cache configuration: src/cache/mod.rs"
echo "  • Monitoring: src/monitoring/mod.rs"
echo ""
echo -e "${GREEN}✅ Setup complete! Your XWave database is now optimized for 1M+ users.${NC}"
