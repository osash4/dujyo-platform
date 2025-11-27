#!/bin/bash

# ===========================================
# XWAVE PRODUCTION DEPLOYMENT SCRIPT
# ===========================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="xwave"
ENVIRONMENT="production"
VERSION="1.0.0"
DOMAIN="xwave.com"
EMAIL="admin@xwave.com"

# Logging
LOG_FILE="/var/log/xwave/deployment.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# ===========================================
# PRE-DEPLOYMENT CHECKS
# ===========================================

check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if Nginx is installed
    if ! command -v nginx &> /dev/null; then
        warning "Nginx is not installed. Installing..."
        sudo apt-get update
        sudo apt-get install -y nginx
    fi
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        warning "Certbot is not installed. Installing..."
        sudo apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Check available disk space
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 10485760 ]; then  # 10GB in KB
        error "Insufficient disk space. At least 10GB required."
    fi
    
    # Check available memory
    AVAILABLE_MEMORY=$(free -m | awk 'NR==2{print $7}')
    if [ "$AVAILABLE_MEMORY" -lt 4096 ]; then  # 4GB
        error "Insufficient memory. At least 4GB required."
    fi
    
    log "✅ Prerequisites check completed"
}

# ===========================================
# ENVIRONMENT SETUP
# ===========================================

setup_environment() {
    log "🔧 Setting up environment..."
    
    # Create necessary directories
    mkdir -p /var/log/xwave
    mkdir -p /var/lib/xwave/data
    mkdir -p /var/lib/xwave/backups
    mkdir -p /etc/xwave
    
    # Set proper permissions
    chmod 755 /var/log/xwave
    chmod 755 /var/lib/xwave
    chmod 755 /etc/xwave
    
    # Copy environment file
    if [ -f "env.production" ]; then
        cp env.production /etc/xwave/.env
        chmod 600 /etc/xwave/.env
        log "✅ Environment file copied"
    else
        error "Environment file not found: env.production"
    fi
    
    # Create systemd service files
    create_systemd_services
    
    log "✅ Environment setup completed"
}

# ===========================================
# SYSTEMD SERVICES
# ===========================================

create_systemd_services() {
    log "🔧 Creating systemd services..."
    
    # XWave Backend Service
    cat > /etc/systemd/system/xwave-backend.service << EOF
[Unit]
Description=XWave Backend Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/xwave
ExecStart=/usr/bin/docker-compose -f docker-compose.production.yml up -d backend_1 backend_2 backend_3
ExecStop=/usr/bin/docker-compose -f docker-compose.production.yml stop backend_1 backend_2 backend_3
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    # XWave Frontend Service
    cat > /etc/systemd/system/xwave-frontend.service << EOF
[Unit]
Description=XWave Frontend Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/xwave
ExecStart=/usr/bin/docker-compose -f docker-compose.production.yml up -d frontend_1 frontend_2 frontend_3
ExecStop=/usr/bin/docker-compose -f docker-compose.production.yml stop frontend_1 frontend_2 frontend_3
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    # XWave Blockchain Service
    cat > /etc/systemd/system/xwave-blockchain.service << EOF
[Unit]
Description=XWave Blockchain Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/xwave
ExecStart=/usr/bin/docker-compose -f docker-compose.production.yml up -d blockchain_1 blockchain_2 blockchain_3
ExecStop=/usr/bin/docker-compose -f docker-compose.production.yml stop blockchain_1 blockchain_2 blockchain_3
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd
    systemctl daemon-reload
    
    log "✅ Systemd services created"
}

# ===========================================
# DOCKER IMAGES BUILD
# ===========================================

build_docker_images() {
    log "🏗️ Building Docker images..."
    
    # Build backend image
    log "Building backend image..."
    docker build -t xwave-backend:latest -f xwave-backend/Dockerfile xwave-backend/
    
    # Build frontend image
    log "Building frontend image..."
    docker build -t xwave-frontend:latest -f xwave-frontend/Dockerfile xwave-frontend/
    
    # Build blockchain image
    log "Building blockchain image..."
    docker build -t xwave-blockchain:latest -f blockchain/Dockerfile blockchain/
    
    log "✅ Docker images built successfully"
}

# ===========================================
# DATABASE SETUP
# ===========================================

