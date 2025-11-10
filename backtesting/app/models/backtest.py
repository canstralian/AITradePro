"""
Production-grade backtesting models with PostgreSQL-specific optimizations.

Adheres to PEP 8, uses PostgreSQL ENUMs, JSONB, proper indexing,
and numeric precision for financial data.
"""

import enum
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import (
    ARRAY,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ============================================================================
# PostgreSQL ENUMs - Cast once, avoid dynamic type creation
# ============================================================================


class RunMode(str, enum.Enum):
    """Backtest execution mode."""

    BACKTEST = "backtest"  # Historical simulation
    PAPER = "paper"  # Live paper trading
    LIVE = "live"  # Live trading with real capital


class ArtifactKind(str, enum.Enum):
    """Types of artifacts generated during backtests."""

    PLOT = "plot"  # Matplotlib/Plotly charts
    REPORT = "report"  # PDF/HTML reports
    CSV = "csv"  # CSV export
    PICKLE = "pickle"  # Serialized Python objects
    JSON = "json"  # JSON data export


# ============================================================================
# Backtesting Dataset - Historical market data configuration
# ============================================================================


class BacktestDataset(Base):
    """
    Reproducible historical market data snapshots for backtesting.

    Uses content hashing to ensure data integrity and reproducibility.
    Supports multiple timeframes and asset universes.
    """

    __tablename__ = "datasets"

    # Primary key
    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        comment="Dataset unique identifier",
    )

    # Dataset metadata
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Human-readable dataset name",
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Dataset description and purpose",
    )

    # Data integrity - ensures reproducibility
    content_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="SHA-256 hash of dataset content for integrity verification",
    )

    # Temporal coverage
    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="Dataset start date (inclusive, UTC)",
    )

    end_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="Dataset end date (inclusive, UTC)",
    )

    # Asset universe
    symbols: Mapped[list[str]] = mapped_column(
        ARRAY(String(20)),
        nullable=False,
        comment="List of asset symbols included in dataset",
    )

    # Data granularity
    timeframe: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="Candle timeframe (e.g., '1m', '5m', '1h', '1d')",
    )

    # Audit timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Record creation timestamp (UTC)",
    )

    # Relationships
    runs: Mapped[list["BacktestRun"]] = relationship(
        "BacktestRun",
        back_populates="dataset",
        cascade="all, delete-orphan",
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint(
            "content_hash",
            name="uq_datasets_hash",
        ),
        CheckConstraint(
            "start_date < end_date",
            name="ck_datasets_valid_daterange",
        ),
        CheckConstraint(
            "array_length(symbols, 1) > 0",
            name="ck_datasets_nonempty_symbols",
        ),
        # Functional index for timeframe filtering
        Index(
            "ix_datasets_timeframe",
            func.lower(timeframe),
        ),
        # Composite index for date range queries
        Index(
            "ix_datasets_daterange",
            "start_date",
            "end_date",
        ),
        {"comment": "Historical market data snapshots for reproducible backtesting"},
    )


# ============================================================================
# Strategy Configuration - Trading strategy parameters
# ============================================================================


class StrategyConfig(Base):
    """
    Strategy definition with versioned parameters.

    Supports language-agnostic strategy definitions with dynamic parameters.
    """

    __tablename__ = "strategies"

    # Primary key
    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        comment="Strategy unique identifier",
    )

    # Strategy identification
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Strategy name",
    )

    version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Strategy version (semver recommended)",
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Strategy description and trading logic",
    )

    # Dynamic strategy parameters - JSONB for performance and indexing
    params: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default="{}",
        comment="Strategy parameters as structured JSON",
    )

    # Audit timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Record creation timestamp (UTC)",
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Record last update timestamp (UTC)",
    )

    # Relationships
    runs: Mapped[list["BacktestRun"]] = relationship(
        "BacktestRun",
        back_populates="strategy",
        cascade="all, delete-orphan",
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint(
            "name",
            "version",
            name="uq_strategies_name_version",
        ),
        # GIN index for JSONB parameter queries
        Index(
            "ix_strategies_params",
            "params",
            postgresql_using="gin",
        ),
        {"comment": "Trading strategy configurations with versioned parameters"},
    )


# ============================================================================
# Backtest Run - Execution results
# ============================================================================


