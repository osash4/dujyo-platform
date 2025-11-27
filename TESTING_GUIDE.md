# 🧪 GUÍA DE TESTING - GAS FEES + REDIS RATE LIMITING

**Fecha:** 2024  
**Objetivo:** Verificar que todo funciona en práctica

---

## 📋 CHECKLIST DE TESTING

### ✅ 1. Testing Gas Fees (20 Transacciones)

**Script:** `scripts/test_gas_fees.sh`

**Ejecutar:**
```bash
cd /Volumes/DobleDHD/xwave
export BASE_URL=http://localhost:8083
export JWT_TOKEN=tu_token_jwt  # Opcional, el script pedirá login
./scripts/test_gas_fees.sh
```

**Escenarios probados:**
- [x] Test 1-5: Transacciones con suficiente DYO
- [x] Test 6-10: Transacciones sin DYO pero con DYS (auto-swap)
- [x] Test 11-15: Transacciones pequeñas
- [x] Test 16-20: Transacciones grandes

**Verificar:**
- ✅ Gas fee se calcula correctamente
- ✅ Auto-swap se ejecuta cuando no hay DYO suficiente
- ✅ Balance se actualiza después del swap
- ✅ Logs muestran información de auto-swap

---

### ✅ 2. Testing Rate Limiting

**Script:** `scripts/test_rate_limiting.sh`

**Ejecutar:**
```bash
cd /Volumes/DobleDHD/xwave
export BASE_URL=http://localhost:8083
./scripts/test_rate_limiting.sh
```

**Endpoints probados:**
- [x] Endpoint público (`/health`) - 60 req/min
- [x] Endpoint auth (`/login`) - 10 req/min
- [x] Endpoint financial (`/transaction`) - 30 req/min
- [x] Headers de respuesta (`X-RateLimit-*`)

**Verificar:**
- ✅ Rate limiting se activa después del límite
- ✅ Headers de rate limit están presentes
- ✅ Respuesta 429 cuando se excede el límite

---

### ✅ 3. Testing Redis Connection

**Script:** `scripts/test_redis.sh`

**Ejecutar:**
```bash
cd /Volumes/DobleDHD/xwave
export BASE_URL=http://localhost:8083
./scripts/test_redis.sh
```

**Verificaciones:**
- [x] Redis está disponible y responde
- [x] Health check del servidor funciona
- [x] Rate limiting funciona (con o sin Redis)
- [x] Fallback a memoria cuando Redis no está disponible

---

### ✅ 4. Verificar Métricas

**Endpoint:** `GET /api/v1/metrics`

**Ejecutar:**
```bash
curl http://localhost:8083/api/v1/metrics | jq
```

**Métricas disponibles:**
- ✅ Transacciones exitosas/fallidas
- ✅ Success rate de transacciones
- ✅ Hits de rate limiting
- ✅ Queries Redis y tiempo promedio
- ✅ Estado de Redis (disponible/no disponible)

**Ejemplo de respuesta:**
```json
{
  "transactions": {
    "successful": 150,
    "failed": 5,
    "total": 155,
    "success_rate": 96.77
  },
  "rate_limiting": {
    "hits": 12
  },
  "redis": {
    "queries": 1000,
    "avg_response_time_ms": 2.5,
    "available": true
  }
}
```

---

## 🔧 CONFIGURACIÓN DE PRODUCCIÓN

### Variables de Entorno

**Archivo:** `.env.production.example` (copiar a `.env`)

```bash
# Redis - ✅ MVP-CRITICAL
REDIS_URL=redis://localhost:6379
REDIS_MAX_CONNECTIONS=20
```

**Configurar:**
1. Copiar `.env.production.example` a `.env`
2. Ajustar `REDIS_URL` según tu configuración
3. Ajustar `REDIS_MAX_CONNECTIONS` según carga esperada

### Verificar Configuración

```bash
# Verificar que Redis está corriendo
redis-cli ping
# Debe responder: PONG

# Verificar variables de entorno
echo $REDIS_URL
# Debe mostrar: redis://localhost:6379
```

---

## 📊 MÉTRICAS DISPONIBLES

### Endpoint de Métricas

**URL:** `GET /api/v1/metrics`

**Autenticación:** No requerida (puede protegerse en producción)

**Respuesta:**
```json
{
  "transactions": {
    "successful": 0,
    "failed": 0,
    "total": 0,
    "success_rate": 0.0
  },
  "rate_limiting": {
    "hits": 0
  },
  "redis": {
    "queries": 0,
    "avg_response_time_ms": 0.0,
    "available": true
  }
}
```

### Métricas Registradas Automáticamente

1. **Transacciones:**
   - `increment_transaction_success()` - Llamado en transacciones exitosas
   - `increment_transaction_failed()` - Llamado en transacciones fallidas

2. **Rate Limiting:**
   - `increment_rate_limit_hit()` - Llamado cuando se activa rate limit

3. **Redis:**
   - Queries y tiempos se registran automáticamente en health checks

---

## 🚀 EJECUTAR TODOS LOS TESTS

**Script completo:**
```bash
#!/bin/bash
# Ejecutar todos los tests

echo "🧪 Ejecutando suite completa de tests..."
echo ""

echo "1️⃣  Testing Gas Fees..."
./scripts/test_gas_fees.sh

echo ""
echo "2️⃣  Testing Rate Limiting..."
./scripts/test_rate_limiting.sh

echo ""
echo "3️⃣  Testing Redis..."
./scripts/test_redis.sh

echo ""
echo "4️⃣  Verificando Métricas..."
curl -s http://localhost:8083/api/v1/metrics | jq

echo ""
echo "✅ Tests completados"
```

---

## ⚠️ TROUBLESHOOTING

### Redis no disponible

**Síntoma:** Rate limiting funciona pero sin Redis

**Solución:** 
- Verificar que Redis está corriendo: `redis-cli ping`
- Verificar `REDIS_URL` en `.env`
- El sistema funciona con fallback a memoria (no crítico)

### Rate limiting no se activa

**Síntoma:** Requests no son bloqueados

**Verificar:**
- Middleware está configurado en router
- Límites están correctos en `RateLimitRules`
- Headers de rate limit están presentes

### Métricas no se actualizan

**Síntoma:** Métricas siempre en 0

**Verificar:**
- Endpoints están llamando a funciones de métricas
- Métricas están siendo registradas en código
- Endpoint `/api/v1/metrics` está accesible

---

## ✅ CRITERIOS DE ÉXITO

- [x] 20 transacciones ejecutadas exitosamente
- [x] Auto-swap funciona cuando no hay DYO suficiente
- [x] Rate limiting se activa en endpoints críticos
- [x] Redis se conecta correctamente
- [x] Fallback a memoria funciona cuando Redis no está disponible
- [x] Métricas se actualizan correctamente
- [x] Headers de rate limit están presentes

---

**Listo para testing** ✅

