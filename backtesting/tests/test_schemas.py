"""Tests for Pydantic validation schemas."""

from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models.backtest import ArtifactKind, RunMode
from app.schemas.backtest import (
    ArtifactCreate,
    BacktestDatasetCreate,
    BacktestEventCreate,
    BacktestRunCreate,
    BacktestRunResponse,
    StrategyConfigCreate,
    StrategyParamSpec,
)


class TestBacktestDatasetCreate:
    """Tests for BacktestDatasetCreate schema."""

    def test_valid_dataset(self) -> None:
        """Test creating valid dataset schema."""
        data = {
            "name": "Test Dataset",
            "content_hash": "a" * 64,
            "start_date": datetime(2023, 1, 1, tzinfo=timezone.utc),
            "end_date": datetime(2023, 12, 31, tzinfo=timezone.utc),
            "symbols": ["BTC", "ETH"],
            "timeframe": "1h",
        }
        schema = BacktestDatasetCreate(**data)
        assert schema.name == "Test Dataset"
        assert len(schema.symbols) == 2

    def test_timezone_aware_conversion(self) -> None:
        """Test that naive datetimes are converted to UTC."""
        data = {
            "name": "Test",
            "content_hash": "a" * 64,
            "start_date": datetime(2023, 1, 1),  # Naive
            "end_date": datetime(2023, 12, 31),  # Naive
            "symbols": ["BTC"],
            "timeframe": "1h",
        }
        schema = BacktestDatasetCreate(**data)
        assert schema.start_date.tzinfo is not None
        assert schema.end_date.tzinfo is not None

    def test_invalid_date_range(self) -> None:
        """Test that end_date must be after start_date."""
        data = {
            "name": "Test",
            "content_hash": "a" * 64,
            "start_date": datetime(2023, 12, 31, tzinfo=timezone.utc),
            "end_date": datetime(2023, 1, 1, tzinfo=timezone.utc),
            "symbols": ["BTC"],
            "timeframe": "1h",
        }
        with pytest.raises(ValidationError) as exc_info:
            BacktestDatasetCreate(**data)
        assert "start_date must be before end_date" in str(exc_info.value)

    def test_invalid_content_hash(self) -> None:
        """Test that content_hash must be valid SHA-256."""
        data = {
            "name": "Test",
            "content_hash": "invalid",
            "start_date": datetime(2023, 1, 1, tzinfo=timezone.utc),
            "end_date": datetime(2023, 12, 31, tzinfo=timezone.utc),
            "symbols": ["BTC"],
            "timeframe": "1h",
        }
        with pytest.raises(ValidationError):
            BacktestDatasetCreate(**data)

    def test_symbols_uppercase_conversion(self) -> None:
        """Test that symbols are converted to uppercase."""
        data = {
            "name": "Test",
            "content_hash": "a" * 64,
            "start_date": datetime(2023, 1, 1, tzinfo=timezone.utc),
            "end_date": datetime(2023, 12, 31, tzinfo=timezone.utc),
            "symbols": ["btc", "eth"],
            "timeframe": "1h",
        }
        schema = BacktestDatasetCreate(**data)
        assert schema.symbols == ["BTC", "ETH"]


class TestStrategyConfigCreate:
    """Tests for StrategyConfigCreate schema."""

    def test_valid_strategy(self) -> None:
        """Test creating valid strategy schema."""
        data = {
            "name": "MA Crossover",
            "version": "1.0.0",
            "params": {"fast": 10, "slow": 50},
        }
        schema = StrategyConfigCreate(**data)
        assert schema.name == "MA Crossover"
        assert schema.version == "1.0.0"

    def test_invalid_version_format(self) -> None:
        """Test that version must follow semver."""
        data = {
            "name": "Test",
            "version": "invalid",
            "params": {},
        }
        with pytest.raises(ValidationError):
            StrategyConfigCreate(**data)

    def test_valid_semver_formats(self) -> None:
        """Test various valid semver formats."""
        versions = ["1.0.0", "2.1.3", "0.0.1", "1.0.0-alpha", "2.0.0-beta.1"]
        for version in versions:
            data = {"name": "Test", "version": version, "params": {}}
            schema = StrategyConfigCreate(**data)
            assert schema.version == version


