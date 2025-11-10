"""Performance metrics calculation for backtests.

Calculates standard risk/return metrics including:
- Returns (total, annualized, cumulative)
- Risk metrics (volatility, Sharpe, Sortino, Calmar)
- Drawdown analysis
- Trade statistics
"""

import math
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from ..domain.models import EquityPoint, Trade


class PerformanceMetrics:
    """Calculate comprehensive performance metrics from backtest results."""

    @staticmethod
    def calculate_equity_metrics(
        equity_curve: List[EquityPoint],
        initial_capital: float,
        risk_free_rate: float = 0.02
    ) -> Dict[str, float]:
        """Calculate metrics from equity curve.

        Args:
            equity_curve: List of equity points
            initial_capital: Starting capital
            risk_free_rate: Annual risk-free rate for Sharpe calculation

        Returns:
            Dict of metrics
        """
        if not equity_curve or len(equity_curve) < 2:
            return PerformanceMetrics._empty_metrics()

        # Extract equity values
        equity_values = [ep.equity for ep in equity_curve]
        timestamps = [ep.ts for ep in equity_curve]

        # Calculate returns
        returns = PerformanceMetrics._calculate_returns(equity_values)

        # Time period
        start_date = timestamps[0]
        end_date = timestamps[-1]
        days = (end_date - start_date).days
        years = days / 365.25

        # Total return
        total_return = (equity_values[-1] - initial_capital) / initial_capital

        # Annualized return
        if years > 0:
            annualized_return = (1 + total_return) ** (1 / years) - 1
        else:
            annualized_return = 0.0

        # Volatility (annualized)
        if len(returns) > 1:
            returns_std = math.sqrt(sum((r - sum(returns)/len(returns))**2 for r in returns) / len(returns))
            # Annualize assuming daily returns
            annualized_vol = returns_std * math.sqrt(252)
        else:
            annualized_vol = 0.0

        # Sharpe ratio
        if annualized_vol > 0:
            sharpe = (annualized_return - risk_free_rate) / annualized_vol
        else:
            sharpe = 0.0

        # Sortino ratio (downside deviation)
        downside_returns = [r for r in returns if r < 0]
        if downside_returns:
            downside_std = math.sqrt(sum(r**2 for r in downside_returns) / len(downside_returns))
            downside_vol = downside_std * math.sqrt(252)
            sortino = (annualized_return - risk_free_rate) / downside_vol if downside_vol > 0 else 0.0
        else:
            sortino = sharpe  # No downside

        # Drawdown metrics
        max_dd, max_dd_duration = PerformanceMetrics._calculate_drawdown(equity_values, timestamps)

        # Calmar ratio
        calmar = annualized_return / abs(max_dd) if max_dd < 0 else 0.0

        # Win rate (based on daily returns)
        winning_days = sum(1 for r in returns if r > 0)
        win_rate = winning_days / len(returns) if returns else 0.0

        return {
            "total_return": total_return,
            "total_return_pct": total_return * 100,
            "annualized_return": annualized_return,
            "annualized_return_pct": annualized_return * 100,
            "annualized_volatility": annualized_vol,
            "sharpe_ratio": sharpe,
            "sortino_ratio": sortino,
            "calmar_ratio": calmar,
            "max_drawdown": max_dd,
            "max_drawdown_pct": max_dd * 100,
            "max_drawdown_duration_days": max_dd_duration,
            "win_rate": win_rate,
            "win_rate_pct": win_rate * 100,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": days,
            "years": years
        }

    @staticmethod
    def calculate_trade_metrics(trades: List[Trade]) -> Dict[str, any]:
        """Calculate trade-based metrics.

        Args:
            trades: List of completed trades

        Returns:
            Dict of trade metrics
        """
        if not trades:
            return {
                "total_trades": 0,
                "winning_trades": 0,
                "losing_trades": 0,
                "win_rate": 0.0,
                "win_rate_pct": 0.0,
                "avg_win": 0.0,
                "avg_loss": 0.0,
                "largest_win": 0.0,
                "largest_loss": 0.0,
                "profit_factor": 0.0,
                "avg_trade_pnl": 0.0,
                "avg_trade_duration_hours": 0.0,
                "total_pnl": 0.0
            }

        winning_trades = [t for t in trades if t.pnl > 0]
        losing_trades = [t for t in trades if t.pnl < 0]
        breakeven_trades = [t for t in trades if t.pnl == 0]

        # Basic counts
        total_trades = len(trades)
        num_wins = len(winning_trades)
        num_losses = len(losing_trades)

        # Win rate
        win_rate = num_wins / total_trades if total_trades > 0 else 0.0

        # P&L stats
        total_pnl = sum(t.pnl for t in trades)
        avg_trade_pnl = total_pnl / total_trades if total_trades > 0 else 0.0

        # Win/loss stats
        if winning_trades:
            avg_win = sum(t.pnl for t in winning_trades) / len(winning_trades)
            largest_win = max(t.pnl for t in winning_trades)
        else:
            avg_win = 0.0
            largest_win = 0.0

        if losing_trades:
            avg_loss = sum(t.pnl for t in losing_trades) / len(losing_trades)
            largest_loss = min(t.pnl for t in losing_trades)
        else:
            avg_loss = 0.0
            largest_loss = 0.0

        # Profit factor
        gross_profit = sum(t.pnl for t in winning_trades)
        gross_loss = abs(sum(t.pnl for t in losing_trades))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0.0

        # Duration stats
        durations = [t.duration for t in trades if t.duration is not None]
        avg_duration_seconds = sum(durations) / len(durations) if durations else 0.0
        avg_duration_hours = avg_duration_seconds / 3600.0

        return {
            "total_trades": total_trades,
            "winning_trades": num_wins,
            "losing_trades": num_losses,
            "breakeven_trades": len(breakeven_trades),
            "win_rate": win_rate,
            "win_rate_pct": win_rate * 100,
            "avg_win": avg_win,
            "avg_loss": avg_loss,
            "largest_win": largest_win,
            "largest_loss": largest_loss,
            "profit_factor": profit_factor,
            "avg_trade_pnl": avg_trade_pnl,
            "avg_trade_duration_hours": avg_duration_hours,
            "total_pnl": total_pnl,
            "gross_profit": gross_profit,
            "gross_loss": gross_loss
        }

    @staticmethod
    def _calculate_returns(equity_values: List[float]) -> List[float]:
        """Calculate period-over-period returns.

        Args:
            equity_values: List of equity values

        Returns:
            List of returns
        """
        if len(equity_values) < 2:
            return []

        returns = []
        for i in range(1, len(equity_values)):
            if equity_values[i-1] != 0:
                ret = (equity_values[i] - equity_values[i-1]) / equity_values[i-1]
                returns.append(ret)
        return returns

    @staticmethod
    def _calculate_drawdown(
        equity_values: List[float],
        timestamps: List[datetime]
    ) -> Tuple[float, int]:
        """Calculate maximum drawdown and duration.

        Args:
            equity_values: Equity curve
            timestamps: Timestamps

        Returns:
            Tuple of (max_drawdown, max_duration_days)
        """
        if not equity_values:
            return 0.0, 0

        max_equity = equity_values[0]
        max_dd = 0.0
        max_dd_duration = 0
        current_dd_start = None

        for i, equity in enumerate(equity_values):
            if equity > max_equity:
                max_equity = equity
                current_dd_start = None
            else:
                # In drawdown
                dd = (equity - max_equity) / max_equity
                if dd < max_dd:
                    max_dd = dd

                # Track duration
                if current_dd_start is None:
                    current_dd_start = timestamps[i]
                else:
                    duration = (timestamps[i] - current_dd_start).days
                    if duration > max_dd_duration:
                        max_dd_duration = duration

        return max_dd, max_dd_duration

    @staticmethod
    def calculate_drawdown_curve(equity_curve: List[EquityPoint]) -> List[Dict[str, any]]:
        """Calculate full drawdown curve.

        Args:
            equity_curve: Equity curve

        Returns:
            List of drawdown points
        """
        if not equity_curve:
            return []

        equity_values = [ep.equity for ep in equity_curve]
        timestamps = [ep.ts for ep in equity_curve]

        max_equity = equity_values[0]
        drawdowns = []

        for i, (equity, ts) in enumerate(zip(equity_values, timestamps)):
            if equity > max_equity:
                max_equity = equity

            dd = (equity - max_equity) / max_equity if max_equity > 0 else 0.0
            drawdowns.append({
                "ts": ts.isoformat(),
                "drawdown": dd,
                "drawdown_pct": dd * 100
            })

        return drawdowns

    @staticmethod
    def _empty_metrics() -> Dict[str, float]:
        """Return empty metrics dict."""
        return {
            "total_return": 0.0,
            "total_return_pct": 0.0,
            "annualized_return": 0.0,
            "annualized_return_pct": 0.0,
            "annualized_volatility": 0.0,
            "sharpe_ratio": 0.0,
            "sortino_ratio": 0.0,
            "calmar_ratio": 0.0,
            "max_drawdown": 0.0,
            "max_drawdown_pct": 0.0,
            "max_drawdown_duration_days": 0,
            "win_rate": 0.0,
            "win_rate_pct": 0.0
        }
