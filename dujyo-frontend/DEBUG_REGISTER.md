# 🔍 Debug: "Failed to register" Error

## Pasos para Diagnosticar

### 1. Abrir Consola del Navegador

En dujyo.com, presiona **F12** y ve a la pestaña **Console**

### 2. Verificar Logs

Deberías ver logs como:
```
📡 Backend register response status: 200 (o 400, 500, etc.)
 Backend error response: [mensaje del backend]
```

### 3. Verificar Network Tab

1. Ve a la pestaña **Network** en las DevTools
2. Intenta registrar de nuevo
3. Busca la petición a `/register`
4. Click en ella
5. Ve a la pestaña **Response** o **Preview**

Deberías ver algo como:
```json
{
  "success": false,
  "message": "Email already registered"  ← Este es el mensaje real
}
```

### 4. Errores Comunes y Soluciones

#### Error: "Email already registered"
**Solución:** Usa un email diferente o verifica si ya tienes cuenta

#### Error: "Username already taken"
**Solución:** Usa un username diferente

#### Error: "Database error: ..."
**Causa:** Problema con la base de datos en Render
**Solución:** 
- Verifica que PostgreSQL esté corriendo en Render
- Verifica la variable `DATABASE_URL` en Render
- Verifica los logs del backend en Render

#### Error: "Invalid email address"
**Solución:** Asegúrate de usar un email válido con formato `usuario@dominio.com`

#### Error: "Password must be at least 6 characters"
**Solución:** Usa una contraseña de al menos 6 caracteres

#### Error: "Failed to create user"
**Causa:** Error en la inserción a la base de datos
**Solución:** Verifica logs del backend en Render

### 5. Verificar Backend en Render

1. Ve a tu dashboard de Render
2. Click en tu servicio backend
3. Ve a **Logs**
4. Busca errores relacionados con `/register`
5. Comparte los logs si hay errores

### 6. Probar Endpoint Directamente

Abre en tu navegador o usa curl:

```bash
curl -X POST https://dujyo-platform.onrender.com/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "username": "testuser"
  }'
```

Esto te dará la respuesta exacta del backend.

---

**Comparte:**
1. El mensaje exacto que ves en la consola
2. El status code de la petición (Network tab)
3. La respuesta del backend (Response/Preview tab)
4. Cualquier error en los logs de Render

