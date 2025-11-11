-- Migration: Add PostgreSQL ENUM types for backtesting schema
-- Date: 2025-11-10
-- Description: Replace TEXT fields with explicit ENUM types for better data integrity

-- Step 1: Create ENUM types
-- Backtest run lifecycle states
CREATE TYPE backtest_run_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed'
);

-- Trade direction (long/short positions)
CREATE TYPE backtest_trade_direction AS ENUM (
  'long',
  'short'
);

-- Trade status (open/closed positions)
CREATE TYPE backtest_trade_status AS ENUM (
  'open',
  'closed'
);

-- Strategy categories
CREATE TYPE trading_strategy_type AS ENUM (
  'trend',
  'mean_reversion',
  'momentum',
  'arbitrage',
  'custom'
);

-- Step 2: Data validation - check for invalid values before migration
-- This query will show any invalid values that need to be fixed
DO $$
BEGIN
  -- Check strategies.type
  IF EXISTS (
    SELECT 1 FROM strategies 
    WHERE LOWER(TRIM(type)) NOT IN ('trend', 'mean_reversion', 'momentum', 'arbitrage', 'custom')
  ) THEN
    RAISE NOTICE 'WARNING: Found invalid values in strategies.type';
    RAISE NOTICE 'Invalid values: %', (
      SELECT string_agg(DISTINCT type, ', ') 
      FROM strategies 
      WHERE LOWER(TRIM(type)) NOT IN ('trend', 'mean_reversion', 'momentum', 'arbitrage', 'custom')
    );
  END IF;

  -- Check backtest_runs.status
  IF EXISTS (
    SELECT 1 FROM backtest_runs 
    WHERE LOWER(TRIM(status)) NOT IN ('pending', 'running', 'completed', 'failed')
  ) THEN
    RAISE NOTICE 'WARNING: Found invalid values in backtest_runs.status';
    RAISE NOTICE 'Invalid values: %', (
      SELECT string_agg(DISTINCT status, ', ') 
      FROM backtest_runs 
      WHERE LOWER(TRIM(status)) NOT IN ('pending', 'running', 'completed', 'failed')
    );
  END IF;
END $$;
