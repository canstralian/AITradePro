# AITradePro Backtesting System

A comprehensive, modular backtesting and paper trading system built with TypeScript, Express, and PostgreSQL.

## Architecture Overview

The backtesting system implements a service-oriented architecture with the following core components:

### Core Components

#### 1. Clock Abstraction (`clocks.ts`)
Controls time progression for different trading modes:
- **HistoricalClock**: For backtesting on historical data with controlled time steps
- **LiveClock**: For live/paper trading using real system time
- **PaperTradingClock**: For paper trading with pause/resume capabilities

#### 2. Broker (`broker.ts`)
Simulates order execution and portfolio management:
- **PaperBroker**: Executes market and limit orders with realistic commission and slippage
- Maintains positions and calculates P&L (realized and unrealized)
- Enforces cash constraints and position limits
- Tracks portfolio value over time

#### 3. Strategy System (`strategy.ts`, `strategies/`)
Modular trading strategy framework:
- **BaseStrategy**: Abstract base class for all strategies
- **StrategyRegistry**: Central registry for strategy management
- Built-in strategies:
  - **MovingAverageCrossoverStrategy**: Golden/death cross signals
  - **RSIStrategy**: Overbought/oversold trading

#### 4. Analytics (`analytics.ts`)
Performance metrics calculator:
- Total return and annualized return
- Sharpe ratio (risk-adjusted returns)
- Maximum drawdown and drawdown duration
- Win rate and profit factor
- Trade statistics (wins, losses, averages)
- Equity and drawdown curves

#### 5. Backtest Engine (`engine.ts`)
Main simulation engine:
- Loads historical market data from database
- Executes strategies bar-by-bar
- Persists trades and performance snapshots
- Broadcasts real-time progress via WebSocket

#### 6. Service Layer (`service.ts`)
Business logic and WebSocket integration:
- Manages backtest lifecycle
- Handles paper trading sessions
- Broadcasts events to connected clients

## Database Schema

### Tables

**strategies**: Trading strategy definitions
```sql
- id: text (primary key)
- name: text
- description: text
- type: text (e.g., 'momentum', 'mean_reversion')
- parameters: jsonb
- is_active: boolean
- created_at, updated_at: timestamp
```

**backtest_runs**: Backtest execution records
```sql
- id: text (primary key)
- strategy_id: text (foreign key)
- name: text
- asset_symbol: text
- start_date, end_date: timestamp
- initial_capital, final_capital: decimal
- total_return, sharpe_ratio, max_drawdown: decimal
- win_rate: decimal
- total_trades, winning_trades, losing_trades: integer
- status: text ('pending', 'running', 'completed', 'failed')
- metadata: jsonb
- created_at, completed_at: timestamp
```

**backtest_trades**: Individual trades from backtests
```sql
- id: text (primary key)
- backtest_run_id: text (foreign key)
- asset_symbol: text
- type: text ('buy', 'sell')
- order_type: text ('market', 'limit')
- quantity, price: decimal
- commission, slippage: decimal
- total, pnl: decimal
- portfolio_value: decimal
- signal: text
- timestamp: timestamp
```

**backtest_performance**: Equity curve snapshots
```sql
- id: text (primary key)
- backtest_run_id: text (foreign key)
- timestamp: timestamp
- portfolio_value, cash_balance, position_value: decimal
- total_return, drawdown: decimal
```

**paper_trading_sessions**: Paper trading sessions
```sql
- id: text (primary key)
- strategy_id: text (foreign key)
- name: text
- asset_symbol: text
- initial_capital, current_capital: decimal
- is_active: boolean
- started_at, stopped_at: timestamp
```

## API Endpoints

### Strategy Management

**GET /api/backtesting/strategies**
```json
Response: {
  "strategies": [
    {
      "id": "ma-crossover",
      "name": "Moving Average Crossover",
      "description": "Trades based on MA crossovers"
    }
  ]
}
```

**POST /api/backtesting/strategies**
```json
Request: {
  "name": "My Strategy",
  "description": "Strategy description",
  "type": "custom",
  "parameters": {
    "key": "value"
  }
}
```

### Backtest Operations

**POST /api/backtesting/run**
```json
Request: {
  "strategyId": "ma-crossover",
  "symbol": "BTC",
  "startDate": "2024-01-01",
  "endDate": "2024-03-01",
  "initialCapital": 10000,
  "commission": 0.001,
  "slippage": 0.0005
}

Response: {
  "runId": "run_123",
  "message": "Backtest started",
  "status": "running"
}
```

**GET /api/backtesting/runs/:id**
```json
Response: {
  "id": "run_123",
  "strategyId": "ma-crossover",
  "status": "completed",
  "totalReturn": 12.5,
  "sharpeRatio": 1.85,
  "maxDrawdown": 8.3,
  "winRate": 65.5,
  "totalTrades": 42,
  ...
}
```

**GET /api/backtesting/runs/:id/trades**
```json
Response: {
  "trades": [
    {
      "id": "trade_1",
      "type": "buy",
      "quantity": 0.5,
      "price": 50000,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**GET /api/backtesting/runs/:id/performance**
```json
Response: {
  "performance": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "portfolioValue": 10500,
      "totalReturn": 5.0,
      "drawdown": 0.0
    }
  ]
}
```

### Paper Trading

**POST /api/backtesting/paper-trading/start**
```json
Request: {
  "strategyId": "ma-crossover",
  "symbol": "BTC",
  "initialCapital": 10000
}

