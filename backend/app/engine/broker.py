"""Broker implementations for order processing and execution.

Brokers handle order validation, execution via execution models,
and maintain order history. They act as the intermediary between
strategies and the market.
"""

from abc import ABC, abstractmethod
from collections import deque
from typing import Dict, List, Optional

from ..domain.enums import OrderStatus
from ..domain.models import Bar, Fill, Order
from .execution import ExecutionModel


class Broker(ABC):
    """Abstract broker interface."""

    @abstractmethod
    def submit_order(self, order: Order) -> bool:
        """Submit order to broker.

        Args:
            order: Order to submit

        Returns:
            True if accepted, False if rejected
        """
        pass

    @abstractmethod
    def process_bar(self, bar: Bar) -> List[Fill]:
        """Process pending orders against new bar.

        Args:
            bar: Current bar

        Returns:
            List of fills generated
        """
        pass

    @abstractmethod
    def get_order(self, order_id: str) -> Optional[Order]:
        """Get order by ID.

        Args:
            order_id: Order identifier

        Returns:
            Order if found, None otherwise
        """
        pass

    @abstractmethod
    def get_pending_orders(self, symbol: Optional[str] = None) -> List[Order]:
        """Get all pending orders.

        Args:
            symbol: Filter by symbol (optional)

        Returns:
            List of pending orders
        """
        pass

    @abstractmethod
    def cancel_order(self, order_id: str) -> bool:
        """Cancel pending order.

        Args:
            order_id: Order to cancel

        Returns:
            True if cancelled, False if not found or already filled
        """
        pass


class SimulatedBroker(Broker):
    """Simulated broker for backtesting.

    Executes orders using an ExecutionModel with no latency.
    Maintains order history and pending order queue.
    """

    def __init__(self, execution_model: ExecutionModel):
        """Initialize simulated broker.

        Args:
            execution_model: Model for order execution
        """
        self.execution_model = execution_model
        self.orders: Dict[str, Order] = {}
        self.pending_orders: Dict[str, Order] = {}
        self.fills: List[Fill] = []

    def submit_order(self, order: Order) -> bool:
        """Submit order for execution.

        Args:
            order: Order to submit

        Returns:
            True if accepted
        """
        if order.id in self.orders:
            return False  # Duplicate order ID

        # Validate order
        if not self._validate_order(order):
            order.status = OrderStatus.REJECTED
            return False

        self.orders[order.id] = order
        self.pending_orders[order.id] = order
        order.status = OrderStatus.PENDING
        return True

    def process_bar(self, bar: Bar) -> List[Fill]:
        """Process pending orders against bar.

        Args:
            bar: Current bar

        Returns:
            List of fills
        """
        fills = []

        # Get pending orders for this symbol
        symbol_orders = [
            order for order in self.pending_orders.values()
            if order.symbol == bar.symbol
        ]

        for order in symbol_orders:
            fill = self.execution_model.execute(bar, order)
            if fill:
                fills.append(fill)
                self.fills.append(fill)
                order.status = OrderStatus.FILLED
                del self.pending_orders[order.id]

        return fills

    def get_order(self, order_id: str) -> Optional[Order]:
        """Get order by ID.

        Args:
            order_id: Order identifier

        Returns:
            Order or None
        """
        return self.orders.get(order_id)

    def get_pending_orders(self, symbol: Optional[str] = None) -> List[Order]:
        """Get pending orders.

        Args:
            symbol: Filter by symbol

        Returns:
            List of pending orders
        """
        orders = list(self.pending_orders.values())
        if symbol:
            orders = [o for o in orders if o.symbol == symbol]
        return orders

    def cancel_order(self, order_id: str) -> bool:
        """Cancel pending order.

        Args:
            order_id: Order to cancel

        Returns:
            True if cancelled
        """
        if order_id not in self.pending_orders:
            return False

        order = self.pending_orders[order_id]
        order.status = OrderStatus.CANCELLED
        del self.pending_orders[order_id]
        return True

    def get_fills(self) -> List[Fill]:
        """Get all fills executed.

        Returns:
            List of fills
        """
        return self.fills.copy()

    def _validate_order(self, order: Order) -> bool:
        """Validate order parameters.

        Args:
            order: Order to validate

        Returns:
            True if valid
        """
        if order.qty <= 0:
            return False
        if order.type == "limit" and order.limit_price is None:
            return False
        if order.limit_price is not None and order.limit_price <= 0:
            return False
        return True


