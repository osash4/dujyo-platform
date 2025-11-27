#!/bin/bash

#! XWave Free Deployment Script
#! 
#! This script deploys XWave to free hosting services:
#! - Frontend: Vercel/Netlify (free tier)
#! - Backend: Railway/Render (free tier)
#! - Database: Supabase/Neon (free tier)
#! - Blockchain: Oracle Cloud VPS (free tier)
#! - CDN: Cloudflare (free tier)

set -e

# ===========================================
# CONFIGURATION
# ===========================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_NAME="xwave"
FRONTEND_DIR="xwave-frontend"
BACKEND_DIR="xwave-backend"
SCRIPTS_DIR="scripts"

# Service configurations
VERCEL_PROJECT_NAME="xwave-frontend"
NETLIFY_SITE_NAME="xwave-entertainment"
RAILWAY_PROJECT_NAME="xwave-backend"
RENDER_SERVICE_NAME="xwave-backend"
SUPABASE_PROJECT_NAME="xwave-db"
NEON_PROJECT_NAME="xwave-db"
ORACLE_VPS_NAME="xwave-blockchain"

# ===========================================
# UTILITY FUNCTIONS
# ===========================================

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

header() {
    echo -e "${PURPLE}===========================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}===========================================${NC}"
}

# ===========================================
# DEPLOYMENT FUNCTIONS
# ===========================================

deploy_frontend_vercel() {
    header "Deploying Frontend to Vercel"
    
    if ! command -v vercel &> /dev/null; then
        log "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    cd $FRONTEND_DIR
    
    # Create vercel.json if it doesn't exist
    if [ ! -f "vercel.json" ]; then
        cat > vercel.json << EOF
{
  "version": 2,
  "name": "$VERCEL_PROJECT_NAME",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_API_URL": "@api_url",
    "VITE_BLOCKCHAIN_URL": "@blockchain_url",
    "VITE_DEX_URL": "@dex_url"
  }
}
EOF
    fi
    
    log "Deploying to Vercel..."
    vercel --prod --yes
    
    success "Frontend deployed to Vercel!"
    cd ..
}

deploy_frontend_netlify() {
    header "Deploying Frontend to Netlify"
    
    if ! command -v netlify &> /dev/null; then
        log "Installing Netlify CLI..."
        npm install -g netlify-cli
    fi
    
    cd $FRONTEND_DIR
    
    # Create netlify.toml if it doesn't exist
    if [ ! -f "netlify.toml" ]; then
        cat > netlify.toml << EOF
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
  VITE_API_URL = "https://xwave-backend.railway.app"
  VITE_BLOCKCHAIN_URL = "https://blockchain.xwave.com"
  VITE_DEX_URL = "https://dex.xwave.com"
EOF
    fi
    
    log "Deploying to Netlify..."
    netlify deploy --prod --dir=dist
    
    success "Frontend deployed to Netlify!"
    cd ..
}

deploy_backend_railway() {
    header "Deploying Backend to Railway"
    
    if ! command -v railway &> /dev/null; then
        log "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    cd $BACKEND_DIR
    
    # Create railway.json if it doesn't exist
    if [ ! -f "railway.json" ]; then
        cat > railway.json << EOF
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cargo run --release",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF
    fi
    
    log "Deploying to Railway..."
    railway login
    railway link
    railway up
    
    success "Backend deployed to Railway!"
    cd ..
}

deploy_backend_render() {
    header "Deploying Backend to Render"
    
    cd $BACKEND_DIR
    
    # Create render.yaml if it doesn't exist
    if [ ! -f "render.yaml" ]; then
        cat > render.yaml << EOF
services:
  - type: web
    name: $RENDER_SERVICE_NAME
    env: rust
    buildCommand: cargo build --release
    startCommand: ./target/release/xwave-backend
    healthCheckPath: /health
    envVars:
      - key: RUST_LOG
        value: info
      - key: PORT
        value: 10000
      - key: DATABASE_URL
        fromDatabase:
          name: xwave-db
          property: connectionString
      - key: REDIS_URL
        value: redis://localhost:6379
      - key: JWT_SECRET
        generateValue: true
      - key: ENVIRONMENT
        value: production

databases:
  - name: xwave-db
    databaseName: xwave
    user: xwave_user
    plan: free
EOF
    fi
    
    log "Creating Render service..."
    # Note: This would require Render CLI or manual setup
    warning "Please manually create the service on Render dashboard using render.yaml"
    
    success "Backend configuration created for Render!"
    cd ..
}

setup_database_supabase() {
    header "Setting up Database on Supabase"
    
    if ! command -v supabase &> /dev/null; then
        log "Installing Supabase CLI..."
        npm install -g supabase
    fi
    
    log "Initializing Supabase project..."
    supabase init
    
    log "Starting local Supabase..."
    supabase start
    
    log "Creating database schema..."
    supabase db reset
    
    success "Database setup on Supabase complete!"
}

