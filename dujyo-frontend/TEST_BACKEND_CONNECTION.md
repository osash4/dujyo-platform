# 🧪 Test Backend Connection

## Quick Test in Browser Console

Abre la consola del navegador (F12) en `https://dujyo.com` y ejecuta:

```javascript
// Test 1: Simple health check
fetch('https://dujyo-platform.onrender.com/health')
  .then(r => r.json())
  .then(data => console.log('✅ Backend OK:', data))
  .catch(err => console.error('❌ Error:', err));

// Test 2: With timeout
fetch('https://dujyo-platform.onrender.com/health', {
  signal: AbortSignal.timeout(10000) // 10 second timeout
})
  .then(r => r.json())
  .then(data => console.log('✅ Backend OK:', data))
  .catch(err => console.error('❌ Error:', err));

// Test 3: Check CORS headers
fetch('https://dujyo-platform.onrender.com/health', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://dujyo.com',
    'Access-Control-Request-Method': 'GET'
  }
})
  .then(r => {
    console.log('✅ CORS OK');
    console.log('Headers:', [...r.headers.entries()]);
  })
  .catch(err => console.error('❌ CORS Error:', err));
```

## Expected Results

### ✅ Success:
```
✅ Backend OK: {service: "dujyo-blockchain", status: "healthy", timestamp: ...}
```

### ❌ Common Errors:

#### "Failed to fetch" / Network Error
**Causa:** Backend dormido (Render free tier) o timeout
**Solución:**
1. Espera 30-60 segundos (Render puede estar "spinning up")
2. Intenta de nuevo
3. Verifica que el backend esté activo en Render Dashboard

#### CORS Error
**Causa:** Backend no permite requests desde dujyo.com
**Solución:** Ya está arreglado - backend usa CORS permisivo

#### Timeout
**Causa:** Backend muy lento
**Solución:** 
1. Verifica logs en Render
2. Puede ser que el backend esté procesando algo pesado

## Check Backend Status

En Render Dashboard:
1. Ve a tu servicio backend
2. Revisa **Logs** - deberías ver actividad reciente
3. Revisa **Metrics** - CPU/Memory usage
4. Si está "Sleeping", la primera petición puede tardar 30-60s

## Alternative: Use Render's Always-On

Si el backend se duerme mucho:
1. Render Dashboard → Settings
2. Busca "Auto-Deploy" o "Sleep Settings"
3. Considera actualizar a un plan que mantenga el servicio activo

