# ⚡ Quick Fix: "Failed to register" Error

## 🔍 Diagnóstico Rápido

El error **"Failed to register"** con HTTP 500 generalmente significa que el **backend tiene un problema con la base de datos**.

## ✅ Checklist Rápido

### 1. Verifica que el Backend Esté Activo
```bash
curl https://dujyo-platform.onrender.com/health
```
Si no responde, el backend está dormido (Render free tier). Espera 30-60 segundos.

### 2. Revisa los Logs en Render
1. Ve a https://dashboard.render.com
2. Selecciona tu servicio backend
3. Click en **Logs**
4. Busca errores con `❌` o `error`

### 3. Verifica Variables de Entorno
En Render Dashboard → Settings → Environment Variables:
- ✅ `DATABASE_URL` debe estar configurada
- ✅ `JWT_SECRET` debe tener mínimo 32 caracteres
- ✅ `HOST` debe ser `0.0.0.0` (o no configurada)
- ✅ `PORT` debe estar configurada (o usar default 8083)

### 4. Prueba el Registro Directamente
```bash
curl -X POST https://dujyo-platform.onrender.com/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","username":"testuser"}'
```

## 🚨 Errores Comunes

### Error: "relation 'users' does not exist"
**Solución:** El backend debería crear las tablas automáticamente. Si no, verifica los logs de inicialización.

### Error: "connection refused" o "password authentication failed"
**Solución:** Verifica `DATABASE_URL` en Render. Debe ser:
```
postgresql://user:password@host:port/database
```

### Error: Backend no responde (timeout)
**Solución:** Render free tier tiene "spin down". La primera petición puede tardar 30-60 segundos.

## 📋 Próximos Pasos

1. **Abre la consola del navegador** (F12) cuando intentes registrar
2. **Revisa los logs** - ahora hay más información de debugging
3. **Comparte el error específico** de los logs de Render

## 🔧 Cambios Recientes

✅ Mejorado el manejo de errores HTTP 500 en el frontend
✅ Mejorado el manejo de errores de base de datos en el backend
✅ Agregados logs más detallados para debugging

