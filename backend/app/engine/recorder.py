"""Recording and audit trail for backtest runs.

Captures all events, orders, fills, and equity snapshots
for reproducibility and analysis.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from ..domain.models import Bar, EquityPoint, Fill, Order, Trade


class EventRecorder:
    """Records all events during a backtest run.

    Maintains comprehensive audit trail of bars, orders, fills,
    and equity snapshots for debugging and compliance.
    """

    def __init__(self, record_bars: bool = False):
        """Initialize recorder.

        Args:
            record_bars: Whether to record every bar (can be memory intensive)
        """
        self.record_bars = record_bars
        self.bars: List[Bar] = []
        self.orders: List[Order] = []
        self.fills: List[Fill] = []
        self.equity_points: List[EquityPoint] = []
        self.events: List[Dict[str, Any]] = []
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.metadata: Dict[str, Any] = {}

    def on_start(self, metadata: Dict[str, Any]) -> None:
        """Record backtest start.

        Args:
            metadata: Run metadata (strategy, params, etc.)
        """
        self.start_time = datetime.utcnow()
        self.metadata = metadata.copy()
        self._record_event("backtest_start", metadata)

    def on_bar(self, bar: Bar) -> None:
        """Record bar if enabled.

        Args:
            bar: Bar to record
        """
        if self.record_bars:
            self.bars.append(bar)

    def on_order(self, order: Order) -> None:
        """Record order submission.

        Args:
            order: Order submitted
        """
        self.orders.append(order)
        self._record_event("order_submitted", {
            "order_id": order.id,
            "symbol": order.symbol,
            "side": order.side.value,
            "qty": order.qty,
            "type": order.type,
            "ts": order.ts.isoformat()
        })

    def on_fill(self, fill: Fill) -> None:
        """Record order fill.

        Args:
            fill: Fill executed
        """
        self.fills.append(fill)
        self._record_event("order_filled", {
            "order_id": fill.order_id,
            "symbol": fill.symbol,
            "side": fill.side.value,
            "qty": fill.qty,
            "price": fill.price,
            "fee": fill.fee,
            "ts": fill.ts.isoformat()
        })

    def on_equity_update(self, equity_point: EquityPoint) -> None:
        """Record equity snapshot.

        Args:
            equity_point: Equity snapshot
        """
        self.equity_points.append(equity_point)

    def on_end(self, final_state: Dict[str, Any]) -> None:
        """Record backtest end.

        Args:
            final_state: Final portfolio state
        """
        self.end_time = datetime.utcnow()
        self._record_event("backtest_end", final_state)

    def _record_event(self, event_type: str, data: Dict[str, Any]) -> None:
        """Record generic event.

        Args:
            event_type: Type of event
            data: Event data
        """
        self.events.append({
            "type": event_type,
            "ts": datetime.utcnow().isoformat(),
            "data": data
        })

    def get_summary(self) -> Dict[str, Any]:
        """Get run summary.

        Returns:
            Summary dict with counts and metadata
        """
        duration = None
        if self.start_time and self.end_time:
            duration = (self.end_time - self.start_time).total_seconds()

        return {
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_seconds": duration,
            "bars_processed": len(self.bars) if self.record_bars else "not_recorded",
            "orders_submitted": len(self.orders),
            "fills_executed": len(self.fills),
            "equity_snapshots": len(self.equity_points),
            "events_logged": len(self.events),
            "metadata": self.metadata
        }

    def get_bars(self) -> List[Bar]:
        """Get recorded bars.

        Returns:
            List of bars
        """
        return self.bars.copy()

    def get_orders(self) -> List[Order]:
        """Get all orders.

        Returns:
            List of orders
        """
        return self.orders.copy()

    def get_fills(self) -> List[Fill]:
        """Get all fills.

        Returns:
            List of fills
        """
        return self.fills.copy()

    def get_equity_curve(self) -> List[EquityPoint]:
        """Get equity curve.

        Returns:
            List of equity points
        """
        return self.equity_points.copy()

    def get_events(self) -> List[Dict[str, Any]]:
        """Get all events.

        Returns:
            List of event dicts
        """
        return self.events.copy()

    def export_to_dict(self) -> Dict[str, Any]:
        """Export complete recording to dict.

        Returns:
            Full audit trail as dict
        """
        return {
            "summary": self.get_summary(),
            "orders": [self._order_to_dict(o) for o in self.orders],
            "fills": [self._fill_to_dict(f) for f in self.fills],
            "equity_curve": [self._equity_point_to_dict(e) for e in self.equity_points],
            "events": self.events.copy()
        }

    @staticmethod
    def _order_to_dict(order: Order) -> Dict[str, Any]:
        """Convert order to dict."""
        return {
            "id": order.id,
            "ts": order.ts.isoformat(),
            "symbol": order.symbol,
            "side": order.side.value,
            "qty": order.qty,
            "type": order.type,
            "limit_price": order.limit_price,
            "status": order.status.value
        }

    @staticmethod
    def _fill_to_dict(fill: Fill) -> Dict[str, Any]:
        """Convert fill to dict."""
        return {
            "order_id": fill.order_id,
            "ts": fill.ts.isoformat(),
            "symbol": fill.symbol,
            "side": fill.side.value,
            "qty": fill.qty,
            "price": fill.price,
            "fee": fill.fee,
            "notional": fill.notional,
            "net_cash_flow": fill.net_cash_flow
        }

    @staticmethod
    def _equity_point_to_dict(point: EquityPoint) -> Dict[str, Any]:
        """Convert equity point to dict."""
        return {
            "ts": point.ts.isoformat(),
            "equity": point.equity,
            "cash": point.cash,
            "positions_value": point.positions_value
        }


class StreamingRecorder(EventRecorder):
    """Recorder that streams events to external storage.

    Useful for long-running backtests or live trading
    where keeping everything in memory is impractical.
    """

    def __init__(self, storage_backend, record_bars: bool = False):
        """Initialize streaming recorder.

        Args:
            storage_backend: Backend with write() method
            record_bars: Whether to record bars
        """
        super().__init__(record_bars)
        self.storage = storage_backend

    def on_order(self, order: Order) -> None:
        """Record and stream order."""
        super().on_order(order)
        self.storage.write("orders", self._order_to_dict(order))

    def on_fill(self, fill: Fill) -> None:
        """Record and stream fill."""
        super().on_fill(fill)
        self.storage.write("fills", self._fill_to_dict(fill))

    def on_equity_update(self, equity_point: EquityPoint) -> None:
        """Record and stream equity point."""
        super().on_equity_update(equity_point)
        self.storage.write("equity", self._equity_point_to_dict(equity_point))


class MinimalRecorder:
    """Lightweight recorder that only tracks essential data.

    Useful when memory is constrained or only final results matter.
    """

    def __init__(self):
        """Initialize minimal recorder."""
        self.fills_count = 0
        self.orders_count = 0
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None

    def on_start(self, metadata: Dict[str, Any]) -> None:
        """Record start time."""
        self.start_time = datetime.utcnow()

    def on_order(self, order: Order) -> None:
        """Count order."""
        self.orders_count += 1

    def on_fill(self, fill: Fill) -> None:
        """Count fill."""
        self.fills_count += 1

    def on_end(self, final_state: Dict[str, Any]) -> None:
        """Record end time."""
        self.end_time = datetime.utcnow()

    def get_summary(self) -> Dict[str, Any]:
        """Get minimal summary."""
        duration = None
        if self.start_time and self.end_time:
            duration = (self.end_time - self.start_time).total_seconds()

        return {
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_seconds": duration,
            "orders_submitted": self.orders_count,
            "fills_executed": self.fills_count
        }
