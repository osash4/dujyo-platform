# 🚀 Deployment en Vercel - dujyo.com

## Configuración Inicial

### 1. Conectar Repositorio a Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Click en "Add New Project"
3. Importa el repositorio `dujyo-platform` desde GitHub
4. Configura el proyecto:
   - **Framework Preset:** Vite
   - **Root Directory:** `dujyo-frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### 2. Variables de Entorno

Configura las siguientes variables en Vercel Dashboard → Settings → Environment Variables:

#### **Variables Requeridas:**
```bash
VITE_API_URL=https://tu-backend-en-render.onrender.com
VITE_API_BASE_URL=https://tu-backend-en-render.onrender.com
VITE_WS_URL=wss://tu-backend-en-render.onrender.com
```

#### **Variables Opcionales:**
```bash
VITE_GOOGLE_CLIENT_ID=tu-google-client-id
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_HOTJAR_SITE_ID=1234567
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_ENV=production
```

**Importante:** 
- Reemplaza `tu-backend-en-render.onrender.com` con la URL real de tu backend en Render
- Asegúrate de usar `https://` para API y `wss://` para WebSocket
- Configura estas variables para **Production**, **Preview**, y **Development**

### 3. Configurar Dominio Personalizado (dujyo.com)

#### **En Vercel:**
1. Ve a tu proyecto en Vercel
2. Click en **Settings** → **Domains**
3. Agrega `dujyo.com` y `www.dujyo.com`
4. Vercel te dará los registros DNS a configurar

#### **En Namecheap:**
1. Inicia sesión en [Namecheap](https://www.namecheap.com)
2. Ve a **Domain List** → Selecciona `dujyo.com`
3. Click en **Advanced DNS**
4. Configura los siguientes registros:

**Para dujyo.com (Apex Domain):**
```
Type: A Record
Host: @
Value: 76.76.21.21 (IP de Vercel - verifica en Vercel)
TTL: Automatic
```

**Para www.dujyo.com:**
```
Type: CNAME Record
Host: www
Value: cname.vercel-dns.com
TTL: Automatic
```

**O usa los registros que Vercel te proporcione:**
- Vercel puede darte registros específicos como:
  - `A Record`: `76.76.21.21`
  - `CNAME Record`: `cname.vercel-dns.com`

**Nota:** Si Vercel te da registros diferentes, usa esos en lugar de los anteriores.

### 4. SSL/HTTPS

Vercel automáticamente:
- ✅ Proporciona certificado SSL gratuito (Let's Encrypt)
- ✅ Configura HTTPS automáticamente
- ✅ Redirige HTTP → HTTPS
- ✅ Soporta HTTP/2

### 5. Verificación

Después de configurar DNS (puede tardar hasta 48 horas, pero usualmente es más rápido):

1. Verifica en Vercel que el dominio esté activo
2. Visita `https://dujyo.com` y `https://www.dujyo.com`
3. Verifica que el SSL esté activo (candado verde)

### 6. Redirecciones

Vercel automáticamente redirige:
- `http://dujyo.com` → `https://dujyo.com`
- `http://www.dujyo.com` → `https://www.dujyo.com`
- `https://www.dujyo.com` → `https://dujyo.com` (si configuras redirect en Vercel)

## Troubleshooting

### Problema: "Domain not resolving"
- **Solución:** Espera hasta 48 horas para propagación DNS
- Verifica que los registros DNS en Namecheap sean correctos
- Usa [whatsmydns.net](https://www.whatsmydns.net) para verificar propagación

### Problema: "SSL Certificate pending"
- **Solución:** Espera 1-24 horas para que Vercel genere el certificado
- Verifica que los registros DNS estén correctos

### Problema: "Backend API not connecting"
- **Solución:** 
  - Verifica que `VITE_API_URL` esté configurado correctamente
  - Asegúrate de que el backend en Render esté corriendo
  - Verifica CORS en el backend para permitir `dujyo.com`

### Problema: "WebSocket connection failed"
- **Solución:**
  - Verifica que `VITE_WS_URL` use `wss://` (no `ws://`)
  - Asegúrate de que el backend soporte WebSocket sobre HTTPS

## Configuración de CORS en Backend (Render)

Asegúrate de que tu backend en Render permita requests desde `dujyo.com`:

```rust
// En tu server.rs, agrega dujyo.com a los orígenes permitidos
let cors = CorsLayer::new()
    .allow_origin("https://dujyo.com".parse().unwrap())
    .allow_origin("https://www.dujyo.com".parse().unwrap())
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
    .allow_headers([CONTENT_TYPE, AUTHORIZATION]);
```

## Monitoreo

- **Vercel Analytics:** Activa en Vercel Dashboard → Analytics
- **Vercel Speed Insights:** Activa para monitorear performance
- **Logs:** Ve a Vercel Dashboard → Deployments → Click en deployment → Logs

## Próximos Pasos

1. ✅ Configurar variables de entorno
2. ✅ Conectar dominio
3. ✅ Verificar SSL
4. ✅ Probar conexión con backend
5. ✅ Configurar CORS en backend
6. ✅ Activar Analytics (opcional)

---

**Última actualización:** 27 de Noviembre 2025