class BacktestRun(Base):
    """
    Backtest execution results with comprehensive performance metrics.

    Uses Numeric(18,4) for accurate financial calculations.
    """

    __tablename__ = "runs"

    # Primary key
    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        comment="Run unique identifier",
    )

    # Foreign keys
    dataset_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("datasets.id", ondelete="RESTRICT"),
        nullable=False,
        comment="Reference to dataset used",
    )

    strategy_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("strategies.id", ondelete="RESTRICT"),
        nullable=False,
        comment="Reference to strategy executed",
    )

    # Execution metadata
    run_mode: Mapped[RunMode] = mapped_column(
        Enum(RunMode, name="run_mode", create_type=True),
        nullable=False,
        server_default=RunMode.BACKTEST.value,
        comment="Execution mode (backtest/paper/live)",
    )

    # Financial metrics - Numeric(18,4) for precision
    initial_capital: Mapped[float] = mapped_column(
        Numeric(18, 4),
        nullable=False,
        comment="Starting capital for backtest",
    )

    final_value: Mapped[float] = mapped_column(
        Numeric(18, 4),
        nullable=False,
        comment="Final portfolio value",
    )

    total_return: Mapped[float] = mapped_column(
        Numeric(10, 4),
        nullable=False,
        comment="Total return as decimal (e.g., 0.2500 = 25%)",
    )

    max_drawdown: Mapped[float] = mapped_column(
        Numeric(10, 4),
        nullable=False,
        comment="Maximum drawdown as decimal (e.g., -0.1500 = -15%)",
    )

    sharpe_ratio: Mapped[float | None] = mapped_column(
        Numeric(10, 4),
        nullable=True,
        comment="Risk-adjusted return metric",
    )

    # Trade statistics
    total_trades: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        comment="Total number of trades executed",
    )

    winning_trades: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        comment="Number of profitable trades",
    )

    losing_trades: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        comment="Number of losing trades",
    )

    win_rate: Mapped[float | None] = mapped_column(
        Numeric(5, 4),
        nullable=True,
        comment="Win rate as decimal (e.g., 0.6500 = 65%)",
    )

    # Execution timing
    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Run execution timestamp (UTC)",
    )

    # Runtime metadata - JSONB for extensibility
    metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default="{}",
        comment="Additional runtime metadata and diagnostics",
    )

    # Relationships
    dataset: Mapped["BacktestDataset"] = relationship(
        "BacktestDataset",
        back_populates="runs",
    )

    strategy: Mapped["StrategyConfig"] = relationship(
        "StrategyConfig",
        back_populates="runs",
    )

    artifacts: Mapped[list["Artifact"]] = relationship(
        "Artifact",
        back_populates="run",
        cascade="all, delete-orphan",
    )

    events: Mapped[list["BacktestEvent"]] = relationship(
        "BacktestEvent",
        back_populates="run",
        cascade="all, delete-orphan",
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "initial_capital > 0",
            name="ck_runs_positive_capital",
        ),
        CheckConstraint(
            "final_value >= 0",
            name="ck_runs_nonnegative_final_value",
        ),
        CheckConstraint(
            "total_trades >= 0",
            name="ck_runs_nonnegative_trades",
        ),
        CheckConstraint(
            "winning_trades >= 0 AND losing_trades >= 0",
            name="ck_runs_nonnegative_trade_counts",
        ),
        CheckConstraint(
            "total_trades = winning_trades + losing_trades",
            name="ck_runs_trade_count_consistency",
        ),
        # Index for performance queries
        Index(
            "ix_runs_executed_at",
            "executed_at",
        ),
        # Composite index for filtering by mode and date
        Index(
            "ix_runs_mode_date",
            "run_mode",
            "executed_at",
        ),
        # GIN index for metadata queries
        Index(
            "ix_runs_metadata",
            "metadata",
            postgresql_using="gin",
        ),
        {"comment": "Backtest execution results with comprehensive metrics"},
    )


# ============================================================================
# Artifact - Generated outputs
# ============================================================================


class Artifact(Base):
    """
    Files and outputs generated during backtest execution.

    Stores plot images, reports, CSV exports, etc.
    """

    __tablename__ = "artifacts"

    # Primary key
    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        comment="Artifact unique identifier",
    )

    # Foreign key
    run_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("runs.id", ondelete="CASCADE"),
        nullable=False,
        comment="Reference to parent backtest run",
    )

    # Artifact classification
    kind: Mapped[ArtifactKind] = mapped_column(
        Enum(ArtifactKind, name="artifact_kind", create_type=True),
        nullable=False,
        comment="Artifact type classification",
    )

    # File metadata
    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Original filename",
    )

    storage_path: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        comment="Storage location (S3 key, filesystem path, etc.)",
    )

    mime_type: Mapped[str] = mapped_column(
        String(127),
        nullable=False,
        comment="MIME type (e.g., image/png, application/pdf)",
    )

    size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="File size in bytes",
    )

    # Audit timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Artifact creation timestamp (UTC)",
    )

    # Relationships
    run: Mapped["BacktestRun"] = relationship(
        "BacktestRun",
        back_populates="artifacts",
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "size_bytes >= 0",
            name="ck_artifacts_nonnegative_size",
        ),
        # Index for filtering by run and kind
        Index(
            "ix_artifacts_run_kind",
            "run_id",
            "kind",
        ),
        {"comment": "Files and outputs generated during backtest execution"},
    )


# ============================================================================
# Backtest Event - Execution event log
# ============================================================================


class BacktestEvent(Base):
    """
    Time-series event log for backtest execution.

    Captures trades, signals, errors, and diagnostics with structured payloads.
    """

    __tablename__ = "events"

    # Primary key
    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        comment="Event unique identifier",
    )

    # Foreign key
    run_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("runs.id", ondelete="CASCADE"),
        nullable=False,
        comment="Reference to parent backtest run",
    )

    # Event classification
    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Event type (e.g., 'trade', 'signal', 'error', 'metric')",
    )

    # Event timing
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="Event timestamp (UTC, can be historical for backtests)",
    )

    # Event payload - JSONB for structured, indexed data
    payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default="{}",
        comment="Event data as structured JSON",
    )

    # Audit timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Record creation timestamp (UTC)",
    )

    # Relationships
    run: Mapped["BacktestRun"] = relationship(
        "BacktestRun",
        back_populates="events",
    )

    # Constraints
    __table_args__ = (
        # Index for time-series queries
        Index(
            "ix_events_run_timestamp",
            "run_id",
            "timestamp",
        ),
        # Index for event type filtering
        Index(
            "ix_events_type",
            "event_type",
        ),
        # GIN index for payload queries
        Index(
            "ix_events_payload",
            "payload",
            postgresql_using="gin",
        ),
        {"comment": "Time-series event log for backtest execution tracking"},
    )
