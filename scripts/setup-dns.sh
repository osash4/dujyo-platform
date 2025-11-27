#!/bin/bash

# ===========================================
# XWAVE DNS CONFIGURATION SCRIPT
# ===========================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="xwave.com"
SUBDOMAINS=(
    "www"
    "app"
    "api"
    "blockchain"
    "dex"
    "nft"
    "staking"
    "governance"
    "monitoring"
    "metrics"
    "logs"
    "backup"
)
SERVER_IP=""

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
# GET SERVER IP
# ===========================================

get_server_ip() {
    log "🔍 Getting server IP address..."
    
    # Try multiple methods to get public IP
    if command -v curl &> /dev/null; then
        SERVER_IP=$(curl -s ifconfig.me)
    elif command -v wget &> /dev/null; then
        SERVER_IP=$(wget -qO- ifconfig.me)
    else
        error "Neither curl nor wget is available. Please install one of them."
    fi
    
    if [ -z "$SERVER_IP" ]; then
        error "Could not determine server IP address"
    fi
    
    log "✅ Server IP: $SERVER_IP"
}

# ===========================================
# CLOUDFLARE DNS CONFIGURATION
# ===========================================

setup_cloudflare_dns() {
    log "☁️ Setting up Cloudflare DNS..."
    
    # Check if Cloudflare CLI is installed
    if ! command -v cloudflared &> /dev/null; then
        warning "Cloudflare CLI not found. Installing..."
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared-linux-amd64.deb
        rm cloudflared-linux-amd64.deb
    fi
    
    # Check if API token is set
    if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
        warning "CLOUDFLARE_API_TOKEN not set. Please set it in your environment."
        warning "You can get an API token from: https://dash.cloudflare.com/profile/api-tokens"
        return
    fi
    
    # Get zone ID
    local zone_id=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$DOMAIN" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" | jq -r '.result[0].id')
    
    if [ "$zone_id" = "null" ] || [ -z "$zone_id" ]; then
        error "Could not find zone ID for domain: $DOMAIN"
    fi
    
    log "✅ Zone ID: $zone_id"
    
    # Create DNS records
    for subdomain in "${SUBDOMAINS[@]}"; do
        local record_name="$subdomain.$DOMAIN"
        
        log "Creating DNS record: $record_name -> $SERVER_IP"
        
        # Check if record already exists
        local existing_record=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records?name=$record_name" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" | jq -r '.result[0].id')
        
        if [ "$existing_record" != "null" ] && [ -n "$existing_record" ]; then
            # Update existing record
            curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records/$existing_record" \
                -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                -H "Content-Type: application/json" \
                --data "{\"type\":\"A\",\"name\":\"$record_name\",\"content\":\"$SERVER_IP\",\"ttl\":300}" > /dev/null
            
            log "✅ Updated DNS record: $record_name"
        else
            # Create new record
            curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
                -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                -H "Content-Type: application/json" \
                --data "{\"type\":\"A\",\"name\":\"$record_name\",\"content\":\"$SERVER_IP\",\"ttl\":300}" > /dev/null
            
            log "✅ Created DNS record: $record_name"
        fi
    done
    
    # Create main domain record
    log "Creating main domain record: $DOMAIN -> $SERVER_IP"
    
    local main_record=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records?name=$DOMAIN" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" | jq -r '.result[0].id')
    
    if [ "$main_record" != "null" ] && [ -n "$main_record" ]; then
        # Update existing record
        curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records/$main_record" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data "{\"type\":\"A\",\"name\":\"$DOMAIN\",\"content\":\"$SERVER_IP\",\"ttl\":300}" > /dev/null
        
        log "✅ Updated main domain record: $DOMAIN"
    else
        # Create new record
        curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data "{\"type\":\"A\",\"name\":\"$DOMAIN\",\"content\":\"$SERVER_IP\",\"ttl\":300}" > /dev/null
        
        log "✅ Created main domain record: $DOMAIN"
    fi
    
    log "✅ Cloudflare DNS configuration completed"
}

# ===========================================
# MANUAL DNS CONFIGURATION
# ===========================================

