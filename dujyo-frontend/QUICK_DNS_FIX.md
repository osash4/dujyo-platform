# ⚡ Quick DNS Fix for "Not Secure" Warning

## Current Status in Vercel
- ✅ `dujyo.com` - Valid Configuration (307 redirect)
- ⚠️ `www.dujyo.com` - DNS Change Recommended ← **This needs fixing**

## Quick Fix Steps

### 1. Get DNS Records from Vercel

In Vercel Dashboard:
1. Go to your project → **Settings** → **Domains**
2. Click on `www.dujyo.com`
3. You'll see the exact DNS records needed

### 2. Update Namecheap DNS

Go to: **Namecheap** → **Domain List** → **dujyo.com** → **Advanced DNS**

#### Remove These (if they exist):
- ❌ Any CNAME pointing to `dujyo-platform.onrender.com`
- ❌ Any ALIAS pointing to `dujyo-platform.onrender.com`

#### Add These Records:

**For www.dujyo.com (CNAME):**
```
Type: CNAME Record
Host: www
Value: cname.vercel-dns.com
TTL: Automatic
```

**For dujyo.com (A Record or ALIAS):**
Check what Vercel shows you. It might be:
- **A Record**: `76.76.21.21` (or IP from Vercel)
- **ALIAS Record**: `cname.vercel-dns.com` (if Namecheap supports it)

### 3. Wait and Verify

1. **Wait 5-10 minutes** for DNS propagation
2. Go back to Vercel → Settings → Domains
3. Both should show ✅ "Valid Configuration"
4. Visit `https://dujyo.com` - should show green lock 🔒

### 4. If Still "Not Secure"

1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Try incognito mode**: To bypass cache
3. **Check SSL**: Visit `https://www.ssllabs.com/ssltest/analyze.html?d=dujyo.com`
4. **Wait longer**: SSL certificate can take up to 24 hours

## Expected Result

After fixing:
- ✅ Both domains show "Valid Configuration" in Vercel
- ✅ Green lock icon in browser
- ✅ No "Not Secure" warnings
- ✅ Automatic HTTPS redirect

## Need Help?

If Vercel shows specific DNS records different from above, **use those instead**. Vercel's instructions are always correct for your specific setup.