Response: {
  "sessionId": "session_123",
  "message": "Paper trading session started"
}
```

**POST /api/backtesting/paper-trading/:id/stop**
```json
Response: {
  "message": "Paper trading session stopped"
}
```

## WebSocket Events

Connect to `/ws` to receive real-time updates:

```javascript
// Client-side example
const ws = new WebSocket('ws://localhost:5000/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'backtest_started':
      console.log('Backtest started:', message.data);
      break;
    case 'backtest_completed':
      console.log('Backtest completed:', message.data.metrics);
      break;
    case 'backtest_failed':
      console.error('Backtest failed:', message.data.error);
      break;
  }
};
```

## Creating Custom Strategies

### Strategy Interface

```typescript
interface IStrategy {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  
  initialize(params: Record<string, any>): void;
  onBar(bar: MarketBar, broker: IBroker): Promise<Signal | null>;
  onStart?(initialCapital: number): void;
  onEnd?(portfolio: Portfolio): void;
}
```

### Example Custom Strategy

```typescript
import { BaseStrategy } from './strategy';
import { MarketBar, IBroker, Signal } from './types';

export class MyCustomStrategy extends BaseStrategy {
  private indicator: number[] = [];

  constructor() {
    super(
      'my-strategy',
      'My Custom Strategy',
      'Description of my strategy',
      { param1: 10 }
    );
  }

  async onBar(bar: MarketBar, broker: IBroker): Promise<Signal | null> {
    // Update indicators
    this.indicator.push(bar.close);
    
    // Generate signal
    if (this.shouldBuy()) {
      return {
        symbol: 'BTC',
        action: 'buy',
        quantity: 0.1,
        reason: 'Buy signal triggered',
        confidence: 0.8,
        timestamp: bar.timestamp,
      };
    }
    
    if (this.shouldSell()) {
      return {
        symbol: 'BTC',
        action: 'sell',
        quantity: 0.1,
        reason: 'Sell signal triggered',
        confidence: 0.8,
        timestamp: bar.timestamp,
      };
    }
    
    return null; // Hold
  }

  private shouldBuy(): boolean {
    // Your buy logic
    return false;
  }

  private shouldSell(): boolean {
    // Your sell logic
    return false;
  }
}

// Register strategy
import { strategyRegistry } from './strategy';
strategyRegistry.register(new MyCustomStrategy());
```

## Running a Backtest

### Programmatic Usage

```typescript
import { BacktestEngine } from './engine';
import { MovingAverageCrossoverStrategy } from './strategies/moving-average';

const strategy = new MovingAverageCrossoverStrategy(10, 30);
const config = {
  strategyId: 'ma-crossover',
  symbol: 'BTC',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-03-01'),
  initialCapital: 10000,
  commission: 0.001,
  slippage: 0.0005,
};

const engine = new BacktestEngine(strategy, config);
const result = await engine.run();

console.log('Total Return:', result.metrics.totalReturn);
console.log('Sharpe Ratio:', result.metrics.sharpeRatio);
console.log('Max Drawdown:', result.metrics.maxDrawdown);
```

### Via REST API

```bash
# Start a backtest
curl -X POST http://localhost:5000/api/backtesting/run \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": "ma-crossover",
    "symbol": "BTC",
    "startDate": "2024-01-01",
    "endDate": "2024-03-01",
    "initialCapital": 10000
  }'

# Check status
curl http://localhost:5000/api/backtesting/runs/{runId}

# Get trades
curl http://localhost:5000/api/backtesting/runs/{runId}/trades

# Get performance data
curl http://localhost:5000/api/backtesting/runs/{runId}/performance
```

## Performance Metrics

### Calculated Metrics

1. **Total Return**: `(Final Capital - Initial Capital) / Initial Capital * 100`
2. **Annualized Return**: `((Final / Initial) ^ (365 / Days) - 1) * 100`
3. **Sharpe Ratio**: `(Avg Return - Risk Free Rate) / Std Dev * sqrt(252)`
4. **Max Drawdown**: Maximum peak-to-trough decline
5. **Win Rate**: `Winning Trades / Total Trades * 100`
6. **Profit Factor**: `Total Wins / Total Losses`

## Testing

Run the test suite:

```bash
npm run test:run -- server/test/backtesting
```

Test coverage:
- Broker: 11 tests (order execution, positions, portfolio)
- Analytics: 7 tests (metrics, drawdowns, returns)
- Strategies: 7 tests (MA, RSI implementations)

## Best Practices

### Strategy Development
1. Start with simple strategies
2. Test thoroughly with historical data
3. Consider transaction costs (commission, slippage)
4. Implement proper risk management
5. Avoid over-optimization (curve fitting)

### Backtesting
1. Use sufficient historical data
2. Account for realistic execution costs
3. Be aware of look-ahead bias
4. Consider market regime changes
5. Validate with out-of-sample data

### Paper Trading
1. Start with small position sizes
2. Monitor performance closely
3. Compare with backtest results
4. Gradually increase capital
5. Be prepared for slippage differences

## Troubleshooting

### Common Issues

**Backtest fails with "No historical data"**
- Ensure market data exists for the specified date range
- Check that the asset symbol is correct

**Insufficient funds error**
- Reduce position sizes
- Increase initial capital
- Check commission/slippage settings

**Strategy not generating signals**
- Verify indicator calculations
- Check if enough bars have been processed
- Review strategy parameters

## Future Enhancements

- [ ] Support for multiple assets (portfolio backtesting)
- [ ] More order types (stop-loss, take-profit)
- [ ] Walk-forward optimization
- [ ] Monte Carlo simulations
- [ ] Strategy performance attribution
- [ ] Real-time strategy execution
- [ ] Integration with live exchanges
- [ ] Machine learning strategy support

## License

MIT
