"""Pytest fixtures and test configuration."""

import asyncio
from collections.abc import AsyncGenerator, Generator
from typing import Any

import pytest
import pytest_asyncio
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.database import Base
from app.models import *  # noqa: F401, F403

# Test database URL - use in-memory SQLite for speed
TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5432/aitradepro_test"


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_engine() -> AsyncGenerator[Any, None]:
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=NullPool,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine: Any) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture
def sample_dataset_data() -> dict[str, Any]:
    """Sample dataset data for testing."""
    from datetime import datetime, timezone

    return {
        "name": "Test Dataset",
        "description": "Dataset for testing purposes",
        "content_hash": "a" * 64,
        "start_date": datetime(2023, 1, 1, tzinfo=timezone.utc),
        "end_date": datetime(2023, 12, 31, tzinfo=timezone.utc),
        "symbols": ["BTC", "ETH", "SOL"],
        "timeframe": "1h",
    }


@pytest.fixture
def sample_strategy_data() -> dict[str, Any]:
    """Sample strategy configuration for testing."""
    return {
        "name": "Moving Average Crossover",
        "version": "1.0.0",
        "description": "Simple MA crossover strategy",
        "params": {
            "fast_period": 10,
            "slow_period": 50,
            "risk_per_trade": 0.02,
        },
    }


@pytest.fixture
def sample_run_data() -> dict[str, Any]:
    """Sample backtest run data for testing."""
    from decimal import Decimal

    from app.models.backtest import RunMode

    return {
        "run_mode": RunMode.BACKTEST,
        "initial_capital": Decimal("10000.0000"),
        "final_value": Decimal("12500.0000"),
        "total_return": Decimal("0.2500"),
        "max_drawdown": Decimal("-0.1200"),
        "sharpe_ratio": Decimal("1.8500"),
        "total_trades": 150,
        "winning_trades": 95,
        "losing_trades": 55,
        "win_rate": Decimal("0.6333"),
    }
