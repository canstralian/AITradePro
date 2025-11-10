"""Backtest simulator orchestrating all engine components.

The BacktestRunner is the main entry point for running backtests.
It coordinates the strategy, data feed, broker, portfolio, and recorder.
"""

import logging
from datetime import datetime
from itertools import count
from typing import Any, Dict, Iterable, List, Optional

from ..domain.models import Bar
from .broker import Broker
from .portfolio import PortfolioManager
from .recorder import EventRecorder
from .strategy import BaseStrategy

logger = logging.getLogger(__name__)


class BacktestRunner:
    """Main backtest simulator engine.

    Orchestrates all components and runs the backtest loop.
    Provides a deterministic, reproducible execution environment.
    """

    def __init__(
        self,
        strategy: BaseStrategy,
        broker: Broker,
        data_feed: Iterable[Bar],
        portfolio: Optional[PortfolioManager] = None,
        recorder: Optional[EventRecorder] = None,
        initial_cash: float = 10_000.0
    ):
        """Initialize backtest runner.

        Args:
            strategy: Trading strategy instance
            broker: Broker for order execution
            data_feed: Iterable of Bar objects
            portfolio: Portfolio manager (created if None)
            recorder: Event recorder (created if None)
            initial_cash: Starting cash balance
        """
        self.strategy = strategy
        self.broker = broker
        self.data_feed = data_feed
        self.portfolio_manager = portfolio or PortfolioManager(initial_cash)
        self.recorder = recorder or EventRecorder(record_bars=False)

        # State for strategy
        self.state: Dict[str, Any] = {
            "portfolio": self.portfolio_manager.portfolio,
            "id_gen": self._id_generator(),
            "bar_count": 0,
            "current_prices": {}
        }

        self.universe: List[str] = []
        self.run_id: Optional[str] = None
        self._running = False

    def run(
        self,
        universe: Iterable[str],
        params: Dict[str, Any],
        run_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute backtest.

        Args:
            universe: List of symbols to trade
            params: Strategy parameters
            run_id: Optional run identifier

        Returns:
            Run results dict
        """
        self.universe = list(universe)
        self.run_id = run_id or f"bt_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

        logger.info(f"Starting backtest {self.run_id}")
        logger.info(f"Strategy: {self.strategy.name}, Universe: {self.universe}")

        # Record start
        metadata = {
            "run_id": self.run_id,
            "strategy": self.strategy.name,
            "params": params,
            "universe": self.universe,
            "initial_cash": self.portfolio_manager.get_cash()
        }
        self.recorder.on_start(metadata)

        # Initialize strategy
        try:
            self.strategy.on_start(self.universe, params)
            logger.info("Strategy initialized")
        except Exception as e:
            logger.error(f"Strategy initialization failed: {e}")
            raise

        # Main backtest loop
        self._running = True
        try:
            self._run_loop()
        except Exception as e:
            logger.error(f"Backtest failed: {e}")
            self._running = False
            raise
        finally:
            self._running = False

        # Cleanup and finalize
        return self._finalize()

    def _run_loop(self) -> None:
        """Main backtest event loop."""
        for bar in self.data_feed:
            self.state["bar_count"] += 1
            self.state["current_prices"][bar.symbol] = bar.close

            # Record bar (if enabled)
            self.recorder.on_bar(bar)

            # Process pending orders against new bar
            fills = self.broker.process_bar(bar)

            # Apply fills to portfolio
            for fill in fills:
                self.recorder.on_fill(fill)
                self.portfolio_manager.apply_fill(fill, self.state["current_prices"])
                logger.debug(
                    f"Fill: {fill.side.value} {fill.qty} {fill.symbol} @ {fill.price:.2f}"
                )

            # Generate signals from strategy
            try:
                orders = self.strategy.on_bar(bar, self.state)
            except Exception as e:
                logger.error(f"Strategy on_bar failed at {bar.ts}: {e}")
                raise

            # Submit orders to broker
            for order in orders:
                if self.broker.submit_order(order):
                    self.recorder.on_order(order)
                    logger.debug(
                        f"Order: {order.side.value} {order.qty} {order.symbol} @ "
                        f"{order.limit_price or 'market'}"
                    )
                else:
                    logger.warning(f"Order rejected: {order.id}")

            # Mark portfolio to market
            if self.state["bar_count"] % 100 == 0:  # Record every 100 bars
                self.portfolio_manager.mark_to_market(bar.ts, self.state["current_prices"])

        logger.info(f"Processed {self.state['bar_count']} bars")

    def _finalize(self) -> Dict[str, Any]:
        """Finalize backtest and generate results.

        Returns:
            Results dictionary
        """
        logger.info("Finalizing backtest")

        # Close all open positions
        final_prices = self.state["current_prices"]
        final_ts = datetime.utcnow()
        if self.portfolio_manager.get_all_positions():
            logger.info("Closing remaining positions")
            self.portfolio_manager.close_all_positions(final_ts, final_prices)

        # Final mark to market
        self.portfolio_manager.mark_to_market(final_ts, final_prices)

        # Strategy cleanup
        try:
            self.strategy.on_end(self.state)
        except Exception as e:
            logger.warning(f"Strategy on_end failed: {e}")

        # Record end
        final_state = {
            "equity": self.portfolio_manager.get_equity(),
            "cash": self.portfolio_manager.get_cash(),
            "total_pnl": self.portfolio_manager.get_total_pnl(),
            "trades": len(self.portfolio_manager.get_trades())
        }
        self.recorder.on_end(final_state)

        # Build results
        results = {
            "run_id": self.run_id,
            "status": "completed",
            "metadata": {
                "strategy": self.strategy.name,
                "universe": self.universe,
                "bars_processed": self.state["bar_count"]
            },
            "portfolio": {
                "initial_cash": self.recorder.metadata.get("initial_cash"),
                "final_equity": self.portfolio_manager.get_equity(),
                "final_cash": self.portfolio_manager.get_cash(),
                "total_pnl": self.portfolio_manager.get_total_pnl(),
                "total_return_pct": self._calculate_return_pct()
            },
            "trading": {
                "orders_submitted": len(self.recorder.get_orders()),
                "fills_executed": len(self.recorder.get_fills()),
                "trades_completed": len(self.portfolio_manager.get_trades())
            },
            "equity_curve": [
                {
                    "ts": ep.ts.isoformat(),
                    "equity": ep.equity,
                    "cash": ep.cash,
                    "positions_value": ep.positions_value
                }
                for ep in self.portfolio_manager.get_equity_curve()
            ],
            "trades": [
                {
                    "symbol": t.symbol,
                    "entry_ts": t.entry_ts.isoformat(),
                    "entry_price": t.entry_price,
                    "exit_ts": t.exit_ts.isoformat() if t.exit_ts else None,
                    "exit_price": t.exit_price,
                    "qty": t.entry_qty,
                    "pnl": t.pnl,
                    "return_pct": t.return_pct,
                    "duration": t.duration
                }
                for t in self.portfolio_manager.get_trades()
            ],
            "recorder_summary": self.recorder.get_summary()
        }

        logger.info(
            f"Backtest complete: {results['portfolio']['final_equity']:.2f} "
            f"({results['portfolio']['total_return_pct']:.2f}%)"
        )

        return results

    def _calculate_return_pct(self) -> float:
        """Calculate total return percentage.

        Returns:
            Return percentage
        """
        initial_cash = self.recorder.metadata.get("initial_cash", 0)
        if initial_cash == 0:
            return 0.0
        final_equity = self.portfolio_manager.get_equity()
        return ((final_equity - initial_cash) / initial_cash) * 100

    @staticmethod
    def _id_generator():
        """Generate unique IDs for orders.

        Returns:
            Generator function
        """
        counter = count(1)
        return lambda: f"ord-{next(counter):06d}"

    def is_running(self) -> bool:
        """Check if backtest is currently running.

        Returns:
            True if running
        """
        return self._running

    def stop(self) -> None:
        """Request backtest stop (graceful)."""
        logger.info("Stop requested")
        self._running = False


class BacktestConfig:
    """Configuration for backtest runs.

    Centralizes all configuration in one place.
    """

    def __init__(
        self,
        strategy_name: str,
        strategy_params: Dict[str, Any],
        universe: List[str],
        initial_cash: float = 10_000.0,
        slippage_bps: float = 5.0,
        fee_pct: float = 0.1,
        record_bars: bool = False
    ):
        """Initialize backtest config.

        Args:
            strategy_name: Strategy identifier
            strategy_params: Strategy parameters
            universe: Trading universe
            initial_cash: Starting capital
            slippage_bps: Slippage in basis points
            fee_pct: Fees as percentage
            record_bars: Whether to record all bars
        """
        self.strategy_name = strategy_name
        self.strategy_params = strategy_params
        self.universe = universe
        self.initial_cash = initial_cash
        self.slippage_bps = slippage_bps
        self.fee_pct = fee_pct
        self.record_bars = record_bars

    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dict.

        Returns:
            Config as dictionary
        """
        return {
            "strategy_name": self.strategy_name,
            "strategy_params": self.strategy_params,
            "universe": self.universe,
            "initial_cash": self.initial_cash,
            "slippage_bps": self.slippage_bps,
            "fee_pct": self.fee_pct,
            "record_bars": self.record_bars
        }
