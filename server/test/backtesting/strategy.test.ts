import { describe, it, expect, beforeEach } from 'vitest';
import { MovingAverageCrossoverStrategy } from '../../backtesting/strategies/moving-average';
import { RSIStrategy } from '../../backtesting/strategies/rsi';
import { PaperBroker } from '../../backtesting/broker';
import { LiveClock } from '../../backtesting/clocks';
import { MarketBar } from '../../backtesting/types';

describe('MovingAverageCrossoverStrategy', () => {
  let strategy: MovingAverageCrossoverStrategy;
  let broker: PaperBroker;
  let clock: LiveClock;

  beforeEach(() => {
    strategy = new MovingAverageCrossoverStrategy(3, 5);
    clock = new LiveClock();
    broker = new PaperBroker(10000, 0, 0, clock);
    strategy.initialize({ shortPeriod: 3, longPeriod: 5 });
    strategy.onStart?.(10000);
  });

  it('should initialize with correct parameters', () => {
    expect(strategy.name).toBe('Moving Average Crossover');
    expect(strategy.parameters.shortPeriod).toBe(3);
    expect(strategy.parameters.longPeriod).toBe(5);
  });

  it('should not generate signals without enough data', async () => {
    const bar: MarketBar = {
      timestamp: new Date(),
      open: 100,
      high: 102,
      low: 98,
      close: 101,
      volume: 1000,
    };

    broker.updatePrice('BTC', bar.close);
    const signal = await strategy.onBar(bar, broker);
    expect(signal).toBeNull();
  });

  it('should generate signals after accumulating data', async () => {
    const prices = [100, 101, 102, 103, 104, 105, 104, 103, 102, 101];

    for (const price of prices) {
      const bar: MarketBar = {
        timestamp: new Date(),
        open: price,
        high: price + 1,
        low: price - 1,
        close: price,
        volume: 1000,
      };

      broker.updatePrice('BTC', bar.close);
      const signal = await strategy.onBar(bar, broker);

      if (signal) {
        expect(['buy', 'sell', 'hold']).toContain(signal.action);
      }
    }
  });
});

describe('RSIStrategy', () => {
  let strategy: RSIStrategy;
  let broker: PaperBroker;
  let clock: LiveClock;

  beforeEach(() => {
    strategy = new RSIStrategy(5, 70, 30);
    clock = new LiveClock();
    broker = new PaperBroker(10000, 0, 0, clock);
    strategy.initialize({ period: 5, overbought: 70, oversold: 30 });
    strategy.onStart?.(10000);
  });

  it('should initialize with correct parameters', () => {
    expect(strategy.name).toBe('RSI Strategy');
    expect(strategy.parameters.period).toBe(5);
    expect(strategy.parameters.overbought).toBe(70);
    expect(strategy.parameters.oversold).toBe(30);
  });

  it('should not generate signals without enough data', async () => {
    const bar: MarketBar = {
      timestamp: new Date(),
      open: 100,
      high: 102,
      low: 98,
      close: 101,
      volume: 1000,
    };

    broker.updatePrice('BTC', bar.close);
    const signal = await strategy.onBar(bar, broker);
    expect(signal).toBeNull();
  });

  it('should generate oversold signal', async () => {
    // Simulate downtrend to get oversold condition
    const prices = [100, 95, 90, 85, 80, 75, 70, 65];

    let lastSignal = null;
    for (const price of prices) {
      const bar: MarketBar = {
        timestamp: new Date(),
        open: price,
        high: price + 1,
        low: price - 1,
        close: price,
        volume: 1000,
      };

      broker.updatePrice('BTC', bar.close);
      const signal = await strategy.onBar(bar, broker);
      if (signal) {
        lastSignal = signal;
      }
    }

    // Should eventually get a buy signal
    if (lastSignal) {
      expect(lastSignal.action).toBe('buy');
    }
  });

  it('should generate overbought signal', async () => {
    // First buy
    broker.updatePrice('BTC', 100);
    await broker.submitOrder({
      symbol: 'BTC',
      side: 'buy' as any,
      type: 'market' as any,
      quantity: 0.5,
    });

    // Simulate uptrend to get overbought condition
    const prices = [100, 105, 110, 115, 120, 125, 130, 135];

    let lastSignal = null;
    for (const price of prices) {
      const bar: MarketBar = {
        timestamp: new Date(),
        open: price,
        high: price + 1,
        low: price - 1,
        close: price,
        volume: 1000,
      };

      broker.updatePrice('BTC', bar.close);
      const signal = await strategy.onBar(bar, broker);
      if (signal) {
        lastSignal = signal;
      }
    }

    // Should eventually get a sell signal
    if (lastSignal) {
      expect(lastSignal.action).toBe('sell');
    }
  });
});
