-- Migration: Add direction, status, exit_price, opened_at, and closed_at columns to backtest_trades
-- Date: 2025-11-10

-- Step 1: Add new columns with defaults for existing rows
ALTER TABLE backtest_trades
ADD COLUMN direction backtest_trade_direction,
ADD COLUMN status backtest_trade_status DEFAULT 'closed',
ADD COLUMN exit_price NUMERIC(15, 8),
ADD COLUMN opened_at TIMESTAMP,
ADD COLUMN closed_at TIMESTAMP;

-- Step 2: Populate direction based on trade type
-- 'buy' trades are typically 'long' positions
-- This is a reasonable default; adjust based on actual business logic
UPDATE backtest_trades
SET direction = CASE 
  WHEN type = 'sell' AND quantity < 0 THEN 'short'::backtest_trade_direction
  ELSE 'long'::backtest_trade_direction
END
WHERE direction IS NULL;

-- Step 3: Populate opened_at from timestamp (assuming timestamp is when trade was opened)
UPDATE backtest_trades
SET opened_at = timestamp
WHERE opened_at IS NULL;

-- Step 4: For existing closed trades, set closed_at to timestamp
-- In real scenarios, you'd want to preserve actual close times if available
UPDATE backtest_trades
SET closed_at = timestamp
WHERE status = 'closed' AND closed_at IS NULL;

-- Step 5: Set exit_price for closed trades (use price as approximation)
UPDATE backtest_trades
SET exit_price = price
WHERE status = 'closed' AND exit_price IS NULL;

-- Step 6: Make direction and opened_at NOT NULL after populating
ALTER TABLE backtest_trades
ALTER COLUMN direction SET NOT NULL;

ALTER TABLE backtest_trades
ALTER COLUMN opened_at SET NOT NULL;

ALTER TABLE backtest_trades
ALTER COLUMN status SET NOT NULL;

-- Step 7: Verify migration
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM backtest_trades WHERE direction IS NULL;
  IF row_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % rows have NULL direction', row_count;
  END IF;
  
  SELECT COUNT(*) INTO row_count FROM backtest_trades WHERE opened_at IS NULL;
  IF row_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % rows have NULL opened_at', row_count;
  END IF;
  
  RAISE NOTICE 'Migration successful: all backtest trades have required ENUM values';
END $$;
