-- Migration Validation: Verify all ENUM migrations completed successfully
-- Date: 2025-11-10

-- Validate strategies table
DO $$
DECLARE
  invalid_count INTEGER;
  total_count INTEGER;
BEGIN
  RAISE NOTICE '=== Validating strategies table ===';
  
  SELECT COUNT(*) INTO total_count FROM strategies;
  RAISE NOTICE 'Total strategies: %', total_count;
  
  SELECT COUNT(*) INTO invalid_count FROM strategies WHERE type IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Validation failed: % strategies have NULL type', invalid_count;
  END IF;
  
  RAISE NOTICE 'All % strategies have valid type values', total_count;
END $$;

-- Validate backtest_runs table
DO $$
DECLARE
  invalid_count INTEGER;
  total_count INTEGER;
  status_counts RECORD;
BEGIN
  RAISE NOTICE '=== Validating backtest_runs table ===';
  
  SELECT COUNT(*) INTO total_count FROM backtest_runs;
  RAISE NOTICE 'Total backtest runs: %', total_count;
  
  SELECT COUNT(*) INTO invalid_count FROM backtest_runs WHERE status IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Validation failed: % backtest runs have NULL status', invalid_count;
  END IF;
  
  -- Show distribution of status values
  FOR status_counts IN 
    SELECT status, COUNT(*) as count 
    FROM backtest_runs 
    GROUP BY status 
    ORDER BY count DESC
  LOOP
    RAISE NOTICE 'Status "%": % runs', status_counts.status, status_counts.count;
  END LOOP;
  
  RAISE NOTICE 'All % backtest runs have valid status values', total_count;
END $$;

-- Validate backtest_trades table
DO $$
DECLARE
  invalid_count INTEGER;
  total_count INTEGER;
  direction_counts RECORD;
  status_counts RECORD;
BEGIN
  RAISE NOTICE '=== Validating backtest_trades table ===';
  
  SELECT COUNT(*) INTO total_count FROM backtest_trades;
  RAISE NOTICE 'Total backtest trades: %', total_count;
  
  -- Check direction
  SELECT COUNT(*) INTO invalid_count FROM backtest_trades WHERE direction IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Validation failed: % trades have NULL direction', invalid_count;
  END IF;
  
  -- Check status
  SELECT COUNT(*) INTO invalid_count FROM backtest_trades WHERE status IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Validation failed: % trades have NULL status', invalid_count;
  END IF;
  
  -- Check opened_at
  SELECT COUNT(*) INTO invalid_count FROM backtest_trades WHERE opened_at IS NULL;
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Validation failed: % trades have NULL opened_at', invalid_count;
  END IF;
  
  -- Show distribution of direction values
  FOR direction_counts IN 
    SELECT direction, COUNT(*) as count 
    FROM backtest_trades 
    GROUP BY direction 
    ORDER BY count DESC
  LOOP
    RAISE NOTICE 'Direction "%": % trades', direction_counts.direction, direction_counts.count;
  END LOOP;
  
  -- Show distribution of status values
  FOR status_counts IN 
    SELECT status, COUNT(*) as count 
    FROM backtest_trades 
    GROUP BY status 
    ORDER BY count DESC
  LOOP
    RAISE NOTICE 'Status "%": % trades', status_counts.status, status_counts.count;
  END LOOP;
  
  RAISE NOTICE 'All % backtest trades have valid ENUM values', total_count;
END $$;

-- Validate ENUM types exist
DO $$
BEGIN
  RAISE NOTICE '=== Validating ENUM types ===';
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'backtest_run_status') THEN
    RAISE EXCEPTION 'ENUM type backtest_run_status does not exist';
  END IF;
  RAISE NOTICE 'ENUM type backtest_run_status exists';
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'backtest_trade_direction') THEN
    RAISE EXCEPTION 'ENUM type backtest_trade_direction does not exist';
  END IF;
  RAISE NOTICE 'ENUM type backtest_trade_direction exists';
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'backtest_trade_status') THEN
    RAISE EXCEPTION 'ENUM type backtest_trade_status does not exist';
  END IF;
  RAISE NOTICE 'ENUM type backtest_trade_status exists';
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trading_strategy_type') THEN
    RAISE EXCEPTION 'ENUM type trading_strategy_type does not exist';
  END IF;
  RAISE NOTICE 'ENUM type trading_strategy_type exists';
END $$;

RAISE NOTICE '=== All validations passed successfully ===';
