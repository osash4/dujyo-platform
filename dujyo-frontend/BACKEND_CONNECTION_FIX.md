# 🔧 Fix: Backend Connection Issue

## Problem
The backend is not connecting correctly to the domain `dujyo.com`.

## Root Causes

### 1. **Missing Environment Variables in Vercel**
The frontend needs these variables to know where the backend is:
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_WS_URL` - WebSocket URL

### 2. **CORS Configuration**
The backend needs to explicitly allow requests from `dujyo.com`.

## Solutions Applied

### ✅ 1. Improved CORS in Backend
- Added explicit CORS configuration for `https://dujyo.com` and `https://www.dujyo.com`
- Allows all necessary HTTP methods and headers
- Enables credentials for authenticated requests

### ✅ 2. Better API URL Detection
- Improved logging in `apiConfig.ts` to show which URL is being used
- Better error messages when environment variables are missing
- Fallback to default Render URL if env var not set

## Action Required: Configure Vercel Environment Variables

### Step 1: Go to Vercel Dashboard
1. Visit https://vercel.com
2. Select your project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add These Variables

**For Production:**
```
VITE_API_BASE_URL = https://dujyo-platform.onrender.com
VITE_API_URL = https://dujyo-platform.onrender.com
VITE_WS_URL = wss://dujyo-platform.onrender.com
```

**Important:**
- ✅ Use `https://` (not `http://`)
- ✅ Use `wss://` for WebSocket (not `ws://`)
- ✅ NO trailing slash (`/`)
- ✅ Apply to **Production**, **Preview**, and **Development**

### Step 3: Redeploy
After adding variables:
1. Go to **Deployments**
2. Click **...** on latest deployment
3. Click **Redeploy**

## Verification

### Check 1: Browser Console
After redeploy, open `https://dujyo.com` and check console (F12):
```
🌐 Using API URL from environment: https://dujyo-platform.onrender.com
```

If you see:
```
❌ ERROR: VITE_API_BASE_URL not set in production!
```
→ Variables are not configured correctly

### Check 2: Test Backend Connection
In browser console, run:
```javascript
fetch('https://dujyo-platform.onrender.com/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

Should return: `{"service":"dujyo-blockchain","status":"healthy",...}`

### Check 3: Check Network Tab
1. Open DevTools → **Network** tab
2. Try to use the app
3. Look for requests to `dujyo-platform.onrender.com`
4. Check if they succeed (200) or fail (CORS/network error)

## Common Issues

### Issue: "Failed to fetch"
**Cause:** Backend not accessible or CORS blocking
**Fix:**
1. Verify backend is running: `curl https://dujyo-platform.onrender.com/health`
2. Check Vercel environment variables
3. Wait 1-2 minutes after setting variables (needs redeploy)

### Issue: "CORS policy blocked"
**Cause:** Backend CORS not allowing dujyo.com
**Fix:** Already fixed in code - backend now explicitly allows dujyo.com

### Issue: Variables not working
**Cause:** Need to redeploy after adding variables
**Fix:** 
1. Go to Vercel → Deployments
2. Click **Redeploy** on latest deployment

## Next Steps

1. ✅ **Configure environment variables in Vercel** (see above)
2. ✅ **Redeploy** the frontend
3. ✅ **Test** the connection
4. ✅ **Check console** for API URL logs
5. ✅ **Verify** backend is accessible

## Quick Test

After configuration, test in browser console:
```javascript
// Check environment variables
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);
console.log('WS URL:', import.meta.env.VITE_WS_URL);

// Test backend connection
fetch('https://dujyo-platform.onrender.com/health')
  .then(r => r.json())
  .then(data => console.log('✅ Backend connected:', data))
  .catch(err => console.error('❌ Backend error:', err));
```