setup_manual_dns() {
    log "📝 Manual DNS configuration instructions..."
    
    cat > dns_configuration.txt << EOF
# ===========================================
# XWAVE DNS CONFIGURATION
# ===========================================

Domain: $DOMAIN
Server IP: $SERVER_IP

# ===========================================
# REQUIRED DNS RECORDS
# ===========================================

# Main domain
$DOMAIN.                    A       $SERVER_IP

# Subdomains
www.$DOMAIN.                A       $SERVER_IP
app.$DOMAIN.                A       $SERVER_IP
api.$DOMAIN.                A       $SERVER_IP
blockchain.$DOMAIN.         A       $SERVER_IP
dex.$DOMAIN.                A       $SERVER_IP
nft.$DOMAIN.                A       $SERVER_IP
staking.$DOMAIN.            A       $SERVER_IP
governance.$DOMAIN.         A       $SERVER_IP
monitoring.$DOMAIN.         A       $SERVER_IP
metrics.$DOMAIN.            A       $SERVER_IP
logs.$DOMAIN.               A       $SERVER_IP
backup.$DOMAIN.             A       $SERVER_IP

# ===========================================
# CNAME RECORDS (Optional)
# ===========================================

# CDN and services
cdn.$DOMAIN.                CNAME   cdn.xwave.com.
assets.$DOMAIN.             CNAME   assets.xwave.com.
static.$DOMAIN.             CNAME   static.xwave.com.

# ===========================================
# MX RECORDS (Email)
# ===========================================

$DOMAIN.                    MX      10      mail.$DOMAIN.
$DOMAIN.                    MX      20      mail2.$DOMAIN.

# ===========================================
# TXT RECORDS (Verification)
# ===========================================

# Domain verification
$DOMAIN.                    TXT     "v=spf1 include:_spf.google.com ~all"
$DOMAIN.                    TXT     "google-site-verification=YOUR_GOOGLE_VERIFICATION_CODE"

# ===========================================
# SRV RECORDS (Services)
# ===========================================

# WebSocket service
_websocket._tcp.$DOMAIN.    SRV     10      5       8080    api.$DOMAIN.
_websocket._tcp.$DOMAIN.    SRV     20      5       8081    api.$DOMAIN.
_websocket._tcp.$DOMAIN.    SRV     30      5       8082    api.$DOMAIN.

# ===========================================
# INSTRUCTIONS
# ===========================================

1. Log in to your DNS provider's control panel
2. Navigate to DNS management for $DOMAIN
3. Add the above A records pointing to $SERVER_IP
4. Wait for DNS propagation (can take up to 48 hours)
5. Test DNS resolution using: nslookup $DOMAIN
6. Verify SSL certificates are working: https://$DOMAIN

# ===========================================
# TESTING COMMANDS
# ===========================================

# Test DNS resolution
nslookup $DOMAIN
nslookup www.$DOMAIN
nslookup api.$DOMAIN

# Test HTTP connectivity
curl -I http://$DOMAIN
curl -I https://$DOMAIN

# Test SSL certificate
openssl s_client -connect $DOMAIN:443 -servername $DOMAIN

# ===========================================
# TROUBLESHOOTING
# ===========================================

# If DNS is not resolving:
1. Check if records are correctly configured
2. Wait for DNS propagation
3. Clear DNS cache: sudo systemctl flush-dns
4. Use different DNS servers: 8.8.8.8, 1.1.1.1

# If SSL is not working:
1. Check if certificates are installed
2. Verify domain ownership
3. Check firewall settings
4. Test with: curl -I https://$DOMAIN

EOF
    
    log "✅ Manual DNS configuration instructions saved to: dns_configuration.txt"
    log "📋 Please follow the instructions in the file to configure your DNS"
}

# ===========================================
# DNS PROPAGATION CHECK
# ===========================================

