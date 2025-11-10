-- Migration: Convert strategies.type from TEXT to trading_strategy_type ENUM
-- Date: 2025-11-10

-- Step 1: Create normalization trigger to ensure consistent values
CREATE OR REPLACE FUNCTION normalize_strategy_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize to lowercase and trim whitespace
  NEW.type := LOWER(TRIM(NEW.type));
  
  -- Map common variations to standard values
  IF NEW.type IN ('trend_following', 'trend-following') THEN
    NEW.type := 'trend';
  ELSIF NEW.type IN ('mean-reversion', 'meanreversion') THEN
    NEW.type := 'mean_reversion';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger temporarily for transition period
CREATE TRIGGER ensure_strategy_type_normalization
BEFORE INSERT OR UPDATE ON strategies
FOR EACH ROW EXECUTE FUNCTION normalize_strategy_type();

-- Step 2: Normalize existing data
UPDATE strategies
SET type = LOWER(TRIM(type));

-- Map variations to standard values
UPDATE strategies
SET type = 'trend'
WHERE type IN ('trend_following', 'trend-following');

UPDATE strategies
SET type = 'mean_reversion'
WHERE type IN ('mean-reversion', 'meanreversion');

-- Step 3: Set default for any unknown types
UPDATE strategies
SET type = 'custom'
WHERE type NOT IN ('trend', 'mean_reversion', 'momentum', 'arbitrage', 'custom');

-- Step 4: Create temporary column with ENUM type
ALTER TABLE strategies 
ADD COLUMN type_new trading_strategy_type;

-- Step 5: Copy data to new column with type casting
UPDATE strategies
SET type_new = type::trading_strategy_type;

-- Step 6: Make new column NOT NULL (all values should be set now)
ALTER TABLE strategies
ALTER COLUMN type_new SET NOT NULL;

-- Step 7: Drop old column and rename new column
ALTER TABLE strategies DROP COLUMN type;
ALTER TABLE strategies RENAME COLUMN type_new TO type;

-- Step 8: Verify migration
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM strategies WHERE type IS NULL;
  IF row_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % rows have NULL type', row_count;
  END IF;
  RAISE NOTICE 'Migration successful: all strategies have valid type values';
END $$;
