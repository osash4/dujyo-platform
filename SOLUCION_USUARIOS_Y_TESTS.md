# 🔧 SOLUCIÓN: Usuarios y Tests

## ❌ PROBLEMAS ENCONTRADOS

1. **No sabes tu email/password** - Necesitas crear un usuario
2. **Métricas da 404** - El endpoint no está respondiendo
3. **Rate limiting no se activa** - Normal, es por minuto completo

---

## ✅ SOLUCIÓN 1: Crear Usuario de Prueba

### Opción A: Script Automático (RECOMENDADO)

```bash
./scripts/crear_usuario_test.sh
```

**Esto:**
- ✅ Crea un usuario automáticamente
- ✅ Te muestra email y password
- ✅ Guarda las credenciales en `/tmp/dujyo_test_credentials.txt`

**Luego usa las credenciales:**
```bash
source /tmp/dujyo_test_credentials.txt
export TEST_EMAIL=$EMAIL
export TEST_PASSWORD=$PASSWORD
```

---

### Opción B: Crear Manualmente

```bash
curl -X POST http://localhost:8083/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Test123456!",
    "username": "testuser"
  }' | jq
```

**Guarda el email y password que uses.**

---

## ✅ SOLUCIÓN 2: Problema Métricas (404)

El endpoint `/api/v1/metrics` está registrado pero puede que:
1. Necesite reiniciar el servidor
2. La ruta esté mal configurada

**Verificar:**
```bash
# Reiniciar servidor
# Luego probar:
curl http://localhost:8083/api/v1/metrics | jq
```

**Si sigue dando 404, el endpoint puede estar en otra ruta. Prueba:**
```bash
curl http://localhost:8083/metrics | jq
```

---

## ✅ SOLUCIÓN 3: Rate Limiting

**Es normal que no se active inmediatamente** porque:
- El límite es **por minuto completo**
- Si envías 65 requests en 1 segundo, todas pueden pasar
- El contador se resetea cada 60 segundos

**Para probar correctamente:**
```bash
# Enviar requests durante 60 segundos
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8083/health
  sleep 0.5
done
```

---

## 🚀 PASOS RECOMENDADOS

1. **Crear usuario:**
   ```bash
   ./scripts/crear_usuario_test.sh
   ```

2. **Guardar credenciales:**
   ```bash
   source /tmp/dujyo_test_credentials.txt
   ```

3. **Probar login:**
   ```bash
   curl -X POST http://localhost:8083/login \
     -H "Content-Type: application/json" \
     -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq
   ```

4. **Ejecutar tests de gas fees:**
   ```bash
   export JWT_TOKEN=$(curl -s -X POST http://localhost:8083/login \
     -H "Content-Type: application/json" \
     -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r '.token')
   
   ./scripts/test_gas_fees.sh
   ```

---

## 📋 RESUMEN

| Problema | Solución |
|----------|----------|
| No tengo email/password | `./scripts/crear_usuario_test.sh` |
| Métricas da 404 | Reiniciar servidor o verificar ruta |
| Rate limiting no activa | Normal, es por minuto completo |

---

**¡Ejecuta el script de crear usuario y tendrás todo listo!** 🚀

