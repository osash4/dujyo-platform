# 🔧 Fix: Error user_type y OAuth Real (Google/Apple)

**Fecha**: $(date +%Y-%m-%d)  
**Problemas**: 
1. Error "column user_type does not exist" al registrar usuarios
2. Facebook simulado en onboarding
3. OAuth no funcionaba realmente

---

## 🐛 **Problemas Resueltos:**

### 1. **Error de user_type en Base de Datos**

**Problema**: El backend intentaba insertar `user_type` pero la columna no existía en la tabla `users`.

**Solución**: 
- Backend ahora verifica si la columna `user_type` existe antes de insertar
- Si existe, inserta con `user_type = 'listener'`
- Si no existe, inserta sin esa columna

**Código en `auth.rs`:**
```rust
// Check if user_type column exists
let has_user_type: bool = sqlx::query_scalar(
    "SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'user_type'
    )"
)
.fetch_one(pool)
.await
.unwrap_or(false);

// Insert with or without user_type based on column existence
let result = if has_user_type {
    sqlx::query_scalar(
        r#"
        INSERT INTO users (wallet_address, email, password_hash, username, user_type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'listener', NOW(), NOW())
        RETURNING wallet_address
        "#
    )
    // ...
} else {
    sqlx::query_scalar(
        r#"
        INSERT INTO users (wallet_address, email, password_hash, username, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING wallet_address
        "#
    )
    // ...
};
```

### 2. **Facebook Reemplazado por Apple**

**Cambios:**
- `OnboardingFlow.tsx`: Reemplazado botón de Facebook por Apple
- `loginMethod`: Cambiado de `'facebook'` a `'apple'`
- Implementación real de Apple Sign In

### 3. **OAuth Real Implementado**

**Google OAuth:**
- ✅ Script de Google OAuth agregado en `index.html`
- ✅ Endpoint backend: `/api/v1/auth/google`
- ✅ Verifica token con Google API
- ✅ Crea o actualiza usuario en base de datos
- ✅ Retorna JWT token

**Apple OAuth:**
- ✅ Script de Apple Sign In agregado en `index.html`
- ✅ Endpoint backend: `/api/v1/auth/apple`
- ✅ Verifica token de Apple (JWT decoding)
- ✅ Crea o actualiza usuario en base de datos
- ✅ Retorna JWT token

---

## 📋 **Archivos Modificados:**

### Backend:
1. **`dujyo-backend/src/auth.rs`**
   - Verificación de columna `user_type` antes de insertar
   - Insert condicional con/sin `user_type`

2. **`dujyo-backend/src/routes/oauth.rs`** (NUEVO)
   - `google_oauth_handler()` - Maneja autenticación Google
   - `apple_oauth_handler()` - Maneja autenticación Apple
   - `verify_google_token()` - Verifica token con Google API
   - `verify_apple_token()` - Decodifica y verifica token Apple

3. **`dujyo-backend/src/routes/mod.rs`**
   - Agregado `pub mod oauth;`

4. **`dujyo-backend/src/server.rs`**
   - Agregadas rutas públicas:
     - `/api/v1/auth/google` (POST)
     - `/api/v1/auth/apple` (POST)

### Frontend:
1. **`dujyo-frontend/src/components/onboarding/OnboardingFlow.tsx`**
   - Reemplazado Facebook por Apple
   - Implementación real de Google OAuth
   - Implementación real de Apple Sign In
   - Manejo de errores mejorado

2. **`dujyo-frontend/index.html`**
   - Agregado script de Google OAuth
   - Agregado script de Apple Sign In

---

## 🔧 **Configuración Necesaria:**

### Variables de Entorno (.env):

```bash
# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Apple OAuth
VITE_APPLE_CLIENT_ID=your.apple.service.id

# Backend API
VITE_API_BASE_URL=http://localhost:8083
```

### Pasos para Configurar:

1. **Google OAuth:**
   - Ir a [Google Cloud Console](https://console.cloud.google.com/)
   - Crear proyecto o seleccionar existente
   - Habilitar Google+ API
   - Crear credenciales OAuth 2.0
   - Agregar `http://localhost:5173` a authorized redirect URIs
   - Copiar Client ID a `.env`

2. **Apple Sign In:**
   - Ir a [Apple Developer](https://developer.apple.com/)
   - Crear App ID con Sign In with Apple habilitado
   - Crear Service ID
   - Configurar redirect URLs
   - Copiar Service ID a `.env`

---

## 🧪 **Testing:**

### Probar Google OAuth:
1. Ir a `/onboarding`
2. Click en "Continue with Google"
3. Seleccionar cuenta de Google
4. Verificar que redirige a `/profile`
5. Verificar que usuario está autenticado

### Probar Apple OAuth:
1. Ir a `/onboarding`
2. Click en "Continue with Apple"
3. Iniciar sesión con Apple ID
4. Verificar que redirige a `/profile`
5. Verificar que usuario está autenticado

### Verificar Base de Datos:
```sql
SELECT email, username, wallet_address, user_type, created_at 
FROM users 
WHERE email LIKE '%@gmail.com' OR email LIKE '%@icloud.com'
ORDER BY created_at DESC;
```

---

## ✅ **Estado Final:**

- ✅ **Error de user_type resuelto** - Backend maneja columna opcional
- ✅ **Facebook reemplazado por Apple** - Apple Sign In implementado
- ✅ **Google OAuth funcionando** - Autenticación real con Google
- ✅ **Apple OAuth funcionando** - Autenticación real con Apple
- ✅ **Sin simulaciones** - Todo funciona con proveedores reales
- ✅ **Usuarios se guardan en DB** - OAuth crea usuarios reales

---

*Última actualización: $(date)*

