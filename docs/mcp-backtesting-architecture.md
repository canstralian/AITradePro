# MCP Backtesting Engine Architecture

## Overview

This document outlines the Model Context Protocol (MCP) integration architecture for adding backtesting and backtrading capabilities to the AITradePro platform.

## Architecture Components

### 1. Python MCP Backtesting Server

**Location:** `server/python-services/backtesting-mcp/`

**Responsibilities:**
- Execute backtesting simulations using historical market data
- Perform backtrading in virtual environments
- Calculate performance metrics (win/loss, returns, drawdown)
- Generate trade signals based on strategies
- Communicate via MCP protocol

**Tech Stack:**
- Python 3.10+
- MCP Server SDK
- pandas/numpy for data processing
- PostgreSQL adapter (psycopg3)
- vectorbt/backtrader for backtesting engine

**MCP Tools Exposed:**
```python
{
  "run_backtest": {
    "description": "Execute backtest with specified strategy and parameters",
    "parameters": {
      "strategy_id": "string",
      "asset_symbol": "string",
      "start_date": "ISO8601",
      "end_date": "ISO8601",
      "initial_capital": "number",
      "parameters": "object"
    }
  },
  "get_backtest_results": {
    "description": "Retrieve results from completed backtest",
    "parameters": {
      "backtest_id": "string"
    }
  },
  "list_strategies": {
    "description": "Get available trading strategies"
  },
  "validate_strategy": {
    "description": "Validate strategy configuration",
    "parameters": {
      "strategy_config": "object"
    }
  },
  "get_metrics": {
    "description": "Calculate performance metrics for backtest",
    "parameters": {
      "backtest_id": "string",
      "metrics": "array"
    }
  }
}
```

### 2. Node.js MCP Client Integration

**Location:** `server/services/mcp-backtesting-client.ts`

**Responsibilities:**
- Establish MCP connection to Python backtesting server
- Translate REST/WebSocket requests to MCP tool calls
- Handle response streaming and error handling
- Integrate with existing async worker service
- Cache results and manage state

**Integration Pattern:**
```typescript
class MCPBacktestingClient {
  private mcpClient: Client;
  private transport: StdioClientTransport;

  async initialize(): Promise<void>;
  async runBacktest(params: BacktestParams): Promise<string>;
  async getResults(backtestId: string): Promise<BacktestResults>;
  async streamProgress(backtestId: string, callback: ProgressCallback): void;
}
```

### 3. Extended Async Worker Service

**Enhancement:** Add new task types to existing worker service

**New Task Types:**
```typescript
type BacktestTaskType =
  | 'backtest_strategy'
  | 'backtest_optimization'
  | 'backtest_monte_carlo'
  | 'backtest_walk_forward';

interface BacktestTask extends WorkerTask {
  type: BacktestTaskType;
  payload: {
    strategyId: string;
    assetSymbol: string;
    dateRange: { start: string; end: string };
    capital: number;
    parameters: Record<string, any>;
  };
}
```

### 4. WebSocket Message Extensions

**New Message Types:**
```typescript
// Client → Server
{
  type: 'backtest_start',
  payload: BacktestParams
}

{
  type: 'backtest_status',
  backtestId: string
}

// Server → Client
{
  type: 'backtest_progress',
  data: {
    backtestId: string,
    progress: number, // 0-100
    currentDate: string,
    tradesExecuted: number
  }
}

{
  type: 'backtest_complete',
  data: BacktestResults
}
```

### 5. Database Schema Extensions

**New Tables:**

```sql
-- Backtesting configurations
CREATE TABLE backtest_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  initial_capital DECIMAL NOT NULL,
  parameters JSONB,
  status TEXT NOT NULL, -- 'pending', 'running', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- Backtest results and metrics
CREATE TABLE backtest_results (
  id TEXT PRIMARY KEY,
  backtest_run_id TEXT NOT NULL,
  final_capital DECIMAL NOT NULL,
  total_return DECIMAL NOT NULL,
  sharpe_ratio DECIMAL,
  max_drawdown DECIMAL,
  win_rate DECIMAL,
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  avg_win DECIMAL,
  avg_loss DECIMAL,
  profit_factor DECIMAL,
  metrics JSONB,
  equity_curve JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (backtest_run_id) REFERENCES backtest_runs(id)
);

-- Individual backtest trades
CREATE TABLE backtest_trades (
  id TEXT PRIMARY KEY,
  backtest_run_id TEXT NOT NULL,
  entry_date TIMESTAMP NOT NULL,
  exit_date TIMESTAMP,
  direction TEXT NOT NULL, -- 'long', 'short'
  entry_price DECIMAL NOT NULL,
  exit_price DECIMAL,
  quantity DECIMAL NOT NULL,
  pnl DECIMAL,
  pnl_percent DECIMAL,
  status TEXT NOT NULL, -- 'open', 'closed'
  FOREIGN KEY (backtest_run_id) REFERENCES backtest_runs(id)
);

-- Trading strategies
CREATE TABLE trading_strategies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  strategy_type TEXT NOT NULL, -- 'trend', 'mean_reversion', 'momentum', etc.
  parameters_schema JSONB NOT NULL,
  default_parameters JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Data Flow Architecture

```
┌─────────────────┐
│  React Client   │
│   (Frontend)    │
└────────┬────────┘
         │ WebSocket/REST
         ▼
