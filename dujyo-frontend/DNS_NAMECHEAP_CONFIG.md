# 🔧 Configuración DNS en Namecheap para Vercel

## ⚠️ IMPORTANTE: Cambios Necesarios

Tu dominio actualmente apunta a **Render** (`dujyo-platform.onrender.com`), pero necesitas apuntarlo a **Vercel** para el frontend.

## 📋 Configuración Correcta para Vercel

### Paso 1: Obtener Registros de Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Domains
3. Agrega `dujyo.com` y `www.dujyo.com`
4. Vercel te mostrará los registros DNS exactos que necesitas

### Paso 2: Configurar en Namecheap

**Elimina los registros actuales:**
- ❌ CNAME Record: `www` → `dujyo-platform.onrender.com`
- ❌ ALIAS Record: `@` → `dujyo-platform.onrender.com`

**Agrega los nuevos registros para Vercel:**

#### Opción A: Si Vercel te da una IP específica

**A Record (para dujyo.com - apex domain):**
```
Type: A Record
Host: @
Value: [IP que Vercel te dé, probablemente 76.76.21.21]
TTL: Automatic (o 5 min)
```

**CNAME Record (para www.dujyo.com):**
```
Type: CNAME Record
Host: www
Value: cname.vercel-dns.com
TTL: Automatic
```

#### Opción B: Si Vercel usa ALIAS (Namecheap lo soporta)

**ALIAS Record (para dujyo.com - apex domain):**
```
Type: ALIAS Record
Host: @
Value: [valor que Vercel te dé, puede ser algo como: cname.vercel-dns.com]
TTL: 5 min
```

**CNAME Record (para www.dujyo.com):**
```
Type: CNAME Record
Host: www
Value: cname.vercel-dns.com
TTL: Automatic
```

## 🔍 Verificación

Después de cambiar los registros:

1. **Espera 5-60 minutos** para propagación DNS
2. Verifica en [whatsmydns.net](https://www.whatsmydns.net/#A/dujyo.com)
3. En Vercel Dashboard, verifica que el dominio muestre "Valid Configuration"
4. Vercel generará automáticamente el certificado SSL (puede tardar hasta 24 horas)

## ⚠️ Nota sobre Backend

Tu **backend seguirá en Render** (`dujyo-platform.onrender.com`), solo el **frontend** estará en Vercel (`dujyo.com`).

Asegúrate de que las variables de entorno en Vercel apunten al backend de Render:
```bash
VITE_API_URL=https://dujyo-platform.onrender.com
VITE_API_BASE_URL=https://dujyo-platform.onrender.com
VITE_WS_URL=wss://dujyo-platform.onrender.com
```

## 🚨 Troubleshooting

### "Domain not resolving"
- Espera más tiempo (hasta 48 horas máximo)
- Verifica que eliminaste los registros antiguos
- Verifica que los nuevos registros sean exactamente como Vercel los especifica

### "SSL Certificate pending"
- Normal, puede tardar hasta 24 horas
- Verifica que los DNS estén correctos
- Vercel generará el certificado automáticamente

### "Backend not connecting"
- Verifica variables de entorno en Vercel
- Verifica que el backend en Render esté corriendo
- Verifica CORS en el backend para permitir `dujyo.com`

---

**Última actualización:** 27 de Noviembre 2025

