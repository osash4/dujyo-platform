# DUJYO SECURITY TESTS - SETUP GUIDE

## Overview

This directory contains security tests that verify critical vulnerabilities are fixed.

## Prerequisites

1. **PostgreSQL 14+** installed and running
2. **Rust 1.70+** with cargo
3. **Test database** created

## Setup Instructions

### 1. Create Test Database

```bash
# Create test database
createdb dujyo_test

# Or use existing database
export TEST_DATABASE_URL="postgresql://dujyo:dujyo_password@localhost:5432/dujyo_test"
```

### 2. Run Database Migrations

```bash
cd dujyo-backend
export DATABASE_URL="postgresql://dujyo:dujyo_password@localhost:5432/dujyo_test"
psql "$DATABASE_URL" -f migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f migrations/002_dex_transactions.sql
psql "$DATABASE_URL" -f migrations/003_database_optimization.sql
psql "$DATABASE_URL" -f migrations/004_token_balances.sql
psql "$DATABASE_URL" -f migrations/005_performance_optimization.sql
psql "$DATABASE_URL" -f migrations/006_content_analytics_royalties.sql
```

### 3. Run Security Tests

```bash
cd dujyo-backend
export TEST_DATABASE_URL="postgresql://dujyo:dujyo_password@localhost:5432/dujyo_test"
cargo test --test critical_security_tests -- --ignored --nocapture
```

## Test Descriptions

### Test #1: Nonce Client Control Attack Fails
- **File:** `critical_security_tests.rs:63-126`
- **Verifies:** Server generates its own nonce (ignores client nonce)
- **Expected:** ✅ PASS

### Test #2: Nonce TOCTOU Attack Fails
- **File:** `critical_security_tests.rs:132-215`
- **Verifies:** Atomic insertion prevents nonce collisions
- **Expected:** ✅ PASS

### Test #3: Concurrent Withdrawal Attack Fails
- **File:** `critical_security_tests.rs:221-279`
- **Verifies:** Mutex lock prevents double withdrawals
- **Expected:** ✅ PASS

### Test #4: Stake Verification Bypass Fails
- **File:** `critical_security_tests.rs:285-332`
- **Verifies:** Balance check prevents registration without balance
- **Expected:** ✅ PASS

### Test #5: Concurrent Validator Registration Fails
- **File:** `critical_security_tests.rs:336-402`
- **Verifies:** Atomic insertion prevents duplicate registrations
- **Expected:** ✅ PASS

## Continuous Integration

Add to `.github/workflows/security-tests.yml`:

```yaml
name: Security Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: dujyo_test
          POSTGRES_USER: dujyo
          POSTGRES_PASSWORD: dujyo_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      
      - name: Run Database Migrations
        run: |
          export DATABASE_URL="postgresql://dujyo:dujyo_password@localhost:5432/dujyo_test"
          psql "$DATABASE_URL" -f dujyo-backend/migrations/001_initial_schema.sql
          psql "$DATABASE_URL" -f dujyo-backend/migrations/002_dex_transactions.sql
          psql "$DATABASE_URL" -f dujyo-backend/migrations/003_database_optimization.sql
          psql "$DATABASE_URL" -f dujyo-backend/migrations/004_token_balances.sql
          psql "$DATABASE_URL" -f dujyo-backend/migrations/005_performance_optimization.sql
          psql "$DATABASE_URL" -f dujyo-backend/migrations/006_content_analytics_royalties.sql
      
      - name: Run Security Tests
        env:
          TEST_DATABASE_URL: postgresql://dujyo:dujyo_password@localhost:5432/dujyo_test
        run: |
          cd dujyo-backend
          cargo test --test critical_security_tests -- --ignored --nocapture
```

## Troubleshooting

### Database Connection Errors

```bash
# Check database is running
psql -U dujyo -d dujyo_test -c "SELECT 1"

# Create test database if missing
createdb -U dujyo dujyo_test
```

### Missing Tables

Tables are created automatically by migrations. If missing:
```bash
export DATABASE_URL="postgresql://dujyo:dujyo_password@localhost:5432/dujyo_test"
psql "$DATABASE_URL" -f dujyo-backend/migrations/001_initial_schema.sql
```

### Test Timeouts

Tests have 5-second timeouts. If tests timeout:
- Check database performance
- Verify network connectivity
- Check for deadlocks

---

**Last Updated:** 2024-11-09  
**Status:** Tests ready but require database setup

