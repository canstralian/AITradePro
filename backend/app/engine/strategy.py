"""Strategy interface and implementations.

All strategies must implement the BaseStrategy protocol.
State is passed explicitly to enable deterministic execution.
"""

from collections import deque
from typing import Any, Dict, Iterable, Protocol

from ..domain.enums import Side
from ..domain.models import Bar, Order, Position


class BaseStrategy(Protocol):
    """Strategy interface that all strategies must implement.

    Attributes:
        name: Unique strategy identifier
    """
    name: str

    def on_start(self, universe: Iterable[str], params: Dict[str, Any]) -> None:
        """Called once before the backtest starts.

        Args:
            universe: List of symbols to trade
            params: Strategy parameters from config
        """
        ...

    def on_bar(self, bar: Bar, state: Dict[str, Any]) -> Iterable[Order]:
        """Called for each bar in the data feed.

        Args:
            bar: Current bar data
            state: Shared state dict containing portfolio, id generator, etc.

        Returns:
            List of orders to submit
        """
        ...

    def on_end(self, state: Dict[str, Any]) -> None:
        """Called once after the backtest completes.

        Args:
            state: Final state for cleanup/reporting
        """
        ...


class SmaCrossStrategy:
    """Simple Moving Average Crossover Strategy.

    Generates BUY signal when fast MA crosses above slow MA.
    Generates SELL signal when fast MA crosses below slow MA.

    Parameters:
        fast: Fast moving average period (default: 10)
        slow: Slow moving average period (default: 20)
        position_size: Fixed position size per trade (default: 1.0)
    """

    name = "sma_cross"

    def __init__(self, fast: int = 10, slow: int = 20, position_size: float = 1.0):
        """Initialize SMA cross strategy.

        Args:
            fast: Fast MA period
            slow: Slow MA period
            position_size: Size of each position
        """
        if fast >= slow:
            raise ValueError(f"Fast period ({fast}) must be < slow period ({slow})")
        if fast < 2 or slow < 2:
            raise ValueError("MA periods must be >= 2")
        if position_size <= 0:
            raise ValueError(f"Position size must be positive: {position_size}")

        self.fast = fast
        self.slow = slow
        self.position_size = position_size
        self.buffers: Dict[str, tuple] = {}
        self.prev_signal: Dict[str, int] = {}  # -1: bearish, 0: neutral, 1: bullish

    def on_start(self, universe: Iterable[str], params: Dict[str, Any]) -> None:
        """Initialize buffers for each symbol.

        Args:
            universe: Trading universe
            params: Additional parameters (unused)
        """
        for symbol in universe:
            self.buffers[symbol] = (
                deque(maxlen=self.fast),
                deque(maxlen=self.slow)
            )
            self.prev_signal[symbol] = 0

    def on_bar(self, bar: Bar, state: Dict[str, Any]) -> Iterable[Order]:
        """Process bar and generate signals.

        Args:
            bar: Current bar
            state: State containing portfolio and order ID generator

        Returns:
            List of orders (empty or single order)
        """
        if bar.symbol not in self.buffers:
            return []

        fast_buf, slow_buf = self.buffers[bar.symbol]
        fast_buf.append(bar.close)
        slow_buf.append(bar.close)

        # Wait for enough data
        if len(fast_buf) < self.fast or len(slow_buf) < self.slow:
            return []

        # Calculate moving averages
        fast_ma = sum(fast_buf) / len(fast_buf)
        slow_ma = sum(slow_buf) / len(slow_buf)

        # Determine current signal
        current_signal = 1 if fast_ma > slow_ma else -1

        # Check for signal change (crossover)
        prev = self.prev_signal[bar.symbol]
        self.prev_signal[bar.symbol] = current_signal

        if prev == current_signal:
            return []  # No change

        # Get current position
        portfolio = state["portfolio"]
        position = portfolio.get_position(bar.symbol)
        current_qty = position.qty

        orders = []

        # Bullish crossover: go long
        if current_signal == 1 and current_qty <= 0:
            # Close any short position and open long
            qty = abs(current_qty) + self.position_size
            orders.append(Order(
                id=state["id_gen"](),
                ts=bar.ts,
                symbol=bar.symbol,
                side=Side.BUY,
                qty=qty,
                type="market"
            ))

        # Bearish crossover: go short (or close long)
        elif current_signal == -1 and current_qty >= 0:
            # Close any long position
            if current_qty > 0:
                orders.append(Order(
                    id=state["id_gen"](),
                    ts=bar.ts,
                    symbol=bar.symbol,
                    side=Side.SELL,
                    qty=current_qty,
                    type="market"
                ))

        return orders

    def on_end(self, state: Dict[str, Any]) -> None:
        """Cleanup strategy state.

        Args:
            state: Final state
        """
        self.buffers.clear()
        self.prev_signal.clear()


