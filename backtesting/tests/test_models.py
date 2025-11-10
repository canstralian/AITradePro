"""Tests for SQLAlchemy database models."""

from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.backtest import (
    Artifact,
    ArtifactKind,
    BacktestDataset,
    BacktestEvent,
    BacktestRun,
    RunMode,
    StrategyConfig,
)


class TestBacktestDataset:
    """Tests for BacktestDataset model."""

    @pytest.mark.asyncio
    async def test_create_dataset(
        self,
        db_session: AsyncSession,
        sample_dataset_data: dict,
    ) -> None:
        """Test creating a dataset."""
        dataset = BacktestDataset(**sample_dataset_data)
        db_session.add(dataset)
        await db_session.commit()
        await db_session.refresh(dataset)

        assert dataset.id is not None
        assert dataset.name == sample_dataset_data["name"]
        assert dataset.content_hash == sample_dataset_data["content_hash"]
        assert dataset.created_at is not None

    @pytest.mark.asyncio
    async def test_unique_content_hash(
        self,
        db_session: AsyncSession,
        sample_dataset_data: dict,
    ) -> None:
        """Test that content_hash is unique."""
        dataset1 = BacktestDataset(**sample_dataset_data)
        db_session.add(dataset1)
        await db_session.commit()

        # Try to create another with same hash
        sample_dataset_data["name"] = "Different Name"
        dataset2 = BacktestDataset(**sample_dataset_data)
        db_session.add(dataset2)

        with pytest.raises(Exception):  # IntegrityError
            await db_session.commit()


class TestStrategyConfig:
    """Tests for StrategyConfig model."""

    @pytest.mark.asyncio
    async def test_create_strategy(
        self,
        db_session: AsyncSession,
        sample_strategy_data: dict,
    ) -> None:
        """Test creating a strategy configuration."""
        strategy = StrategyConfig(**sample_strategy_data)
        db_session.add(strategy)
        await db_session.commit()
        await db_session.refresh(strategy)

        assert strategy.id is not None
        assert strategy.name == sample_strategy_data["name"]
        assert strategy.version == sample_strategy_data["version"]
        assert strategy.params == sample_strategy_data["params"]

    @pytest.mark.asyncio
    async def test_unique_name_version(
        self,
        db_session: AsyncSession,
        sample_strategy_data: dict,
    ) -> None:
        """Test that name+version combination is unique."""
        strategy1 = StrategyConfig(**sample_strategy_data)
        db_session.add(strategy1)
        await db_session.commit()

        # Try to create another with same name+version
        strategy2 = StrategyConfig(**sample_strategy_data)
        db_session.add(strategy2)

        with pytest.raises(Exception):  # IntegrityError
            await db_session.commit()


class TestBacktestRun:
    """Tests for BacktestRun model."""

    @pytest.mark.asyncio
    async def test_create_run(
        self,
        db_session: AsyncSession,
        sample_dataset_data: dict,
        sample_strategy_data: dict,
        sample_run_data: dict,
    ) -> None:
        """Test creating a backtest run."""
        # Create dependencies
        dataset = BacktestDataset(**sample_dataset_data)
        strategy = StrategyConfig(**sample_strategy_data)
        db_session.add(dataset)
        db_session.add(strategy)
        await db_session.commit()

        # Create run
        run = BacktestRun(
            dataset_id=dataset.id,
            strategy_id=strategy.id,
            **sample_run_data,
        )
        db_session.add(run)
        await db_session.commit()
        await db_session.refresh(run)

        assert run.id is not None
        assert run.dataset_id == dataset.id
        assert run.strategy_id == strategy.id
        assert run.initial_capital == sample_run_data["initial_capital"]
        assert run.total_trades == sample_run_data["total_trades"]

    @pytest.mark.asyncio
    async def test_run_with_relationships(
        self,
        db_session: AsyncSession,
        sample_dataset_data: dict,
        sample_strategy_data: dict,
        sample_run_data: dict,
    ) -> None:
        """Test backtest run with relationships loaded."""
        # Create dependencies
        dataset = BacktestDataset(**sample_dataset_data)
        strategy = StrategyConfig(**sample_strategy_data)
        db_session.add(dataset)
        db_session.add(strategy)
        await db_session.commit()

        # Create run
        run = BacktestRun(
            dataset_id=dataset.id,
            strategy_id=strategy.id,
            **sample_run_data,
        )
        db_session.add(run)
        await db_session.commit()

        # Load with relationships
        result = await db_session.execute(
            select(BacktestRun)
            .where(BacktestRun.id == run.id)
        )
        loaded_run = result.scalar_one()

        # Access relationships
        await db_session.refresh(loaded_run, ["dataset", "strategy"])
        assert loaded_run.dataset.name == sample_dataset_data["name"]
        assert loaded_run.strategy.name == sample_strategy_data["name"]


class TestArtifact:
    """Tests for Artifact model."""

    @pytest.mark.asyncio
    async def test_create_artifact(
        self,
        db_session: AsyncSession,
        sample_dataset_data: dict,
        sample_strategy_data: dict,
        sample_run_data: dict,
    ) -> None:
        """Test creating an artifact."""
        # Create dependencies
        dataset = BacktestDataset(**sample_dataset_data)
        strategy = StrategyConfig(**sample_strategy_data)
        db_session.add(dataset)
        db_session.add(strategy)
        await db_session.commit()

        run = BacktestRun(
            dataset_id=dataset.id,
            strategy_id=strategy.id,
            **sample_run_data,
        )
        db_session.add(run)
        await db_session.commit()

        # Create artifact
        artifact = Artifact(
            run_id=run.id,
            kind=ArtifactKind.PLOT,
            filename="equity_curve.png",
            storage_path="s3://bucket/runs/uuid/equity_curve.png",
            mime_type="image/png",
            size_bytes=12345,
        )
        db_session.add(artifact)
        await db_session.commit()
        await db_session.refresh(artifact)

        assert artifact.id is not None
        assert artifact.run_id == run.id
        assert artifact.kind == ArtifactKind.PLOT


class TestBacktestEvent:
    """Tests for BacktestEvent model."""

    @pytest.mark.asyncio
    async def test_create_event(
        self,
        db_session: AsyncSession,
        sample_dataset_data: dict,
        sample_strategy_data: dict,
        sample_run_data: dict,
    ) -> None:
        """Test creating a backtest event."""
        # Create dependencies
        dataset = BacktestDataset(**sample_dataset_data)
        strategy = StrategyConfig(**sample_strategy_data)
        db_session.add(dataset)
        db_session.add(strategy)
        await db_session.commit()

        run = BacktestRun(
            dataset_id=dataset.id,
            strategy_id=strategy.id,
            **sample_run_data,
        )
        db_session.add(run)
        await db_session.commit()

        # Create event
        event = BacktestEvent(
            run_id=run.id,
            event_type="trade",
            timestamp=datetime(2023, 6, 15, 10, 30, 0, tzinfo=timezone.utc),
            payload={
                "symbol": "BTC",
                "side": "buy",
                "quantity": 0.5,
                "price": 30000.00,
            },
        )
        db_session.add(event)
        await db_session.commit()
        await db_session.refresh(event)

        assert event.id is not None
        assert event.run_id == run.id
        assert event.event_type == "trade"
        assert event.payload["symbol"] == "BTC"
