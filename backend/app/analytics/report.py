"""Report generation for backtest results.

Combines metrics, trades, and equity curves into comprehensive reports.
"""

from typing import Any, Dict, List

from ..domain.models import EquityPoint, Trade
from .metrics import PerformanceMetrics


def build_report(
    run_id: str,
    strategy_name: str,
    params: Dict[str, Any],
    equity_curve: List[EquityPoint],
    trades: List[Trade],
    initial_capital: float,
    dataset_info: Dict[str, Any],
    risk_free_rate: float = 0.02
) -> Dict[str, Any]:
    """Build comprehensive backtest report.

    Args:
        run_id: Run identifier
        strategy_name: Strategy name
        params: Strategy parameters
        equity_curve: Equity curve
        trades: List of trades
        initial_capital: Starting capital
        dataset_info: Dataset metadata
        risk_free_rate: Risk-free rate for Sharpe

    Returns:
        Complete report dict
    """
    # Calculate metrics
    equity_metrics = PerformanceMetrics.calculate_equity_metrics(
        equity_curve,
        initial_capital,
        risk_free_rate
    )

    trade_metrics = PerformanceMetrics.calculate_trade_metrics(trades)

    drawdown_curve = PerformanceMetrics.calculate_drawdown_curve(equity_curve)

    # Format equity curve
    equity_curve_data = [
        {
            "ts": ep.ts.isoformat(),
            "equity": ep.equity,
            "cash": ep.cash,
            "positions_value": ep.positions_value
        }
        for ep in equity_curve
    ]

    # Format trades
    trades_data = [
        {
            "symbol": t.symbol,
            "side": t.side.value if t.side else None,
            "entry_ts": t.entry_ts.isoformat(),
            "entry_price": t.entry_price,
            "entry_qty": t.entry_qty,
            "exit_ts": t.exit_ts.isoformat() if t.exit_ts else None,
            "exit_price": t.exit_price,
            "exit_qty": t.exit_qty,
            "pnl": t.pnl,
            "return_pct": t.return_pct,
            "fees": t.fees,
            "duration_seconds": t.duration
        }
        for t in trades
    ]

    # Combine into report
    report = {
        "run_id": run_id,
        "strategy": strategy_name,
        "params": params,
        "dataset": dataset_info,
        "summary": {
            "initial_capital": initial_capital,
            "final_equity": equity_curve[-1].equity if equity_curve else initial_capital,
            **equity_metrics,
            **trade_metrics
        },
        "equity_curve": equity_curve_data,
        "drawdown_curve": drawdown_curve,
        "trades": trades_data
    }

    return report


def generate_summary_text(report: Dict[str, Any]) -> str:
    """Generate human-readable summary from report.

    Args:
        report: Report dict

    Returns:
        Formatted summary text
    """
    summary = report["summary"]

    text = f"""
Backtest Report: {report['run_id']}
{'=' * 60}

Strategy: {report['strategy']}
Parameters: {report['params']}

Performance Summary
-------------------
Initial Capital:        ${summary['initial_capital']:,.2f}
Final Equity:           ${summary['final_equity']:,.2f}
Total Return:           {summary['total_return_pct']:.2f}%
Annualized Return:      {summary['annualized_return_pct']:.2f}%

Risk Metrics
------------
Annualized Volatility:  {summary['annualized_volatility']:.2f}%
Sharpe Ratio:           {summary['sharpe_ratio']:.2f}
Sortino Ratio:          {summary['sortino_ratio']:.2f}
Calmar Ratio:           {summary['calmar_ratio']:.2f}
Max Drawdown:           {summary['max_drawdown_pct']:.2f}%
Max DD Duration:        {summary['max_drawdown_duration_days']} days

Trading Statistics
------------------
Total Trades:           {summary['total_trades']}
Winning Trades:         {summary['winning_trades']}
Losing Trades:          {summary['losing_trades']}
Win Rate:               {summary['win_rate_pct']:.2f}%
Avg Win:                ${summary['avg_win']:.2f}
Avg Loss:               ${summary['avg_loss']:.2f}
Profit Factor:          {summary['profit_factor']:.2f}
Avg Trade P&L:          ${summary['avg_trade_pnl']:.2f}

Period: {summary['start_date']} to {summary['end_date']}
Duration: {summary['days']} days ({summary['years']:.2f} years)
"""
    return text


def compare_strategies(reports: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compare multiple strategy reports.

    Args:
        reports: List of strategy reports

    Returns:
        Comparison dict
    """
    if not reports:
        return {}

    comparison = {
        "strategies": [],
        "metrics_comparison": {}
    }

    # Extract key metrics for each strategy
    for report in reports:
        summary = report["summary"]
        comparison["strategies"].append({
            "strategy": report["strategy"],
            "params": report["params"],
            "total_return_pct": summary["total_return_pct"],
            "sharpe_ratio": summary["sharpe_ratio"],
            "max_drawdown_pct": summary["max_drawdown_pct"],
            "win_rate_pct": summary["win_rate_pct"],
            "total_trades": summary["total_trades"]
        })

    # Find best/worst
    comparison["best_return"] = max(
        comparison["strategies"],
        key=lambda x: x["total_return_pct"]
    )["strategy"]

    comparison["best_sharpe"] = max(
        comparison["strategies"],
        key=lambda x: x["sharpe_ratio"]
    )["strategy"]

    comparison["lowest_drawdown"] = max(
        comparison["strategies"],
        key=lambda x: -x["max_drawdown_pct"]
    )["strategy"]

    return comparison
