# Python Backtesting Service Implementation Plan

## Directory Structure

```
server/python-services/
└── backtesting-mcp/
    ├── pyproject.toml              # Poetry/pip dependencies
    ├── requirements.txt            # Python dependencies
    ├── README.md                   # Service documentation
    ├── .env.example               # Environment variables template
    ├── main.py                    # MCP server entry point
    ├── config/
    │   ├── __init__.py
    │   ├── settings.py            # Configuration management
    │   └── database.py            # Database connection settings
    ├── mcp_server/
    │   ├── __init__.py
    │   ├── server.py              # MCP server implementation
    │   ├── tools.py               # MCP tool definitions
    │   └── schemas.py             # Request/response schemas
    ├── backtesting/
    │   ├── __init__.py
    │   ├── engine.py              # Core backtesting engine
    │   ├── strategy.py            # Strategy base classes
    │   ├── metrics.py             # Performance metrics calculation
    │   ├── data_loader.py         # Historical data fetching
    │   └── strategies/
    │       ├── __init__.py
    │       ├── sma_crossover.py   # Simple Moving Average strategy
    │       ├── rsi_strategy.py    # RSI-based strategy
    │       └── macd_strategy.py   # MACD strategy
    ├── database/
    │   ├── __init__.py
    │   ├── models.py              # SQLAlchemy/Pydantic models
    │   └── repository.py          # Database operations
    ├── utils/
    │   ├── __init__.py
    │   ├── logger.py              # Logging configuration
    │   └── validators.py          # Input validation
    └── tests/
        ├── __init__.py
        ├── test_engine.py
        ├── test_strategies.py
        ├── test_mcp_server.py
        └── fixtures/
            └── sample_data.py
```

## Core Implementation Files

### 1. `pyproject.toml`

```toml
[tool.poetry]
name = "aitradepro-backtesting-mcp"
version = "0.1.0"
description = "MCP Backtesting Service for AITradePro"
authors = ["AITradePro Team"]
python = "^3.10"

[tool.poetry.dependencies]
python = "^3.10"
mcp = "^1.0.0"
pydantic = "^2.5.0"
pydantic-settings = "^2.1.0"
pandas = "^2.1.0"
numpy = "^1.26.0"
vectorbt = "^0.26.0"
psycopg = {extras = ["binary", "pool"], version = "^3.1.0"}
sqlalchemy = "^2.0.0"
python-dotenv = "^1.0.0"
structlog = "^24.1.0"
ta-lib = "^0.4.28"

[tool.poetry.dev-dependencies]
pytest = "^7.4.0"
pytest-asyncio = "^0.21.0"
pytest-cov = "^4.1.0"
black = "^23.12.0"
ruff = "^0.1.0"
mypy = "^1.8.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

### 2. `main.py` - MCP Server Entry Point

```python
#!/usr/bin/env python3
"""MCP Backtesting Server Entry Point."""

import asyncio
import sys
from pathlib import Path

# Add project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from mcp_server.server import create_backtesting_server
from config.settings import settings
from utils.logger import logger


async def main():
    """Start the MCP backtesting server."""
    logger.info("Starting AITradePro MCP Backtesting Server", version="0.1.0")

    try:
        server = await create_backtesting_server()

        # Run server with stdio transport
        from mcp.server.stdio import stdio_server

        async with stdio_server() as (read_stream, write_stream):
            await server.run(
                read_stream,
                write_stream,
                server.create_initialization_options()
            )

    except KeyboardInterrupt:
        logger.info("Server shutdown requested")
    except Exception as e:
        logger.error("Server error", error=str(e), exc_info=True)
        sys.exit(1)
    finally:
        logger.info("MCP Backtesting Server stopped")


if __name__ == "__main__":
    asyncio.run(main())
