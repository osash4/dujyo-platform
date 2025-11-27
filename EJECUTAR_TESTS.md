# 🧪 EJECUTAR TESTS - GUÍA RÁPIDA

## 🚀 PASO 1: Iniciar el Servidor

**En una terminal:**
```bash
cd dujyo-backend
cargo run --bin xwavve-backend
```

**Espera a ver:**
```
Dujyo Blockchain Server starting on http://127.0.0.1:8083
```

---

## 🧪 PASO 2: Ejecutar Tests

**En otra terminal (deja el servidor corriendo):**

### Test 1: Diagnóstico Simple
```bash
cd /Volumes/DobleDHD/xwave
./scripts/diagnostico_simple.sh
```

**Verifica:**
- ✅ Servidor respondiendo
- ✅ Endpoint de métricas funciona
- ✅ Rate limiting activo
- ✅ Redis (opcional)

---

### Test 2: Rate Limiting
```bash
./scripts/test_rate_limiting.sh
```

**Verifica:**
- ✅ Rate limiting se activa después de 60 requests
- ✅ Headers de rate limit presentes
- ✅ Respuesta 429 cuando se excede

---

### Test 3: Redis Connection
```bash
./scripts/test_redis.sh
```

**Verifica:**
- ✅ Redis disponible (o fallback a memoria)
- ✅ Health check funciona
- ✅ Rate limiting funciona con/sin Redis

---

### Test 4: Gas Fees (Requiere Login)
```bash
./scripts/test_gas_fees.sh
```

**Nota:** Este test requiere que tengas un usuario creado. Te pedirá email y password.

---

### Test 5: Métricas Manual
```bash
curl http://localhost:8083/api/v1/metrics | jq
```

**Deberías ver:**
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
    "available": false
  }
}
```

---

## 📋 CHECKLIST RÁPIDO

- [ ] Servidor iniciado y corriendo
- [ ] Diagnóstico simple ejecutado
- [ ] Rate limiting probado
- [ ] Métricas verificadas
- [ ] Redis verificado (opcional)

---

## ⚠️ NOTAS IMPORTANTES

1. **El servidor debe estar corriendo** antes de ejecutar los tests
2. **Rate limiting es por minuto** - puede que no se active inmediatamente
3. **Redis es opcional** - el sistema funciona sin él
4. **Gas fees test requiere usuario** - crea uno primero si no tienes

---

## 🎯 ORDEN RECOMENDADO

1. **Primero:** `./scripts/diagnostico_simple.sh` - Verifica que todo funciona
2. **Segundo:** `curl http://localhost:8083/api/v1/metrics | jq` - Ver métricas
3. **Tercero:** `./scripts/test_rate_limiting.sh` - Probar rate limiting
4. **Cuarto:** `./scripts/test_redis.sh` - Verificar Redis

---

**¡Listo para testing!** 🚀

