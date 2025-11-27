# 🔧 Troubleshooting: "Failed to fetch" en dujyo.com

## Problema: "Failed to fetch" al crear cuenta

Este error generalmente ocurre por:
1. Variables de entorno no configuradas en Vercel
2. URL del backend incorrecta
3. Backend no accesible desde Vercel
4. Problema de CORS (aunque el backend es permissive)

## ✅ Solución Paso a Paso

### 1. Verificar Variables de Entorno en Vercel

Ve a **Vercel Dashboard** → Tu Proyecto → **Settings** → **Environment Variables**

Asegúrate de tener estas variables configuradas para **Production**:

```bash
VITE_API_URL=https://dujyo-platform.onrender.com
VITE_API_BASE_URL=https://dujyo-platform.onrender.com
VITE_WS_URL=wss://dujyo-platform.onrender.com
```

**⚠️ IMPORTANTE:**
- Reemplaza `dujyo-platform.onrender.com` con la URL REAL de tu backend en Render
- Usa `https://` (no `http://`)
- Usa `wss://` para WebSocket (no `ws://`)
- Después de agregar/modificar variables, **redeploya** el proyecto en Vercel

### 2. Verificar que el Backend esté Accesible

Abre en tu navegador:
```
https://tu-backend-render.onrender.com/health
```

Deberías ver una respuesta JSON. Si no funciona:
- Verifica que el backend esté corriendo en Render
- Verifica que el backend use `HOST=0.0.0.0` y `PORT` correcto
- Verifica que Render tenga el servicio activo

### 3. Verificar CORS en el Backend

El backend ya tiene `CorsLayer::permissive()`, pero verifica en Render que:
- El backend esté escuchando en `0.0.0.0` (no `127.0.0.1`)
- El puerto esté correctamente configurado

### 4. Verificar en el Navegador

Abre la **Consola del Navegador** (F12) en dujyo.com y verifica:

1. **Network Tab**: Busca la petición a `/register`
   - ¿Qué URL está usando?
   - ¿Qué error muestra?
   - ¿Status code?

2. **Console Tab**: Busca errores
   - ¿"Failed to fetch"?
   - ¿"CORS error"?
   - ¿"Network error"?

### 5. Debug Rápido

Abre la consola del navegador en dujyo.com y ejecuta:

```javascript
// Verificar variables de entorno
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);

// Probar conexión al backend
fetch('https://tu-backend-render.onrender.com/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

## 🔍 Diagnóstico Común

### Error: "Failed to fetch" sin más detalles
**Causa:** URL del backend incorrecta o backend no accesible
**Solución:** 
1. Verifica variables de entorno en Vercel
2. Verifica que el backend esté corriendo
3. Redeploya Vercel después de cambiar variables

### Error: "CORS policy"
**Causa:** Aunque el backend es permissive, puede haber un problema
**Solución:** 
1. Verifica que el backend esté usando `CorsLayer::permissive()`
2. Verifica que el backend esté escuchando en `0.0.0.0`

### Error: "Network error" o "Connection refused"
**Causa:** Backend no accesible o URL incorrecta
**Solución:**
1. Verifica la URL del backend en Render
2. Prueba acceder directamente al backend en el navegador
3. Verifica que Render no esté en "sleep" (si es plan gratuito)

## 🚀 Pasos de Verificación Rápida

1. ✅ Variables de entorno configuradas en Vercel
2. ✅ Backend accesible en `https://tu-backend.onrender.com/health`
3. ✅ Vercel redeployado después de cambiar variables
4. ✅ Consola del navegador sin errores de CORS
5. ✅ Network tab muestra peticiones al backend correcto

## 📝 Nota sobre Render Free Tier

Si estás en el plan gratuito de Render:
- El servicio puede "dormir" después de 15 minutos de inactividad
- El primer request puede tardar ~30 segundos en "despertar"
- Considera usar un servicio de "ping" para mantenerlo activo

---

**Última actualización:** 27 de Noviembre 2025