```

### 3. `config/settings.py` - Configuration Management

```python
"""Application settings and configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )

    # Database
    database_url: str = "postgresql://localhost:5432/trading_db"
    db_pool_size: int = 5
    db_max_overflow: int = 10

    # Backtesting limits
    max_backtest_duration_days: int = 365 * 5  # 5 years max
    max_concurrent_backtests: int = 3
    max_data_points: int = 1_000_000

    # Performance
    chunk_size: int = 10000  # Data loading chunk size
    cache_ttl_seconds: int = 3600  # 1 hour cache

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # MCP Server
    server_name: str = "aitradepro-backtesting"
    server_version: str = "0.1.0"


settings = Settings()
```

### 4. `mcp_server/server.py` - MCP Server Implementation

```python
"""MCP Server implementation for backtesting."""

from mcp.server import Server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource
from typing import Any, Sequence
import json

from backtesting.engine import BacktestEngine
from backtesting.strategy import StrategyRegistry
from database.repository import BacktestRepository
from config.settings import settings
from utils.logger import logger
from .tools import (
    run_backtest_tool,
    get_backtest_results_tool,
    list_strategies_tool,
    validate_strategy_tool,
    get_metrics_tool,
)
from .schemas import (
    RunBacktestRequest,
    GetBacktestResultsRequest,
    ValidateStrategyRequest,
    GetMetricsRequest,
)


async def create_backtesting_server() -> Server:
    """Create and configure the MCP backtesting server."""

    server = Server(settings.server_name)

    # Initialize dependencies
    engine = BacktestEngine()
    repository = BacktestRepository()
    strategy_registry = StrategyRegistry()

    # Register MCP tools
    @server.list_tools()
    async def list_tools() -> list[Tool]:
        """List available backtesting tools."""
        return [
            run_backtest_tool,
            get_backtest_results_tool,
            list_strategies_tool,
            validate_strategy_tool,
            get_metrics_tool,
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: dict[str, Any]) -> Sequence[TextContent | ImageContent | EmbeddedResource]:
        """Execute a backtesting tool."""
        logger.info("Tool called", tool=name, arguments=arguments)

        try:
            if name == "run_backtest":
                request = RunBacktestRequest(**arguments)
                result = await engine.run_backtest(
                    strategy_id=request.strategy_id,
                    asset_symbol=request.asset_symbol,
                    start_date=request.start_date,
                    end_date=request.end_date,
                    initial_capital=request.initial_capital,
                    parameters=request.parameters,
                )

                # Save to database
                await repository.save_backtest_run(result)

                return [
                    TextContent(
                        type="text",
                        text=f"Backtest started successfully with ID: {result.backtest_id}"
                    ),
                    EmbeddedResource(
                        type="resource",
                        resource={
                            "uri": f"backtest://{result.backtest_id}",
                            "mimeType": "application/json",
                            "text": json.dumps({
                                "backtest_id": result.backtest_id,
                                "status": result.status,
                                "progress": 0
                            })
                        }
                    )
                ]

            elif name == "get_backtest_results":
                request = GetBacktestResultsRequest(**arguments)
                results = await repository.get_backtest_results(request.backtest_id)

                if not results:
                    return [TextContent(
                        type="text",
                        text=f"No results found for backtest ID: {request.backtest_id}"
                    )]

                return [
                    TextContent(
                        type="text",
                        text="Backtest results retrieved successfully"
                    ),
                    EmbeddedResource(
                        type="resource",
                        resource={
                            "uri": f"backtest://{request.backtest_id}/results",
                            "mimeType": "application/json",
                            "text": json.dumps(results.model_dump())
                        }
                    )
                ]

            elif name == "list_strategies":
                strategies = strategy_registry.list_strategies()
                return [
                    TextContent(
                        type="text",
                        text=f"Found {len(strategies)} available strategies"
                    ),
                    EmbeddedResource(
                        type="resource",
                        resource={
                            "uri": "strategies://list",
                            "mimeType": "application/json",
                            "text": json.dumps(strategies)
                        }
                    )
                ]

            elif name == "validate_strategy":
                request = ValidateStrategyRequest(**arguments)
                validation = strategy_registry.validate_strategy(
                    request.strategy_config
                )
                return [
                    TextContent(
                        type="text",
                        text="Strategy validation complete"
                    ),
                    EmbeddedResource(
                        type="resource",
                        resource={
                            "uri": "validation://result",
                            "mimeType": "application/json",
                            "text": json.dumps(validation)
                        }
                    )
                ]

            elif name == "get_metrics":
                request = GetMetricsRequest(**arguments)
                metrics = await repository.get_metrics(
                    request.backtest_id,
                    request.metrics
                )
                return [
                    TextContent(
                        type="text",
                        text="Metrics calculated successfully"
                    ),
                    EmbeddedResource(
                        type="resource",
                        resource={
                            "uri": f"backtest://{request.backtest_id}/metrics",
                            "mimeType": "application/json",
                            "text": json.dumps(metrics)
                        }
                    )
                ]

            else:
                return [TextContent(
                    type="text",
                    text=f"Unknown tool: {name}"
                )]

        except Exception as e:
            logger.error("Tool execution failed", tool=name, error=str(e), exc_info=True)
            return [TextContent(
                type="text",
                text=f"Error executing tool {name}: {str(e)}"
            )]

    return server
```

### 5. `backtesting/engine.py` - Core Backtesting Engine

```python
"""Core backtesting engine using vectorbt."""

import pandas as pd
import numpy as np
import vectorbt as vbt
from datetime import datetime
from typing import Dict, Any, Optional
from uuid import uuid4

from database.repository import BacktestRepository
from backtesting.strategy import StrategyRegistry
from backtesting.data_loader import DataLoader
from backtesting.metrics import MetricsCalculator
from utils.logger import logger


class BacktestResult:
    """Backtest execution result."""

    def __init__(
        self,
        backtest_id: str,
        status: str,
        final_capital: Optional[float] = None,
        total_return: Optional[float] = None,
        metrics: Optional[Dict[str, Any]] = None,
        trades: Optional[list] = None,
        equity_curve: Optional[list] = None,
    ):
        self.backtest_id = backtest_id
        self.status = status
        self.final_capital = final_capital
        self.total_return = total_return
        self.metrics = metrics or {}
        self.trades = trades or []
        self.equity_curve = equity_curve or []


class BacktestEngine:
    """Execute backtests using vectorbt."""

    def __init__(self):
        self.data_loader = DataLoader()
        self.strategy_registry = StrategyRegistry()
        self.metrics_calculator = MetricsCalculator()

    async def run_backtest(
        self,
        strategy_id: str,
        asset_symbol: str,
        start_date: datetime,
        end_date: datetime,
        initial_capital: float,
        parameters: Dict[str, Any],
    ) -> BacktestResult:
        """
        Execute a backtest simulation.

        Args:
            strategy_id: Strategy identifier
            asset_symbol: Asset to backtest
            start_date: Backtest start date
            end_date: Backtest end date
            initial_capital: Starting capital
            parameters: Strategy parameters

        Returns:
            BacktestResult with execution details
        """
        backtest_id = f"bt-{uuid4().hex[:12]}"

        logger.info(
            "Starting backtest",
            backtest_id=backtest_id,
            strategy=strategy_id,
            asset=asset_symbol,
            start=start_date.isoformat(),
            end=end_date.isoformat(),
        )

        try:
            # Load historical data
            data = await self.data_loader.load_market_data(
                asset_symbol=asset_symbol,
                start_date=start_date,
                end_date=end_date,
            )

            if data.empty:
                raise ValueError(f"No data available for {asset_symbol}")

            # Get strategy
            strategy_class = self.strategy_registry.get_strategy(strategy_id)
            strategy = strategy_class(**parameters)

            # Generate trading signals
            signals = strategy.generate_signals(data)

            # Run backtest with vectorbt
            portfolio = vbt.Portfolio.from_signals(
                close=data['close'],
                entries=signals['entries'],
                exits=signals['exits'],
                init_cash=initial_capital,
                fees=0.001,  # 0.1% trading fee
                slippage=0.001,  # 0.1% slippage
            )

            # Calculate metrics
            metrics = self.metrics_calculator.calculate_all_metrics(portfolio)

            # Extract trades
            trades = self._extract_trades(portfolio)

            # Generate equity curve
            equity_curve = portfolio.value().tolist()

            result = BacktestResult(
                backtest_id=backtest_id,
                status="completed",
                final_capital=float(portfolio.final_value()),
                total_return=float(portfolio.total_return() * 100),
                metrics=metrics,
                trades=trades,
                equity_curve=equity_curve,
            )

            logger.info(
                "Backtest completed",
                backtest_id=backtest_id,
                final_capital=result.final_capital,
                total_return=result.total_return,
                trades=len(trades),
            )

            return result

        except Exception as e:
            logger.error("Backtest failed", backtest_id=backtest_id, error=str(e), exc_info=True)
            return BacktestResult(
                backtest_id=backtest_id,
                status="failed",
            )

    def _extract_trades(self, portfolio) -> list[Dict[str, Any]]:
        """Extract individual trades from portfolio."""
        trades = []

        for _, trade in portfolio.trades.records_readable.iterrows():
            trades.append({
                "entry_date": trade['Entry Timestamp'].isoformat(),
                "exit_date": trade['Exit Timestamp'].isoformat() if pd.notna(trade['Exit Timestamp']) else None,
                "direction": "long",  # vectorbt default
                "entry_price": float(trade['Avg Entry Price']),
                "exit_price": float(trade['Avg Exit Price']) if pd.notna(trade['Avg Exit Price']) else None,
                "quantity": float(trade['Size']),
                "pnl": float(trade['PnL']),
                "pnl_percent": float(trade['Return'] * 100),
                "status": "closed" if pd.notna(trade['Exit Timestamp']) else "open",
            })

        return trades
```

### 6. `backtesting/strategy.py` - Strategy Base Classes

```python
"""Trading strategy base classes and registry."""

from abc import ABC, abstractmethod
import pandas as pd
from typing import Dict, Any


class TradingStrategy(ABC):
    """Base class for all trading strategies."""

    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> Dict[str, pd.Series]:
        """
        Generate trading signals from market data.

        Args:
            data: DataFrame with OHLCV data

        Returns:
            Dictionary with 'entries' and 'exits' boolean Series
        """
        pass

    @property
    @abstractmethod
    def parameters_schema(self) -> Dict[str, Any]:
        """Return JSON schema for strategy parameters."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Return strategy description."""
        pass


