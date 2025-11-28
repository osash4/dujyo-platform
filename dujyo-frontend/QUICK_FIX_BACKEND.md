# ⚡ Quick Fix: Backend Connection

## Problema
El fetch al backend falla con "Failed to fetch" desde el navegador.

## Posibles Causas

### 1. Backend Dormido (Render Free Tier)
Render free tier "duerme" el servicio después de inactividad. La primera petición puede tardar 30-60 segundos.

**Solución:**
- Espera 30-60 segundos después de la primera petición
- O actualiza a un plan que mantenga el servicio activo

### 2. Timeout
El backend puede estar tardando mucho en responder.

**Solución:**
- Verifica logs en Render
- Puede haber un proceso pesado corriendo

### 3. CORS (Ya Arreglado)
El backend ahora usa CORS permisivo, así que esto no debería ser el problema.

## Test Rápido

### Desde Terminal:
```bash
curl https://dujyo-platform.onrender.com/health
```
Si esto funciona, el backend está activo.

### Desde Navegador (Consola):
```javascript
// Test con timeout más largo
fetch('https://dujyo-platform.onrender.com/health', {
  signal: AbortSignal.timeout(60000) // 60 segundos
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

## Si Sigue Fallando

1. **Verifica Render Dashboard:**
   - ¿El servicio está "Running"?
   - ¿Hay errores en los logs?
   - ¿CPU/Memory está alto?

2. **Prueba desde otro lugar:**
   - ¿Funciona desde tu terminal local?
   - ¿Funciona desde otro navegador?

3. **Revisa Network Tab:**
   - Abre DevTools → Network
   - Intenta el fetch
   - ¿Qué status code muestra?
   - ¿Hay algún error específico?

## Solución Temporal

Si el backend se duerme mucho, considera:
- Actualizar Render a un plan que mantenga el servicio activo
- O usar un servicio de "ping" para mantenerlo despierto

