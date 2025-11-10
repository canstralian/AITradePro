"""Request and response schemas for MCP tools."""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any, Optional, List


class RunBacktestRequest(BaseModel):
    """Request schema for run_backtest tool."""

    strategy_id: str = Field(..., description="Strategy identifier")
    asset_symbol: str = Field(..., description="Asset symbol (e.g., BTC, ETH)")
    start_date: datetime = Field(..., description="Backtest start date")
    end_date: datetime = Field(..., description="Backtest end date")
    initial_capital: float = Field(..., gt=0, description="Starting capital")
    parameters: Dict[str, Any] = Field(
        default_factory=dict, description="Strategy parameters"
    )


class GetBacktestResultsRequest(BaseModel):
    """Request schema for get_backtest_results tool."""

    backtest_id: str = Field(..., description="Backtest run identifier")


class ValidateStrategyRequest(BaseModel):
    """Request schema for validate_strategy tool."""

    strategy_config: Dict[str, Any] = Field(
        ..., description="Strategy configuration to validate"
    )


class GetMetricsRequest(BaseModel):
    """Request schema for get_metrics tool."""

    backtest_id: str = Field(..., description="Backtest run identifier")
    metrics: List[str] = Field(
        default_factory=list,
        description="Specific metrics to calculate (empty for all)",
    )


class BacktestStatus(BaseModel):
    """Backtest execution status."""

    backtest_id: str
    status: str  # 'pending', 'running', 'completed', 'failed'
    progress: float = 0.0
    message: Optional[str] = None


class BacktestTrade(BaseModel):
    """Individual trade record."""

    entry_date: datetime
    exit_date: Optional[datetime] = None
    direction: str  # 'long' or 'short'
    entry_price: float
    exit_price: Optional[float] = None
    quantity: float
    pnl: float
    pnl_percent: float
    status: str  # 'open' or 'closed'


class BacktestMetrics(BaseModel):
    """Performance metrics for a backtest."""

    final_capital: float
    total_return: float
    sharpe_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    win_rate: Optional[float] = None
    total_trades: int
    winning_trades: int
    losing_trades: int
    avg_win: Optional[float] = None
    avg_loss: Optional[float] = None
    profit_factor: Optional[float] = None


class BacktestResults(BaseModel):
    """Complete backtest results."""

    backtest_id: str
    status: str
    strategy_id: str
    asset_symbol: str
    start_date: datetime
    end_date: datetime
    initial_capital: float
    final_capital: Optional[float] = None
    total_return: Optional[float] = None
    metrics: Optional[BacktestMetrics] = None
    trades: List[BacktestTrade] = Field(default_factory=list)
    equity_curve: List[float] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


class StrategyInfo(BaseModel):
    """Trading strategy information."""

    id: str
    name: str
    description: str
    parameters_schema: Dict[str, Any]
    default_parameters: Optional[Dict[str, Any]] = None


class ValidationResult(BaseModel):
    """Strategy validation result."""

    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
