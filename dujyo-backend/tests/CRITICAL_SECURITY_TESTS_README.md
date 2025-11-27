# CRITICAL SECURITY TESTS - Paranoid Mode

## Overview

These tests verify **EMPIRICALLY** that the 4 critical exploits **NO LONGER WORK**.

Each test executes the **ORIGINAL EXPLOIT** and verifies it **FAILS**.

**IMPORTANT:** These tests **MUST FAIL** if the exploits still work.

---

## Prerequisites

### 1. Test Database Setup

Create a test database:

```bash
# Create test database
createdb dujyo_test

# Or use existing database
export TEST_DATABASE_URL="postgresql://dujyo:dujyo_password@localhost:5432/dujyo_test"
```

### 2. Database Tables

The test database must have the following tables:
- `stream_nonces`
- `validator_stakes`
- `content_stream_limits`
- `content`

These tables are created automatically by `BlockchainStorage::init_tables()`.

---

## Running the Tests

### Run All Critical Security Tests

```bash
cd dujyo-backend
cargo test --test critical_security_tests
```

### Run Specific Test

```bash
# Test #1: Nonce client control attack
cargo test --test critical_security_tests test_nonce_client_control_attack_fails

# Test #2: Nonce TOCTOU attack
cargo test --test critical_security_tests test_nonce_toctou_attack_fails

# Test #3: Concurrent withdrawal attack
cargo test --test critical_security_tests test_concurrent_withdrawal_attack_fails

# Test #4: Stake verification bypass
cargo test --test critical_security_tests test_stake_verification_bypass_fails

# Test #5: Concurrent validator registration
cargo test --test critical_security_tests test_concurrent_validator_registration_fails
```

### Run Tests with Output

```bash
cargo test --test critical_security_tests -- --nocapture
```

### Run Tests Ignoring Database Requirements

Tests are marked with `#[ignore]` to skip database setup. To run them:

```bash
cargo test --test critical_security_tests -- --ignored
```

---

## Test Descriptions

### TEST #1: Nonce Client Control Attack Fails

**Vulnerability:** Client controlled nonce, allowing collision attacks

**Test:** Verifies that server generates its own nonce (ignoring client-provided nonce)

**Verifications:**
1. Server generates nonce server-side (32-character hex, 128 bits)
2. Server-generated nonce is different from client-provided nonce
3. Nonce is stored in database successfully

**Expected Result:** ✅ PASS - Server generates its own nonce

---

### TEST #2: Nonce TOCTOU Attack Fails

**Vulnerability:** Check and insert were separate operations (TOCTOU)

**Test:** Verifies that atomic `INSERT ... ON CONFLICT DO NOTHING` prevents collisions

**Verifications:**
1. First nonce insert succeeds
2. Second nonce insert with same nonce fails (returns `None`)
3. Only one nonce exists in database (no duplicates)

**Expected Result:** ✅ PASS - Atomic insertion prevents collisions

---

### TEST #3: Concurrent Withdrawal Attack Fails

**Vulnerability:** Balance check and withdrawal were separate operations (TOCTOU)

**Test:** Verifies that mutex lock prevents concurrent withdrawals from exceeding balance

**Verifications:**
1. First withdrawal succeeds
2. Second withdrawal fails (insufficient balance)
3. Final balance is 0 (not negative)

**Expected Result:** ✅ PASS - Only one withdrawal processed

---

### TEST #4: Stake Verification Bypass Fails

**Vulnerability:** No balance verification before locking stake

**Test:** Verifies that balance check prevents registration without sufficient balance

**Verifications:**
1. User with 0 balance cannot register validator
2. Atomic stake insertion works (defense in depth)

**Expected Result:** ✅ PASS - Balance check prevents registration

---

### TEST #5: Concurrent Validator Registration Fails

**Vulnerability:** Race condition in stake locking

**Test:** Verifies that atomic `INSERT ... ON CONFLICT DO NOTHING` prevents duplicate registrations

**Verifications:**
1. First registration succeeds
2. Second registration fails (stake already locked)
3. Only one stake locked in database

**Expected Result:** ✅ PASS - Only one registration succeeds

---

## Test Results Interpretation

### ✅ PASS
- Exploit **NO LONGER WORKS**
- Security fix is **EFFECTIVE**
- System is **PROTECTED** against this attack vector

### ❌ FAIL
- Exploit **STILL WORKS**
- Security fix is **INEFFECTIVE**
- System is **VULNERABLE** - **DO NOT DEPLOY**

---

## Troubleshooting

### Database Connection Errors

```bash
# Check database is running
psql -U dujyo -d dujyo_test -c "SELECT 1"

# Create test database if missing
createdb -U dujyo dujyo_test
```

### Missing Tables

```bash
# Tables are created automatically by BlockchainStorage::init_tables()
# If missing, check that storage initialization runs before tests
```

### Test Timeouts

Tests have 5-second timeouts. If tests timeout:
- Check database performance
- Verify network connectivity
- Check for deadlocks

---

## Continuous Integration

Add to CI/CD pipeline:

```yaml
# .github/workflows/security-tests.yml
- name: Run Critical Security Tests
  run: |
    cargo test --test critical_security_tests -- --ignored
  env:
    TEST_DATABASE_URL: postgresql://dujyo:dujyo_password@localhost:5432/dujyo_test
```

---

## Security Notes

1. **These tests verify fixes work** - They do NOT guarantee complete security
2. **Run tests before every deployment** - Security fixes must be verified
3. **Monitor test results** - Failures indicate vulnerabilities
4. **Update tests when fixes change** - Keep tests in sync with code

---

## Report Issues

If tests fail or find new vulnerabilities:
1. **DO NOT DEPLOY** until fixed
2. Document the vulnerability
3. Create security fix
4. Update tests to verify fix
5. Re-run all tests

---

**Last Updated:** 2024-01-XX  
**Status:** ✅ All tests compile and are ready to run

