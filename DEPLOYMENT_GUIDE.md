# 🚀 GUÍA DE DEPLOYMENT - DUJYO MVP

**Versión:** 1.0  
**Fecha:** 2024  
**Objetivo:** Desplegar DUJYO MVP en producción de forma segura y confiable

---

## 📋 PREREQUISITOS

### Servidor de Producción
- [ ] Ubuntu 20.04+ o similar
- [ ] Mínimo 4GB RAM, 2 CPU cores
- [ ] 50GB+ espacio en disco
- [ ] Acceso root o sudo

### Software Requerido
- [ ] Rust 1.70+ (`rustup install stable`)
- [ ] PostgreSQL 14+ (`sudo apt-get install postgresql`)
- [ ] Redis 7+ (`sudo apt-get install redis-server`)
- [ ] Nginx (`sudo apt-get install nginx`)
- [ ] Certbot para SSL (`sudo apt-get install certbot python3-certbot-nginx`)

### Variables de Entorno
- [ ] Todas las variables configuradas (ver `.env.example`)
- [ ] Secrets seguros (JWT_SECRET, etc.)
- [ ] URLs de producción configuradas

---

## 🔧 CONFIGURACIÓN INICIAL

### 1. Instalar Dependencias

```bash
# Actualizar sistema
sudo apt-get update && sudo apt-get upgrade -y

# Instalar Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Instalar PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Instalar Redis
sudo apt-get install -y redis-server

# Instalar Nginx
sudo apt-get install -y nginx

# Instalar Certbot
sudo apt-get install -y certbot python3-certbot-nginx
```

### 2. Configurar PostgreSQL

```bash
# Crear base de datos
sudo -u postgres psql << EOF
CREATE DATABASE dujyo;
CREATE USER dujyo WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE dujyo TO dujyo;
\q
EOF

# Configurar PostgreSQL para conexiones remotas (si es necesario)
sudo nano /etc/postgresql/14/main/postgresql.conf
# Descomentar: listen_addresses = 'localhost'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Agregar: host dujyo dujyo 127.0.0.1/32 md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### 3. Configurar Redis

```bash
# Configurar Redis
sudo nano /etc/redis/redis.conf

# Cambios recomendados:
# - maxmemory 512mb
# - maxmemory-policy allkeys-lru
# - requirepass your_redis_password (opcional pero recomendado)

# Reiniciar Redis
sudo systemctl restart redis-server

# Verificar
redis-cli ping
```

### 4. Clonar y Compilar Backend

```bash
# Clonar repositorio
cd /opt
git clone <repository-url> dujyo
cd dujyo/dujyo-backend

# Configurar variables de entorno
cp ../env.example .env
nano .env  # Editar con valores de producción

# Compilar en modo release
cargo build --release

# Ejecutar migraciones
cargo run --bin migrate-database
```

---

## 🐳 DEPLOYMENT CON DOCKER (Recomendado)

### 1. Preparar Docker Compose

```bash
# Crear docker-compose.production.yml
cp docker-compose.yml docker-compose.production.yml
nano docker-compose.production.yml  # Editar para producción
```

### 2. Configurar Variables de Entorno

```bash
# Crear .env.production
cat > .env.production << EOF
DATABASE_URL=postgresql://dujyo:secure_password@postgres:5432/dujyo
REDIS_URL=redis://redis:6379
JWT_SECRET=your_super_secret_jwt_key_production
ENVIRONMENT=production
RUST_LOG=info
EOF
```

### 3. Desplegar

```bash
# Construir imágenes
docker-compose -f docker-compose.production.yml build

# Iniciar servicios
docker-compose -f docker-compose.production.yml up -d

# Ver logs
docker-compose -f docker-compose.production.yml logs -f backend
```

---

## 🌐 CONFIGURAR NGINX

### 1. Crear Configuración Nginx

```bash
sudo nano /etc/nginx/sites-available/dujyo
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Backend API
    location /api {
        proxy_pass http://localhost:8083;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check (no rate limiting)
    location /health {
        proxy_pass http://localhost:8083;
        access_log off;
    }

    # Frontend (si está servido desde el mismo servidor)
    location / {
        root /var/www/dujyo-frontend;
        try_files $uri $uri/ /index.html;
    }
}
```

### 2. Habilitar Sitio

```bash
sudo ln -s /etc/nginx/sites-available/dujyo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Configurar SSL

```bash
sudo certbot --nginx -d your-domain.com
```

---

## 🔄 SYSTEMD SERVICE (Sin Docker)

### 1. Crear Service File

```bash
sudo nano /etc/systemd/system/dujyo-backend.service
```

