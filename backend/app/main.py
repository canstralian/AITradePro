"""FastAPI application entry point.

Main application setup with CORS, middleware, and routing.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import ensure_directories
from .core.logging import setup_logging
from .settings import settings

# Setup logging
setup_logging(
    level=settings.log_level,
    log_format=settings.log_format,
    log_file=settings.log_file
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    ensure_directories()
    logger.info("Application directories initialized")

    yield

    # Shutdown
    logger.info("Shutting down application")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Production-grade backtesting and back-trading engine",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production() else None,
    redoc_url="/redoc" if not settings.is_production() else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_credentials,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "operational",
        "environment": settings.environment
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


# Import and include routers (to be implemented)
# from .api.v1 import routes_backtest, routes_strategies, routes_datasets
# app.include_router(routes_backtest.router, prefix="/api/v1", tags=["backtest"])
# app.include_router(routes_strategies.router, prefix="/api/v1", tags=["strategies"])
# app.include_router(routes_datasets.router, prefix="/api/v1", tags=["datasets"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
        log_level=settings.log_level.lower()
    )
