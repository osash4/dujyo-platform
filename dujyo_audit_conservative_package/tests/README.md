# Security Tests - Setup and Execution

## Prerequisites

1. **PostgreSQL Database**
   ```bash
   docker run -d \
     --name dujyo-postgres \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=dujyo_blockchain \
     -p 5432:5432 \
     postgres:15
   ```

2. **Environment Variables**
   ```bash
   export DATABASE_URL="postgresql://postgres:password@localhost:5432/dujyo_blockchain"
   export JWT_SECRET="test_jwt_secret_minimum_32_characters_long_for_security"
   ```

3. **Database Schema**
   ```bash
   cd dujyo-backend
   sqlx migrate run
   ```

## Running Tests

### All Security Tests
```bash
cd dujyo-backend
cargo test --test vuln_005_006_007_008_009_tests -- --ignored --nocapture
```

### Individual Vulnerability Tests

#### VULN-005: Integer Overflow
```bash
cargo test --test vuln_005_overflow_poc -- --ignored --nocapture
```

#### VULN-006: Reentrancy
```bash
cargo test --test vuln_006_reentrancy_poc -- --ignored --nocapture
```

#### VULN-007: JWT Secret
```bash
cargo test --test vuln_007_jwt_secret_poc -- --ignored --nocapture
```

#### VULN-008: Vesting Validation
```bash
cargo test --test vuln_008_vesting_validation_poc -- --ignored --nocapture
```

#### VULN-009: unwrap() Panics
```bash
cargo test --test vuln_009_unwrap_panic_poc -- --ignored --nocapture
```

#### VULN-010: Rollback Errors
```bash
cargo test --test vuln_010_rollback_errors_poc -- --ignored --nocapture
```

#### VULN-011: Fail-Open Rate Limiter
```bash
cargo test --test vuln_011_fail_open_rate_limiter_poc -- --ignored --nocapture
```

#### VULN-012: Time Manipulation
```bash
cargo test --test vuln_012_time_manipulation_poc -- --ignored --nocapture
```

#### VULN-013: DB Pool Fail-Open
```bash
cargo test --test vuln_013_db_pool_fail_open_poc -- --ignored --nocapture
```

## Test Harness for Race Conditions

### Concurrent Stream-to-Earn Test
```bash
cd dujyo-backend
cargo test --test concurrent_stream_earn_test -- --ignored --nocapture
```

### Concurrent Withdrawal Test
```bash
cd dujyo-backend
cargo test --test concurrent_withdrawal_test -- --ignored --nocapture
```

## Fuzzing Targets

### Setup Fuzzing
```bash
cd dujyo-backend
cargo install cargo-fuzz
cargo fuzz init
```

### Run Fuzzing
```bash
# Fuzz SafeMath operations
cargo fuzz run safe_math_operations

# Fuzz DEX swap calculations
cargo fuzz run dex_swap_calculations

# Fuzz vesting calculations
cargo fuzz run vesting_calculations
```

## Expected Results

### Before Fixes
- VULN-005: Overflow not detected
- VULN-006: Reentrancy possible
- VULN-007: JWT secret validation fails
- VULN-008: Input validation incomplete
- VULN-009: Panics occur
- VULN-010: Rollback errors ignored
- VULN-011: Fail-open behavior
- VULN-012: Time manipulation possible
- VULN-013: Fail-open behavior

### After Fixes
- VULN-005: Overflow detected and prevented
- VULN-006: Reentrancy prevented
- VULN-007: JWT secret validated
- VULN-008: Input validation passes
- VULN-009: No panics occur
- VULN-010: Rollback errors handled
- VULN-011: Fail-closed behavior
- VULN-012: Time validation passes
- VULN-013: Fail-closed behavior

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -h localhost -U postgres -d dujyo_blockchain
```

### Test Failures
1. Check environment variables are set
2. Verify database schema is up to date
3. Check logs for detailed error messages
4. Ensure all dependencies are installed