setup_database() {
    log "🗄️ Setting up database..."
    
    # Start PostgreSQL
    docker-compose -f docker-compose.production.yml up -d postgres_master postgres_replica
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 30
    
    # Run migrations
    log "Running database migrations..."
    docker-compose -f docker-compose.production.yml exec postgres_master psql -U xwave_user -d xwave_production -f /docker-entrypoint-initdb.d/001_initial_schema.sql
    docker-compose -f docker-compose.production.yml exec postgres_master psql -U xwave_user -d xwave_production -f /docker-entrypoint-initdb.d/002_dex_transactions.sql
    docker-compose -f docker-compose.production.yml exec postgres_master psql -U xwave_user -d xwave_production -f /docker-entrypoint-initdb.d/003_database_optimization.sql
    
    log "✅ Database setup completed"
}

# ===========================================
# REDIS SETUP
# ===========================================

setup_redis() {
    log "🔴 Setting up Redis..."
    
    # Start Redis cluster
    docker-compose -f docker-compose.production.yml up -d redis_master redis_replica
    
    # Wait for Redis to be ready
    log "Waiting for Redis to be ready..."
    sleep 15
    
    # Test Redis connection
    docker-compose -f docker-compose.production.yml exec redis_master redis-cli ping
    
    log "✅ Redis setup completed"
}

# ===========================================
# APPLICATION DEPLOYMENT
# ===========================================

deploy_application() {
    log "🚀 Deploying application..."
    
    # Start all services
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 60
    
    # Check service health
    check_service_health
    
    log "✅ Application deployment completed"
}

# ===========================================
# NGINX CONFIGURATION
# ===========================================

configure_nginx() {
    log "🌐 Configuring Nginx..."
    
    # Copy Nginx configuration
    cp nginx.conf /etc/nginx/sites-available/xwave
    ln -sf /etc/nginx/sites-available/xwave /etc/nginx/sites-enabled/
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
    
    log "✅ Nginx configuration completed"
}

# ===========================================
# SSL CERTIFICATE
# ===========================================

setup_ssl() {
    log "🔒 Setting up SSL certificate..."
    
    # Check if domain is accessible
    if ! ping -c 1 "$DOMAIN" &> /dev/null; then
        warning "Domain $DOMAIN is not accessible. Skipping SSL setup."
        return
    fi
    
    # Obtain SSL certificate
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" -d "app.$DOMAIN" --non-interactive --agree-tos --email "$EMAIL"
    
    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log "✅ SSL certificate setup completed"
}

# ===========================================
# MONITORING SETUP
# ===========================================

setup_monitoring() {
    log "📊 Setting up monitoring..."
    
    # Start monitoring services
    docker-compose -f docker-compose.production.yml up -d prometheus grafana elasticsearch kibana jaeger
    
    # Wait for services to be ready
    sleep 30
    
    # Import Grafana dashboards
    import_grafana_dashboards
    
    # Setup log aggregation
    setup_log_aggregation
    
    log "✅ Monitoring setup completed"
}

# ===========================================
# GRAFANA DASHBOARDS
# ===========================================

import_grafana_dashboards() {
    log "📈 Importing Grafana dashboards..."
    
    # Wait for Grafana to be ready
    sleep 20
    
    # Import XWave dashboard
    curl -X POST \
        -H "Content-Type: application/json" \
        -d @grafana-dashboard.json \
        http://admin:grafana_admin_2024!@localhost:3000/api/dashboards/db
    
    log "✅ Grafana dashboards imported"
}

# ===========================================
# LOG AGGREGATION
# ===========================================

setup_log_aggregation() {
    log "📝 Setting up log aggregation..."
    
    # Create log directories
    mkdir -p /var/log/xwave/backend
    mkdir -p /var/log/xwave/frontend
    mkdir -p /var/log/xwave/blockchain
    
    # Setup log rotation
    cat > /etc/logrotate.d/xwave << EOF
/var/log/xwave/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        systemctl reload nginx
    endscript
}
EOF
    
    log "✅ Log aggregation setup completed"
}

# ===========================================
# HEALTH CHECKS
# ===========================================

check_service_health() {
    log "🏥 Checking service health..."
    
    # Check backend health
    for i in {1..3}; do
        if curl -f http://localhost:808$i/health &> /dev/null; then
            log "✅ Backend $i is healthy"
        else
            error "❌ Backend $i is not healthy"
        fi
    done
    
    # Check frontend health
    for i in {1..3}; do
        if curl -f http://localhost:300$i &> /dev/null; then
            log "✅ Frontend $i is healthy"
        else
            error "❌ Frontend $i is not healthy"
        fi
    done
    
    # Check blockchain health
    for i in {1..3}; do
        if curl -f http://localhost:900$i/health &> /dev/null; then
            log "✅ Blockchain $i is healthy"
        else
            error "❌ Blockchain $i is not healthy"
        fi
    done
    
    log "✅ All services are healthy"
}

