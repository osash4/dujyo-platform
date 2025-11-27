# 🔄 REINICIAR SERVIDOR Y EJECUTAR TESTS

## ⚠️ IMPORTANTE

El servidor necesita iniciarse **manualmente en una terminal separada** porque:
- La compilación puede tomar 2-3 minutos
- Necesitas ver los logs para detectar errores
- Debe quedarse corriendo mientras ejecutas los tests

---

## 🚀 PASO 1: Iniciar Servidor

**En una terminal (Terminal 1):**
```bash
cd /Volumes/DobleDHD/xwave/dujyo-backend
cargo run --bin xwavve-backend
```

**Espera a ver:**
```
Dujyo Blockchain Server starting on http://127.0.0.1:8083
```

**NO cierres esta terminal** - déjala corriendo.

---

## 🧪 PASO 2: Ejecutar Tests

**En otra terminal (Terminal 2):**

### Test 1: Diagnóstico
```bash
cd /Volumes/DobleDHD/xwave
./scripts/diagnostico_simple.sh
```

### Test 2: Métricas
```bash
curl http://localhost:8083/api/v1/metrics | jq
```

### Test 3: Gas Fees
```bash
source /tmp/dujyo_test_credentials.txt
export JWT_TOKEN=$(curl -s -X POST http://localhost:8083/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r '.token')
./scripts/test_gas_fees.sh
```

### Test 4: Rate Limiting
```bash
./scripts/test_rate_limiting.sh
```

### Test 5: Redis
```bash
./scripts/test_redis.sh
```

---

## 📊 RESULTADOS ESPERADOS

### ✅ Diagnóstico
- Servidor respondiendo
- Métricas funcionando (después de reiniciar)
- Rate limiting implementado
- Redis fallback funcionando

### ✅ Métricas
```json
{
  "transactions": { ... },
  "rate_limiting": { ... },
  "redis": { ... }
}
```

### ✅ Gas Fees
- Usa wallet real del usuario
- Transacciones se ejecutan (pueden fallar si no hay balance, eso es normal)

---

## 🔍 SI HAY PROBLEMAS

1. **Servidor no inicia:**
   - Verifica que la base de datos esté corriendo
   - Revisa los errores en la terminal

2. **Métricas da 404:**
   - Reinicia el servidor después de los cambios
   - Verifica que el endpoint esté registrado

3. **Tests fallan:**
   - Verifica que el servidor esté corriendo
   - Verifica que las credenciales estén en `/tmp/dujyo_test_credentials.txt`

---

**Inicia el servidor manualmente y luego ejecuta los tests** 🚀