┌─────────────────────────────────────┐
│      Node.js Express Server         │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   Async Worker Service       │  │
│  │  (Enhanced with backtest)    │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│  ┌──────────▼───────────────────┐  │
│  │  MCP Backtesting Client      │  │
│  │  (Node.js MCP Client)        │  │
│  └──────────┬───────────────────┘  │
└─────────────┼───────────────────────┘
              │ MCP Protocol (stdio/HTTP)
              ▼
┌─────────────────────────────────────┐
│   Python MCP Backtesting Server     │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   Backtesting Engine         │  │
│  │   (vectorbt/backtrader)      │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│  ┌──────────▼───────────────────┐  │
│  │   PostgreSQL Connector       │  │
│  │   (Historical Data Access)   │  │
│  └──────────────────────────────┘  │
└─────────────┼───────────────────────┘
              │ SQL
              ▼
┌─────────────────────────────────────┐
│         PostgreSQL Database         │
│                                     │
│  • market_data (historical)         │
│  • backtest_runs                    │
│  • backtest_results                 │
│  • backtest_trades                  │
│  • trading_strategies               │
└─────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Python MCP server structure
- [ ] Define MCP tool schemas
- [ ] Create database schema extensions
- [ ] Implement basic MCP client in Node.js

### Phase 2: Core Backtesting (Week 3-4)
- [ ] Implement backtesting engine with vectorbt
- [ ] PostgreSQL data fetching for historical prices
- [ ] Strategy execution logic
- [ ] Metrics calculation engine

### Phase 3: Integration (Week 5-6)
- [ ] Integrate MCP client with async worker service
- [ ] Add WebSocket message handlers
- [ ] REST API endpoints for backtesting
- [ ] Result storage and retrieval

### Phase 4: Frontend (Week 7-8)
- [ ] Backtest configuration UI
- [ ] Real-time progress visualization
- [ ] Results dashboard with charts
- [ ] Strategy parameter optimization UI

### Phase 5: Advanced Features (Week 9-10)
- [ ] Walk-forward optimization
- [ ] Monte Carlo simulation
- [ ] Multi-asset portfolio backtesting
- [ ] Strategy comparison tools

## MCP Message Examples

### Starting a Backtest

**Client Request:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "run_backtest",
    "arguments": {
      "strategy_id": "sma_crossover",
      "asset_symbol": "BTC",
      "start_date": "2023-01-01T00:00:00Z",
      "end_date": "2024-01-01T00:00:00Z",
      "initial_capital": 10000,
      "parameters": {
        "fast_period": 10,
        "slow_period": 30,
        "position_size": 0.95
      }
    }
  }
}
```

**MCP Server Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Backtest started successfully"
    },
    {
      "type": "resource",
      "resource": {
        "uri": "backtest://bt-1234567890",
        "mimeType": "application/json",
        "text": "{\"backtest_id\": \"bt-1234567890\", \"status\": \"running\"}"
      }
    }
  ]
}
```

### Retrieving Results

**Client Request:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "get_backtest_results",
    "arguments": {
      "backtest_id": "bt-1234567890"
    }
  }
}
```

**MCP Server Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Backtest results retrieved successfully"
    },
    {
      "type": "resource",
      "resource": {
        "uri": "backtest://bt-1234567890/results",
        "mimeType": "application/json",
        "text": "{\"metrics\": {...}, \"trades\": [...], \"equity_curve\": [...]}"
      }
    }
  ]
}
```

## Security Considerations

1. **Input Validation:** All strategy parameters validated before execution
2. **Resource Limits:** Cap on backtest duration, data points, and memory usage
3. **User Isolation:** Backtest runs isolated per user
4. **Rate Limiting:** Limit concurrent backtests per user
5. **Data Access:** Read-only access to historical market data
6. **MCP Transport Security:** Use authenticated stdio transport or HTTPS

## Performance Optimization

1. **Caching:** Cache frequently used historical data
2. **Parallel Processing:** Run multiple backtests concurrently using Python multiprocessing
3. **Incremental Results:** Stream partial results during long-running backtests
4. **Database Indexing:** Optimize queries on market_data table
5. **Result Pagination:** Paginate trade lists for large backtests

## Testing Strategy

1. **Unit Tests:** Test individual backtesting functions
2. **Integration Tests:** Test MCP client-server communication
3. **Performance Tests:** Benchmark backtest execution times
4. **Accuracy Tests:** Validate metrics calculations against known results
5. **E2E Tests:** Full workflow from UI to results display

## Monitoring & Observability

1. **Logging:** Structured logging for backtest execution
2. **Metrics:** Track backtest duration, success rate, resource usage
3. **Error Tracking:** Detailed error reporting for failed backtests
4. **Performance Monitoring:** Monitor MCP communication latency
5. **Alerting:** Alert on system overload or failures

## Future Enhancements

1. **Live Trading Integration:** Bridge from backtesting to paper trading
2. **Strategy Marketplace:** Share and discover trading strategies
3. **AI Strategy Generation:** Use LLMs to generate and optimize strategies
4. **Social Trading:** Follow and copy successful backtest strategies
5. **Advanced Analytics:** Risk analysis, correlation studies, regime detection
