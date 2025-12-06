#!/bin/bash
# Script de monitoreo para MVP cerrado - S2E System
# Ejecutar cada 15 minutos con cron: */15 * * * * /path/to/monitor_mvp.sh

set -e

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

API_BASE_URL="${API_BASE_URL:-http://localhost:8083}"
LOG_DIR="${LOG_DIR:-/Volumes/DobleDHD/xwave/logs}"
REPORT_DIR="${REPORT_DIR:-/Volumes/DobleDHD/xwave/reports}"
BACKUP_DIR="${BACKUP_DIR:-/Volumes/DobleDHD/xwave/backups}"

# Umbrales de alerta
POOL_WARNING_THRESHOLD=1500000.0  # 1.5M DYO (75% del pool)
DAILY_EMISSION_WARNING=50000.0    # 50,000 DYO/día
ANOMALY_SCORE_WARNING=30.0        # Anomaly score > 30

# Intervalos
METRICS_INTERVAL=15    # minutos
REPORT_INTERVAL=4      # horas
BACKUP_INTERVAL=12     # horas

# Crear directorios si no existen
mkdir -p "$LOG_DIR" "$REPORT_DIR" "$BACKUP_DIR"

# ============================================================================
# FUNCIONES DE UTILIDAD
# ============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/monitor.log"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_DIR/monitor.log" >&2
}

alert() {
    local message="$1"
    log "🚨 ALERTA: $message"
    # Aquí puedes agregar notificaciones (email, Slack, etc.)
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ALERTA: $message" >> "$LOG_DIR/alerts.log"
}

# ============================================================================
# 1. VERIFICAR MÉTRICAS CADA 15 MINUTOS
# ============================================================================

check_metrics() {
    log "📊 Verificando métricas S2E..."
    
    # Obtener métricas del dashboard
    local dashboard_response
    dashboard_response=$(curl -s "${API_BASE_URL}/api/v1/s2e/dashboard" 2>&1)
    
    if [ $? -ne 0 ]; then
        error "No se pudo conectar al endpoint de dashboard"
        return 1
    fi
    
    # Parsear métricas
    local pool_remaining pool_percent daily_emission anomaly_score
    pool_remaining=$(echo "$dashboard_response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('pool_remaining_dyo', 0))" 2>/dev/null || echo "0")
    pool_percent=$(echo "$dashboard_response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('pool_remaining_percent', 0))" 2>/dev/null || echo "0")
    daily_emission=$(echo "$dashboard_response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('daily_emission', 0))" 2>/dev/null || echo "0")
    anomaly_score=$(echo "$dashboard_response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('anomaly_score', 0))" 2>/dev/null || echo "0")
    active_users=$(echo "$dashboard_response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('active_users_today', 0))" 2>/dev/null || echo "0")
    
    # Guardar métricas en log
    echo "$(date '+%Y-%m-%d %H:%M:%S'),$pool_remaining,$pool_percent,$daily_emission,$anomaly_score,$active_users" >> "$LOG_DIR/metrics.csv"
    
    log "   Pool: ${pool_remaining:0:10} DYO (${pool_percent}%)"
    log "   Emisión diaria: ${daily_emission:0:10} DYO"
    log "   Usuarios activos: $active_users"
    log "   Anomaly score: $anomaly_score"
    
    # ============================================================================
    # 2. VERIFICAR ALERTAS
    # ============================================================================
    
    # Alerta: Pool < 1.5M DYO (75%)
    if (( $(echo "$pool_remaining < $POOL_WARNING_THRESHOLD" | bc -l) )); then
        alert "Pool por debajo de 75%: ${pool_remaining} DYO (${pool_percent}%)"
    fi
    
    # Alerta: Daily emission > 50,000 DYO
    if (( $(echo "$daily_emission > $DAILY_EMISSION_WARNING" | bc -l) )); then
        alert "Emisión diaria alta: ${daily_emission} DYO (umbral: ${DAILY_EMISSION_WARNING} DYO)"
    fi
    
    # Alerta: Anomaly score > 30
    if (( $(echo "$anomaly_score > $ANOMALY_SCORE_WARNING" | bc -l) )); then
        alert "Anomaly score alto: ${anomaly_score} (umbral: ${ANOMALY_SCORE_WARNING})"
    fi
    
    # Verificar alertas del dashboard
    local alerts_count
    alerts_count=$(echo "$dashboard_response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('alerts', [])))" 2>/dev/null || echo "0")
    
    if [ "$alerts_count" -gt 0 ]; then
        local alerts
        alerts=$(echo "$dashboard_response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(' | '.join(d.get('alerts', [])))" 2>/dev/null || echo "")
        alert "Alertas del dashboard: $alerts"
    fi
    
    return 0
}

