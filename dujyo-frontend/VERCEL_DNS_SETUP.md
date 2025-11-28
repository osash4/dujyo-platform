# 🔒 Vercel DNS Configuration for dujyo.com

## Current Status
- ✅ `dujyo.com` - Valid Configuration (307 redirect)
- ⚠️ `www.dujyo.com` - DNS Change Recommended
- ✅ `dujyo-platform.vercel.app` - Valid Configuration

## Problem: "Not Secure" Warning

The "Not Secure" warning appears because:
1. DNS records might not be pointing to Vercel correctly
2. SSL certificate might not be fully propagated
3. Mixed content (HTTP/HTTPS) issues

## Solution: Update DNS Records in Namecheap

### Step 1: Get Vercel DNS Records

In Vercel Dashboard:
1. Go to your project → Settings → Domains
2. Click on `www.dujyo.com`
3. You'll see DNS records that need to be added

### Step 2: Update Namecheap DNS

Go to Namecheap → Domain List → dujyo.com → Advanced DNS

**Remove these records (if they point to Render):**
- Any CNAME or A records pointing to `dujyo-platform.onrender.com`

**Add these records:**

#### For Root Domain (dujyo.com):
```
Type: A Record
Host: @
Value: 76.76.21.21
TTL: Automatic
```

OR (if Vercel provides a different IP):
```
Type: A Record
Host: @
Value: [IP from Vercel]
TTL: Automatic
```

#### For www Subdomain:
```
Type: CNAME Record
Host: www
Value: cname.vercel-dns.com
TTL: Automatic
```

OR (if Vercel provides specific CNAME):
```
Type: CNAME Record
Host: www
Value: [CNAME from Vercel]
TTL: Automatic
```

### Step 3: Verify in Vercel

After updating DNS:
1. Wait 5-10 minutes for DNS propagation
2. Go back to Vercel → Settings → Domains
3. Both domains should show "Valid Configuration" (green checkmark)
4. SSL certificate should be automatically issued

### Step 4: Force HTTPS Redirect

Vercel should automatically redirect HTTP to HTTPS, but you can verify in `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/(.*)",
      "has": [
        {
          "type": "header",
          "key": "x-forwarded-proto",
          "value": "http"
        }
      ],
      "destination": "https://dujyo.com/:1",
      "permanent": true
    }
  ]
}
```

## Troubleshooting

### If "Not Secure" persists:

1. **Clear browser cache**: Ctrl+Shift+Delete (Chrome) or Cmd+Shift+Delete (Safari)
2. **Check SSL certificate**: Visit `https://www.ssllabs.com/ssltest/analyze.html?d=dujyo.com`
3. **Verify DNS propagation**: Use `nslookup dujyo.com` or `dig dujyo.com`
4. **Check Vercel logs**: Look for SSL certificate errors

### Common Issues:

- **DNS not propagated**: Wait up to 48 hours (usually 5-10 minutes)
- **Wrong DNS records**: Double-check values in Namecheap match Vercel's requirements
- **Certificate pending**: Vercel needs time to issue SSL (usually automatic)

## Quick Check Commands

```bash
# Check DNS records
nslookup dujyo.com
nslookup www.dujyo.com

# Check SSL certificate
curl -I https://dujyo.com
curl -I https://www.dujyo.com
```

## Expected Result

After correct configuration:
- ✅ Both domains show "Valid Configuration" in Vercel
- ✅ Site loads with HTTPS (green lock icon)
- ✅ No "Not Secure" warnings
- ✅ Automatic redirect from HTTP to HTTPS

