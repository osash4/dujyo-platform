# 🔴 GUÍA DE SETUP DE REDIS - DUJYO MVP

**Versión:** 1.0  
**Objetivo:** Configurar Redis para rate limiting distribuido en DUJYO

---

## 📋 PREREQUISITOS

- Sistema operativo: Linux, macOS, o Windows (con WSL)
- Acceso root o sudo (para instalación)
- Puerto 6379 disponible (default de Redis)

---

## 🚀 INSTALACIÓN

### macOS (Homebrew)

```bash
# Instalar Redis
brew install redis

# Iniciar Redis
brew services start redis

# Verificar
redis-cli ping
# Debe responder: PONG
```

### Ubuntu/Debian

```bash
# Actualizar paquetes
sudo apt-get update

# Instalar Redis
sudo apt-get install redis-server

# Iniciar Redis
sudo systemctl start redis-server

# Habilitar al inicio
sudo systemctl enable redis-server

# Verificar
redis-cli ping
```

### Docker

```bash
# Ejecutar Redis en Docker
docker run -d \
  --name redis-dujyo \
  -p 6379:6379 \
  redis:7-alpine

# Verificar
docker exec -it redis-dujyo redis-cli ping
```

---

## ⚙️ CONFIGURACIÓN

### 1. Configuración Básica

Editar archivo de configuración:

**Ubuntu/Debian:**
```bash
sudo nano /etc/redis/redis.conf
```

**macOS (Homebrew):**
```bash
nano /usr/local/etc/redis.conf
```

**Configuración recomendada para desarrollo:**
```conf
# Memoria máxima (ajustar según necesidades)
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistencia (opcional para desarrollo)
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile ""

# Seguridad (opcional pero recomendado)
# requirepass your_secure_password
```

### 2. Configuración para Producción

```conf
# Memoria
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistencia (crítico para producción)
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Seguridad
requirepass your_very_secure_password
bind 127.0.0.1  # Solo conexiones locales

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300
```

### 3. Aplicar Configuración

```bash
# Reiniciar Redis
sudo systemctl restart redis-server  # Linux
brew services restart redis          # macOS
```

---

## 🔧 CONFIGURACIÓN PARA DUJYO

### 1. Variables de Entorno

Agregar a `.env`:

```bash
# Redis Configuration
REDIS_URL=redis://127.0.0.1:6379
# O con password:
# REDIS_URL=redis://:your_password@127.0.0.1:6379

# Para testing
TEST_REDIS_URL=redis://127.0.0.1:6379
```

### 2. Verificar Conexión desde Backend

```bash
# Ejecutar script de setup
cd dujyo-backend
./scripts/setup_redis.sh
```

### 3. Health Check

```bash
# Desde backend
curl http://localhost:8083/health

# Debe incluir estado de Redis en respuesta
```

---

## 🧪 TESTING

### 1. Test Básico

```bash
# Conectar a Redis CLI
redis-cli

# Comandos de prueba
PING          # Debe responder PONG
SET test "hello"
GET test      # Debe retornar "hello"
DEL test
```

### 2. Test desde Backend

```bash
# Ejecutar tests de Redis
cd dujyo-backend
cargo test --test rate_limiting_test -- --ignored
```

### 3. Test de Rate Limiting

```bash
# Hacer muchas requests
for i in {1..70}; do
  curl http://localhost:8083/health
done

# Verificar keys de rate limiting en Redis
redis-cli KEYS "rate_limit:*"
```

---

## 📊 MONITOREO

### 1. Información del Servidor

```bash
redis-cli INFO server
redis-cli INFO memory
redis-cli INFO stats
```

### 2. Monitoreo en Tiempo Real

```bash
# Monitor todas las operaciones
redis-cli MONITOR

# Stats en tiempo real
redis-cli --stat
```

### 3. Verificar Keys de Rate Limiting

```bash
# Ver todas las keys de rate limiting
redis-cli KEYS "rate_limit:*"

# Ver valor de una key específica
redis-cli GET "rate_limit:public:127.0.0.1"

# Ver TTL de una key
redis-cli TTL "rate_limit:public:127.0.0.1"
```

---

## 🔒 SEGURIDAD

### 1. Configurar Password

```bash
# Editar redis.conf
requirepass your_secure_password

# Reiniciar Redis
sudo systemctl restart redis-server

# Conectar con password
redis-cli -a your_secure_password
```

### 2. Firewall

```bash
# Solo permitir conexiones locales (recomendado)
# En redis.conf:
bind 127.0.0.1

# O configurar firewall
sudo ufw allow from 127.0.0.1 to any port 6379
```

### 3. Actualizar URL en Backend

```bash
# Si Redis tiene password
REDIS_URL=redis://:your_password@127.0.0.1:6379
```

---

## 🐛 TROUBLESHOOTING

### Redis no inicia

```bash
# Verificar logs
sudo tail -f /var/log/redis/redis-server.log  # Linux
tail -f /usr/local/var/log/redis.log           # macOS

# Verificar configuración
redis-server /etc/redis/redis.conf --test-memory 1
```

### Conexión rechazada

```bash
# Verificar que Redis está corriendo
sudo systemctl status redis-server  # Linux
brew services list                  # macOS

# Verificar puerto
sudo netstat -tlnp | grep 6379
```

### Memoria llena

```bash
# Ver uso de memoria
redis-cli INFO memory

# Limpiar keys expiradas (automático con maxmemory-policy)
# O manualmente:
redis-cli FLUSHDB  # CUIDADO: Elimina todas las keys
```

### Performance lenta

```bash
# Ver estadísticas
redis-cli INFO stats

# Verificar conexiones
redis-cli CLIENT LIST

# Verificar comandos lentos
redis-cli SLOWLOG GET 10
```

---

## 🔄 BACKUP Y RESTAURACIÓN

### 1. Backup Manual

```bash
# Crear snapshot
redis-cli BGSAVE

# O copiar archivo RDB
sudo cp /var/lib/redis/dump.rdb /backup/redis_$(date +%Y%m%d).rdb
```

### 2. Restaurar

```bash
# Detener Redis
sudo systemctl stop redis-server

# Copiar archivo RDB
sudo cp /backup/redis_20240101.rdb /var/lib/redis/dump.rdb

# Iniciar Redis
sudo systemctl start redis-server
```

---

## 📝 MANTENIMIENTO

### Limpieza Regular

```bash
# Limpiar keys de test (cuidado en producción)
redis-cli --scan --pattern "test:*" | xargs redis-cli DEL

# Limpiar keys expiradas de rate limiting (se limpian automáticamente)
# Pero puedes verificar:
redis-cli KEYS "rate_limit:*" | wc -l
```

### Actualización

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get upgrade redis-server

# macOS
brew upgrade redis

# Reiniciar
sudo systemctl restart redis-server
```

---

## ✅ CHECKLIST

- [ ] Redis instalado
- [ ] Redis corriendo
- [ ] Conexión verificada (`redis-cli ping`)
- [ ] Configuración aplicada
- [ ] Variables de entorno configuradas
- [ ] Health check del backend pasa
- [ ] Rate limiting funciona
- [ ] Monitoreo configurado
- [ ] Seguridad configurada (password, firewall)
- [ ] Backups configurados (producción)

---

## 🔗 RECURSOS

- [Documentación oficial de Redis](https://redis.io/docs/)
- [Redis Commands](https://redis.io/commands/)
- [Redis Configuration](https://redis.io/docs/management/config/)

---

**Última actualización:** 2024

