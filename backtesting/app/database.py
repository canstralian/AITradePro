"""Database connection and session management."""

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings


class Base(DeclarativeBase):
    """Base class for all database models."""

    pass


# Create async engine with PostgreSQL-specific optimizations
engine: AsyncEngine = create_async_engine(
    str(settings.database_url).replace("postgresql://", "postgresql+asyncpg://"),
    echo=settings.database_echo,
    poolclass=NullPool if settings.is_development else None,
    pool_pre_ping=True,
    pool_size=20 if settings.is_production else 5,
    max_overflow=10,
    connect_args={
        "server_settings": {
            "jit": "off",  # Disable JIT for faster simple queries
            "application_name": "aitradepro_backtesting",
        },
    },
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@event.listens_for(engine.sync_engine, "connect")
def set_postgresql_session_config(dbapi_connection: Any, connection_record: Any) -> None:
    """Set PostgreSQL session configuration for optimal performance."""
    cursor = dbapi_connection.cursor()
    # Set timezone to UTC for all connections
    cursor.execute("SET timezone='UTC'")
    # Optimize for OLTP workload
    cursor.execute("SET work_mem='16MB'")
    cursor.close()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for FastAPI to get database session.

    Usage:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_session)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database (create tables if not exist)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()
