# ✅ Checklist: Variables de Entorno en Vercel

## 🔍 Verificar Configuración Actual

Ve a **Vercel Dashboard** → Tu Proyecto → **Settings** → **Environment Variables**

### Variables Requeridas para Producción:

```bash
VITE_API_BASE_URL=https://dujyo-platform.onrender.com
VITE_API_URL=https://dujyo-platform.onrender.com
VITE_WS_URL=wss://dujyo-platform.onrender.com
```

### ⚠️ IMPORTANTE:
- **NO** uses `http://` - siempre `https://`
- **NO** uses `ws://` para WebSocket - usa `wss://`
- **NO** agregues `/` al final de las URLs
- Asegúrate de que estén configuradas para **Production**, **Preview**, y **Development**

## 🔧 Cómo Configurar

1. Ve a Vercel Dashboard
2. Selecciona tu proyecto (`dujyo-platform` o similar)
3. Click en **Settings** → **Environment Variables**
4. Agrega cada variable:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://dujyo-platform.onrender.com`
   - **Environment:** Selecciona Production, Preview, Development
5. Repite para `VITE_API_URL` y `VITE_WS_URL`

## ✅ Verificación

Después de configurar:

1. **Redeploy** el proyecto en Vercel (o espera al próximo push)
2. Abre `https://dujyo.com` en el navegador
3. Abre **Console** (F12)
4. Deberías ver:
   ```
   🌐 Using API URL from environment: https://dujyo-platform.onrender.com
   ```
5. Si ves:
   ```
   ❌ ERROR: VITE_API_BASE_URL not set in production!
   ```
   → Las variables no están configuradas correctamente

## 🐛 Troubleshooting

### Problema: "Failed to fetch"
**Causa:** Backend no accesible o CORS bloqueando
**Solución:**
1. Verifica que el backend esté corriendo: `curl https://dujyo-platform.onrender.com/health`
2. Verifica variables de entorno en Vercel
3. Espera 1-2 minutos después de configurar variables (necesita redeploy)

### Problema: "CORS error"
**Causa:** Backend no permite requests desde dujyo.com
**Solución:** Ya está arreglado en el código - el backend ahora permite explícitamente `https://dujyo.com`

### Problema: Variables no se aplican
**Causa:** Necesitas redeploy después de agregar variables
**Solución:**
1. Ve a **Deployments** en Vercel
2. Click en los 3 puntos (...) del último deployment
3. Click en **Redeploy**

## 📋 Quick Check

En la consola del navegador, ejecuta:
```javascript
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);
console.log('WS URL:', import.meta.env.VITE_WS_URL);
```

Si muestra `undefined`, las variables no están configuradas.

