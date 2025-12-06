# 🚀 DUJYO Migration Scripts Guide

## 📋 Overview

This directory contains scripts for safely applying database migrations before the MVP launch.

## 🔒 Safety First

**ALWAYS create a backup before running migrations!**

## 📦 Available Scripts

### 1. `verify_before_migrations.sh`
Verifies database state before migrations:
- Tests database connection
- Lists existing tables
- Checks for conflicts with new tables
- Validates migration files
- Checks database size and connections

**Usage:**
```bash
./scripts/verify_before_migrations.sh
```

### 2. `backup_database.sh`
Creates a complete database backup:
- Full database dump
- Compressed backup file
- MD5 checksum
- Backup documentation

**Usage:**
```bash
./scripts/backup_database.sh
```

**Output:**
- `database_backups/backup_pre_mvp_YYYYMMDD_HHMMSS.sql.gz`
- `database_backups/README_YYYYMMDD_HHMMSS.txt`

### 3. `run_migrations.sh`
Executes critical migrations:
- `024_content_marketplace.sql`
- `025_tips_system.sql`
- Verifies tables were created

**Usage:**
```bash
./scripts/run_migrations.sh
```

### 4. `verify_after_migrations.sh`
Verifies migrations were successful:
- Checks all new tables exist
- Validates table structures
- Tests queries
- Checks indexes and foreign keys

**Usage:**
```bash
./scripts/verify_after_migrations.sh
```

### 5. `restore_database.sh`
Restores database from backup (EMERGENCY ONLY):
- Restores complete database
- Verifies restore success

**Usage:**
```bash
./scripts/restore_database.sh database_backups/backup_pre_mvp_YYYYMMDD_HHMMSS.sql.gz
```

### 6. `safe_migration_process.sh`
**RECOMMENDED**: Automated complete process:
- Runs all steps in order
- Prompts for confirmation at each step
- Handles errors gracefully

**Usage:**
```bash
./scripts/safe_migration_process.sh
```

## 🎯 Recommended Workflow

### Option 1: Automated (Recommended)
```bash
./scripts/safe_migration_process.sh
```

### Option 2: Manual Step-by-Step
```bash
# 1. Verify before
./scripts/verify_before_migrations.sh

# 2. Create backup
./scripts/backup_database.sh

# 3. Run migrations
./scripts/run_migrations.sh

# 4. Verify after
./scripts/verify_after_migrations.sh
```

## 🆘 Emergency Restore

If something goes wrong:

```bash
# List available backups
ls -lah database_backups/*.sql.gz

# Restore from backup
./scripts/restore_database.sh database_backups/backup_pre_mvp_YYYYMMDD_HHMMSS.sql.gz
```

## ⚙️ Configuration

Scripts use environment variables (with defaults):

```bash
export DB_USER=dujyo_user      # Default: dujyo_user
export DB_NAME=dujyo_db        # Default: dujyo_db
export DB_HOST=localhost       # Default: localhost
export DB_PORT=5432            # Default: 5432
```

## 📊 What Gets Created

### New Tables:
- `content_listings` - Marketplace listings
- `content_purchases` - Purchase records
- `content_licenses` - License keys
- `tips` - Tips transactions
- `artist_tip_stats` - Artist tip statistics
- `user_tip_stats` - User tip statistics

### Materialized Views:
- `tip_leaderboard` - Top tipped artists

## ✅ Verification Checklist

After migrations, verify:
- [ ] All 6 new tables exist
- [ ] Tables have correct structure
- [ ] Indexes are created
- [ ] Foreign keys are set
- [ ] Materialized view exists
- [ ] Queries work correctly

## 🐛 Troubleshooting

### Migration fails
1. Check error message
2. Restore from backup: `./scripts/restore_database.sh <backup>`
3. Fix issues
4. Retry migration

### Tables already exist
- Check if migrations were already applied
- Or drop tables if you want to re-apply

### Connection errors
- Verify database is running
- Check credentials in environment variables
- Verify network connectivity

## 📞 Support

If you encounter issues:
1. Check backup was created successfully
2. Review error messages
3. Check database logs
4. Restore from backup if needed

## 🔐 Security Notes

- Backups contain sensitive data
- Store backups securely
- Don't commit backups to git
- Use strong database passwords
- Limit backup file permissions

