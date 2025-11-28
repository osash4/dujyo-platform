# 🔧 Manual Fix: Create Users Table

## Problem
The backend is failing to start because the `users` table doesn't exist, even though the code tries to create it automatically.

## Quick Fix: Run SQL Manually

### Option 1: Using Neon Console (Recommended)
1. Go to your Neon dashboard: https://console.neon.tech
2. Select your database
3. Go to SQL Editor
4. Copy and paste this SQL:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(255) PRIMARY KEY,
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(255) UNIQUE,
    user_type VARCHAR(50) DEFAULT 'listener',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create token_balances table
CREATE TABLE IF NOT EXISTS token_balances (
    address VARCHAR(255) PRIMARY KEY,
    dyo_balance BIGINT NOT NULL DEFAULT 0,
    dys_balance BIGINT NOT NULL DEFAULT 0,
    staked_balance BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

5. Click "Run" or press Ctrl+Enter
6. Verify tables were created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'token_balances');
```

### Option 2: Using psql Command Line
```bash
psql "postgresql://neondb_owner:npg_Tt5QVSHC9Kke@ep-round-frost-ah8vkncp-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require" -f dujyo-backend/migrations/create_users_table.sql
```

## After Running SQL
1. Go to Render Dashboard
2. Trigger a manual redeploy of your backend service
3. Check logs - you should see:
   - `✅ Database tables initialized`
   - No more "relation \"users\" does not exist" errors

## Why This Happened
The automatic table creation in `init_tables()` might be failing silently, or there's a race condition where something tries to access the table before it's created.

## Prevention
The code now has better error handling and verification. After this manual fix, future deployments should work automatically.

