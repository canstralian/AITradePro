"""Execution models for simulating realistic order fills.

Handles slippage, transaction costs, and partial fills.
All models are configurable and composable.
"""

from abc import ABC, abstractmethod
from typing import Optional

from ..domain.enums import OrderType, Side
from ..domain.models import Bar, Fill, Order


class SlippageModel(ABC):
    """Abstract base for slippage models."""

    @abstractmethod
    def apply(self, bar: Bar, order: Order, base_price: float) -> float:
        """Calculate execution price with slippage.

        Args:
            bar: Current bar
            order: Order being executed
            base_price: Base price before slippage

        Returns:
            Adjusted execution price
        """
        pass


class FixedBpsSlippage(SlippageModel):
    """Fixed basis point slippage model.

    Applies constant slippage in either direction.
    """

    def __init__(self, bps: float = 5.0):
        """Initialize fixed slippage.

        Args:
            bps: Basis points of slippage (e.g., 5 = 0.05%)
        """
        if bps < 0:
            raise ValueError(f"Slippage bps must be non-negative: {bps}")
        self.bps = bps

    def apply(self, bar: Bar, order: Order, base_price: float) -> float:
        """Apply fixed slippage.

        Buys execute higher, sells execute lower.

        Args:
            bar: Current bar
            order: Order being executed
            base_price: Base price

        Returns:
            Slipped price
        """
        slippage_factor = self.bps / 10000.0
        if order.side == Side.BUY:
            return base_price * (1 + slippage_factor)
        else:
            return base_price * (1 - slippage_factor)


class VolumeBasedSlippage(SlippageModel):
    """Volume-based slippage model.

    Slippage increases with order size relative to bar volume.
    More realistic for large orders.
    """

    def __init__(self, base_bps: float = 2.0, volume_impact: float = 10.0):
        """Initialize volume-based slippage.

        Args:
            base_bps: Base slippage in basis points
            volume_impact: Additional bps per 1% of volume traded
        """
        if base_bps < 0 or volume_impact < 0:
            raise ValueError("Slippage parameters must be non-negative")
        self.base_bps = base_bps
        self.volume_impact = volume_impact

    def apply(self, bar: Bar, order: Order, base_price: float) -> float:
        """Apply volume-based slippage.

        Args:
            bar: Current bar
            order: Order being executed
            base_price: Base price

        Returns:
            Slipped price
        """
        # Calculate order size as fraction of bar volume
        if bar.volume == 0:
            volume_fraction = 0
        else:
            volume_fraction = order.qty / bar.volume

        # Total slippage = base + volume impact
        total_bps = self.base_bps + (volume_fraction * 100 * self.volume_impact)
        slippage_factor = total_bps / 10000.0

        if order.side == Side.BUY:
            return base_price * (1 + slippage_factor)
        else:
            return base_price * (1 - slippage_factor)


class NoSlippage(SlippageModel):
    """Zero slippage model for testing."""

    def apply(self, bar: Bar, order: Order, base_price: float) -> float:
        """Return price unchanged."""
        return base_price


class FeeModel(ABC):
    """Abstract base for fee models."""

    @abstractmethod
    def compute(self, symbol: str, qty: float, price: float, side: Side) -> float:
        """Calculate transaction fee.

        Args:
            symbol: Trading pair
            qty: Quantity traded
            price: Execution price
            side: Order side

        Returns:
            Fee amount in quote currency
        """
        pass


class PercentageFeeModel(FeeModel):
    """Percentage-based fee model.

    Charges a fixed percentage of notional value.
    Common for most exchanges.
    """

    def __init__(self, percentage: float = 0.1):
        """Initialize percentage fee model.

        Args:
            percentage: Fee as percentage (e.g., 0.1 = 0.1%)
        """
        if percentage < 0:
            raise ValueError(f"Fee percentage must be non-negative: {percentage}")
        self.percentage = percentage

    def compute(self, symbol: str, qty: float, price: float, side: Side) -> float:
        """Calculate percentage fee.

        Args:
            symbol: Trading pair
            qty: Quantity
            price: Price
            side: Order side

        Returns:
            Fee amount
        """
        notional = qty * price
        return notional * (self.percentage / 100.0)


class TieredFeeModel(FeeModel):
    """Tiered fee model based on volume.

    Different fee rates for different volume tiers.
    """

    def __init__(self, tiers: list[tuple[float, float]]):
        """Initialize tiered fee model.

        Args:
            tiers: List of (volume_threshold, fee_percentage) tuples
                   Sorted in ascending order by volume
        """
        if not tiers:
            raise ValueError("Tiers cannot be empty")
        self.tiers = sorted(tiers, key=lambda x: x[0])

    def compute(self, symbol: str, qty: float, price: float, side: Side) -> float:
        """Calculate tiered fee.

        Args:
            symbol: Trading pair
            qty: Quantity
            price: Price
            side: Order side

        Returns:
            Fee amount
        """
        notional = qty * price

        # Find applicable tier
        fee_pct = self.tiers[0][1]
        for threshold, pct in self.tiers:
            if notional >= threshold:
                fee_pct = pct
            else:
                break

        return notional * (fee_pct / 100.0)


