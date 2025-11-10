"""Application settings and configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql://localhost:5432/trading_db"
    db_pool_size: int = 5
    db_max_overflow: int = 10

    # Backtesting limits
    max_backtest_duration_days: int = 1825  # 5 years max
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
