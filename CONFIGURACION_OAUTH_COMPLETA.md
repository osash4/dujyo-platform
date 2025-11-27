# 🔐 Configuración Completa de OAuth - Dujyo

**Fecha**: $(date +%Y-%m-%d)  
**Objetivo**: Configurar Google y Apple OAuth para que funcionen REALMENTE

---

## ✅ **LO QUE ESTÁ LISTO:**

1. ✅ Código de OAuth implementado (frontend y backend)
2. ✅ Endpoints backend creados (`/api/v1/auth/google` y `/api/v1/auth/apple`)
3. ✅ Scripts de OAuth agregados en `index.html`
4. ✅ Script de configuración creado: `scripts/setup-oauth.sh`
5. ✅ Error de `user_type` corregido (fallback automático)

---

## 📋 **PASO 1: Configurar Google OAuth**

### **1.1 Crear Proyecto en Google Cloud Console**

1. Ve a: https://console.cloud.google.com/
2. Crea un nuevo proyecto o selecciona uno existente
3. Nombre del proyecto: "Dujyo" (o el que prefieras)

### **1.2 Habilitar Google+ API**

1. Ve a "APIs & Services" > "Library"
2. Busca "Google+ API" o "People API"
3. Click en "Enable"

### **1.3 Crear OAuth 2.0 Credentials**

1. Ve a "APIs & Services" > "Credentials"
2. Click en "Create Credentials" > "OAuth client ID"
3. Si es la primera vez, configura OAuth consent screen:
   - User Type: External
   - App name: Dujyo
   - User support email: tu email
   - Developer contact: tu email
   - Click "Save and Continue"
   - Scopes: No necesitas agregar scopes adicionales
   - Test users: Agrega tu email si es necesario
   - Click "Save and Continue"
4. Application type: **Web application**
5. Name: "Dujyo Web Client"
6. **Authorized JavaScript origins:**
   - `http://localhost:5173`
   - `http://localhost:3000` (si usas otro puerto)
7. **Authorized redirect URIs:**
   - `http://localhost:5173`
   - `http://localhost:5173/callback/google`
8. Click "Create"
9. **Copia el "Client ID"** (algo como: `123456789-abcdefg.apps.googleusercontent.com`)

### **1.4 Agregar Client ID al .env**

```bash
cd dujyo-frontend
echo "VITE_GOOGLE_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com" >> .env
```

O edita `.env` manualmente y agrega:
```bash
VITE_GOOGLE_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com
```

---

## 📋 **PASO 2: Configurar Apple Sign In**

### **2.1 Requisitos Previos** ⚠️ **IMPORTANTE**

- **Cuenta de Apple Developer Program** (requiere pago: $99 USD/año)
- **NO hay versión gratuita** para Sign In with Apple en producción
- App ID creado en Apple Developer Portal

### **⚠️ ALTERNATIVAS si NO tienes cuenta de Apple Developer:**

**Opción A: Saltar Apple OAuth por ahora**
- Puedes lanzar MVP solo con Google OAuth y registro por email
- Agregar Apple OAuth después cuando tengas cuenta de desarrollador

**Opción B: Usar cuenta de desarrollador existente**
- Si tienes o puedes obtener acceso a una cuenta de Apple Developer
- Puedes configurar Sign In with Apple

### **2.2 Crear Services ID** (Solo si tienes cuenta de Apple Developer)

**⚠️ REQUISITO: Debes tener cuenta de Apple Developer Program activa ($99 USD/año)**

1. Ve a: https://developer.apple.com/account/
2. **Si no tienes cuenta:** 
   - Click en "Enroll" para registrarte
   - Requiere pago de $99 USD/año
   - Puede tomar 24-48 horas para aprobación
3. Una vez con cuenta activa:
   - Ve a "Certificates, Identifiers & Profiles"
   - Click en "Identifiers" > "+" (botón azul)
   - Selecciona "Services IDs" > Continue
   - Description: `Dujyo`
   - Identifier: `com.dujyo.app` (o tu dominio)
   - Click "Continue" > "Register"

### **2.3 Configurar Sign In with Apple**

1. En la lista de Identifiers, click en el Services ID que acabas de crear
2. Marca la casilla "Sign In with Apple"
3. Click "Configure"
4. Primary App ID: Selecciona tu App ID (o crea uno si no existe)
5. Website URLs:
   - **Domains and Subdomains**: `localhost`
   - **Return URLs**: 
     - `http://localhost:5173/callback/apple`
     - `http://localhost:5173`
6. Click "Save" > "Continue" > "Register"

### **2.4 Agregar Services ID al .env**

```bash
cd dujyo-frontend
echo "VITE_APPLE_CLIENT_ID=com.dujyo.app" >> .env
```

O edita `.env` manualmente y agrega:
```bash
VITE_APPLE_CLIENT_ID=com.dujyo.app
```

---

## 📋 **PASO 3: Usar Script de Configuración (Alternativa)**

Si prefieres usar el script interactivo:

```bash
cd /Volumes/DobleDHD/dujyo
./scripts/setup-oauth.sh
```

