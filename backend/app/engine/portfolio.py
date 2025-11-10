"""Portfolio management and P&L tracking.

Handles position updates, equity calculations, and performance tracking.
"""

from typing import Dict, List, Optional

from ..domain.models import EquityPoint, Fill, Portfolio, Position, Trade
from ..domain.enums import Side


class PortfolioManager:
    """Manages portfolio state and tracks equity curve.

    Maintains current positions, cash, and equity history.
    Generates trade records for closed positions.
    """

    def __init__(self, initial_cash: float = 10_000.0):
        """Initialize portfolio manager.

        Args:
            initial_cash: Starting cash balance
        """
        if initial_cash <= 0:
            raise ValueError(f"Initial cash must be positive: {initial_cash}")

        self.portfolio = Portfolio(cash=initial_cash, equity=initial_cash)
        self.equity_curve: List[EquityPoint] = []
        self.trades: List[Trade] = []
        self._open_trades: Dict[str, Trade] = {}

    def apply_fill(self, fill: Fill, current_prices: Dict[str, float]) -> None:
        """Apply fill and update portfolio.

        Args:
            fill: Fill to apply
            current_prices: Current market prices for marking positions
        """
        # Apply to portfolio
        self.portfolio.apply_fill(fill)

        # Track trade lifecycle
        self._track_trade(fill)

        # Mark to market
        self.portfolio.mark_to_market(current_prices)

        # Record equity point
        positions_value = self.portfolio.equity - self.portfolio.cash
        self.equity_curve.append(EquityPoint(
            ts=fill.ts,
            equity=self.portfolio.equity,
            cash=self.portfolio.cash,
            positions_value=positions_value
        ))

    def mark_to_market(self, ts, prices: Dict[str, float]) -> None:
        """Update equity based on current prices.

        Args:
            ts: Current timestamp
            prices: Current market prices
        """
        self.portfolio.mark_to_market(prices)

        positions_value = self.portfolio.equity - self.portfolio.cash
        self.equity_curve.append(EquityPoint(
            ts=ts,
            equity=self.portfolio.equity,
            cash=self.portfolio.cash,
            positions_value=positions_value
        ))

    def _track_trade(self, fill: Fill) -> None:
        """Track trade lifecycle for P&L reporting.

        Args:
            fill: Fill to process
        """
        symbol = fill.symbol

        # Opening new position
        if symbol not in self._open_trades:
            if fill.side == Side.BUY:
                self._open_trades[symbol] = Trade(
                    symbol=symbol,
                    entry_ts=fill.ts,
                    entry_price=fill.price,
                    entry_qty=fill.qty,
                    fees=fill.fee,
                    side=Side.BUY
                )
        else:
            # Existing trade
            open_trade = self._open_trades[symbol]

            # Same direction - average in
            if (open_trade.side == Side.BUY and fill.side == Side.BUY) or \
               (open_trade.side == Side.SELL and fill.side == Side.SELL):
                # Update average entry price
                total_qty = open_trade.entry_qty + fill.qty
                weighted_price = (
                    (open_trade.entry_price * open_trade.entry_qty) +
                    (fill.price * fill.qty)
                ) / total_qty
                open_trade.entry_price = weighted_price
                open_trade.entry_qty = total_qty
                open_trade.fees += fill.fee

            # Opposite direction - close or reverse
            else:
                # Full or partial close
                if fill.qty >= open_trade.entry_qty:
                    # Close existing trade
                    open_trade.close(
                        exit_ts=fill.ts,
                        exit_price=fill.price,
                        exit_qty=open_trade.entry_qty,
                        exit_fee=fill.fee
                    )
                    self.trades.append(open_trade)
                    del self._open_trades[symbol]

                    # If fill qty > entry qty, open reverse position
                    remaining_qty = fill.qty - open_trade.entry_qty
                    if remaining_qty > 0:
                        self._open_trades[symbol] = Trade(
                            symbol=symbol,
                            entry_ts=fill.ts,
                            entry_price=fill.price,
                            entry_qty=remaining_qty,
                            fees=0,  # Fee already counted
                            side=fill.side
                        )
                else:
                    # Partial close - reduce position
                    open_trade.entry_qty -= fill.qty

    def get_position(self, symbol: str) -> Position:
        """Get position for symbol.

        Args:
            symbol: Symbol to query

        Returns:
            Position (may be empty)
        """
        return self.portfolio.get_position(symbol)

    def get_all_positions(self) -> Dict[str, Position]:
        """Get all positions.

        Returns:
            Dict of symbol -> Position
        """
        return self.portfolio.positions.copy()

    def get_equity_curve(self) -> List[EquityPoint]:
        """Get equity curve history.

        Returns:
            List of equity points
        """
        return self.equity_curve.copy()

    def get_trades(self) -> List[Trade]:
        """Get completed trades.

        Returns:
            List of trades
        """
        return self.trades.copy()

    def get_open_trades(self) -> Dict[str, Trade]:
        """Get currently open trades.

        Returns:
            Dict of symbol -> open trade
        """
        return self._open_trades.copy()

    def get_cash(self) -> float:
        """Get current cash balance.

        Returns:
            Cash balance
        """
        return self.portfolio.cash

    def get_equity(self) -> float:
        """Get current equity.

        Returns:
            Total equity
        """
        return self.portfolio.equity

    def get_total_pnl(self) -> float:
        """Calculate total realized P&L.

        Returns:
            Total P&L from closed trades
        """
        return sum(trade.pnl for trade in self.trades)

    def get_exposure(self) -> float:
        """Get current portfolio exposure.

        Returns:
            Gross exposure as ratio of equity
        """
        return self.portfolio.get_exposure()

    def close_all_positions(self, ts, prices: Dict[str, float]) -> List[Trade]:
        """Close all open positions at current prices.

        Used at end of backtest.

        Args:
            ts: Closing timestamp
            prices: Current market prices

        Returns:
            List of closed trades
        """
        closed_trades = []

        for symbol, trade in list(self._open_trades.items()):
            if symbol in prices:
                trade.close(
                    exit_ts=ts,
                    exit_price=prices[symbol],
                    exit_qty=trade.entry_qty,
                    exit_fee=0  # No fee on forced close
                )
                self.trades.append(trade)
                closed_trades.append(trade)
                del self._open_trades[symbol]

        return closed_trades