check_dns_propagation() {
    log "🔍 Checking DNS propagation..."
    
    local dns_servers=(
        "8.8.8.8"      # Google DNS
        "1.1.1.1"      # Cloudflare DNS
        "208.67.222.222" # OpenDNS
        "9.9.9.9"      # Quad9 DNS
    )
    
    for dns_server in "${dns_servers[@]}"; do
        log "Checking with DNS server: $dns_server"
        
        local result=$(nslookup "$DOMAIN" "$dns_server" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
        
        if [ "$result" = "$SERVER_IP" ]; then
            log "✅ DNS propagated on $dns_server"
        else
            warning "❌ DNS not propagated on $dns_server (got: $result, expected: $SERVER_IP)"
        fi
    done
    
    log "✅ DNS propagation check completed"
}

# ===========================================
# SSL CERTIFICATE VERIFICATION
# ===========================================

verify_ssl_certificates() {
    log "🔒 Verifying SSL certificates..."
    
    local domains=(
        "$DOMAIN"
        "www.$DOMAIN"
        "app.$DOMAIN"
        "api.$DOMAIN"
    )
    
    for domain in "${domains[@]}"; do
        log "Checking SSL certificate for: $domain"
        
        # Check if certificate exists and is valid
        local cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
        
        if [ -n "$cert_info" ]; then
            log "✅ SSL certificate found for $domain"
            echo "$cert_info"
        else
            warning "❌ SSL certificate not found for $domain"
        fi
    done
    
    log "✅ SSL certificate verification completed"
}

# ===========================================
# FIREWALL CONFIGURATION
# ===========================================

configure_firewall() {
    log "🔥 Configuring firewall..."
    
    # Check if ufw is installed
    if ! command -v ufw &> /dev/null; then
        warning "UFW not installed. Installing..."
        sudo apt-get update
        sudo apt-get install -y ufw
    fi
    
    # Enable firewall
    sudo ufw --force enable
    
    # Allow SSH
    sudo ufw allow 22/tcp
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow XWave services
    sudo ufw allow 8080:8082/tcp  # Backend services
    sudo ufw allow 3000:3002/tcp  # Frontend services
    sudo ufw allow 9000:9002/tcp  # Blockchain services
    sudo ufw allow 9090/tcp       # Prometheus
    sudo ufw allow 3000/tcp       # Grafana
    
    # Allow monitoring ports
    sudo ufw allow 9200/tcp       # Elasticsearch
    sudo ufw allow 5601/tcp       # Kibana
    sudo ufw allow 14268/tcp      # Jaeger
    
    # Show firewall status
    sudo ufw status
    
    log "✅ Firewall configuration completed"
}

# ===========================================
# NGINX CONFIGURATION UPDATE
# ===========================================

update_nginx_config() {
    log "🌐 Updating Nginx configuration..."
    
    # Check if Nginx is installed
    if ! command -v nginx &> /dev/null; then
        warning "Nginx not installed. Installing..."
        sudo apt-get update
        sudo apt-get install -y nginx
    fi
    
    # Update Nginx configuration with domain names
    if [ -f "nginx.conf" ]; then
        # Replace localhost with actual domain
        sed -i "s/localhost/$DOMAIN/g" nginx.conf
        sed -i "s/127.0.0.1/$SERVER_IP/g" nginx.conf
        
        # Copy updated configuration
        sudo cp nginx.conf /etc/nginx/sites-available/xwave
        sudo ln -sf /etc/nginx/sites-available/xwave /etc/nginx/sites-enabled/
        
        # Test configuration
        sudo nginx -t
        
        # Reload Nginx
        sudo systemctl reload nginx
        
        log "✅ Nginx configuration updated"
    else
        warning "nginx.conf not found. Please create it first."
    fi
}

# ===========================================
# MONITORING SETUP
# ===========================================

setup_monitoring() {
    log "📊 Setting up monitoring..."
    
    # Create monitoring configuration
    cat > monitoring_config.yml << EOF
# XWave Monitoring Configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "xwave_rules.yml"

scrape_configs:
  - job_name: 'xwave-backend'
    static_configs:
      - targets: ['$DOMAIN:8080', '$DOMAIN:8081', '$DOMAIN:8082']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'xwave-frontend'
    static_configs:
      - targets: ['$DOMAIN:3000', '$DOMAIN:3001', '$DOMAIN:3002']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'xwave-blockchain'
    static_configs:
      - targets: ['$DOMAIN:9000', '$DOMAIN:9001', '$DOMAIN:9002']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'xwave-database'
    static_configs:
      - targets: ['$DOMAIN:5432']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'xwave-redis'
    static_configs:
      - targets: ['$DOMAIN:6379']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'xwave-nginx'
    static_configs:
      - targets: ['$DOMAIN:9113']
    metrics_path: '/metrics'
    scrape_interval: 10s
EOF
    
    log "✅ Monitoring configuration created: monitoring_config.yml"
}

# ===========================================
# BACKUP CONFIGURATION
# ===========================================

setup_backup_config() {
    log "💾 Setting up backup configuration..."
    
    # Create backup script
    cat > backup_config.sh << EOF
#!/bin/bash

# XWave Backup Configuration
BACKUP_DIR="/var/lib/xwave/backups"
DATE=\$(date +%Y%m%d_%H%M%S)
DOMAIN="$DOMAIN"

# Create backup directory
mkdir -p "\$BACKUP_DIR"

# Database backup
docker-compose -f docker-compose.production.yml exec postgres_master pg_dump -U xwave_user xwave_production > "\$BACKUP_DIR/database_\$DATE.sql"

# Redis backup
docker-compose -f docker-compose.production.yml exec redis_master redis-cli --rdb "\$BACKUP_DIR/redis_\$DATE.rdb"

# Configuration backup
tar -czf "\$BACKUP_DIR/config_\$DATE.tar.gz" /etc/xwave/ /etc/nginx/sites-available/xwave

# Application backup
tar -czf "\$BACKUP_DIR/app_\$DATE.tar.gz" /opt/xwave/

# Compress all backups
tar -czf "\$BACKUP_DIR/xwave_backup_\$DATE.tar.gz" "\$BACKUP_DIR/database_\$DATE.sql" "\$BACKUP_DIR/redis_\$DATE.rdb" "\$BACKUP_DIR/config_\$DATE.tar.gz" "\$BACKUP_DIR/app_\$DATE.tar.gz"

# Upload to S3 (if configured)
if [ -n "\$BACKUP_S3_BUCKET" ]; then
    aws s3 cp "\$BACKUP_DIR/xwave_backup_\$DATE.tar.gz" "s3://\$BACKUP_S3_BUCKET/"
fi

# Cleanup old backups
find "\$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: xwave_backup_\$DATE.tar.gz"
EOF
    
    chmod +x backup_config.sh
    
    log "✅ Backup configuration created: backup_config.sh"
}

# ===========================================
# MAIN FUNCTION
# ===========================================

main() {
    log "🚀 Starting XWave DNS Configuration"
    log "Domain: $DOMAIN"
    
    # Get server IP
    get_server_ip
    
    # Setup DNS (try Cloudflare first, fallback to manual)
    if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
        setup_cloudflare_dns
    else
        setup_manual_dns
    fi
    
    # Configure firewall
    configure_firewall
    
    # Update Nginx configuration
    update_nginx_config
    
    # Setup monitoring
    setup_monitoring
    
    # Setup backup configuration
    setup_backup_config
    
    # Check DNS propagation
    check_dns_propagation
    
    # Verify SSL certificates
    verify_ssl_certificates
    
    log "🎉 DNS configuration completed successfully!"
    log "🌐 Main domain: https://$DOMAIN"
    log "📱 App: https://app.$DOMAIN"
    log "🔌 API: https://api.$DOMAIN"
    log "⛓️ Blockchain: https://blockchain.$DOMAIN"
    log "💱 DEX: https://dex.$DOMAIN"
    log "🖼️ NFT: https://nft.$DOMAIN"
    log "🥩 Staking: https://staking.$DOMAIN"
    log "🗳️ Governance: https://governance.$DOMAIN"
    log "📊 Monitoring: https://monitoring.$DOMAIN"
    log "📈 Metrics: https://metrics.$DOMAIN"
    log "📝 Logs: https://logs.$DOMAIN"
    log "💾 Backup: https://backup.$DOMAIN"
    
    log "📋 Next steps:"
    log "1. Wait for DNS propagation (up to 48 hours)"
    log "2. Test all endpoints"
    log "3. Verify SSL certificates"
    log "4. Run load tests"
    log "5. Monitor system performance"
}

# ===========================================
# ERROR HANDLING
# ===========================================

trap 'error "DNS configuration failed at line $LINENO"' ERR

# ===========================================
# EXECUTION
# ===========================================

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --ip)
            SERVER_IP="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --domain DOMAIN    Domain name (default: xwave.com)"
            echo "  --ip IP           Server IP address (auto-detected if not provided)"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Run main function
main "$@"
