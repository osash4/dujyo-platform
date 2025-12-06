#!/bin/bash

# Backup automático diario de tablas S2E críticas
# Ejecutar diariamente vía cron: 0 2 * * * /path/to/backup-database.sh

set -e

# Configuración
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME:-dujyo}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "🔄 Iniciando backup de tablas S2E críticas..."

# Backup de tablas S2E críticas
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  -t s2e_monthly_pools \
  -t stream_logs \
  -t beta_users \
  -t beta_codes \
  -t user_daily_usage \
  -t content_stream_limits \
  --data-only \
  --format=custom \
  -f "$BACKUP_DIR/s2e_critical_${DATE}.dump"

# Backup completo de seguridad (semanal, solo domingos)
if [ $(date +%u) -eq 7 ]; then
  echo "📦 Backup completo semanal..."
  pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
    --format=custom \
    -f "$BACKUP_DIR/full_backup_${DATE}.dump"
fi

# Limpiar backups antiguos (mantener últimos 30 días)
find "$BACKUP_DIR" -name "s2e_critical_*.dump" -mtime +30 -delete
find "$BACKUP_DIR" -name "full_backup_*.dump" -mtime +90 -delete

echo "✅ Backup completado: $BACKUP_DIR/s2e_critical_${DATE}.dump"
