# Cloudflare R2 CDN Setup Guide

## Overview

DUJYO uses Cloudflare R2 for CDN and object storage. R2 is S3-compatible and provides:
- Fast global CDN delivery
- Low-cost storage
- No egress fees

## Configuration

### 1. Create R2 Bucket

1. Go to Cloudflare Dashboard → R2
2. Create a new bucket: `dujyo-media`
3. Note the bucket name

### 2. Get API Credentials

1. Go to R2 → Manage R2 API Tokens
2. Create API Token with:
   - Permissions: Object Read & Write
   - Bucket: `dujyo-media`
3. Save:
   - Access Key ID
   - Secret Access Key

### 3. Configure Public Access (Optional)

1. Go to R2 → `dujyo-media` → Settings
2. Enable Public Access
3. Note the public URL (e.g., `https://pub-xxxx.r2.dev`)

### 4. Environment Variables

Add to `.env`:

```bash
# R2 Configuration
R2_ACCESS_KEY=your_access_key_here
R2_SECRET_KEY=your_secret_key_here
R2_ENDPOINT=https://r2.cloudflarestorage.com
R2_BUCKET=dujyo-media
R2_PUBLIC_URL=https://pub-xxxx.r2.dev  # Optional, if public access enabled
```

## Current Implementation

The R2 integration is **prepared but not fully implemented** for MVP. The system will:
- ✅ Check for R2 configuration
- ✅ Fall back to local storage if R2 not configured
- ⏳ Use local storage for MVP (R2 upload will be implemented post-MVP)

## Future Implementation

To fully implement R2 uploads, add `aws-sdk-s3` dependency:

```toml
[dependencies]
aws-sdk-s3 = "1.0"
aws-config = "1.0"
```

Then update `dujyo-backend/src/storage/r2_storage.rs` with actual S3-compatible upload code.

## Testing

1. **Without R2 (Development):**
   - Files stored locally in `uploads/`
   - URLs: `/uploads/{type}/{filename}`

2. **With R2 (Production):**
   - Files uploaded to R2 bucket
   - URLs: `https://pub-xxxx.r2.dev/{filename}`

## Notes

- R2 is S3-compatible, so any S3 SDK will work
- For MVP, local storage is sufficient
- R2 can be enabled post-MVP without code changes (just env vars)