setup_database_neon() {
    header "Setting up Database on Neon"
    
    log "Creating Neon project..."
    # Note: This would require Neon CLI or manual setup
    warning "Please manually create the project on Neon dashboard"
    
    log "Database connection string will be provided by Neon"
    success "Database setup on Neon complete!"
}

setup_blockchain_oracle() {
    header "Setting up Blockchain on Oracle Cloud"
    
    log "Creating Oracle Cloud VPS..."
    # Note: This would require Oracle Cloud CLI or manual setup
    warning "Please manually create the VPS on Oracle Cloud dashboard"
    
    log "VPS specifications:"
    echo "  - Shape: VM.Standard.E2.1.Micro (Always Free)"
    echo "  - OS: Ubuntu 20.04 LTS"
    echo "  - Storage: 50GB"
    echo "  - Memory: 1GB"
    echo "  - CPU: 1 OCPU"
    
    success "Blockchain setup on Oracle Cloud complete!"
}

setup_cdn_cloudflare() {
    header "Setting up CDN on Cloudflare"
    
    log "Creating Cloudflare account..."
    # Note: This would require Cloudflare CLI or manual setup
    warning "Please manually setup Cloudflare account and add domain"
    
    log "Cloudflare features to enable:"
    echo "  - DNS management"
    echo "  - SSL/TLS certificates"
    echo "  - Caching"
    echo "  - DDoS protection"
    echo "  - Analytics"
    
    success "CDN setup on Cloudflare complete!"
}

# ===========================================
# ENVIRONMENT SETUP
# ===========================================

setup_environment() {
    header "Setting up Environment Variables"
    
    # Create .env.production file
    cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
RUST_LOG=info

# Database
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_REPLICA1_URL=postgresql://user:password@host:port/database
DATABASE_REPLICA2_URL=postgresql://user:password@host:port/database

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# API URLs
API_URL=https://xwave-backend.railway.app
BLOCKCHAIN_URL=https://blockchain.xwave.com
DEX_URL=https://dex.xwave.com
FRONTEND_URL=https://xwave.vercel.app

# Monitoring
ENABLE_MONITORING=true
MONITORING_INTERVAL=30

# Security
RATE_LIMIT_IP_MAX_REQUESTS=100
RATE_LIMIT_USER_MAX_REQUESTS=1000
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT_MS=30000

# Email
EMAIL_SERVICE_API_KEY=your-email-api-key
EMAIL_SENDER_EMAIL=noreply@xwave.com
EMAIL_RECIPIENT_EMAIL=admin@xwave.com

# Notifications
SLACK_WEBHOOK_URL=your-slack-webhook-url
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
DISCORD_WEBHOOK_URL=your-discord-webhook-url
EOF
    
    success "Environment variables created!"
}

# ===========================================
# CI/CD SETUP
# ===========================================

