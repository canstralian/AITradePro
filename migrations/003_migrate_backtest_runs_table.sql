-- Migration: Convert backtest_runs.status from TEXT to backtest_run_status ENUM
-- Date: 2025-11-10

-- Step 1: Create normalization trigger to ensure consistent values
CREATE OR REPLACE FUNCTION normalize_backtest_run_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize to lowercase and trim whitespace
  NEW.status := LOWER(TRIM(NEW.status));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger temporarily for transition period
CREATE TRIGGER ensure_backtest_run_status_normalization
BEFORE INSERT OR UPDATE ON backtest_runs
FOR EACH ROW EXECUTE FUNCTION normalize_backtest_run_status();

-- Step 2: Normalize existing data
UPDATE backtest_runs
SET status = LOWER(TRIM(status));

-- Step 3: Set default for any unknown statuses
UPDATE backtest_runs
SET status = 'failed'
WHERE status NOT IN ('pending', 'running', 'completed', 'failed');

-- Step 4: Create temporary column with ENUM type
ALTER TABLE backtest_runs 
ADD COLUMN status_new backtest_run_status;

-- Step 5: Copy data to new column with type casting
UPDATE backtest_runs
SET status_new = status::backtest_run_status;

-- Step 6: Make new column NOT NULL with default value
ALTER TABLE backtest_runs
ALTER COLUMN status_new SET NOT NULL;

ALTER TABLE backtest_runs
ALTER COLUMN status_new SET DEFAULT 'pending';

-- Step 7: Drop old column and rename new column
ALTER TABLE backtest_runs DROP COLUMN status;
ALTER TABLE backtest_runs RENAME COLUMN status_new TO status;

-- Step 8: Verify migration
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM backtest_runs WHERE status IS NULL;
  IF row_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % rows have NULL status', row_count;
  END IF;
  RAISE NOTICE 'Migration successful: all backtest runs have valid status values';
END $$;
