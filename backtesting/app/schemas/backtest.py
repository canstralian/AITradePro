"""
Production-grade Pydantic schemas with timezone-aware validation.

All datetime fields are validated to be UTC-aware, ensuring consistency
across the entire application.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.models.backtest import ArtifactKind, RunMode


# ============================================================================
# Timezone Validation Utilities
# ============================================================================


def ensure_utc_aware(dt: datetime) -> datetime:
    """
    Ensure datetime is timezone-aware and normalized to UTC.

    Args:
        dt: Input datetime (naive or aware)

    Returns:
        UTC-aware datetime

    Raises:
        ValueError: If datetime cannot be converted to UTC
    """
    if dt.tzinfo is None:
        # Naive datetime - assume UTC
        return dt.replace(tzinfo=timezone.utc)
    # Convert to UTC if not already
    return dt.astimezone(timezone.utc)


# ============================================================================
# Base Schema with Common Configuration
# ============================================================================


class BaseSchema(BaseModel):
    """Base schema with common Pydantic configuration."""

    model_config = ConfigDict(
        # ORM mode for SQLAlchemy model conversion
        from_attributes=True,
        # Validate on assignment for safety
        validate_assignment=True,
        # Use enums by value for JSON serialization
        use_enum_values=False,
        # Strict validation
        strict=False,
        # Allow arbitrary types (for UUID, Decimal, etc.)
        arbitrary_types_allowed=True,
    )


# ============================================================================
# Dataset Schemas
# ============================================================================


class BacktestDatasetCreate(BaseSchema):
    """Schema for creating a new backtesting dataset."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Human-readable dataset name",
    )

    description: str | None = Field(
        None,
        description="Dataset description and purpose",
    )

    content_hash: str = Field(
        ...,
        min_length=64,
        max_length=64,
        pattern=r"^[a-f0-9]{64}$",
        description="SHA-256 hash of dataset content",
    )

    start_date: datetime = Field(
        ...,
        description="Dataset start date (UTC)",
    )

    end_date: datetime = Field(
        ...,
        description="Dataset end date (UTC)",
    )

    symbols: list[str] = Field(
        ...,
        min_length=1,
        description="List of asset symbols",
    )

    timeframe: str = Field(
        ...,
        min_length=2,
        max_length=20,
        pattern=r"^[0-9]+[mhdwMy]$",
        description="Candle timeframe (e.g., '1m', '5m', '1h', '1d')",
        examples=["1m", "5m", "15m", "1h", "4h", "1d"],
    )

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def validate_timezone_aware(cls, v: datetime) -> datetime:
        """Ensure datetime is UTC-aware."""
        return ensure_utc_aware(v)

    @model_validator(mode="after")
    def validate_date_range(self) -> "BacktestDatasetCreate":
        """Ensure start_date < end_date."""
        if self.start_date >= self.end_date:
            raise ValueError("start_date must be before end_date")
        return self

    @field_validator("symbols", mode="after")
    @classmethod
    def validate_symbols(cls, v: list[str]) -> list[str]:
        """Ensure symbols are uppercase and non-empty."""
        if not v:
            raise ValueError("symbols list cannot be empty")
        return [symbol.upper() for symbol in v]


class BacktestDatasetResponse(BacktestDatasetCreate):
    """Schema for dataset API responses."""

    id: UUID = Field(
        ...,
        description="Dataset unique identifier",
    )

    created_at: datetime = Field(
        ...,
        description="Record creation timestamp (UTC)",
    )

    @field_validator("created_at", mode="before")
    @classmethod
    def validate_created_at(cls, v: datetime) -> datetime:
        """Ensure datetime is UTC-aware."""
        return ensure_utc_aware(v)


# ============================================================================
# Strategy Configuration Schemas
# ============================================================================


class StrategyParamSpec(BaseSchema):
    """
    Strategy parameter specification for dynamic form generation.

    Supports various parameter types with validation rules.
    """

    name: str = Field(
        ...,
        description="Parameter name",
    )

    type: Literal["int", "float", "bool", "str", "choice"] = Field(
        ...,
        description="Parameter data type",
    )

    default: int | float | bool | str | None = Field(
        None,
        description="Default value",
    )

    min: int | float | None = Field(
        None,
        description="Minimum value (for numeric types)",
    )

    max: int | float | None = Field(
        None,
        description="Maximum value (for numeric types)",
    )

    choices: list[str] | None = Field(
        None,
        description="Available choices (for choice type)",
    )

    description: str | None = Field(
        None,
        description="Parameter description",
    )

    @model_validator(mode="after")
    def validate_param_spec(self) -> "StrategyParamSpec":
        """Validate parameter specification consistency."""
        if self.type in ("int", "float"):
            if self.min is not None and self.max is not None:
                if self.min >= self.max:
                    raise ValueError("min must be less than max")
        if self.type == "choice":
            if not self.choices:
                raise ValueError("choices required for choice type")
        return self


