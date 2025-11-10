# ENUM Types Usage Examples

This document provides practical examples of using the new PostgreSQL ENUM types in the AITradePro backtesting system.

## Overview

The backtesting schema now uses explicit ENUM types for better type safety and data integrity:

- `trading_strategy_type`: Strategy categories
- `backtest_run_status`: Run lifecycle states
- `backtest_trade_direction`: Position direction (long/short)
- `backtest_trade_status`: Position state (open/closed)

## Creating Strategies

### Valid Strategy Types

```typescript
import { insertStrategySchema } from '../shared/backtesting-schema';

// Valid strategy types
const validTypes = [
  'trend',           // Trend-following strategies
  'mean_reversion',  // Mean reversion strategies
  'momentum',        // Momentum-based strategies
  'arbitrage',       // Arbitrage strategies
  'custom'           // Custom strategies
];

// Example: Creating a trend strategy
const trendStrategy = {
  id: 'strategy_123',
  name: 'Moving Average Crossover',
  description: 'Buy when 50-day MA crosses above 200-day MA',
  type: 'trend' as const,
  parameters: {
    shortPeriod: 50,
    longPeriod: 200,
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Validate with Zod
const result = insertStrategySchema.safeParse(trendStrategy);
if (result.success) {
  // Insert into database
  await db.insert(strategies).values(result.data);
}
```

### REST API Example

```bash
# Create a new strategy via API
curl -X POST http://localhost:5000/api/backtesting/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RSI Oversold Strategy",
    "description": "Buy when RSI < 30, sell when RSI > 70",
    "type": "momentum",
    "parameters": {
      "period": 14,
      "oversoldThreshold": 30,
      "overboughtThreshold": 70
    }
  }'
```

## Running Backtests

### Backtest Run Status Lifecycle

```typescript
import { insertBacktestRunSchema } from '../shared/backtesting-schema';

// Status progression: pending → running → completed/failed
const runStatuses = {
  PENDING: 'pending',     // Initial state
  RUNNING: 'running',     // Currently executing
  COMPLETED: 'completed', // Successfully finished
  FAILED: 'failed',       // Error occurred
} as const;

// Example: Creating a backtest run
const backtestRun = {
  id: 'run_456',
  strategyId: 'strategy_123',
  name: 'BTC Backtest 2024',
  assetSymbol: 'BTC',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  initialCapital: '100000',
  status: 'pending' as const, // Start in pending state
  createdAt: new Date(),
};

// The status will be updated as the backtest progresses
```

### Updating Run Status

```typescript
// When backtest starts
await db.update(backtestRuns)
  .set({ status: 'running' })
  .where(eq(backtestRuns.id, runId));

// When backtest completes successfully
await db.update(backtestRuns)
  .set({ 
    status: 'completed',
    completedAt: new Date(),
    finalCapital: '125000',
    totalReturn: '0.25',
  })
  .where(eq(backtestRuns.id, runId));

// When backtest fails
await db.update(backtestRuns)
  .set({ 
    status: 'failed',
    errorMessage: 'Insufficient data for backtest period',
    completedAt: new Date(),
  })
  .where(eq(backtestRuns.id, runId));
```

## Recording Trades

### Trade Direction: Long vs Short

```typescript
import { insertBacktestTradeSchema } from '../shared/backtesting-schema';

// Long position (buying to profit from price increase)
const longTrade = {
  id: 'trade_001',
  backtestRunId: 'run_456',
  assetSymbol: 'BTC',
  type: 'buy',
  direction: 'long' as const,
  orderType: 'market',
  quantity: '0.5',
  price: '45000',
  commission: '11.25',
  slippage: '5',
  total: '22500',
  portfolioValue: '100000',
  status: 'open' as const,
  openedAt: new Date('2024-01-15T10:00:00Z'),
  timestamp: new Date('2024-01-15T10:00:00Z'),
};

// Short position (selling to profit from price decrease)
const shortTrade = {
  id: 'trade_002',
  backtestRunId: 'run_456',
  assetSymbol: 'ETH',
  type: 'sell',
  direction: 'short' as const,
  orderType: 'limit',
  quantity: '10',
  price: '2800',
  commission: '14',
  slippage: '2',
  total: '28000',
  portfolioValue: '100000',
  status: 'open' as const,
  openedAt: new Date('2024-02-01T14:30:00Z'),
  timestamp: new Date('2024-02-01T14:30:00Z'),
};
```

### Trade Lifecycle: Opening and Closing Positions

```typescript
// Opening a position
const openPosition = {
  id: 'trade_003',
  backtestRunId: 'run_456',
  assetSymbol: 'SOL',
  type: 'buy',
  direction: 'long' as const,
  orderType: 'market',
  quantity: '100',
  price: '95',
  commission: '4.75',
  slippage: '1',
  total: '9500',
  portfolioValue: '100000',
  status: 'open' as const,
  openedAt: new Date('2024-03-10T09:00:00Z'),
  timestamp: new Date('2024-03-10T09:00:00Z'),
};

// Closing the position (update the same trade record)
await db.update(backtestTrades)
  .set({
    status: 'closed',
    exitPrice: '105',
    closedAt: new Date('2024-03-15T16:00:00Z'),
    pnl: '1000', // Profit: (105 - 95) * 100
  })
  .where(eq(backtestTrades.id, 'trade_003'));
```

### Complete Trade Example with Entry and Exit

