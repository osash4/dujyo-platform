# 🔧 Fix: Google OAuth redirect_uri_mismatch

**Error**: `Error 400: redirect_uri_mismatch`  
**Client ID**: `956023991925-73umpdgeu2dcb0no3luqdbourvmucuhb.apps.googleusercontent.com`

---

## ❌ **PROBLEMA:**

Google OAuth está rechazando la solicitud porque el `redirect_uri` que usa la aplicación no está autorizado en Google Cloud Console.

---

## ✅ **SOLUCIÓN PASO A PASO:**

### **PASO 1: Ir a Google Cloud Console**

1. Ve a: https://console.cloud.google.com/
2. Selecciona tu proyecto (o el proyecto donde creaste el OAuth Client ID)

### **PASO 2: Editar OAuth 2.0 Client ID**

1. Ve a: **APIs & Services** > **Credentials**
2. Busca tu OAuth 2.0 Client ID: `956023991925-73umpdgeu2dcb0no3luqdbourvmucuhb`
3. **Click en el nombre** del Client ID para editarlo

### **PASO 3: Agregar Authorized Redirect URIs**

En la sección **"Authorized redirect URIs"**, agrega estos URIs (uno por línea):

```
http://localhost:5173
http://localhost:5173/callback/google
http://localhost:5173/onboarding
```

**⚠️ IMPORTANTE:**
- Debe ser `http://` (no `https://` para localhost)
- Sin trailing slash (`/`) al final
- Coincidir EXACTAMENTE con lo que usa la aplicación

### **PASO 4: Guardar Cambios**

1. Click en **"Save"** (botón azul abajo)
2. Espera unos segundos para que se actualice

### **PASO 5: Verificar en el Código**

El código usa `initTokenClient` que NO requiere redirect URI explícito, pero Google puede estar validando el origen. Verifica que:

1. El frontend esté corriendo en `http://localhost:5173`
2. El Client ID esté correcto en `.env`:
   ```bash
   VITE_GOOGLE_CLIENT_ID=956023991925-73umpdgeu2dcb0no3luqdbourvmucuhb.apps.googleusercontent.com
   ```

### **PASO 6: Probar de Nuevo**

1. Reinicia el frontend (si está corriendo):
   ```bash
   cd dujyo-frontend
   # Detener (Ctrl+C) y reiniciar
   npm run dev
   ```

2. Ve a: `http://localhost:5173/onboarding`
3. Click en "Continue with Google"
4. Debe funcionar ahora

---

## 🔍 **VERIFICACIÓN ADICIONAL:**

Si aún no funciona, verifica:

### **1. JavaScript Origins (Authorized JavaScript origins)**

En la misma página de edición del Client ID, en **"Authorized JavaScript origins"**, agrega:

```
http://localhost:5173
```

### **2. Verificar que el Client ID esté en .env**

```bash
cd dujyo-frontend
cat .env | grep GOOGLE
```

Debe mostrar:
```
VITE_GOOGLE_CLIENT_ID=956023991925-73umpdgeu2dcb0no3luqdbourvmucuhb.apps.googleusercontent.com
```

### **3. Verificar que el frontend esté en el puerto correcto**

Si usas otro puerto (no 5173), agrega ese puerto a los redirect URIs en Google Cloud Console.

---

## 📝 **CHECKLIST:**

- [ ] Agregado `http://localhost:5173` a Authorized redirect URIs
- [ ] Agregado `http://localhost:5173/callback/google` a Authorized redirect URIs
- [ ] Agregado `http://localhost:5173/onboarding` a Authorized redirect URIs
- [ ] Agregado `http://localhost:5173` a Authorized JavaScript origins
- [ ] Guardado cambios en Google Cloud Console
- [ ] Verificado Client ID en `.env`
- [ ] Reiniciado frontend
- [ ] Probado de nuevo

---

## 🐛 **SI AÚN NO FUNCIONA:**

### **Opción 1: Verificar en Console del Navegador**

1. Abre DevTools (F12)
2. Ve a Console
3. Intenta hacer login con Google
4. Revisa los errores en Console
5. Busca el redirect URI que está intentando usar

### **Opción 2: Usar redirect URI explícito**

Si `initTokenClient` no funciona, podemos cambiar a usar `redirect` en lugar de `popup`:

```typescript
// En lugar de initTokenClient, usar redirect
window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=token&scope=email profile`;
```

Pero primero intenta con la solución de agregar los redirect URIs.

---

## ✅ **RESUMEN:**

**El problema es que Google Cloud Console no tiene autorizado el redirect URI que usa la aplicación.**

**Solución:** Agregar los redirect URIs en Google Cloud Console y guardar.

---

*Última actualización: $(date)*