class StrategyConfigCreate(BaseSchema):
    """Schema for creating a new strategy configuration."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Strategy name",
    )

    version: str = Field(
        ...,
        min_length=1,
        max_length=50,
        pattern=r"^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$",
        description="Strategy version (semver)",
        examples=["1.0.0", "2.1.0-beta", "0.1.0-alpha"],
    )

    description: str | None = Field(
        None,
        description="Strategy description",
    )

    params: dict[str, Any] = Field(
        default_factory=dict,
        description="Strategy parameters as key-value pairs",
    )


class StrategyConfigResponse(StrategyConfigCreate):
    """Schema for strategy configuration API responses."""

    id: UUID = Field(
        ...,
        description="Strategy unique identifier",
    )

    created_at: datetime = Field(
        ...,
        description="Record creation timestamp (UTC)",
    )

    updated_at: datetime = Field(
        ...,
        description="Record last update timestamp (UTC)",
    )

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def validate_timestamps(cls, v: datetime) -> datetime:
        """Ensure datetime is UTC-aware."""
        return ensure_utc_aware(v)


# ============================================================================
# Backtest Run Schemas
# ============================================================================


class BacktestRunCreate(BaseSchema):
    """Schema for creating a new backtest run."""

    dataset_id: UUID = Field(
        ...,
        description="Reference to dataset",
    )

    strategy_id: UUID = Field(
        ...,
        description="Reference to strategy",
    )

    run_mode: RunMode = Field(
        default=RunMode.BACKTEST,
        description="Execution mode",
    )

    initial_capital: Decimal = Field(
        ...,
        gt=0,
        max_digits=18,
        decimal_places=4,
        description="Starting capital",
    )


class BacktestRunResponse(BacktestRunCreate):
    """Schema for backtest run API responses with results."""

    id: UUID = Field(
        ...,
        description="Run unique identifier",
    )

    final_value: Decimal = Field(
        ...,
        ge=0,
        max_digits=18,
        decimal_places=4,
        description="Final portfolio value",
    )

    total_return: Decimal = Field(
        ...,
        max_digits=10,
        decimal_places=4,
        description="Total return as decimal",
    )

    max_drawdown: Decimal = Field(
        ...,
        max_digits=10,
        decimal_places=4,
        description="Maximum drawdown as decimal",
    )

    sharpe_ratio: Decimal | None = Field(
        None,
        max_digits=10,
        decimal_places=4,
        description="Risk-adjusted return metric",
    )

    total_trades: int = Field(
        ...,
        ge=0,
        description="Total number of trades",
    )

    winning_trades: int = Field(
        ...,
        ge=0,
        description="Number of profitable trades",
    )

    losing_trades: int = Field(
        ...,
        ge=0,
        description="Number of losing trades",
    )

    win_rate: Decimal | None = Field(
        None,
        ge=0,
        le=1,
        max_digits=5,
        decimal_places=4,
        description="Win rate as decimal",
    )

    executed_at: datetime = Field(
        ...,
        description="Run execution timestamp (UTC)",
    )

    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional runtime metadata",
    )

    @field_validator("executed_at", mode="before")
    @classmethod
    def validate_executed_at(cls, v: datetime) -> datetime:
        """Ensure datetime is UTC-aware."""
        return ensure_utc_aware(v)

    @model_validator(mode="after")
    def validate_trade_consistency(self) -> "BacktestRunResponse":
        """Ensure trade counts are consistent."""
        if self.total_trades != self.winning_trades + self.losing_trades:
            raise ValueError(
                "total_trades must equal winning_trades + losing_trades"
            )
        return self


class BacktestRunReport(BaseSchema):
    """
    Comprehensive backtest report for frontend consumption.

    Combines run results with time-series data for visualization.
    """

    run: BacktestRunResponse = Field(
        ...,
        description="Run metadata and results",
    )

    equity_curve: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Time-series equity data",
    )

    trades: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Individual trade records",
    )

    metrics: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional performance metrics",
    )


# ============================================================================
# Artifact Schemas
# ============================================================================


class ArtifactCreate(BaseSchema):
    """Schema for creating a new artifact."""

    run_id: UUID = Field(
        ...,
        description="Reference to parent run",
    )

    kind: ArtifactKind = Field(
        ...,
        description="Artifact type",
    )

    filename: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Original filename",
    )

    storage_path: str = Field(
        ...,
        min_length=1,
        max_length=512,
        description="Storage location",
    )

    mime_type: str = Field(
        ...,
        min_length=1,
        max_length=127,
        pattern=r"^[a-z]+/[a-z0-9\-\+\.]+$",
        description="MIME type",
        examples=["image/png", "application/pdf", "text/csv"],
    )

    size_bytes: int = Field(
        ...,
        ge=0,
        description="File size in bytes",
    )


class ArtifactResponse(ArtifactCreate):
    """Schema for artifact API responses."""

    id: UUID = Field(
        ...,
        description="Artifact unique identifier",
    )

    created_at: datetime = Field(
        ...,
        description="Artifact creation timestamp (UTC)",
    )

    @field_validator("created_at", mode="before")
    @classmethod
    def validate_created_at(cls, v: datetime) -> datetime:
        """Ensure datetime is UTC-aware."""
        return ensure_utc_aware(v)


# ============================================================================
# Event Schemas
# ============================================================================


class BacktestEventCreate(BaseSchema):
    """Schema for creating a new backtest event."""

    run_id: UUID = Field(
        ...,
        description="Reference to parent run",
    )

    event_type: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Event type",
        examples=["trade", "signal", "error", "metric"],
    )

    timestamp: datetime = Field(
        ...,
        description="Event timestamp (UTC)",
    )

    payload: dict[str, Any] = Field(
        default_factory=dict,
        description="Event data",
    )

    @field_validator("timestamp", mode="before")
    @classmethod
    def validate_timestamp(cls, v: datetime) -> datetime:
        """Ensure datetime is UTC-aware."""
        return ensure_utc_aware(v)


class BacktestEventResponse(BacktestEventCreate):
    """Schema for event API responses."""

    id: UUID = Field(
        ...,
        description="Event unique identifier",
    )

    created_at: datetime = Field(
        ...,
        description="Record creation timestamp (UTC)",
    )

    @field_validator("created_at", mode="before")
    @classmethod
    def validate_created_at(cls, v: datetime) -> datetime:
        """Ensure datetime is UTC-aware."""
        return ensure_utc_aware(v)