El script te guiará paso a paso y agregará las variables al `.env` automáticamente.

---

## 📋 **PASO 4: Reiniciar Servicios**

### **4.1 Reiniciar Frontend**

```bash
cd dujyo-frontend
# Detener servidor actual (Ctrl+C)
npm run dev
```

**IMPORTANTE**: Las variables de entorno de Vite solo se cargan al iniciar el servidor. Debes reiniciar para que los cambios surtan efecto.

### **4.2 Reiniciar Backend (si hiciste cambios)**

```bash
cd dujyo-backend
# Detener servidor actual
pkill -f xwavve-backend
cargo run --bin xwavve-backend
```

---

## 🧪 **PASO 5: Probar OAuth**

### **5.1 Verificar que Scripts Cargaron**

1. Abre DevTools (F12)
2. Ve a Console
3. Escribe: `window.google` y presiona Enter
   - Debe mostrar un objeto, no `undefined`
4. Escribe: `window.AppleID` y presiona Enter
   - Debe mostrar un objeto, no `undefined`

### **5.2 Verificar Client IDs**

En Console:
```javascript
console.log(import.meta.env.VITE_GOOGLE_CLIENT_ID);
console.log(import.meta.env.VITE_APPLE_CLIENT_ID);
```

Deben mostrar los IDs, no `undefined`.

### **5.3 Probar Google OAuth**

1. Ve a: `http://localhost:5173/onboarding`
2. El botón "Continue with Google" debe estar habilitado (no gris)
3. Click en el botón
4. Debe abrir popup de Google para seleccionar cuenta
5. Después de autenticar, debe redirigir a `/profile`
6. Debes estar autenticado

### **5.4 Probar Apple OAuth**

1. Ve a: `http://localhost:5173/onboarding`
2. El botón "Continue with Apple" debe estar habilitado (no gris)
3. Click en el botón
4. Debe abrir popup de Apple Sign In
5. Inicia sesión con tu Apple ID
6. Después de autenticar, debe redirigir a `/profile`
7. Debes estar autenticado

---

## 🐛 **TROUBLESHOOTING**

### **Problema: "Google Sign-In is not available"**

**Causas posibles:**
1. Script no cargó - Verifica en Console: `window.google`
2. Client ID no configurado - Verifica: `import.meta.env.VITE_GOOGLE_CLIENT_ID`
3. Frontend no reiniciado - Reinicia el servidor de desarrollo

**Solución:**
- Verifica que el script está en `index.html`
- Verifica que `VITE_GOOGLE_CLIENT_ID` está en `.env`
- Reinicia el frontend

### **Problema: "Apple Sign-In is not available"**

**Causas posibles:**
1. Script no cargó - Verifica en Console: `window.AppleID`
2. Client ID no configurado - Verifica: `import.meta.env.VITE_APPLE_CLIENT_ID`
3. Services ID mal configurado en Apple Developer

**Solución:**
- Verifica que el script está en `index.html`
- Verifica que `VITE_APPLE_CLIENT_ID` está en `.env`
- Verifica la configuración en Apple Developer Portal
- Reinicia el frontend

### **Problema: "Error 400: redirect_uri_mismatch" (Google)**

**Causa**: El redirect URI no está autorizado en Google Cloud Console

**Solución:**
1. Ve a Google Cloud Console > Credentials
2. Edita tu OAuth 2.0 Client ID
3. Agrega `http://localhost:5173` a "Authorized redirect URIs"
4. Guarda cambios

### **Problema: "Error de user_type"**

**Causa**: La columna `user_type` no existe en la base de datos

**Solución:**
```bash
cd dujyo-backend
# Ejecutar migración 007
psql $DATABASE_URL -f migrations/007_add_user_type.sql
```

O el código ahora tiene fallback automático, así que debería funcionar sin la columna.

---

## ✅ **CHECKLIST DE CONFIGURACIÓN:**

- [ ] Google Cloud Console: Proyecto creado
- [ ] Google Cloud Console: OAuth 2.0 Client ID creado
- [ ] Google Cloud Console: Redirect URIs configurados
- [ ] `VITE_GOOGLE_CLIENT_ID` agregado a `.env`
- [ ] Apple Developer: Services ID creado
- [ ] Apple Developer: Sign In with Apple configurado
- [ ] `VITE_APPLE_CLIENT_ID` agregado a `.env`
- [ ] Frontend reiniciado
- [ ] Scripts cargando correctamente (verificado en Console)
- [ ] Google OAuth probado y funcionando
- [ ] Apple OAuth probado y funcionando

---

## 📝 **NOTAS IMPORTANTES:**

1. **Variables de entorno**: Vite solo carga variables que empiezan con `VITE_`
2. **Reinicio necesario**: Siempre reinicia el frontend después de cambiar `.env`
3. **Desarrollo vs Producción**: Los redirect URIs deben coincidir exactamente
4. **Apple requiere cuenta de desarrollador**: Puede tomar tiempo configurar
5. **Google es más rápido**: Puede estar listo en minutos

---

*Configuración paso a paso - Sin atajos*