```typescript
// A complete closed trade
const completeTrade = {
  id: 'trade_004',
  backtestRunId: 'run_456',
  assetSymbol: 'ADA',
  type: 'buy',
  direction: 'long' as const,
  orderType: 'market',
  quantity: '10000',
  price: '0.45',          // Entry price
  exitPrice: '0.52',       // Exit price
  commission: '4.5',
  slippage: '0.5',
  total: '4500',
  pnl: '700',             // Profit: (0.52 - 0.45) * 10000
  portfolioValue: '105000',
  status: 'closed' as const,
  openedAt: new Date('2024-04-01T10:00:00Z'),
  closedAt: new Date('2024-04-10T15:30:00Z'),
  timestamp: new Date('2024-04-10T15:30:00Z'),
};

const result = insertBacktestTradeSchema.safeParse(completeTrade);
if (result.success) {
  await db.insert(backtestTrades).values(result.data);
}
```

## Querying with ENUM Types

### Filter by Strategy Type

```typescript
import { eq, and } from 'drizzle-orm';

// Get all trend strategies
const trendStrategies = await db
  .select()
  .from(strategies)
  .where(eq(strategies.type, 'trend'));

// Get active momentum strategies
const activeMomentumStrategies = await db
  .select()
  .from(strategies)
  .where(
    and(
      eq(strategies.type, 'momentum'),
      eq(strategies.isActive, true)
    )
  );
```

### Filter by Run Status

```typescript
// Get all completed backtest runs
const completedRuns = await db
  .select()
  .from(backtestRuns)
  .where(eq(backtestRuns.status, 'completed'))
  .orderBy(desc(backtestRuns.createdAt));

// Get currently running backtests
const runningBacktests = await db
  .select()
  .from(backtestRuns)
  .where(eq(backtestRuns.status, 'running'));

// Get failed runs for debugging
const failedRuns = await db
  .select()
  .from(backtestRuns)
  .where(eq(backtestRuns.status, 'failed'));
```

### Filter by Trade Direction and Status

```typescript
// Get all open long positions
const openLongPositions = await db
  .select()
  .from(backtestTrades)
  .where(
    and(
      eq(backtestTrades.direction, 'long'),
      eq(backtestTrades.status, 'open')
    )
  );

// Get closed short positions with profit
const profitableShorts = await db
  .select()
  .from(backtestTrades)
  .where(
    and(
      eq(backtestTrades.direction, 'short'),
      eq(backtestTrades.status, 'closed'),
      gt(backtestTrades.pnl, '0')
    )
  );
```

## Error Handling

### Handling Invalid ENUM Values

```typescript
try {
  const strategy = {
    name: 'Test Strategy',
    description: 'Test',
    type: 'invalid_type', // This will fail validation
    parameters: {},
    isActive: true,
  };

  const result = insertStrategySchema.safeParse(strategy);
  
  if (!result.success) {
    // Handle validation error
    console.error('Validation failed:', result.error.issues);
    // Error: Invalid enum value. Expected 'trend' | 'mean_reversion' | 'momentum' | 'arbitrage' | 'custom'
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

### REST API Error Response

```bash
# Attempting to create strategy with invalid type
curl -X POST http://localhost:5000/api/backtesting/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Strategy",
    "description": "Test",
    "type": "invalid_type",
    "parameters": {}
  }'

# Response (400 Bad Request):
{
  "error": "Validation failed",
  "details": [
    {
      "field": "type",
      "message": "Invalid enum value. Expected 'trend' | 'mean_reversion' | 'momentum' | 'arbitrage' | 'custom', received 'invalid_type'"
    }
  ]
}
```

## TypeScript Type Safety

### Using Const Assertions

```typescript
// Type-safe ENUM values with const assertions
const strategyType: 'trend' | 'mean_reversion' | 'momentum' | 'arbitrage' | 'custom' = 'trend';
const runStatus: 'pending' | 'running' | 'completed' | 'failed' = 'pending';
const tradeDirection: 'long' | 'short' = 'long';
const tradeStatus: 'open' | 'closed' = 'open';

// TypeScript will prevent typos at compile time
// const invalid: BacktestRunStatus = 'complete'; // ❌ Type error
```

### Type Definitions from Schema

```typescript
import type { 
  Strategy, 
  BacktestRun, 
  BacktestTrade 
} from '../shared/backtesting-schema';

// These types include the ENUM constraints
const strategy: Strategy = {
  id: 'strategy_123',
  name: 'Test',
  description: 'Test',
  type: 'trend', // ✅ Type-safe
  // type: 'invalid', // ❌ Type error
  parameters: {},
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

## Best Practices

1. **Always use lowercase**: ENUM values are case-sensitive ('trend' ≠ 'TREND')
2. **Validate before insert**: Use Zod schemas to validate data before database operations
3. **Handle validation errors**: Provide meaningful error messages to users
4. **Use type definitions**: Leverage TypeScript types for compile-time safety
5. **Document valid values**: Keep API documentation up-to-date with valid ENUM values
6. **Use const assertions**: Apply `as const` to ensure type safety with literal values
7. **Test ENUM constraints**: Write tests to verify ENUM validation works as expected

## Migration Considerations

If you're migrating from the old TEXT-based schema:

1. Existing data will be normalized and validated during migration
2. Unknown values will be mapped to safe defaults:
   - Strategy types → 'custom'
   - Run statuses → 'failed'
3. Review your code for hardcoded string values that may not match ENUM values
4. Update any dynamic queries that construct ENUM values from user input
5. Run the validation script after migration to ensure data integrity

## See Also

- [Migration Guide](../migrations/README.md)
- [Schema Definition](../shared/backtesting-schema.ts)
- [Validation Tests](../server/test/backtesting/enum-validation.test.ts)
