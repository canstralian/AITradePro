"""Core configuration utilities."""

import os
from pathlib import Path


def get_project_root() -> Path:
    """Get project root directory.

    Returns:
        Path to project root
    """
    return Path(__file__).parent.parent.parent


def ensure_directories() -> None:
    """Ensure required directories exist."""
    root = get_project_root()
    dirs = [
        root / "data",
        root / "results",
        root / "logs"
    ]

    for directory in dirs:
        directory.mkdir(parents=True, exist_ok=True)


def get_data_dir() -> Path:
    """Get data directory path."""
    return get_project_root() / "data"


def get_results_dir() -> Path:
    """Get results directory path."""
    return get_project_root() / "results"


def get_logs_dir() -> Path:
    """Get logs directory path."""
    return get_project_root() / "logs"
