"""Clock implementations for driving backtests and live trading.

Clocks provide a unified interface for time-based simulation,
allowing the same strategy code to work in both historical
and live/paper trading modes.
"""

import time
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Iterator, Optional

from ..domain.models import Bar


class Clock(ABC):
    """Abstract base class for all clock implementations."""

    @abstractmethod
    def tick(self) -> Optional[Bar]:
        """Advance clock and return next bar.

        Returns:
            Next bar or None if clock is exhausted
        """
        pass

    @abstractmethod
    def reset(self) -> None:
        """Reset clock to initial state."""
        pass


class HistoricalClock(Clock):
    """Clock for historical backtesting.

    Yields bars from a pre-loaded dataset in strict temporal order.
    Deterministic and repeatable.
    """

    def __init__(self, bars: Iterator[Bar]):
        """Initialize historical clock.

        Args:
            bars: Iterator of Bar objects in chronological order
        """
        self._original_bars = bars
        self._iter: Optional[Iterator[Bar]] = None
        self.reset()

    def tick(self) -> Optional[Bar]:
        """Get next bar from historical data.

        Returns:
            Next bar or None if data exhausted
        """
        try:
            return next(self._iter)
        except StopIteration:
            return None

    def reset(self) -> None:
        """Reset iterator to beginning."""
        self._iter = iter(self._original_bars)


class LiveClock(Clock):
    """Clock for live/paper trading with real-time or accelerated time.

    Polls data source at specified intervals and yields bars.
    Can run at real-time speed or accelerated for paper trading.

    Attributes:
        poll_interval: Seconds between data polls
        acceleration: Time acceleration factor (1.0 = real-time, 2.0 = 2x speed)
    """

    def __init__(
        self,
        data_source,
        poll_interval: float = 1.0,
        acceleration: float = 1.0
    ):
        """Initialize live clock.

        Args:
            data_source: Data source with get_latest_bars() method
            poll_interval: Seconds between polls
            acceleration: Speed multiplier (1.0 = real-time)
        """
        if poll_interval <= 0:
            raise ValueError(f"Poll interval must be positive: {poll_interval}")
        if acceleration <= 0:
            raise ValueError(f"Acceleration must be positive: {acceleration}")

        self.data_source = data_source
        self.poll_interval = poll_interval
        self.acceleration = acceleration
        self._last_poll: Optional[float] = None
        self._running = False

    def tick(self) -> Optional[Bar]:
        """Poll data source and return latest bar.

        Sleeps to maintain polling interval adjusted by acceleration.

        Returns:
            Latest bar or None if source has no data
        """
        if not self._running:
            self._running = True
            self._last_poll = time.time()

        # Calculate adjusted sleep time
        if self._last_poll is not None:
            elapsed = time.time() - self._last_poll
            adjusted_interval = self.poll_interval / self.acceleration
            sleep_time = adjusted_interval - elapsed

            if sleep_time > 0:
                time.sleep(sleep_time)

        self._last_poll = time.time()

        # Poll data source
        bars = self.data_source.get_latest_bars()
        return bars[0] if bars else None

    def reset(self) -> None:
        """Reset clock state."""
        self._last_poll = None
        self._running = False


class ScheduledClock(Clock):
    """Clock that yields bars on a fixed schedule (e.g., every 1 minute).

    Useful for simulating regular interval data without pre-loading.
    """

    def __init__(
        self,
        start_time: datetime,
        end_time: datetime,
        interval: timedelta,
        bar_generator
    ):
        """Initialize scheduled clock.

        Args:
            start_time: Simulation start time
            end_time: Simulation end time
            interval: Time between bars
            bar_generator: Callable that takes datetime and returns Bar
        """
        if start_time >= end_time:
            raise ValueError("Start time must be before end time")
        if interval <= timedelta(0):
            raise ValueError("Interval must be positive")

        self.start_time = start_time
        self.end_time = end_time
        self.interval = interval
        self.bar_generator = bar_generator
        self._current_time: Optional[datetime] = None
        self.reset()

    def tick(self) -> Optional[Bar]:
        """Generate next scheduled bar.

        Returns:
            Generated bar or None if schedule complete
        """
        if self._current_time >= self.end_time:
            return None

        bar = self.bar_generator(self._current_time)
        self._current_time += self.interval
        return bar

    def reset(self) -> None:
        """Reset to start time."""
        self._current_time = self.start_time


class MultiSymbolClock(Clock):
    """Clock that interleaves bars from multiple symbols.

    Maintains separate iterators per symbol and yields bars
    in strict chronological order across all symbols.
    """

    def __init__(self, symbol_bars: dict[str, Iterator[Bar]]):
        """Initialize multi-symbol clock.

        Args:
            symbol_bars: Dict of symbol -> bar iterator
        """
        self.symbol_bars = symbol_bars
        self._buffers: dict[str, Optional[Bar]] = {}
        self.reset()

    def tick(self) -> Optional[Bar]:
        """Return earliest bar across all symbols.

        Returns:
            Next chronological bar or None if all exhausted
        """
        # Fill empty buffers
        for symbol, iterator in self.symbol_bars.items():
            if symbol not in self._buffers or self._buffers[symbol] is None:
                try:
                    self._buffers[symbol] = next(iterator)
                except StopIteration:
                    self._buffers[symbol] = None

        # Find earliest bar
        active_bars = {
            sym: bar for sym, bar in self._buffers.items()
            if bar is not None
        }

        if not active_bars:
            return None

        # Get symbol with earliest timestamp
        earliest_symbol = min(active_bars.keys(), key=lambda s: active_bars[s].ts)
        bar = active_bars[earliest_symbol]

        # Mark buffer as consumed
        self._buffers[earliest_symbol] = None

        return bar

    def reset(self) -> None:
        """Reset all symbol iterators."""
        self._buffers.clear()
        for symbol, bars in self.symbol_bars.items():
            self.symbol_bars[symbol] = iter(bars)
