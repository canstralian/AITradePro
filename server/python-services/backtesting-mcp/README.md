# AITradePro MCP Backtesting Service

Model Context Protocol (MCP) server for executing backtesting simulations with historical market data.

## Features

- Execute backtests with custom trading strategies
- Real-time progress updates via MCP protocol
- Comprehensive performance metrics (Sharpe ratio, drawdown, win rate, etc.)
- PostgreSQL integration for historical data
- Built-in strategies: SMA Crossover, RSI, MACD
- Extensible strategy framework

## Installation

### Using Poetry (Recommended)

```bash
cd server/python-services/backtesting-mcp
poetry install
```

### Using pip

```bash
cd server/python-services/backtesting-mcp
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update environment variables:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/trading_db
```

## Usage

### Start MCP Server

```bash
python main.py
```

The server communicates via stdio (standard input/output) using the MCP protocol.

### Available MCP Tools

1. **run_backtest** - Execute a backtest simulation
   ```json
   {
     "strategy_id": "sma_crossover",
     "asset_symbol": "BTC",
     "start_date": "2023-01-01T00:00:00Z",
     "end_date": "2024-01-01T00:00:00Z",
     "initial_capital": 10000,
     "parameters": {
       "fast_period": 10,
       "slow_period": 30
     }
   }
   ```

2. **get_backtest_results** - Retrieve completed results
   ```json
   {
     "backtest_id": "bt-abc123def456"
   }
   ```

3. **list_strategies** - Get available trading strategies
   ```json
   {}
   ```

4. **validate_strategy** - Validate strategy configuration
   ```json
   {
     "strategy_config": {
       "strategy_id": "sma_crossover",
       "parameters": {"fast_period": 10, "slow_period": 30}
     }
   }
   ```

5. **get_metrics** - Calculate performance metrics
   ```json
   {
     "backtest_id": "bt-abc123def456",
     "metrics": ["sharpe_ratio", "max_drawdown"]
   }
   ```

## Built-in Strategies

### SMA Crossover
Simple Moving Average crossover strategy. Generates buy signal when fast SMA crosses above slow SMA.

**Parameters:**
- `fast_period` (int): Fast moving average period (default: 10)
- `slow_period` (int): Slow moving average period (default: 30)
- `position_size` (float): Position size as fraction of capital (default: 0.95)

### RSI Strategy
Relative Strength Index overbought/oversold strategy.

**Parameters:**
- `period` (int): RSI calculation period (default: 14)
- `oversold` (float): Oversold threshold (default: 30)
- `overbought` (float): Overbought threshold (default: 70)
- `position_size` (float): Position size fraction (default: 0.95)

## Development

### Running Tests

```bash
pytest
```

### With coverage

```bash
pytest --cov=backtesting --cov=mcp_server --cov-report=html
```

### Code Formatting

```bash
black .
ruff check --fix .
```

### Type Checking

```bash
mypy .
```

## Architecture

```
main.py                     # Entry point
├── config/
│   ├── settings.py        # Configuration management
│   └── database.py        # Database connection
├── mcp_server/
│   ├── server.py          # MCP server implementation
│   ├── tools.py           # Tool definitions
│   └── schemas.py         # Request/response schemas
├── backtesting/
│   ├── engine.py          # Backtesting engine (vectorbt)
│   ├── strategy.py        # Strategy base classes
│   ├── metrics.py         # Performance metrics
│   ├── data_loader.py     # Historical data fetching
│   └── strategies/        # Built-in strategies
└── database/
    ├── models.py          # SQLAlchemy models
    └── repository.py      # Database operations
```

## Performance Metrics

The backtesting engine calculates the following metrics:

- **Total Return**: Overall percentage return
- **Sharpe Ratio**: Risk-adjusted return
- **Max Drawdown**: Largest peak-to-trough decline
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Gross profit / gross loss
- **Average Win/Loss**: Mean P&L for winning/losing trades
- **Total Trades**: Number of executed trades
- **Expectancy**: Average trade outcome

## Database Schema

The service expects the following PostgreSQL tables:

- `market_data` - Historical OHLCV data
- `backtest_runs` - Backtest execution metadata
- `backtest_results` - Performance metrics
- `backtest_trades` - Individual trade records
- `trading_strategies` - Strategy definitions

See `docs/mcp-backtesting-architecture.md` for detailed schema.

## License

MIT
