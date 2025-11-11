# Database Schema Migration: TEXT to PostgreSQL ENUMs

## Overview

This migration converts unconstrained TEXT fields in the backtesting schema to explicit PostgreSQL ENUM types for improved data integrity and query performance.

## Migration Files

Execute these files in order:

1. **001_add_enum_types.sql** - Creates the ENUM types and validates existing data
2. **002_migrate_strategies_table.sql** - Converts `strategies.type` to ENUM
3. **003_migrate_backtest_runs_table.sql** - Converts `backtest_runs.status` to ENUM
4. **004_add_backtest_trades_columns.sql** - Adds new ENUM columns to `backtest_trades`
5. **005_validate_migration.sql** - Validates all migrations completed successfully

## ENUM Types Defined

### `backtest_run_status`
Values: `pending`, `running`, `completed`, `failed`

### `backtest_trade_direction`
Values: `long`, `short`

### `backtest_trade_status`
Values: `open`, `closed`

### `trading_strategy_type`
Values: `trend`, `mean_reversion`, `momentum`, `arbitrage`, `custom`

## Running the Migration

### Option 1: Manual Execution (Recommended for production)

```bash
# Connect to your PostgreSQL database
psql -h your-host -U your-user -d your-database

# Execute each migration file in order
\i migrations/001_add_enum_types.sql
\i migrations/002_migrate_strategies_table.sql
\i migrations/003_migrate_backtest_runs_table.sql
\i migrations/004_add_backtest_trades_columns.sql
\i migrations/005_validate_migration.sql
```

### Option 2: Batch Execution

```bash
# Execute all migrations at once
for file in migrations/00*.sql; do
  psql -h your-host -U your-user -d your-database -f "$file"
done
```

### Option 3: Using Drizzle Kit

```bash
# Push schema changes using Drizzle
npm run db:push
```

## Pre-Migration Checklist

- [ ] Backup your database
- [ ] Review existing data for any invalid values
- [ ] Test migration on a development/staging environment first
- [ ] Ensure application code is updated to use ENUM values
- [ ] Plan for minimal downtime during migration

## Post-Migration Verification

Run the validation script to ensure all data was migrated correctly:

```bash
psql -h your-host -U your-user -d your-database -f migrations/005_validate_migration.sql
```

Expected output:
```
NOTICE:  === Validating strategies table ===
NOTICE:  Total strategies: X
NOTICE:  All X strategies have valid type values
NOTICE:  === Validating backtest_runs table ===
...
NOTICE:  === All validations passed successfully ===
```

## Rollback

If you need to rollback the migration:

```bash
psql -h your-host -U your-user -d your-database -f migrations/ROLLBACK.sql
```

**Warning:** Rolling back will:
- Convert all ENUM columns back to TEXT
- Remove new columns added to `backtest_trades` (direction, status, exit_price, opened_at, closed_at)
- Drop all ENUM types
- Remove normalization triggers

## Schema Changes

### `strategies` Table
- `type`: TEXT → `trading_strategy_type` ENUM

### `backtest_runs` Table
- `status`: TEXT → `backtest_run_status` ENUM

### `backtest_trades` Table
- Added: `direction` (`backtest_trade_direction` ENUM, NOT NULL)
- Added: `status` (`backtest_trade_status` ENUM, NOT NULL, default 'open')
- Added: `exit_price` (NUMERIC(15, 8), nullable)
- Added: `opened_at` (TIMESTAMP, NOT NULL)
- Added: `closed_at` (TIMESTAMP, nullable)

## Data Migration Logic

### Strategies
- Normalizes type to lowercase
- Maps variations (e.g., `trend_following` → `trend`)
- Defaults unknown types to `custom`

### Backtest Runs
- Normalizes status to lowercase
- Defaults unknown statuses to `failed`

### Backtest Trades
- Infers direction from trade type (`buy` → `long`, sell with negative quantity → `short`)
- Sets `opened_at` from existing `timestamp`
- For closed trades, sets `closed_at` and `exit_price` from available data

## Normalization Triggers

Temporary triggers are created during migration to normalize incoming data:

- `normalize_strategy_type()` - Ensures consistent strategy types
- `normalize_backtest_run_status()` - Ensures consistent run statuses

These triggers help during the transition period when some systems may still send TEXT values.

## Benefits

1. **Data Integrity**: Database enforces valid values at the schema level
2. **Performance**: ENUM types are more efficient than TEXT for repeated values
3. **Type Safety**: Application code benefits from explicit type definitions
4. **Self-Documenting**: Schema clearly shows valid values
5. **Query Optimization**: Database can optimize queries using ENUM columns

## Considerations

- ENUM values are case-sensitive
- Adding new ENUM values requires `ALTER TYPE` (not just application changes)
- Consider your deployment strategy for adding new values
- Test thoroughly in development before production deployment

## Support

For issues or questions, refer to:
- PostgreSQL ENUM documentation: https://www.postgresql.org/docs/current/datatype-enum.html
- Drizzle ORM documentation: https://orm.drizzle.team/docs/column-types/pg
