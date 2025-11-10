"""MCP Server implementation for backtesting."""

import json
from typing import Any, Sequence
from mcp.server import Server
from mcp.types import Tool, TextContent, EmbeddedResource

from config.settings import settings
from utils.logger import logger
from .tools import (
    run_backtest_tool,
    get_backtest_results_tool,
    list_strategies_tool,
    validate_strategy_tool,
    get_metrics_tool,
)
from .schemas import (
    RunBacktestRequest,
    GetBacktestResultsRequest,
    ValidateStrategyRequest,
    GetMetricsRequest,
    BacktestStatus,
    StrategyInfo,
    ValidationResult,
)


async def create_backtesting_server() -> Server:
    """Create and configure the MCP backtesting server."""

    server = Server(settings.server_name)

    # Initialize (will be populated with actual implementations)
    # For Phase 1, we'll use mock data
    mock_strategies = [
        StrategyInfo(
            id="sma_crossover",
            name="SMA Crossover",
            description="Simple Moving Average crossover strategy",
            parameters_schema={
                "fast_period": {
                    "type": "integer",
                    "description": "Fast moving average period",
                    "minimum": 1,
                    "maximum": 200,
                    "default": 10,
                },
                "slow_period": {
                    "type": "integer",
                    "description": "Slow moving average period",
                    "minimum": 1,
                    "maximum": 200,
                    "default": 30,
                },
                "position_size": {
                    "type": "number",
                    "description": "Position size as fraction of capital",
                    "minimum": 0,
                    "maximum": 1,
                    "default": 0.95,
                },
            },
            default_parameters={
                "fast_period": 10,
                "slow_period": 30,
                "position_size": 0.95,
            },
        ),
        StrategyInfo(
            id="rsi",
            name="RSI Strategy",
            description="Relative Strength Index overbought/oversold strategy",
            parameters_schema={
                "period": {
                    "type": "integer",
                    "description": "RSI calculation period",
                    "minimum": 2,
                    "maximum": 50,
                    "default": 14,
                },
                "oversold": {
                    "type": "number",
                    "description": "Oversold threshold",
                    "minimum": 0,
                    "maximum": 100,
                    "default": 30,
                },
                "overbought": {
                    "type": "number",
                    "description": "Overbought threshold",
                    "minimum": 0,
                    "maximum": 100,
                    "default": 70,
                },
                "position_size": {
                    "type": "number",
                    "description": "Position size fraction",
                    "minimum": 0,
                    "maximum": 1,
                    "default": 0.95,
                },
            },
            default_parameters={
                "period": 14,
                "oversold": 30,
                "overbought": 70,
                "position_size": 0.95,
            },
        ),
    ]

    # Register MCP tool handlers
    @server.list_tools()
    async def list_tools() -> list[Tool]:
        """List available backtesting tools."""
        logger.info("Listing available tools")
        return [
            run_backtest_tool,
            get_backtest_results_tool,
            list_strategies_tool,
            validate_strategy_tool,
            get_metrics_tool,
        ]

    @server.call_tool()
    async def call_tool(
        name: str, arguments: dict[str, Any]
    ) -> Sequence[TextContent | EmbeddedResource]:
        """Execute a backtesting tool."""
        logger.info("Tool called", tool=name, arguments=arguments)

        try:
            if name == "run_backtest":
                request = RunBacktestRequest(**arguments)

                # Generate mock backtest ID
                import uuid

                backtest_id = f"bt-{uuid.uuid4().hex[:12]}"

                logger.info(
                    "Starting backtest",
                    backtest_id=backtest_id,
                    strategy=request.strategy_id,
                    asset=request.asset_symbol,
                )

                status = BacktestStatus(
                    backtest_id=backtest_id,
                    status="running",
                    progress=0.0,
                    message="Backtest queued successfully",
                )

                return [
                    TextContent(
                        type="text",
                        text=f"Backtest started successfully with ID: {backtest_id}",
                    ),
                    EmbeddedResource(
                        type="resource",
                        resource={
                            "uri": f"backtest://{backtest_id}",
                            "mimeType": "application/json",
                            "text": status.model_dump_json(),
                        },
                    ),
                ]

            elif name == "get_backtest_results":
                request = GetBacktestResultsRequest(**arguments)

                logger.info(
                    "Fetching backtest results", backtest_id=request.backtest_id
                )

                # Mock response - in real implementation, would query database
                mock_result = {
                    "backtest_id": request.backtest_id,
                    "status": "completed",
                    "strategy_id": "sma_crossover",
                    "asset_symbol": "BTC",
                    "initial_capital": 10000,
                    "final_capital": 12450.50,
                    "total_return": 24.51,
                    "metrics": {
                        "sharpe_ratio": 1.85,
                        "max_drawdown": -15.3,
                        "win_rate": 62.5,
                        "total_trades": 48,
                        "winning_trades": 30,
                        "losing_trades": 18,
                        "profit_factor": 2.15,
                    },
                    "trades_count": 48,
                }

                return [
                    TextContent(
                        type="text",
                        text="Backtest results retrieved successfully",
                    ),
                    EmbeddedResource(
                        type="resource",
                        resource={
                            "uri": f"backtest://{request.backtest_id}/results",
                            "mimeType": "application/json",
                            "text": json.dumps(mock_result),
                        },
                    ),
                ]

            elif name == "list_strategies":
                logger.info("Listing available strategies")

                strategies_data = [s.model_dump() for s in mock_strategies]

                return [
                    TextContent(
                        type="text",
                        text=f"Found {len(mock_strategies)} available strategies",
                    ),
                    EmbeddedResource(
                        type="resource",
                        resource={
                            "uri": "strategies://list",
                            "mimeType": "application/json",
                            "text": json.dumps(strategies_data),
                        },
                    ),
                ]

            elif name == "validate_strategy":
                request = ValidateStrategyRequest(**arguments)

                strategy_config = request.strategy_config
                strategy_id = strategy_config.get("strategy_id")
                parameters = strategy_config.get("parameters", {})

                logger.info("Validating strategy", strategy_id=strategy_id)

                # Check if strategy exists
                strategy_exists = any(s.id == strategy_id for s in mock_strategies)

                if not strategy_exists:
                    validation = ValidationResult(
                        valid=False,
                        errors=[f"Unknown strategy: {strategy_id}"],
                    )
                else:
                    # In real implementation, would validate against schema
                    validation = ValidationResult(
                        valid=True,
                        errors=[],
                        warnings=[],
                    )

                return [
                    TextContent(
                        type="text",
                        text="Strategy validation complete",
                    ),
                    EmbeddedResource(
                        type="resource",
                        resource={
                            "uri": "validation://result",
                            "mimeType": "application/json",
                            "text": validation.model_dump_json(),
                        },
                    ),
                ]

            elif name == "get_metrics":
                request = GetMetricsRequest(**arguments)

                logger.info(
                    "Fetching metrics",
                    backtest_id=request.backtest_id,
                    requested_metrics=request.metrics,
                )

                # Mock metrics response
                mock_metrics = {
                    "final_capital": 12450.50,
                    "total_return": 24.51,
                    "sharpe_ratio": 1.85,
                    "max_drawdown": -15.3,
                    "win_rate": 62.5,
                    "total_trades": 48,
                    "winning_trades": 30,
                    "losing_trades": 18,
                    "avg_win": 350.25,
                    "avg_loss": -175.50,
                    "profit_factor": 2.15,
                }

                # Filter metrics if specific ones requested
                if request.metrics:
                    mock_metrics = {
                        k: v for k, v in mock_metrics.items() if k in request.metrics
                    }

                return [
                    TextContent(
                        type="text",
                        text="Metrics calculated successfully",
                    ),
                    EmbeddedResource(
                        type="resource",
                        resource={
                            "uri": f"backtest://{request.backtest_id}/metrics",
                            "mimeType": "application/json",
                            "text": json.dumps(mock_metrics),
                        },
                    ),
                ]

            else:
                return [
                    TextContent(
                        type="text",
                        text=f"Unknown tool: {name}",
                    )
                ]

        except Exception as e:
            logger.error("Tool execution failed", tool=name, error=str(e), exc_info=True)
            return [
                TextContent(
                    type="text",
                    text=f"Error executing tool {name}: {str(e)}",
                )
            ]

    logger.info("MCP backtesting server configured", version=settings.server_version)
    return server
