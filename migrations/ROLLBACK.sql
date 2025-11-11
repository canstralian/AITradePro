-- Rollback Migration: Revert ENUM types back to TEXT
-- Date: 2025-11-10
-- WARNING: Use this only if you need to roll back the migration

-- Step 1: Rollback backtest_trades table
ALTER TABLE backtest_trades DROP COLUMN IF EXISTS direction;
ALTER TABLE backtest_trades DROP COLUMN IF EXISTS exit_price;
ALTER TABLE backtest_trades DROP COLUMN IF EXISTS opened_at;
ALTER TABLE backtest_trades DROP COLUMN IF EXISTS closed_at;

-- Convert status back to TEXT if it exists as ENUM
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'backtest_trades' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE backtest_trades ADD COLUMN status_text TEXT;
    UPDATE backtest_trades SET status_text = status::TEXT;
    ALTER TABLE backtest_trades DROP COLUMN status;
    ALTER TABLE backtest_trades RENAME COLUMN status_text TO status;
    ALTER TABLE backtest_trades ALTER COLUMN status SET DEFAULT 'pending';
  END IF;
END $$;

-- Step 2: Rollback backtest_runs table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'backtest_runs' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE backtest_runs ADD COLUMN status_text TEXT;
    UPDATE backtest_runs SET status_text = status::TEXT;
    ALTER TABLE backtest_runs DROP COLUMN status;
    ALTER TABLE backtest_runs RENAME COLUMN status_text TO status;
    ALTER TABLE backtest_runs ALTER COLUMN status SET NOT NULL;
    ALTER TABLE backtest_runs ALTER COLUMN status SET DEFAULT 'pending';
  END IF;
END $$;

-- Step 3: Rollback strategies table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'strategies' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE strategies ADD COLUMN type_text TEXT;
    UPDATE strategies SET type_text = type::TEXT;
    ALTER TABLE strategies DROP COLUMN type;
    ALTER TABLE strategies RENAME COLUMN type_text TO type;
    ALTER TABLE strategies ALTER COLUMN type SET NOT NULL;
  END IF;
END $$;

-- Step 4: Drop triggers
DROP TRIGGER IF EXISTS ensure_strategy_type_normalization ON strategies;
DROP FUNCTION IF EXISTS normalize_strategy_type();

DROP TRIGGER IF EXISTS ensure_backtest_run_status_normalization ON backtest_runs;
DROP FUNCTION IF EXISTS normalize_backtest_run_status();

-- Step 5: Drop ENUM types (only if no other tables use them)
DROP TYPE IF EXISTS backtest_trade_status CASCADE;
DROP TYPE IF EXISTS backtest_trade_direction CASCADE;
DROP TYPE IF EXISTS backtest_run_status CASCADE;
DROP TYPE IF EXISTS trading_strategy_type CASCADE;

-- Step 6: Verify rollback
DO $$
BEGIN
  RAISE NOTICE '=== Rollback completed ===';
  RAISE NOTICE 'All ENUM types have been converted back to TEXT';
  RAISE NOTICE 'New columns in backtest_trades have been removed';
  RAISE NOTICE 'Triggers and functions have been dropped';
END $$;