class TestStrategyParamSpec:
    """Tests for StrategyParamSpec schema."""

    def test_valid_numeric_param(self) -> None:
        """Test creating valid numeric parameter spec."""
        spec = StrategyParamSpec(
            name="period",
            type="int",
            default=20,
            min=5,
            max=200,
            description="Moving average period",
        )
        assert spec.name == "period"
        assert spec.type == "int"

    def test_invalid_min_max(self) -> None:
        """Test that min must be less than max."""
        with pytest.raises(ValidationError) as exc_info:
            StrategyParamSpec(
                name="period",
                type="int",
                min=200,
                max=5,
            )
        assert "min must be less than max" in str(exc_info.value)

    def test_choice_param_requires_choices(self) -> None:
        """Test that choice type requires choices list."""
        with pytest.raises(ValidationError) as exc_info:
            StrategyParamSpec(
                name="direction",
                type="choice",
            )
        assert "choices required" in str(exc_info.value)


class TestBacktestRunResponse:
    """Tests for BacktestRunResponse schema."""

    def test_valid_run_response(self) -> None:
        """Test creating valid run response."""
        data = {
            "id": uuid4(),
            "dataset_id": uuid4(),
            "strategy_id": uuid4(),
            "run_mode": RunMode.BACKTEST,
            "initial_capital": Decimal("10000.0000"),
            "final_value": Decimal("12000.0000"),
            "total_return": Decimal("0.2000"),
            "max_drawdown": Decimal("-0.1500"),
            "sharpe_ratio": Decimal("1.5000"),
            "total_trades": 100,
            "winning_trades": 60,
            "losing_trades": 40,
            "win_rate": Decimal("0.6000"),
            "executed_at": datetime.now(timezone.utc),
            "metadata": {},
        }
        schema = BacktestRunResponse(**data)
        assert schema.total_trades == 100
        assert schema.win_rate == Decimal("0.6000")

    def test_trade_consistency_validation(self) -> None:
        """Test that trade counts must be consistent."""
        data = {
            "id": uuid4(),
            "dataset_id": uuid4(),
            "strategy_id": uuid4(),
            "run_mode": RunMode.BACKTEST,
            "initial_capital": Decimal("10000.0000"),
            "final_value": Decimal("12000.0000"),
            "total_return": Decimal("0.2000"),
            "max_drawdown": Decimal("-0.1500"),
            "total_trades": 100,
            "winning_trades": 60,
            "losing_trades": 50,  # Should be 40!
            "executed_at": datetime.now(timezone.utc),
        }
        with pytest.raises(ValidationError) as exc_info:
            BacktestRunResponse(**data)
        assert "total_trades must equal" in str(exc_info.value)


class TestArtifactCreate:
    """Tests for ArtifactCreate schema."""

    def test_valid_artifact(self) -> None:
        """Test creating valid artifact schema."""
        data = {
            "run_id": uuid4(),
            "kind": ArtifactKind.PLOT,
            "filename": "equity_curve.png",
            "storage_path": "s3://bucket/path/file.png",
            "mime_type": "image/png",
            "size_bytes": 12345,
        }
        schema = ArtifactCreate(**data)
        assert schema.kind == ArtifactKind.PLOT
        assert schema.size_bytes == 12345

    def test_invalid_mime_type(self) -> None:
        """Test that mime_type must match pattern."""
        data = {
            "run_id": uuid4(),
            "kind": ArtifactKind.PLOT,
            "filename": "test.png",
            "storage_path": "path",
            "mime_type": "invalid",
            "size_bytes": 100,
        }
        with pytest.raises(ValidationError):
            ArtifactCreate(**data)


class TestBacktestEventCreate:
    """Tests for BacktestEventCreate schema."""

    def test_valid_event(self) -> None:
        """Test creating valid event schema."""
        data = {
            "run_id": uuid4(),
            "event_type": "trade",
            "timestamp": datetime(2023, 6, 15, tzinfo=timezone.utc),
            "payload": {"symbol": "BTC", "side": "buy"},
        }
        schema = BacktestEventCreate(**data)
        assert schema.event_type == "trade"
        assert schema.payload["symbol"] == "BTC"

    def test_timezone_conversion(self) -> None:
        """Test that naive timestamps are converted to UTC."""
        data = {
            "run_id": uuid4(),
            "event_type": "trade",
            "timestamp": datetime(2023, 6, 15),  # Naive
            "payload": {},
        }
        schema = BacktestEventCreate(**data)
        assert schema.timestamp.tzinfo is not None