class PaperBroker(Broker):
    """Paper trading broker with simulated execution.

    Similar to SimulatedBroker but includes realistic delays
    and can connect to live data feeds.
    """

    def __init__(
        self,
        execution_model: ExecutionModel,
        order_delay_bars: int = 1
    ):
        """Initialize paper broker.

        Args:
            execution_model: Execution model
            order_delay_bars: Number of bars delay before execution
        """
        self.execution_model = execution_model
        self.order_delay_bars = order_delay_bars
        self.orders: Dict[str, Order] = {}
        self.pending_orders: Dict[str, tuple[Order, int]] = {}  # (order, bars_remaining)
        self.fills: List[Fill] = []

    def submit_order(self, order: Order) -> bool:
        """Submit order with delay.

        Args:
            order: Order to submit

        Returns:
            True if accepted
        """
        if order.id in self.orders:
            return False

        self.orders[order.id] = order
        self.pending_orders[order.id] = (order, self.order_delay_bars)
        order.status = OrderStatus.PENDING
        return True

    def process_bar(self, bar: Bar) -> List[Fill]:
        """Process orders with delay.

        Args:
            bar: Current bar

        Returns:
            List of fills
        """
        fills = []
        to_remove = []

        for order_id, (order, bars_remaining) in list(self.pending_orders.items()):
            if order.symbol != bar.symbol:
                continue

            # Decrement delay counter
            bars_remaining -= 1
            self.pending_orders[order_id] = (order, bars_remaining)

            # Try to execute if delay expired
            if bars_remaining <= 0:
                fill = self.execution_model.execute(bar, order)
                if fill:
                    fills.append(fill)
                    self.fills.append(fill)
                    order.status = OrderStatus.FILLED
                    to_remove.append(order_id)

        # Remove filled orders
        for order_id in to_remove:
            del self.pending_orders[order_id]

        return fills

    def get_order(self, order_id: str) -> Optional[Order]:
        """Get order by ID."""
        return self.orders.get(order_id)

    def get_pending_orders(self, symbol: Optional[str] = None) -> List[Order]:
        """Get pending orders."""
        orders = [order for order, _ in self.pending_orders.values()]
        if symbol:
            orders = [o for o in orders if o.symbol == symbol]
        return orders

    def cancel_order(self, order_id: str) -> bool:
        """Cancel pending order."""
        if order_id not in self.pending_orders:
            return False

        order, _ = self.pending_orders[order_id]
        order.status = OrderStatus.CANCELLED
        del self.pending_orders[order_id]
        return True

    def get_fills(self) -> List[Fill]:
        """Get all fills."""
        return self.fills.copy()


class OrderQueue:
    """Priority queue for managing multiple pending orders.

    Useful for more complex broker implementations.
    """

    def __init__(self):
        """Initialize order queue."""
        self.orders: deque[Order] = deque()

    def add(self, order: Order) -> None:
        """Add order to queue.

        Args:
            order: Order to add
        """
        self.orders.append(order)

    def remove(self, order_id: str) -> Optional[Order]:
        """Remove and return order by ID.

        Args:
            order_id: Order identifier

        Returns:
            Removed order or None
        """
        for i, order in enumerate(self.orders):
            if order.id == order_id:
                del self.orders[i]
                return order
        return None

    def get_all(self) -> List[Order]:
        """Get all orders in queue.

        Returns:
            List of orders
        """
        return list(self.orders)

    def get_by_symbol(self, symbol: str) -> List[Order]:
        """Get orders for specific symbol.

        Args:
            symbol: Symbol to filter

        Returns:
            List of orders
        """
        return [o for o in self.orders if o.symbol == symbol]

    def clear(self) -> None:
        """Clear all orders."""
        self.orders.clear()

    def __len__(self) -> int:
        """Get queue size."""
        return len(self.orders)
