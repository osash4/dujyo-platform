# 🔧 Troubleshooting: "Failed to register" (HTTP 500)

## Problema
El endpoint `/register` está devolviendo HTTP 500 (Internal Server Error).

## Causas Posibles

### 1. **Error de Base de Datos** (Más Probable)
El backend no puede conectarse a PostgreSQL o las tablas no existen.

**Solución:**
1. Ve a Render Dashboard → tu servicio backend
2. Revisa los **Logs** del servicio
3. Busca errores como:
   - `connection refused`
   - `relation "users" does not exist`
   - `database does not exist`
   - `password authentication failed`

### 2. **Variables de Entorno Faltantes**
El backend necesita estas variables en Render:
- `DATABASE_URL` - URL completa de PostgreSQL
- `JWT_SECRET` - Secret para tokens (mínimo 32 caracteres)
- `REDIS_URL` - URL de Redis (opcional, tiene fallback)

**Verificar en Render:**
1. Settings → Environment Variables
2. Asegúrate de que `DATABASE_URL` esté configurada
3. Formato: `postgresql://user:password@host:port/database`

### 3. **Tablas No Inicializadas**
El backend intenta crear las tablas automáticamente, pero puede fallar.

**Solución Manual:**
Si las tablas no existen, ejecuta las migraciones SQL en tu base de datos PostgreSQL.

### 4. **Backend No Está Corriendo**
El servicio puede estar dormido (Render free tier).

**Solución:**
- Render free tier tiene "spin down" después de inactividad
- La primera petición puede tardar 30-60 segundos
- Considera actualizar a un plan que mantenga el servicio activo

## Pasos de Diagnóstico

### Paso 1: Verificar Health Check
```bash
curl https://dujyo-platform.onrender.com/health
```
**Esperado:** `{"service":"dujyo-blockchain","status":"healthy","timestamp":...}`

### Paso 2: Probar Registro Directamente
```bash
curl -X POST https://dujyo-platform.onrender.com/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","username":"testuser"}' \
  -v
```

**Revisa:**
- Status code (debe ser 200 o 400, no 500)
- Response body (debe ser JSON con `success: true/false`)

### Paso 3: Revisar Logs en Render
1. Ve a tu servicio en Render Dashboard
2. Click en **Logs**
3. Busca líneas con `❌` o `error`
4. Copia el error completo

### Paso 4: Verificar Base de Datos
Si tienes acceso a PostgreSQL:
```sql
-- Verificar que la tabla users existe
SELECT * FROM users LIMIT 1;

-- Verificar que token_balances existe
SELECT * FROM token_balances LIMIT 1;
```

## Soluciones Rápidas

### Si es Error de Conexión a BD:
1. Verifica `DATABASE_URL` en Render
2. Asegúrate de que la base de datos esté activa
3. Verifica credenciales (usuario/contraseña)

### Si es Error de Tablas:
El backend debería crear las tablas automáticamente en el primer inicio.
Si no, necesitas ejecutar las migraciones manualmente.

### Si el Backend Está Dormido:
- Espera 30-60 segundos después de la primera petición
- Considera usar un servicio que mantenga el backend activo

## Mejoras Implementadas

✅ **Mejor manejo de errores en frontend:**
- Ahora muestra mensajes más específicos para HTTP 500
- Logs detallados en consola del navegador

✅ **Mejor manejo de errores en backend:**
- Errores de base de datos ahora devuelven JSON en lugar de StatusCode directo
- Logs más detallados para debugging

## Próximos Pasos

1. **Revisa los logs de Render** y comparte el error específico
2. **Verifica las variables de entorno** en Render
3. **Prueba el health check** para confirmar que el backend está activo
4. **Intenta registrar de nuevo** después de verificar la configuración

## Contacto
Si el problema persiste después de seguir estos pasos, comparte:
- El error completo de los logs de Render
- El resultado del health check
- El resultado del curl de registro

