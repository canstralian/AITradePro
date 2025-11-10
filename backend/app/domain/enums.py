"""Enumerations for the backtesting domain."""

from enum import Enum


class Side(str, Enum):
    """Order side enum."""
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    """Order type enum."""
    MARKET = "market"
    LIMIT = "limit"


class OrderStatus(str, Enum):
    """Order status enum."""
    PENDING = "pending"
    FILLED = "filled"
    PARTIAL = "partial"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class RunMode(str, Enum):
    """Backtest run mode."""
    BACKTEST = "backtest"
    BACKTRADING = "backtrading"


class RunStatus(str, Enum):
    """Run execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ArtifactKind(str, Enum):
    """Artifact type stored in database."""
    EQUITY_CURVE = "equity_curve"
    TRADES = "trades"
    METRICS = "metrics"
    DRAWDOWN_CURVE = "drawdown_curve"
    POSITIONS = "positions"