# ============================================================================
# 3. GENERAR REPORTE CADA 4 HORAS
# ============================================================================

generate_report() {
    local report_file="$REPORT_DIR/report_$(date '+%Y%m%d_%H%M%S').txt"
    
    log "📄 Generando reporte..."
    
    {
        echo "=========================================="
        echo "REPORTE S2E - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "=========================================="
        echo ""
        
        # Métricas actuales
        echo "📊 MÉTRICAS ACTUALES:"
        local dashboard_response
        dashboard_response=$(curl -s "${API_BASE_URL}/api/v1/s2e/dashboard" 2>&1)
        
        if [ $? -eq 0 ]; then
            echo "$dashboard_response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"   Pool Remaining: {d.get('pool_remaining_dyo', 0):,.0f} DYO ({d.get('pool_remaining_percent', 0):.1f}%)\")
print(f\"   Daily Emission: {d.get('daily_emission', 0):,.2f} DYO\")
print(f\"   Active Users: {d.get('active_users_today', 0)}\")
print(f\"   Anomaly Score: {d.get('anomaly_score', 0):.1f}\")
alerts = d.get('alerts', [])
print(f\"   Alerts: {len(alerts)}\")
for a in alerts:
    print(f\"      - {a}\")
" 2>/dev/null || echo "   Error al obtener métricas"
        else
            echo "   Error al conectar al dashboard"
        fi
        
        echo ""
        
        # Configuración actual
        echo "⚙️  CONFIGURACIÓN:"
        local config_response
        config_response=$(curl -s "${API_BASE_URL}/api/v1/s2e/config" 2>&1)
        
        if [ $? -eq 0 ]; then
            echo "$config_response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"   Listener Rate: {d.get('listener_rate', 0)} DYO/min\")
print(f\"   Artist Rate: {d.get('artist_rate', 0)} DYO/min\")
print(f\"   Pool Total: {d.get('pool_total', 0):,.0f} DYO\")
print(f\"   Pool Month: {d.get('pool_month', 'N/A')}\")
" 2>/dev/null || echo "   Error al obtener configuración"
        fi
        
        echo ""
        
        # Estadísticas de las últimas 24 horas
        echo "📈 ESTADÍSTICAS (últimas 24 horas):"
        if [ -f "$LOG_DIR/metrics.csv" ]; then
            local total_lines
            total_lines=$(wc -l < "$LOG_DIR/metrics.csv" | tr -d ' ')
            if [ "$total_lines" -gt 0 ]; then
                echo "   Total de métricas registradas: $total_lines"
                echo "   (Ver $LOG_DIR/metrics.csv para detalles)"
            fi
        fi
        
        echo ""
        
        # Alertas recientes
        echo "🚨 ALERTAS RECIENTES:"
        if [ -f "$LOG_DIR/alerts.log" ]; then
            tail -10 "$LOG_DIR/alerts.log" | while IFS= read -r line; do
                echo "   $line"
            done
        else
            echo "   No hay alertas recientes"
        fi
        
        echo ""
        echo "=========================================="
        
    } > "$report_file"
    
    log "   Reporte guardado en: $report_file"
    
    # Mantener solo los últimos 10 reportes
    ls -t "$REPORT_DIR"/report_*.txt 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
}

# ============================================================================
# 4. BACKUP AUTOMÁTICO CADA 12 HORAS
# ============================================================================

create_backup() {
    log "💾 Creando backup..."
    
    local backup_file="$BACKUP_DIR/backup_$(date '+%Y%m%d_%H%M%S').sql"
    
    # Backup de tablas críticas S2E
    PGPASSWORD="" pg_dump -h 127.0.0.1 -U yare -d dujyo_blockchain \
        -t s2e_monthly_pools \
        -t stream_logs \
        -t content_stream_limits \
        -t user_daily_usage \
        --data-only \
        > "$backup_file" 2>&1
    
    if [ $? -eq 0 ]; then
        # Comprimir backup
        gzip -f "$backup_file"
        log "   Backup creado: ${backup_file}.gz"
        
        # Mantener solo los últimos 7 backups
        ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
    else
        error "Error al crear backup"
    fi
}

# ============================================================================
# FUNCIÓN PRINCIPAL
# ============================================================================

main() {
    local action="${1:-check}"
    
    case "$action" in
        check)
            check_metrics
            ;;
        report)
            generate_report
            ;;
        backup)
            create_backup
            ;;
        all)
            check_metrics
            generate_report
            create_backup
            ;;
        *)
            echo "Uso: $0 {check|report|backup|all}"
            echo ""
            echo "  check  - Verificar métricas y alertas (cada 15 min)"
            echo "  report - Generar reporte (cada 4 horas)"
            echo "  backup - Crear backup (cada 12 horas)"
            echo "  all    - Ejecutar todas las funciones"
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"