class BuyAndHoldStrategy:
    """Simple buy and hold strategy.

    Buys once at the start and holds until the end.
    Useful as a baseline for comparison.

    Parameters:
        position_size: Size of position to buy (default: 1.0)
    """

    name = "buy_and_hold"

    def __init__(self, position_size: float = 1.0):
        """Initialize buy and hold strategy.

        Args:
            position_size: Size of initial position
        """
        if position_size <= 0:
            raise ValueError(f"Position size must be positive: {position_size}")
        self.position_size = position_size
        self.entered: Dict[str, bool] = {}

    def on_start(self, universe: Iterable[str], params: Dict[str, Any]) -> None:
        """Initialize entry tracking.

        Args:
            universe: Trading universe
            params: Additional parameters (unused)
        """
        for symbol in universe:
            self.entered[symbol] = False

    def on_bar(self, bar: Bar, state: Dict[str, Any]) -> Iterable[Order]:
        """Enter position on first bar.

        Args:
            bar: Current bar
            state: State containing order ID generator

        Returns:
            List with single buy order on first bar, empty otherwise
        """
        if bar.symbol not in self.entered or self.entered[bar.symbol]:
            return []

        self.entered[bar.symbol] = True
        return [Order(
            id=state["id_gen"](),
            ts=bar.ts,
            symbol=bar.symbol,
            side=Side.BUY,
            qty=self.position_size,
            type="market"
        )]

    def on_end(self, state: Dict[str, Any]) -> None:
        """Cleanup.

        Args:
            state: Final state
        """
        self.entered.clear()


# Strategy registry
class StrategyRegistry:
    """Central registry for all available strategies."""

    _strategies = {
        "sma_cross": SmaCrossStrategy,
        "buy_and_hold": BuyAndHoldStrategy,
    }

    @classmethod
    def create(cls, name: str, **kwargs) -> BaseStrategy:
        """Create strategy instance by name.

        Args:
            name: Strategy name
            **kwargs: Strategy parameters

        Returns:
            Strategy instance

        Raises:
            KeyError: If strategy name not found
        """
        if name not in cls._strategies:
            raise KeyError(f"Unknown strategy: {name}. Available: {list(cls._strategies.keys())}")
        return cls._strategies[name](**kwargs)

    @classmethod
    def list_strategies(cls) -> Dict[str, Dict[str, Any]]:
        """List all available strategies with metadata.

        Returns:
            Dict of strategy name -> metadata
        """
        return {
            "sma_cross": {
                "name": "sma_cross",
                "display_name": "SMA Crossover",
                "description": "Simple moving average crossover strategy",
                "parameters": {
                    "fast": {"type": "int", "default": 10, "min": 2, "max": 500},
                    "slow": {"type": "int", "default": 20, "min": 2, "max": 1000},
                    "position_size": {"type": "float", "default": 1.0, "min": 0.001}
                }
            },
            "buy_and_hold": {
                "name": "buy_and_hold",
                "display_name": "Buy and Hold",
                "description": "Buy once at start and hold until end",
                "parameters": {
                    "position_size": {"type": "float", "default": 1.0, "min": 0.001}
                }
            }
        }

    @classmethod
    def register(cls, name: str, strategy_class: type) -> None:
        """Register a new strategy.

        Args:
            name: Strategy identifier
            strategy_class: Strategy class
        """
        cls._strategies[name] = strategy_class