class NoFees(FeeModel):
    """Zero fees model for testing."""

    def compute(self, symbol: str, qty: float, price: float, side: Side) -> float:
        """Return zero fees."""
        return 0.0


class ExecutionModel:
    """Main execution engine combining slippage and fees.

    Responsible for determining if and how orders are filled.
    """

    def __init__(
        self,
        slippage: SlippageModel,
        fees: FeeModel,
        partial_fills: bool = False
    ):
        """Initialize execution model.

        Args:
            slippage: Slippage model
            fees: Fee model
            partial_fills: Whether to support partial fills
        """
        self.slippage = slippage
        self.fees = fees
        self.partial_fills = partial_fills

    def execute(self, bar: Bar, order: Order) -> Optional[Fill]:
        """Attempt to execute an order against a bar.

        Args:
            bar: Current bar
            order: Order to execute

        Returns:
            Fill if order executed, None if not filled
        """
        if order.symbol != bar.symbol:
            return None

        # Determine base execution price
        base_price = self._get_base_price(bar, order)
        if base_price is None:
            return None  # Order not fillable

        # Apply slippage
        execution_price = self.slippage.apply(bar, order, base_price)

        # Calculate fee
        fee = self.fees.compute(
            symbol=order.symbol,
            qty=order.qty,
            price=execution_price,
            side=order.side
        )

        # Create fill
        return Fill(
            order_id=order.id,
            ts=bar.ts,
            symbol=order.symbol,
            side=order.side,
            qty=order.qty,
            price=execution_price,
            fee=fee
        )

    def _get_base_price(self, bar: Bar, order: Order) -> Optional[float]:
        """Determine base execution price before slippage.

        Args:
            bar: Current bar
            order: Order to price

        Returns:
            Base price or None if unfillable
        """
        if order.type == OrderType.MARKET:
            # Market orders execute at close price
            return bar.close

        elif order.type == OrderType.LIMIT:
            # Limit orders only fill if price reached
            if order.limit_price is None:
                return None

            if order.side == Side.BUY:
                # Buy limit fills if bar low <= limit price
                if bar.low <= order.limit_price:
                    return order.limit_price
            else:
                # Sell limit fills if bar high >= limit price
                if bar.high >= order.limit_price:
                    return order.limit_price

            return None  # Limit not reached

        return None


class RealisticExecutionModel(ExecutionModel):
    """Enhanced execution model with realistic market microstructure.

    Includes:
    - Bid-ask spread simulation
    - Partial fills for large orders
    - Aggressive vs passive fills
    """

    def __init__(
        self,
        slippage: SlippageModel,
        fees: FeeModel,
        spread_bps: float = 5.0,
        max_fill_pct: float = 0.1
    ):
        """Initialize realistic execution model.

        Args:
            slippage: Slippage model
            fees: Fee model
            spread_bps: Bid-ask spread in basis points
            max_fill_pct: Max fill as percentage of bar volume
        """
        super().__init__(slippage, fees, partial_fills=True)
        self.spread_bps = spread_bps
        self.max_fill_pct = max_fill_pct

    def execute(self, bar: Bar, order: Order) -> Optional[Fill]:
        """Execute with spread and volume constraints.

        Args:
            bar: Current bar
            order: Order to execute

        Returns:
            Fill (potentially partial) or None
        """
        if order.symbol != bar.symbol:
            return None

        # Calculate max fillable quantity based on volume
        max_qty = bar.volume * self.max_fill_pct
        fill_qty = min(order.qty, max_qty)

        if fill_qty <= 0:
            return None

        # Determine execution price with spread
        base_price = self._get_base_price(bar, order)
        if base_price is None:
            return None

        # Apply spread (taker pays spread)
        spread_adjustment = base_price * (self.spread_bps / 10000.0)
        if order.side == Side.BUY:
            base_price += spread_adjustment
        else:
            base_price -= spread_adjustment

        # Apply additional slippage
        execution_price = self.slippage.apply(bar, order, base_price)

        # Calculate fee
        fee = self.fees.compute(
            symbol=order.symbol,
            qty=fill_qty,
            price=execution_price,
            side=order.side
        )

        return Fill(
            order_id=order.id,
            ts=bar.ts,
            symbol=order.symbol,
            side=order.side,
            qty=fill_qty,
            price=execution_price,
            fee=fee
        )
