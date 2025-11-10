"""MCP tool definitions for backtesting operations."""

from mcp.types import Tool

# Define MCP tools
run_backtest_tool = Tool(
    name="run_backtest",
    description="Execute a backtest simulation with specified strategy and parameters",
    inputSchema={
        "type": "object",
        "properties": {
            "strategy_id": {
                "type": "string",
                "description": "Strategy identifier (e.g., 'sma_crossover', 'rsi')",
            },
            "asset_symbol": {
                "type": "string",
                "description": "Asset symbol to backtest (e.g., 'BTC', 'ETH')",
            },
            "start_date": {
                "type": "string",
                "format": "date-time",
                "description": "Backtest start date in ISO 8601 format",
            },
            "end_date": {
                "type": "string",
                "format": "date-time",
                "description": "Backtest end date in ISO 8601 format",
            },
            "initial_capital": {
                "type": "number",
                "minimum": 0,
                "description": "Starting capital for the backtest",
            },
            "parameters": {
                "type": "object",
                "description": "Strategy-specific parameters",
                "additionalProperties": True,
            },
        },
        "required": [
            "strategy_id",
            "asset_symbol",
            "start_date",
            "end_date",
            "initial_capital",
        ],
    },
)

get_backtest_results_tool = Tool(
    name="get_backtest_results",
    description="Retrieve results from a completed backtest",
    inputSchema={
        "type": "object",
        "properties": {
            "backtest_id": {
                "type": "string",
                "description": "Backtest run identifier",
            },
        },
        "required": ["backtest_id"],
    },
)

list_strategies_tool = Tool(
    name="list_strategies",
    description="Get a list of all available trading strategies",
    inputSchema={
        "type": "object",
        "properties": {},
        "required": [],
    },
)

validate_strategy_tool = Tool(
    name="validate_strategy",
    description="Validate a strategy configuration before execution",
    inputSchema={
        "type": "object",
        "properties": {
            "strategy_config": {
                "type": "object",
                "description": "Strategy configuration to validate",
                "properties": {
                    "strategy_id": {"type": "string"},
                    "parameters": {"type": "object"},
                },
                "required": ["strategy_id"],
            },
        },
        "required": ["strategy_config"],
    },
)

get_metrics_tool = Tool(
    name="get_metrics",
    description="Calculate performance metrics for a backtest",
    inputSchema={
        "type": "object",
        "properties": {
            "backtest_id": {
                "type": "string",
                "description": "Backtest run identifier",
            },
            "metrics": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Specific metrics to calculate (empty for all)",
            },
        },
        "required": ["backtest_id"],
    },
)
