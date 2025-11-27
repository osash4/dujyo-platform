# 🔄 INSTRUCCIONES PARA REINICIAR SERVIDOR Y EJECUTAR TESTS

## ⚠️ PROBLEMA DETECTADO

El servidor no está respondiendo. Puede ser que:
1. Esté compilando (toma tiempo)
2. Haya un error al iniciar
3. Necesite más tiempo para iniciar

---

## 🚀 SOLUCIÓN MANUAL (RECOMENDADO)

### Paso 1: Iniciar Servidor Manualmente

**En una terminal:**
```bash
cd dujyo-backend
cargo run --bin xwavve-backend
```

**Espera a ver:**
```
Dujyo Blockchain Server starting on http://127.0.0.1:8083
```

**NO cierres esta terminal** - déjala corriendo.

---

### Paso 2: Ejecutar Tests (en otra terminal)

**En otra terminal:**
```bash
cd /Volumes/DobleDHD/xwave

# Test 1: Diagnóstico
./scripts/diagnostico_simple.sh

# Test 2: Métricas
curl http://localhost:8083/api/v1/metrics | jq

# Test 3: Gas Fees
source /tmp/dujyo_test_credentials.txt
export JWT_TOKEN=$(curl -s -X POST http://localhost:8083/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r '.token')
./scripts/test_gas_fees.sh
```

---

## 🔍 VERIFICAR PROBLEMAS

Si el servidor no inicia:

1. **Verificar logs:**
   ```bash
   tail -f /tmp/dujyo_server.log
   ```

2. **Verificar compilación:**
   ```bash
   cd dujyo-backend
   cargo check --bin xwavve-backend
   ```

3. **Verificar base de datos:**
   ```bash
   psql -h localhost -U yare -d dujyo_blockchain -c "SELECT 1;"
   ```

---

## ✅ ALTERNATIVA: Script Automatizado

Si prefieres automatizado, el script está en:
```bash
./scripts/iniciar_y_testear.sh
```

Pero puede tomar más tiempo porque compila desde cero.

---

**Recomendación: Inicia el servidor manualmente y luego ejecuta los tests** 🚀

