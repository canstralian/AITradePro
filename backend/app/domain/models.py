"""Core domain models for backtesting engine.

These are runtime dataclasses representing trading primitives.
All models are immutable where possible and timezone-aware.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Optional
from uuid import uuid4

from .enums import OrderStatus, OrderType, Side


@dataclass(frozen=True)
class Bar:
    """OHLCV bar representing market data at a point in time.

    Attributes:
        ts: Timestamp (UTC)
        symbol: Trading pair symbol (e.g., "BTCUSDT")
        open: Opening price
        high: Highest price
        low: Lowest price
        close: Closing price
        volume: Trading volume
    """
    ts: datetime
    symbol: str
    open: float
    high: float
    low: float
    close: float
    volume: float

    def __post_init__(self):
        """Validate bar data."""
        if self.high < self.low:
            raise ValueError(f"High {self.high} cannot be less than low {self.low}")
        if self.high < max(self.open, self.close):
            raise ValueError(f"High {self.high} must be >= open/close")
        if self.low > min(self.open, self.close):
            raise ValueError(f"Low {self.low} must be <= open/close")
        if self.volume < 0:
            raise ValueError(f"Volume cannot be negative: {self.volume}")


@dataclass
class Order:
    """Order representation.

    Attributes:
        id: Unique order identifier
        ts: Order creation timestamp
        symbol: Trading pair
        side: BUY or SELL
        qty: Quantity to trade
        type: Order type (market/limit)
        limit_price: Limit price (required for limit orders)
        status: Current order status
    """
    id: str
    ts: datetime
    symbol: str
    side: Side
    qty: float
    type: OrderType
    limit_price: Optional[float] = None
    status: OrderStatus = OrderStatus.PENDING

    def __post_init__(self):
        """Validate order."""
        if self.qty <= 0:
            raise ValueError(f"Order quantity must be positive: {self.qty}")
        if self.type == OrderType.LIMIT and self.limit_price is None:
            raise ValueError("Limit orders require limit_price")
        if self.limit_price is not None and self.limit_price <= 0:
            raise ValueError(f"Limit price must be positive: {self.limit_price}")

    @staticmethod
    def generate_id() -> str:
        """Generate unique order ID."""
        return f"ord-{uuid4().hex[:12]}"


@dataclass(frozen=True)
class Fill:
    """Trade execution fill.

    Attributes:
        order_id: Reference to originating order
        ts: Execution timestamp
        symbol: Trading pair
        side: BUY or SELL
        qty: Filled quantity
        price: Execution price
        fee: Transaction fee paid
    """
    order_id: str
    ts: datetime
    symbol: str
    side: Side
    qty: float
    price: float
    fee: float

    def __post_init__(self):
        """Validate fill."""
        if self.qty <= 0:
            raise ValueError(f"Fill quantity must be positive: {self.qty}")
        if self.price <= 0:
            raise ValueError(f"Fill price must be positive: {self.price}")
        if self.fee < 0:
            raise ValueError(f"Fee cannot be negative: {self.fee}")

    @property
    def notional(self) -> float:
        """Gross notional value of the fill."""
        return self.qty * self.price

    @property
    def net_cash_flow(self) -> float:
        """Net cash flow (negative for buys, positive for sells)."""
        if self.side == Side.BUY:
            return -(self.notional + self.fee)
        else:
            return self.notional - self.fee


@dataclass
class Position:
    """Position in a single symbol.

    Attributes:
        symbol: Trading pair
        qty: Current quantity (positive for long, negative for short)
        avg_price: Average entry price
    """
    symbol: str
    qty: float = 0.0
    avg_price: float = 0.0

    def update(self, fill: Fill) -> None:
        """Update position with a new fill.

        Args:
            fill: Fill to apply to position
        """
        if fill.symbol != self.symbol:
            raise ValueError(f"Fill symbol {fill.symbol} doesn't match position {self.symbol}")

        fill_qty = fill.qty if fill.side == Side.BUY else -fill.qty
        new_qty = self.qty + fill_qty

        # Position reversal or close
        if self.qty * new_qty <= 0:
            self.qty = new_qty
            self.avg_price = fill.price if new_qty != 0 else 0.0
        else:
            # Adding to position - update average price
            total_cost = (self.qty * self.avg_price) + (fill_qty * fill.price)
            self.qty = new_qty
            self.avg_price = abs(total_cost / new_qty) if new_qty != 0 else 0.0

    def market_value(self, current_price: float) -> float:
        """Calculate current market value of position."""
        return self.qty * current_price

    def unrealized_pnl(self, current_price: float) -> float:
        """Calculate unrealized P&L."""
        if self.qty == 0:
            return 0.0
        return (current_price - self.avg_price) * self.qty


@dataclass
class Portfolio:
    """Portfolio state tracking cash and positions.

    Attributes:
        cash: Available cash
        equity: Total equity (cash + position values)
        positions: Dict of symbol -> Position
    """
    cash: float
    equity: float
    positions: Dict[str, Position] = field(default_factory=dict)

    def get_position(self, symbol: str) -> Position:
        """Get or create position for symbol."""
        if symbol not in self.positions:
            self.positions[symbol] = Position(symbol=symbol)
        return self.positions[symbol]

    def apply_fill(self, fill: Fill) -> None:
        """Apply a fill to the portfolio.

        Args:
            fill: Fill to apply
        """
        # Update cash
        self.cash += fill.net_cash_flow

        # Update position
        position = self.get_position(fill.symbol)
        position.update(fill)

        # Clean up closed positions
        if position.qty == 0:
            del self.positions[fill.symbol]

    def mark_to_market(self, prices: Dict[str, float]) -> None:
        """Update equity based on current market prices.

        Args:
            prices: Dict of symbol -> current price
        """
        total_position_value = sum(
            pos.market_value(prices.get(pos.symbol, pos.avg_price))
            for pos in self.positions.values()
        )
        self.equity = self.cash + total_position_value

    def get_exposure(self) -> float:
        """Calculate total gross exposure as fraction of equity."""
        if self.equity == 0:
            return 0.0
        total_exposure = sum(abs(pos.qty * pos.avg_price) for pos in self.positions.values())
        return total_exposure / self.equity


@dataclass
class Trade:
    """Completed round-trip trade (entry + exit).

    Attributes:
        symbol: Trading pair
        entry_ts: Entry timestamp
        entry_price: Entry price
        entry_qty: Entry quantity
        exit_ts: Exit timestamp (None if still open)
        exit_price: Exit price
        exit_qty: Exit quantity
        pnl: Realized profit/loss
        return_pct: Return percentage
        fees: Total fees paid
        side: Original entry side
    """
    symbol: str
    entry_ts: datetime
    entry_price: float
    entry_qty: float
    exit_ts: Optional[datetime] = None
    exit_price: Optional[float] = None
    exit_qty: Optional[float] = None
    pnl: float = 0.0
    return_pct: float = 0.0
    fees: float = 0.0
    side: Optional[Side] = None

    def close(self, exit_ts: datetime, exit_price: float, exit_qty: float, exit_fee: float) -> None:
        """Close the trade.

        Args:
            exit_ts: Exit timestamp
            exit_price: Exit price
            exit_qty: Exit quantity
            exit_fee: Exit fee
        """
        self.exit_ts = exit_ts
        self.exit_price = exit_price
        self.exit_qty = exit_qty
        self.fees += exit_fee

        # Calculate P&L
        if self.side == Side.BUY:
            self.pnl = (exit_price - self.entry_price) * self.entry_qty - self.fees
        else:
            self.pnl = (self.entry_price - exit_price) * self.entry_qty - self.fees

        # Calculate return percentage
        entry_value = self.entry_price * self.entry_qty
        self.return_pct = (self.pnl / entry_value) * 100 if entry_value != 0 else 0.0

    @property
    def is_open(self) -> bool:
        """Check if trade is still open."""
        return self.exit_ts is None

    @property
    def duration(self) -> Optional[float]:
        """Trade duration in seconds."""
        if self.exit_ts is None:
            return None
        return (self.exit_ts - self.entry_ts).total_seconds()


@dataclass
class EquityPoint:
    """Point on equity curve.

    Attributes:
        ts: Timestamp
        equity: Portfolio equity value
        cash: Cash balance
        positions_value: Total value of positions
    """
    ts: datetime
    equity: float
    cash: float
    positions_value: float