```ini
[Unit]
Description=DUJYO Backend Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=dujyo
WorkingDirectory=/opt/dujyo/dujyo-backend
Environment="RUST_LOG=info"
EnvironmentFile=/opt/dujyo/dujyo-backend/.env
ExecStart=/opt/dujyo/dujyo-backend/target/release/xwavve-backend
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 2. Iniciar Servicio

```bash
sudo systemctl daemon-reload
sudo systemctl enable dujyo-backend
sudo systemctl start dujyo-backend
sudo systemctl status dujyo-backend
```

---

## 📊 MONITOREO

### 1. Health Checks

```bash
# Script de health check
./dujyo-backend/scripts/health_check.sh

# O manualmente
curl https://your-domain.com/health
curl https://your-domain.com/health/detailed
```

### 2. Logs

```bash
# Systemd
sudo journalctl -u dujyo-backend -f

# Docker
docker-compose logs -f backend

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 3. Métricas

```bash
# Endpoint de métricas
curl https://your-domain.com/metrics

# Redis
redis-cli INFO stats
redis-cli INFO memory

# PostgreSQL
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

---

## 🔒 SEGURIDAD

### Checklist de Seguridad

- [ ] JWT_SECRET es fuerte y único
- [ ] Passwords de base de datos son seguros
- [ ] Redis tiene password (opcional pero recomendado)
- [ ] SSL/TLS configurado correctamente
- [ ] Firewall configurado (solo puertos necesarios abiertos)
- [ ] Rate limiting habilitado
- [ ] CORS configurado correctamente
- [ ] Headers de seguridad configurados
- [ ] Logs no contienen información sensible
- [ ] Backups configurados

### Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 🔄 BACKUPS

### 1. Backup de Base de Datos

```bash
# Script de backup
#!/bin/bash
BACKUP_DIR="/var/backups/dujyo"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump -U dujyo dujyo > $BACKUP_DIR/dujyo_$DATE.sql

# Comprimir
gzip $BACKUP_DIR/dujyo_$DATE.sql

# Eliminar backups antiguos (mantener últimos 7 días)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

### 2. Cron Job

```bash
# Agregar a crontab
0 2 * * * /opt/dujyo/scripts/backup.sh
```

---

## 🧪 POST-DEPLOYMENT TESTING

### 1. Verificar Servicios

```bash
# Health checks
./scripts/health_check.sh

# Endpoints críticos
curl https://your-domain.com/health
curl https://your-domain.com/api/v1/auth/login
```

### 2. Testing Manual

- [ ] Ejecutar checklist de testing manual (ver `TESTING_MANUAL_CHECKLIST.md`)
- [ ] Verificar rate limiting funciona
- [ ] Verificar gas fees se calculan correctamente
- [ ] Verificar auto-swap funciona
- [ ] Verificar Redis fallback funciona

### 3. Performance Testing

```bash
# Load testing básico
ab -n 1000 -c 50 https://your-domain.com/health
```

---

## 🐛 TROUBLESHOOTING

### Backend no inicia

```bash
# Verificar logs
sudo journalctl -u dujyo-backend -n 50

# Verificar variables de entorno
sudo systemctl show dujyo-backend | grep Environment

# Verificar puerto
sudo netstat -tlnp | grep 8083
```

### Redis no conecta

```bash
# Verificar Redis está corriendo
sudo systemctl status redis-server

# Verificar conexión
redis-cli ping

# Verificar configuración
redis-cli CONFIG GET requirepass
```

### Base de datos no conecta

```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Verificar conexión
psql -U dujyo -d dujyo -h localhost

# Verificar logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## 📝 MANTENIMIENTO

### Actualizaciones

```bash
# Pull latest code
cd /opt/dujyo
git pull origin main

# Recompilar
cd dujyo-backend
cargo build --release

# Reiniciar servicio
sudo systemctl restart dujyo-backend
```

### Limpieza

```bash
# Limpiar logs antiguos
sudo journalctl --vacuum-time=30d

# Limpiar Redis (cuidado!)
redis-cli FLUSHDB  # Solo en desarrollo/testing
```

---

## ✅ CHECKLIST FINAL

- [ ] Todos los servicios corriendo
- [ ] Health checks pasando
- [ ] SSL/TLS configurado
- [ ] Backups configurados
- [ ] Monitoreo configurado
- [ ] Logs funcionando
- [ ] Rate limiting funcionando
- [ ] Testing manual completado
- [ ] Documentación actualizada

---

**Última actualización:** 2024  
**Mantener actualizado con cada deployment**

