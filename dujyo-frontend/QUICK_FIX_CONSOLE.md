# 🔍 Solución Rápida: Consola en Blanco

## Si la consola está completamente en blanco:

### 1. Verifica que el código se haya desplegado

- Ve a Vercel Dashboard → Deployments
- Verifica que el último deployment esté completo (verde)
- Si está "Building" o "Error", espera o revisa los logs

### 2. Hard Refresh del Navegador

En dujyo.com, presiona:
- **Windows/Linux:** `Ctrl + Shift + R` o `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`

Esto fuerza la recarga del JavaScript nuevo.

### 3. Verifica que la Consola esté Habilitada

1. Abre DevTools (F12)
2. Ve a la pestaña **Console**
3. Verifica que no haya filtros activos (debería decir "All levels")
4. Verifica que no esté en "Hide network messages"

### 4. Verifica Errores de JavaScript

1. En la consola, busca cualquier error en rojo
2. Si hay errores, compártelos
3. Verifica la pestaña **Network** para ver si las peticiones se están haciendo

### 5. Prueba Directamente el Endpoint

Abre la consola y ejecuta:

```javascript
// Verificar variables de entorno
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);

// Probar fetch directamente
fetch('https://dujyo-platform.onrender.com/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@test.com',
    password: 'test123',
    username: 'testuser'
  })
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
```

Esto te dirá:
- Si las variables de entorno están configuradas
- Si el backend está accesible
- Qué error específico está devolviendo

### 6. Verifica Network Tab

1. Abre DevTools → Network
2. Intenta registrar
3. Busca la petición a `/register`
4. Si NO aparece ninguna petición → El código no se está ejecutando
5. Si aparece pero falla → Click en ella y ve Response/Preview

---

**Comparte:**
1. ¿Ves alguna petición en Network tab cuando intentas registrar?
2. ¿Hay algún error en rojo en la consola?
3. ¿Qué muestra el último deployment en Vercel? (¿está completo?)