class StrategyRegistry:
    """Registry for available trading strategies."""

    def __init__(self):
        self._strategies: Dict[str, type[TradingStrategy]] = {}
        self._register_builtin_strategies()

    def _register_builtin_strategies(self):
        """Register built-in strategies."""
        from backtesting.strategies.sma_crossover import SMACrossoverStrategy
        from backtesting.strategies.rsi_strategy import RSIStrategy

        self.register("sma_crossover", SMACrossoverStrategy)
        self.register("rsi", RSIStrategy)

    def register(self, strategy_id: str, strategy_class: type[TradingStrategy]):
        """Register a new strategy."""
        self._strategies[strategy_id] = strategy_class

    def get_strategy(self, strategy_id: str) -> type[TradingStrategy]:
        """Get strategy class by ID."""
        if strategy_id not in self._strategies:
            raise ValueError(f"Unknown strategy: {strategy_id}")
        return self._strategies[strategy_id]

    def list_strategies(self) -> list[Dict[str, Any]]:
        """List all available strategies."""
        return [
            {
                "id": strategy_id,
                "name": strategy_class.__name__,
                "description": strategy_class().description,
                "parameters_schema": strategy_class().parameters_schema,
            }
            for strategy_id, strategy_class in self._strategies.items()
        ]

    def validate_strategy(self, strategy_config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate strategy configuration."""
        strategy_id = strategy_config.get("strategy_id")
        parameters = strategy_config.get("parameters", {})

        if not strategy_id:
            return {"valid": False, "errors": ["strategy_id is required"]}

        if strategy_id not in self._strategies:
            return {"valid": False, "errors": [f"Unknown strategy: {strategy_id}"]}

        # Validate parameters against schema
        strategy_class = self._strategies[strategy_id]
        schema = strategy_class().parameters_schema

        # Simple validation (can be enhanced with jsonschema)
        errors = []
        for param_name, param_schema in schema.items():
            if param_schema.get("required", False) and param_name not in parameters:
                errors.append(f"Required parameter missing: {param_name}")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
        }
```

## Next Steps

1. **Set up Python environment:**
   ```bash
   cd server/python-services/backtesting-mcp
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure database connection:**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` to PostgreSQL connection string

3. **Implement built-in strategies:**
   - SMA Crossover
   - RSI Overbought/Oversold
   - MACD

4. **Test MCP server:**
   ```bash
   python main.py
   ```

5. **Integrate with Node.js backend**

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=backtesting --cov=mcp_server

# Run specific test file
pytest tests/test_engine.py -v
```
