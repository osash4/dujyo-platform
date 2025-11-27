#!/bin/bash

# ===========================================
# XWAVE MONITORING ALERTS SETUP SCRIPT
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
ALERT_EMAIL="admin@xwave.com"
SLACK_WEBHOOK=""
DISCORD_WEBHOOK=""
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

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
# PROMETHEUS ALERT RULES
# ===========================================

create_prometheus_rules() {
    log "📊 Creating Prometheus alert rules..."
    
    cat > xwave_rules.yml << EOF
groups:
  - name: xwave.rules
    rules:
      # ===========================================
      # SYSTEM ALERTS
      # ===========================================
      
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% for more than 5 minutes on {{ \$labels.instance }}"
          
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 85% for more than 5 minutes on {{ \$labels.instance }}"
          
      - alert: HighDiskUsage
        expr: (node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High disk usage detected"
          description: "Disk usage is above 90% for more than 5 minutes on {{ \$labels.instance }}"
          
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "Service {{ \$labels.job }} on {{ \$labels.instance }} is down"
          
      # ===========================================
      # APPLICATION ALERTS
      # ===========================================
      
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100 > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for more than 5 minutes on {{ \$labels.instance }}"
          
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is above 1 second for more than 5 minutes on {{ \$labels.instance }}"
          
      - alert: LowThroughput
        expr: rate(http_requests_total[5m]) < 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low throughput detected"
          description: "Request rate is below 10 requests per second for more than 10 minutes on {{ \$labels.instance }}"
          
      # ===========================================
      # DATABASE ALERTS
      # ===========================================
      
      - alert: DatabaseConnectionHigh
        expr: pg_stat_database_numbackends / pg_settings_max_connections * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection usage"
          description: "Database connection usage is above 80% for more than 5 minutes"
          
      - alert: DatabaseSlowQueries
        expr: rate(pg_stat_database_tup_returned[5m]) / rate(pg_stat_database_tup_fetched[5m]) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "Database query efficiency is below 10% for more than 5 minutes"
          
      - alert: DatabaseDeadlocks
        expr: rate(pg_stat_database_deadlocks[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database deadlocks detected"
          description: "Database deadlocks are occurring on {{ \$labels.instance }}"
          
      # ===========================================
      # REDIS ALERTS
      # ===========================================
      
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High Redis memory usage"
          description: "Redis memory usage is above 85% for more than 5 minutes on {{ \$labels.instance }}"
          
      - alert: RedisConnectionHigh
        expr: redis_connected_clients / redis_maxclients * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High Redis connection usage"
          description: "Redis connection usage is above 80% for more than 5 minutes on {{ \$labels.instance }}"
          
      - alert: RedisSlowQueries
        expr: rate(redis_slowlog_length[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis slow queries detected"
          description: "Redis slow query rate is above 10 per second for more than 5 minutes on {{ \$labels.instance }}"
          
      # ===========================================
      # BLOCKCHAIN ALERTS
      # ===========================================
      
      - alert: BlockchainSyncIssues
        expr: blockchain_sync_status != 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Blockchain sync issues detected"
          description: "Blockchain is not syncing properly on {{ \$labels.instance }}"
          
      - alert: BlockchainHighGasPrice
        expr: blockchain_gas_price > 100000000000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High blockchain gas price"
          description: "Blockchain gas price is above 100 Gwei for more than 5 minutes"
          
      - alert: BlockchainLowBalance
        expr: blockchain_balance < 1000000000000000000
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low blockchain balance"
          description: "Blockchain balance is below 1 ETH for more than 5 minutes"
          
      # ===========================================
      # DEX ALERTS
      # ===========================================
      
      - alert: DEXHighSlippage
        expr: dex_slippage_percentage > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High DEX slippage detected"
          description: "DEX slippage is above 5% for more than 5 minutes"
          
      - alert: DEXLowLiquidity
        expr: dex_liquidity_ratio < 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low DEX liquidity detected"
          description: "DEX liquidity ratio is below 10% for more than 10 minutes"
          
      - alert: DEXHighVolume
        expr: rate(dex_volume_total[5m]) > 1000000
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "High DEX volume detected"
          description: "DEX volume is above 1M tokens per second for more than 5 minutes"
          
      # ===========================================
      # NFT MARKETPLACE ALERTS
      # ===========================================
      
      - alert: NFTMarketplaceHighVolume
        expr: rate(nft_volume_total[5m]) > 100000
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "High NFT marketplace volume"
          description: "NFT marketplace volume is above 100K tokens per second for more than 5 minutes"
          
      - alert: NFTMarketplaceLowActivity
        expr: rate(nft_transactions_total[5m]) < 1
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Low NFT marketplace activity"
          description: "NFT marketplace activity is below 1 transaction per second for more than 30 minutes"
          
      # ===========================================
      # STAKING ALERTS
      # ===========================================
      
      - alert: StakingLowParticipation
        expr: staking_participation_ratio < 0.3
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Low staking participation"
          description: "Staking participation is below 30% for more than 1 hour"
          
      - alert: StakingHighUnstaking
        expr: rate(staking_unstake_total[5m]) > 1000000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High unstaking activity"
          description: "Unstaking rate is above 1M tokens per second for more than 5 minutes"
          
      # ===========================================
      # GOVERNANCE ALERTS
      # ===========================================
      
      - alert: GovernanceHighActivity
        expr: rate(governance_proposals_total[5m]) > 10
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "High governance activity"
          description: "Governance proposal rate is above 10 per second for more than 5 minutes"
          
      - alert: GovernanceLowParticipation
        expr: governance_participation_ratio < 0.1
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Low governance participation"
          description: "Governance participation is below 10% for more than 1 hour"
          
      # ===========================================
      # SECURITY ALERTS
      # ===========================================
      
      - alert: SecurityHighFailedLogins
        expr: rate(security_failed_logins_total[5m]) > 100
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High failed login attempts"
          description: "Failed login rate is above 100 per second for more than 5 minutes"
          
      - alert: SecuritySuspiciousActivity
        expr: rate(security_suspicious_activity_total[5m]) > 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Suspicious activity detected"
          description: "Suspicious activity rate is above 10 per second for more than 1 minute"
          
      - alert: SecurityRateLimitExceeded
        expr: rate(security_rate_limit_exceeded_total[5m]) > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Rate limit exceeded frequently"
          description: "Rate limit exceeded rate is above 50 per second for more than 5 minutes"
          
      # ===========================================
      # NETWORK ALERTS
      # ===========================================
      
      - alert: NetworkHighLatency
        expr: histogram_quantile(0.95, rate(network_latency_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High network latency"
          description: "95th percentile network latency is above 500ms for more than 5 minutes"
          
      - alert: NetworkPacketLoss
        expr: rate(network_packets_dropped_total[5m]) / rate(network_packets_total[5m]) * 100 > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High packet loss"
          description: "Network packet loss is above 1% for more than 5 minutes"
          
      # ===========================================
      # BACKUP ALERTS
      # ===========================================
      
      - alert: BackupFailed
        expr: backup_status != 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Backup failed"
          description: "Backup process failed on {{ \$labels.instance }}"
          
      - alert: BackupOld
        expr: time() - backup_last_success_timestamp > 86400
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Backup is old"
          description: "Last successful backup was more than 24 hours ago"
          
      # ===========================================
      # CERTIFICATE ALERTS
      # ===========================================
      
      - alert: CertificateExpiringSoon
        expr: (ssl_certificate_expiry_timestamp - time()) / 86400 < 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL certificate expiring soon"
          description: "SSL certificate for {{ \$labels.instance }} expires in less than 30 days"
          
      - alert: CertificateExpired
        expr: ssl_certificate_expiry_timestamp < time()
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "SSL certificate expired"
          description: "SSL certificate for {{ \$labels.instance }} has expired"
EOF
    
    log "✅ Prometheus alert rules created: xwave_rules.yml"
}

# ===========================================
# ALERTMANAGER CONFIGURATION
# ===========================================

create_alertmanager_config() {
    log "🚨 Creating Alertmanager configuration..."
    
    cat > alertmanager.yml << EOF
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: '$ALERT_EMAIL'
  smtp_auth_username: '$ALERT_EMAIL'
  smtp_auth_password: 'your_email_password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'
    - match:
        severity: info
      receiver: 'info-alerts'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:5001/'

  - name: 'critical-alerts'
    email_configs:
      - to: '$ALERT_EMAIL'
        subject: '[CRITICAL] XWave Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Severity: {{ .Labels.severity }}
          {{ end }}
    slack_configs:
      - api_url: '$SLACK_WEBHOOK'
        channel: '#xwave-alerts'
        title: 'XWave Critical Alert'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Instance:* {{ .Labels.instance }}
          *Severity:* {{ .Labels.severity }}
          {{ end }}
    discord_configs:
      - webhook_url: '$DISCORD_WEBHOOK'
        title: 'XWave Critical Alert'
        content: |
          {{ range .Alerts }}
          **Alert:** {{ .Annotations.summary }}
          **Description:** {{ .Annotations.description }}
          **Instance:** {{ .Labels.instance }}
          **Severity:** {{ .Labels.severity }}
          {{ end }}
    telegram_configs:
      - bot_token: '$TELEGRAM_BOT_TOKEN'
        chat_id: '$TELEGRAM_CHAT_ID'
        message: |
          🚨 XWave Critical Alert
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Severity: {{ .Labels.severity }}
          {{ end }}

  - name: 'warning-alerts'
    email_configs:
      - to: '$ALERT_EMAIL'
        subject: '[WARNING] XWave Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Severity: {{ .Labels.severity }}
          {{ end }}
    slack_configs:
      - api_url: '$SLACK_WEBHOOK'
        channel: '#xwave-warnings'
        title: 'XWave Warning Alert'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Instance:* {{ .Labels.instance }}
          *Severity:* {{ .Labels.severity }}
          {{ end }}

  - name: 'info-alerts'
    email_configs:
      - to: '$ALERT_EMAIL'
        subject: '[INFO] XWave Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Severity: {{ .Labels.severity }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
EOF
    
    log "✅ Alertmanager configuration created: alertmanager.yml"
}

# ===========================================
# GRAFANA ALERT CHANNELS
# ===========================================

create_grafana_alerts() {
    log "📊 Creating Grafana alert channels..."
    
    cat > grafana_alerts.json << EOF
{
  "alertChannels": [
    {
      "name": "Email Alerts",
      "type": "email",
      "settings": {
        "addresses": "$ALERT_EMAIL",
        "subject": "XWave Alert: {{ .AlertName }}",
        "message": "Alert: {{ .AlertName }}\\nDescription: {{ .Description }}\\nInstance: {{ .Instance }}\\nSeverity: {{ .Severity }}"
      }
    },
    {
      "name": "Slack Alerts",
      "type": "slack",
      "settings": {
        "url": "$SLACK_WEBHOOK",
        "channel": "#xwave-alerts",
        "title": "XWave Alert",
        "text": "Alert: {{ .AlertName }}\\nDescription: {{ .Description }}\\nInstance: {{ .Instance }}\\nSeverity: {{ .Severity }}"
      }
    },
    {
      "name": "Discord Alerts",
      "type": "discord",
      "settings": {
        "url": "$DISCORD_WEBHOOK",
        "title": "XWave Alert",
        "content": "Alert: {{ .AlertName }}\\nDescription: {{ .Description }}\\nInstance: {{ .Instance }}\\nSeverity: {{ .Severity }}"
      }
    },
    {
      "name": "Telegram Alerts",
      "type": "telegram",
      "settings": {
        "botToken": "$TELEGRAM_BOT_TOKEN",
        "chatId": "$TELEGRAM_CHAT_ID",
        "message": "🚨 XWave Alert\\nAlert: {{ .AlertName }}\\nDescription: {{ .Description }}\\nInstance: {{ .Instance }}\\nSeverity: {{ .Severity }}"
      }
    }
  ],
  "alertRules": [
    {
      "name": "High CPU Usage",
      "condition": "avg(cpu_usage_percent) > 80",
      "frequency": "5m",
      "severity": "warning",
      "channels": ["Email Alerts", "Slack Alerts"]
    },
    {
      "name": "High Memory Usage",
      "condition": "avg(memory_usage_percent) > 85",
      "frequency": "5m",
      "severity": "warning",
      "channels": ["Email Alerts", "Slack Alerts"]
    },
    {
      "name": "High Disk Usage",
      "condition": "avg(disk_usage_percent) > 90",
      "frequency": "5m",
      "severity": "critical",
      "channels": ["Email Alerts", "Slack Alerts", "Discord Alerts", "Telegram Alerts"]
    },
    {
      "name": "Service Down",
      "condition": "up == 0",
      "frequency": "1m",
      "severity": "critical",
      "channels": ["Email Alerts", "Slack Alerts", "Discord Alerts", "Telegram Alerts"]
    },
    {
      "name": "High Error Rate",
      "condition": "rate(error_requests_total[5m]) / rate(total_requests_total[5m]) > 0.05",
      "frequency": "5m",
      "severity": "warning",
      "channels": ["Email Alerts", "Slack Alerts"]
    },
    {
      "name": "High Response Time",
      "condition": "histogram_quantile(0.95, rate(response_time_seconds_bucket[5m])) > 1",
      "frequency": "5m",
      "severity": "warning",
      "channels": ["Email Alerts", "Slack Alerts"]
    },
    {
      "name": "Database Connection High",
      "condition": "database_connections / database_max_connections > 0.8",
      "frequency": "5m",
      "severity": "warning",
      "channels": ["Email Alerts", "Slack Alerts"]
    },
    {
      "name": "Redis Memory High",
      "condition": "redis_memory_used / redis_memory_max > 0.85",
      "frequency": "5m",
      "severity": "warning",
      "channels": ["Email Alerts", "Slack Alerts"]
    },
    {
      "name": "Blockchain Sync Issues",
      "condition": "blockchain_sync_status != 1",
      "frequency": "2m",
      "severity": "critical",
      "channels": ["Email Alerts", "Slack Alerts", "Discord Alerts", "Telegram Alerts"]
    },
    {
      "name": "SSL Certificate Expiring",
      "condition": "(ssl_certificate_expiry - time()) / 86400 < 30",
      "frequency": "1h",
      "severity": "warning",
      "channels": ["Email Alerts", "Slack Alerts"]
    }
  ]
}
EOF
    
    log "✅ Grafana alert configuration created: grafana_alerts.json"
}

# ===========================================
# CUSTOM ALERT SCRIPTS
# ===========================================

create_alert_scripts() {
    log "📝 Creating custom alert scripts..."
    
    # Email alert script
    cat > send_email_alert.sh << 'EOF'
#!/bin/bash

# XWave Email Alert Script
ALERT_EMAIL="$1"
ALERT_SUBJECT="$2"
ALERT_MESSAGE="$3"

if [ -z "$ALERT_EMAIL" ] || [ -z "$ALERT_SUBJECT" ] || [ -z "$ALERT_MESSAGE" ]; then
    echo "Usage: $0 <email> <subject> <message>"
    exit 1
fi

# Send email using mail command
echo "$ALERT_MESSAGE" | mail -s "$ALERT_SUBJECT" "$ALERT_EMAIL"

# Log the alert
echo "$(date): Sent email alert to $ALERT_EMAIL: $ALERT_SUBJECT" >> /var/log/xwave/alerts.log
EOF

    # Slack alert script
    cat > send_slack_alert.sh << 'EOF'
#!/bin/bash

# XWave Slack Alert Script
SLACK_WEBHOOK="$1"
ALERT_MESSAGE="$2"

if [ -z "$SLACK_WEBHOOK" ] || [ -z "$ALERT_MESSAGE" ]; then
    echo "Usage: $0 <webhook_url> <message>"
    exit 1
fi

# Send to Slack
curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"$ALERT_MESSAGE\"}" \
    "$SLACK_WEBHOOK"

# Log the alert
echo "$(date): Sent Slack alert: $ALERT_MESSAGE" >> /var/log/xwave/alerts.log
EOF

    # Discord alert script
    cat > send_discord_alert.sh << 'EOF'
#!/bin/bash

# XWave Discord Alert Script
DISCORD_WEBHOOK="$1"
ALERT_MESSAGE="$2"

if [ -z "$DISCORD_WEBHOOK" ] || [ -z "$ALERT_MESSAGE" ]; then
    echo "Usage: $0 <webhook_url> <message>"
    exit 1
fi

# Send to Discord
curl -X POST -H 'Content-type: application/json' \
    --data "{\"content\":\"$ALERT_MESSAGE\"}" \
    "$DISCORD_WEBHOOK"

# Log the alert
echo "$(date): Sent Discord alert: $ALERT_MESSAGE" >> /var/log/xwave/alerts.log
EOF

    # Telegram alert script
    cat > send_telegram_alert.sh << 'EOF'
#!/bin/bash

# XWave Telegram Alert Script
TELEGRAM_BOT_TOKEN="$1"
TELEGRAM_CHAT_ID="$2"
ALERT_MESSAGE="$3"

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ] || [ -z "$ALERT_MESSAGE" ]; then
    echo "Usage: $0 <bot_token> <chat_id> <message>"
    exit 1
fi

# Send to Telegram
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "text=$ALERT_MESSAGE"

# Log the alert
echo "$(date): Sent Telegram alert: $ALERT_MESSAGE" >> /var/log/xwave/alerts.log
EOF

    # Make scripts executable
    chmod +x send_email_alert.sh
    chmod +x send_slack_alert.sh
    chmod +x send_discord_alert.sh
    chmod +x send_telegram_alert.sh
    
    log "✅ Custom alert scripts created"
}

# ===========================================
# MONITORING DASHBOARD
# ===========================================

create_monitoring_dashboard() {
    log "📊 Creating monitoring dashboard..."
    
    cat > monitoring_dashboard.json << EOF
{
  "dashboard": {
    "title": "XWave Monitoring Dashboard",
    "tags": ["xwave", "monitoring"],
    "timezone": "browser",
    "panels": [
      {
        "title": "System Overview",
        "type": "stat",
        "targets": [
          {
            "expr": "up",
            "legendFormat": "Services Up"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by(instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU Usage %"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "Memory Usage %"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "title": "Disk Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100",
            "legendFormat": "Disk Usage %"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16}
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 16}
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 24}
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends",
            "legendFormat": "Active Connections"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 24}
      },
      {
        "title": "Redis Memory",
        "type": "graph",
        "targets": [
          {
            "expr": "redis_memory_used_bytes",
            "legendFormat": "Memory Used"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 32}
      },
      {
        "title": "Blockchain Status",
        "type": "stat",
        "targets": [
          {
            "expr": "blockchain_sync_status",
            "legendFormat": "Sync Status"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 32}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF
    
    log "✅ Monitoring dashboard created: monitoring_dashboard.json"
}

# ===========================================
# ALERT TESTING
# ===========================================

test_alerts() {
    log "🧪 Testing alert system..."
    
    # Test email alert
    if [ -n "$ALERT_EMAIL" ]; then
        log "Testing email alert..."
        ./send_email_alert.sh "$ALERT_EMAIL" "XWave Alert Test" "This is a test alert from XWave monitoring system."
    fi
    
    # Test Slack alert
    if [ -n "$SLACK_WEBHOOK" ]; then
        log "Testing Slack alert..."
        ./send_slack_alert.sh "$SLACK_WEBHOOK" "🚨 XWave Alert Test: This is a test alert from XWave monitoring system."
    fi
    
    # Test Discord alert
    if [ -n "$DISCORD_WEBHOOK" ]; then
        log "Testing Discord alert..."
        ./send_discord_alert.sh "$DISCORD_WEBHOOK" "🚨 XWave Alert Test: This is a test alert from XWave monitoring system."
    fi
    
    # Test Telegram alert
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        log "Testing Telegram alert..."
        ./send_telegram_alert.sh "$TELEGRAM_BOT_TOKEN" "$TELEGRAM_CHAT_ID" "🚨 XWave Alert Test: This is a test alert from XWave monitoring system."
    fi
    
    log "✅ Alert testing completed"
}

# ===========================================
# MAIN FUNCTION
# ===========================================

main() {
    log "🚀 Starting XWave Alert System Setup"
    log "Domain: $DOMAIN"
    log "Alert Email: $ALERT_EMAIL"
    
    # Create alert configurations
    create_prometheus_rules
    create_alertmanager_config
    create_grafana_alerts
    create_alert_scripts
    create_monitoring_dashboard
    
    # Test alerts
    test_alerts
    
    log "🎉 Alert system setup completed successfully!"
    log "📊 Prometheus rules: xwave_rules.yml"
    log "🚨 Alertmanager config: alertmanager.yml"
    log "📈 Grafana alerts: grafana_alerts.json"
    log "📝 Alert scripts: send_*_alert.sh"
    log "📊 Monitoring dashboard: monitoring_dashboard.json"
    
    log "📋 Next steps:"
    log "1. Import Prometheus rules into Prometheus"
    log "2. Configure Alertmanager with the provided config"
    log "3. Import Grafana dashboard and alerts"
    log "4. Test all alert channels"
    log "5. Monitor system performance"
    log "6. Adjust alert thresholds as needed"
}

# ===========================================
# ERROR HANDLING
# ===========================================

trap 'error "Alert setup failed at line $LINENO"' ERR

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
        --email)
            ALERT_EMAIL="$2"
            shift 2
            ;;
        --slack)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        --discord)
            DISCORD_WEBHOOK="$2"
            shift 2
            ;;
        --telegram-token)
            TELEGRAM_BOT_TOKEN="$2"
            shift 2
            ;;
        --telegram-chat)
            TELEGRAM_CHAT_ID="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --domain DOMAIN        Domain name (default: xwave.com)"
            echo "  --email EMAIL          Alert email address"
            echo "  --slack WEBHOOK        Slack webhook URL"
            echo "  --discord WEBHOOK      Discord webhook URL"
            echo "  --telegram-token TOKEN Telegram bot token"
            echo "  --telegram-chat ID     Telegram chat ID"
            echo "  --help                 Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Run main function
main "$@"
