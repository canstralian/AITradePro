# AITradePro Backtesting Engine

Production-grade backtesting and back-trading engine for the AITradePro platform.

## 🎯 Overview

A deterministic simulation engine for historical data (backtesting) that can switch to a clocked, market-connected paper mode (back-trading). Both modes share the same strategy interface, execution model, and analytics pipeline.

## ✨ Features

- **Deterministic Backtesting**: Reproducible results with complete audit trails
- **Strategy Framework**: Clean, testable strategy interface with examples
- **Realistic Execution**: Configurable slippage, fees, and market microstructure
- **Comprehensive Analytics**: Sharpe, Sortino, Calmar, drawdown analysis, and more
- **Data Validation**: Automatic data quality checks and error detection
- **Multiple Data Sources**: CSV, Parquet, and streaming support
- **Portfolio Management**: Accurate position tracking and P&L calculation
- **Back-trading Ready**: Switch to live/paper trading with same codebase

## 🏗️ Architecture

```
backend/
├── app/
│   ├── api/              # FastAPI routes (v1)
│   ├── core/             # Config, logging, security
│   ├── domain/           # Core models (Bar, Order, Fill, Position)
│   ├── engine/           # Backtest engine components
│   │   ├── broker.py     # Order execution
│   │   ├── clock.py      # Historical/Live time sources
│   │   ├── execution.py  # Slippage and fee models
│   │   ├── portfolio.py  # Position and P&L tracking
│   │   ├── recorder.py   # Audit trail
│   │   ├── simulator.py  # Main backtest runner
│   │   └── strategy.py   # Strategy interface
│   ├── data/             # Data loading and validation
│   ├── analytics/        # Performance metrics
│   ├── storage/          # PostgreSQL persistence
│   └── tests/            # Unit and integration tests
├── requirements.txt
├── pyproject.toml
└── README.md
```

## 🚀 Quick Start

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# For development
pip install -e ".[dev]"
```

### Basic Usage

```python
from app.engine.strategy import SmaCrossStrategy
from app.engine.simulator import BacktestRunner
from app.engine.broker import SimulatedBroker
from app.engine.execution import ExecutionModel, FixedBpsSlippage, PercentageFeeModel
from app.data.loader import DataLoader

# Load data
bars = DataLoader.from_csv("data/BTCUSDT_1h.csv")

# Create strategy
strategy = SmaCrossStrategy(fast=10, slow=20, position_size=1.0)

# Configure execution
execution = ExecutionModel(
    slippage=FixedBpsSlippage(5.0),
    fees=PercentageFeeModel(0.1)
)
broker = SimulatedBroker(execution)

# Run backtest
runner = BacktestRunner(
    strategy=strategy,
    broker=broker,
    data_feed=bars,
    initial_cash=10_000.0
)

results = runner.run(
    universe=["BTCUSDT"],
    params={"fast": 10, "slow": 20}
)

print(f"Final Equity: ${results['portfolio']['final_equity']:,.2f}")
print(f"Total Return: {results['portfolio']['total_return_pct']:.2f}%")
```

## 📊 Data Format

### CSV Format

```csv
timestamp,symbol,open,high,low,close,volume
2023-01-01T00:00:00Z,BTCUSDT,16500.0,16600.0,16450.0,16580.0,125.5
2023-01-01T01:00:00Z,BTCUSDT,16580.0,16650.0,16550.0,16620.0,98.3
```

### Required Columns

- `timestamp`: ISO format or Unix timestamp (UTC)
- `symbol`: Trading pair identifier
- `open`, `high`, `low`, `close`: Price data
- `volume`: Trading volume

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest app/tests/unit/test_strategy.py

# Run integration tests
pytest app/tests/integration/
```

## 📈 Strategy Development

### Creating a Strategy

```python
from typing import Any, Dict, Iterable
from app.domain.models import Bar, Order
from app.domain.enums import Side

class MyStrategy:
    name = "my_strategy"

    def __init__(self, param1: int, param2: float):
        self.param1 = param1
        self.param2 = param2

    def on_start(self, universe: Iterable[str], params: Dict[str, Any]) -> None:
        """Initialize strategy state."""
        pass

    def on_bar(self, bar: Bar, state: Dict[str, Any]) -> Iterable[Order]:
        """Process bar and generate orders."""
        orders = []
        # Your logic here
        return orders

    def on_end(self, state: Dict[str, Any]) -> None:
        """Cleanup."""
        pass
```

### Built-in Strategies

- **SMA Crossover**: Simple moving average crossover
- **Buy and Hold**: Baseline strategy for comparison

## 📊 Performance Metrics

The engine calculates:

### Return Metrics
- Total return
- Annualized return
- Cumulative returns

### Risk Metrics
- Volatility (annualized)
- Sharpe ratio
- Sortino ratio
- Calmar ratio
- Maximum drawdown
- Drawdown duration

### Trading Statistics
- Win rate
- Profit factor
- Average win/loss
- Trade count
- Trade duration

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aitradepro_backtest

# API
API_HOST=0.0.0.0
API_PORT=8000

# Backtesting
DEFAULT_INITIAL_CASH=10000.0
DEFAULT_SLIPPAGE_BPS=5.0
DEFAULT_FEE_PCT=0.1

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_FILE=logs/backtest.log
```

## 🔬 Advanced Features

### Custom Slippage Models

```python
from app.engine.execution import SlippageModel

class MySlippage(SlippageModel):
    def apply(self, bar, order, base_price):
        # Your custom slippage logic
        return adjusted_price
```

### Custom Fee Models

```python
from app.engine.execution import FeeModel

class MyFees(FeeModel):
    def compute(self, symbol, qty, price, side):
        # Your custom fee calculation
        return fee_amount
```

### Event Recording

```python
from app.engine.recorder import EventRecorder

recorder = EventRecorder(record_bars=True)
runner = BacktestRunner(..., recorder=recorder)

# Access full audit trail
events = recorder.get_events()
orders = recorder.get_orders()
fills = recorder.get_fills()
```

## 📚 API Documentation

Once implemented, FastAPI will provide interactive documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🛠️ Development

### Code Quality

```bash
# Format code
black app/

# Lint
ruff check app/

# Type check
mypy app/
```

### Project Structure Rules

1. **Domain models** are immutable dataclasses
2. **All prices** in quote currency
3. **All timestamps** in UTC
4. **Deterministic** by default (no randomness without seed)
5. **Protocol-based** interfaces for flexibility

## 🚦 Roadmap

### Sprint 1 (Completed)
- ✅ Core domain models
- ✅ Strategy interface
- ✅ Execution models
- ✅ Backtest simulator
- ✅ Data loaders
- ✅ Analytics engine

### Sprint 2 (Planned)
- [ ] FastAPI REST endpoints
- [ ] PostgreSQL persistence
- [ ] Async task queue (Celery)
- [ ] Dataset management API

### Sprint 3 (Planned)
- [ ] Live/paper trading clock
- [ ] WebSocket streaming
- [ ] React dashboard integration
- [ ] Parameter optimization

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run code quality checks
5. Submit a pull request

## 📞 Support

For issues and questions, please create a GitHub issue.

---

**Built with:** Python 3.10+ | FastAPI | PostgreSQL | Pandas | SQLAlchemy
