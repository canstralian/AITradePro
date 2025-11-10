"""Logging configuration and utilities.

Provides structured logging with JSON support for production.
"""

import logging
import logging.config
import sys
from typing import Any, Dict


def setup_logging(
    level: str = "INFO",
    log_format: str = "text",
    log_file: str = None
) -> None:
    """Configure application logging.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format: "text" or "json"
        log_file: Optional log file path
    """
    handlers = ["console"]
    handler_config: Dict[str, Any] = {
        "console": {
            "class": "logging.StreamHandler",
            "level": level,
            "formatter": log_format,
            "stream": sys.stdout
        }
    }

    if log_file:
        handlers.append("file")
        handler_config["file"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "level": level,
            "formatter": log_format,
            "filename": log_file,
            "maxBytes": 10_485_760,  # 10MB
            "backupCount": 5
        }

    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "text": {
                "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S"
            },
            "json": {
                "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                "format": "%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d"
            }
        },
        "handlers": handler_config,
        "root": {
            "level": level,
            "handlers": handlers
        },
        "loggers": {
            "uvicorn": {
                "level": "INFO",
                "handlers": handlers,
                "propagate": False
            },
            "sqlalchemy": {
                "level": "WARNING",
                "handlers": handlers,
                "propagate": False
            }
        }
    }

    logging.config.dictConfig(config)


def get_logger(name: str) -> logging.Logger:
    """Get logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Logger instance
    """
    return logging.getLogger(name)


class LoggerAdapter(logging.LoggerAdapter):
    """Custom logger adapter for adding context."""

    def process(self, msg: str, kwargs: dict) -> tuple:
        """Add extra context to log messages.

        Args:
            msg: Log message
            kwargs: Keyword arguments

        Returns:
            Processed message and kwargs
        """
        if self.extra:
            msg = f"[{self.extra}] {msg}"
        return msg, kwargs


def get_context_logger(name: str, context: dict) -> LoggerAdapter:
    """Get logger with context.

    Args:
        name: Logger name
        context: Context dict to include in logs

    Returns:
        Logger adapter with context
    """
    logger = logging.getLogger(name)
    return LoggerAdapter(logger, context)