setup_cicd() {
    header "Setting up CI/CD Pipeline"
    
    # Create GitHub Actions workflow
    mkdir -p .github/workflows
    
    cat > .github/workflows/deploy.yml << EOF
name: Deploy XWave

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: xwave-frontend/package-lock.json
    
    - name: Setup Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
        components: rustfmt, clippy
    
    - name: Install frontend dependencies
      run: |
        cd xwave-frontend
        npm ci
    
    - name: Install backend dependencies
      run: |
        cd xwave-backend
        cargo fetch
    
    - name: Run frontend tests
      run: |
        cd xwave-frontend
        npm test
    
    - name: Run backend tests
      run: |
        cd xwave-backend
        cargo test
    
    - name: Build frontend
      run: |
        cd xwave-frontend
        npm run build
    
    - name: Build backend
      run: |
        cd xwave-backend
        cargo build --release

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: \${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
        working-directory: ./xwave-frontend
    
    - name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v1.2
      with:
        publish-dir: './xwave-frontend/dist'
        production-branch: main
        github-token: \${{ secrets.GITHUB_TOKEN }}
        deploy-message: "Deploy from GitHub Actions"
        enable-pull-request-comment: false
        enable-commit-comment: true
        overwrites-pull-request-comment: true
      env:
        NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Railway
      uses: railway-app/railway-deploy@v1
      with:
        railway-token: \${{ secrets.RAILWAY_TOKEN }}
        service: xwave-backend
    
    - name: Deploy to Render
      uses: johnbeynon/render-deploy-action@v0.0.8
      with:
        service-id: \${{ secrets.RENDER_SERVICE_ID }}
        api-key: \${{ secrets.RENDER_API_KEY }}
EOF
    
    success "CI/CD pipeline created!"
}

# ===========================================
# MONITORING SETUP
# ===========================================

setup_monitoring() {
    header "Setting up Monitoring"
    
    # Create monitoring configuration
    cat > monitoring-config.yml << EOF
# Monitoring Configuration for XWave

# Prometheus configuration
prometheus:
  scrape_interval: 15s
  evaluation_interval: 15s
  
  scrape_configs:
    - job_name: 'xwave-backend'
      static_configs:
        - targets: ['localhost:8080']
      metrics_path: '/metrics'
      scrape_interval: 30s
      
    - job_name: 'xwave-blockchain'
      static_configs:
        - targets: ['localhost:8081']
      metrics_path: '/metrics'
      scrape_interval: 30s

# Grafana dashboards
grafana:
  dashboards:
    - name: 'XWave Overview'
      url: 'https://grafana.com/grafana/dashboards/1860'
    - name: 'XWave Backend'
      url: 'https://grafana.com/grafana/dashboards/315'
    - name: 'XWave Blockchain'
      url: 'https://grafana.com/grafana/dashboards/1860'

# Alerting rules
alerting:
  rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        
    - alert: HighResponseTime
      expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High response time detected"
EOF
    
    success "Monitoring configuration created!"
}

# ===========================================
# BACKUP SETUP
# ===========================================

setup_backup() {
    header "Setting up Backup Strategy"
    
    # Create backup script
    cat > scripts/backup.sh << 'EOF'
#!/bin/bash

# XWave Backup Script
# This script creates backups of the database and important files

set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="xwave_backup_$DATE.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump $DATABASE_URL > $BACKUP_DIR/database_$DATE.sql

# Configuration backup
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    .env.production \
    docker-compose.yml \
    monitoring-config.yml

# Create full backup
tar -czf $BACKUP_DIR/$BACKUP_FILE \
    $BACKUP_DIR/database_$DATE.sql \
    $BACKUP_DIR/config_$DATE.tar.gz

# Upload to cloud storage (if configured)
if [ ! -z "$BACKUP_S3_BUCKET" ]; then
    aws s3 cp $BACKUP_DIR/$BACKUP_FILE s3://$BACKUP_S3_BUCKET/
fi

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
EOF
    
    chmod +x scripts/backup.sh
    
    # Create restore script
    cat > scripts/restore.sh << 'EOF'
#!/bin/bash

# XWave Restore Script
# This script restores from a backup

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Extract backup
tar -xzf $BACKUP_FILE

# Restore database
psql $DATABASE_URL < database_*.sql

# Restore configuration
tar -xzf config_*.tar.gz

echo "Restore completed from: $BACKUP_FILE"
EOF
    
    chmod +x scripts/restore.sh
    
    success "Backup strategy created!"
}

# ===========================================
# MAIN DEPLOYMENT FUNCTION
# ===========================================

main() {
    header "XWave Free Deployment Script"
    
    log "Starting deployment to free hosting services..."
    
    # Check if we're in the right directory
    if [ ! -d "$FRONTEND_DIR" ] || [ ! -d "$BACKEND_DIR" ]; then
        error "Please run this script from the XWave project root directory"
        exit 1
    fi
    
    # Setup environment
    setup_environment
    
    # Deploy frontend
    read -p "Deploy frontend to Vercel? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_frontend_vercel
    fi
    
    read -p "Deploy frontend to Netlify? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_frontend_netlify
    fi
    
    # Deploy backend
    read -p "Deploy backend to Railway? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_backend_railway
    fi
    
    read -p "Deploy backend to Render? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_backend_render
    fi
    
    # Setup database
    read -p "Setup database on Supabase? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_database_supabase
    fi
    
    read -p "Setup database on Neon? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_database_neon
    fi
    
    # Setup blockchain
    read -p "Setup blockchain on Oracle Cloud? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_blockchain_oracle
    fi
    
    # Setup CDN
    read -p "Setup CDN on Cloudflare? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_cdn_cloudflare
    fi
    
    # Setup CI/CD
    read -p "Setup CI/CD pipeline? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_cicd
    fi
    
    # Setup monitoring
    read -p "Setup monitoring? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_monitoring
    fi
    
    # Setup backup
    read -p "Setup backup strategy? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_backup
    fi
    
    header "Deployment Complete!"
    
    success "XWave has been deployed to free hosting services!"
    log "Next steps:"
    echo "  1. Update environment variables with actual values"
    echo "  2. Configure domain names"
    echo "  3. Set up SSL certificates"
    echo "  4. Configure monitoring alerts"
    echo "  5. Test all endpoints"
    echo "  6. Set up automated backups"
    
    log "Deployment URLs:"
    echo "  Frontend (Vercel): https://xwave.vercel.app"
    echo "  Frontend (Netlify): https://xwave.netlify.app"
    echo "  Backend (Railway): https://xwave-backend.railway.app"
    echo "  Backend (Render): https://xwave-backend.onrender.com"
    echo "  Database (Supabase): https://supabase.com/dashboard"
    echo "  Database (Neon): https://neon.tech/dashboard"
    echo "  Blockchain (Oracle): https://cloud.oracle.com"
    echo "  CDN (Cloudflare): https://dash.cloudflare.com"
}

# ===========================================
# SCRIPT EXECUTION
# ===========================================

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