# ===========================================
# BACKUP SETUP
# ===========================================

setup_backups() {
    log "💾 Setting up backups..."
    
    # Create backup script
    cat > /usr/local/bin/xwave-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/lib/xwave/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="xwave_backup_$DATE.tar.gz"

# Create backup
docker-compose -f /opt/xwave/docker-compose.production.yml exec postgres_master pg_dump -U xwave_user xwave_production > "$BACKUP_DIR/database_$DATE.sql"
docker-compose -f /opt/xwave/docker-compose.production.yml exec redis_master redis-cli --rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Compress backup
tar -czf "$BACKUP_DIR/$BACKUP_FILE" "$BACKUP_DIR/database_$DATE.sql" "$BACKUP_DIR/redis_$DATE.rdb"

# Upload to S3 (if configured)
if [ -n "$BACKUP_S3_BUCKET" ]; then
    aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$BACKUP_S3_BUCKET/"
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

    chmod +x /usr/local/bin/xwave-backup.sh
    
    # Setup cron job
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/xwave-backup.sh") | crontab -
    
    log "✅ Backup setup completed"
}

# ===========================================
# SECURITY HARDENING
# ===========================================

harden_security() {
    log "🔒 Hardening security..."
    
    # Setup firewall
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 8080:8082/tcp
    ufw allow 3000:3002/tcp
    ufw allow 9000:9002/tcp
    
    # Setup fail2ban
    apt-get install -y fail2ban
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF
    
    systemctl enable fail2ban
    systemctl start fail2ban
    
    # Setup automatic security updates
    apt-get install -y unattended-upgrades
    echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades
    
    log "✅ Security hardening completed"
}

# ===========================================
# PERFORMANCE OPTIMIZATION
# ===========================================

optimize_performance() {
    log "⚡ Optimizing performance..."
    
    # Optimize kernel parameters
    cat >> /etc/sysctl.conf << EOF
# XWave Performance Optimizations
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr
EOF
    
    sysctl -p
    
    # Optimize file limits
    cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF
    
    log "✅ Performance optimization completed"
}

# ===========================================
# FINAL VERIFICATION
# ===========================================

final_verification() {
    log "🔍 Final verification..."
    
    # Check all services
    check_service_health
    
    # Check SSL certificate
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        log "✅ SSL certificate is valid"
    else
        warning "SSL certificate not found"
    fi
    
    # Check monitoring
    if curl -f http://localhost:9090 &> /dev/null; then
        log "✅ Prometheus is running"
    else
        warning "Prometheus is not running"
    fi
    
    if curl -f http://localhost:3000 &> /dev/null; then
        log "✅ Grafana is running"
    else
        warning "Grafana is not running"
    fi
    
    # Check backups
    if [ -f "/usr/local/bin/xwave-backup.sh" ]; then
        log "✅ Backup system is configured"
    else
        warning "Backup system not configured"
    fi
    
    log "✅ Final verification completed"
}

# ===========================================
# MAIN DEPLOYMENT FUNCTION
# ===========================================

main() {
    log "🚀 Starting XWave Production Deployment"
    log "Version: $VERSION"
    log "Environment: $ENVIRONMENT"
    log "Domain: $DOMAIN"
    
    # Pre-deployment checks
    check_prerequisites
    
    # Environment setup
    setup_environment
    
    # Build Docker images
    build_docker_images
    
    # Database setup
    setup_database
    
    # Redis setup
    setup_redis
    
    # Application deployment
    deploy_application
    
    # Nginx configuration
    configure_nginx
    
    # SSL setup
    setup_ssl
    
    # Monitoring setup
    setup_monitoring
    
    # Backup setup
    setup_backups
    
    # Security hardening
    harden_security
    
    # Performance optimization
    optimize_performance
    
    # Final verification
    final_verification
    
    log "🎉 XWave Production Deployment Completed Successfully!"
    log "🌐 Application URL: https://$DOMAIN"
    log "📊 Monitoring: https://$DOMAIN:3000"
    log "📈 Metrics: https://$DOMAIN:9090"
    log "📝 Logs: /var/log/xwave/"
    log "💾 Backups: /var/lib/xwave/backups/"
    
    # Display service status
    log "📋 Service Status:"
    systemctl status xwave-backend --no-pager
    systemctl status xwave-frontend --no-pager
    systemctl status xwave-blockchain --no-pager
}

# ===========================================
# ERROR HANDLING
# ===========================================

trap 'error "Deployment failed at line $LINENO"' ERR

# ===========================================
# EXECUTION
# ===========================================

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root (use sudo)"
fi

# Run main function
main "$@"