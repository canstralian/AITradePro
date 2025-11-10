"""Application settings and configuration.

Uses pydantic-settings for configuration management.
Loads from environment variables and .env files.
"""

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )

    # Application
    app_name: str = "AITradePro Backtesting Engine"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"

    # API Server
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_reload: bool = True
    api_workers: int = 1

    # Database
    database_url: str = "postgresql://user:password@localhost:5432/aitradepro_backtest"
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5000"]
    cors_credentials: bool = True
    cors_methods: list[str] = ["*"]
    cors_headers: list[str] = ["*"]

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"  # "json" or "text"
    log_file: Optional[str] = None

    # Backtesting
    default_initial_cash: float = 10_000.0
    default_slippage_bps: float = 5.0
    default_fee_pct: float = 0.1
    max_bars_in_memory: int = 1_000_000
    enable_bar_recording: bool = False

    # Data Storage
    data_dir: str = "./data"
    results_dir: str = "./results"
    upload_max_size_mb: int = 100

    # Celery (optional)
    celery_broker_url: Optional[str] = None
    celery_result_backend: Optional[str] = None

    # Security
    api_key_header: str = "X-API-Key"
    allowed_api_keys: list[str] = []

    # Performance
    max_concurrent_runs: int = 5
    backtest_timeout_seconds: int = 3600

    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment.lower() == "production"

    def get_log_config(self) -> dict:
        """Get logging configuration dict."""
        return {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S"
                },
                "json": {
                    "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                    "format": "%(asctime)s %(name)s %(levelname)s %(message)s"
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "level": self.log_level,
                    "formatter": self.log_format,
                    "stream": "ext://sys.stdout"
                },
                "file": {
                    "class": "logging.FileHandler",
                    "level": self.log_level,
                    "formatter": self.log_format,
                    "filename": self.log_file
                } if self.log_file else None
            },
            "root": {
                "level": self.log_level,
                "handlers": ["console"] + (["file"] if self.log_file else [])
            }
        }


# Global settings instance
settings = Settings()
