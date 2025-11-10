import { BaseStrategy } from '../strategy';
import { MarketBar, IBroker, Signal, OrderSide } from '../types';

/**
 * MovingAverageCrossoverStrategy
 * Buys when short MA crosses above long MA, sells when it crosses below
 */
export class MovingAverageCrossoverStrategy extends BaseStrategy {
  private shortPeriod: number;
  private longPeriod: number;
  private shortMA: number[] = [];
  private longMA: number[] = [];
  private prices: number[] = [];

  constructor(shortPeriod: number = 10, longPeriod: number = 30) {
    super(
      'ma-crossover',
      'Moving Average Crossover',
      'Trades based on short and long moving average crossovers',
      { shortPeriod, longPeriod }
    );
    this.shortPeriod = shortPeriod;
    this.longPeriod = longPeriod;
  }

  initialize(params: Record<string, any>): void {
    super.initialize(params);
    this.shortPeriod = params.shortPeriod || this.shortPeriod;
    this.longPeriod = params.longPeriod || this.longPeriod;
  }

  async onBar(bar: MarketBar, broker: IBroker): Promise<Signal | null> {
    this.prices.push(bar.close);

    // Need enough data for the long MA
    if (this.prices.length < this.longPeriod) {
      return null;
    }

    // Calculate moving averages
    const shortMA = this.calculateSMA(this.shortPeriod);
    const longMA = this.calculateSMA(this.longPeriod);

    // Store previous values for crossover detection
    const prevShortMA =
      this.shortMA.length > 0 ? this.shortMA[this.shortMA.length - 1] : 0;
    const prevLongMA =
      this.longMA.length > 0 ? this.longMA[this.longMA.length - 1] : 0;

    this.shortMA.push(shortMA);
    this.longMA.push(longMA);

    // Detect crossovers
    const position = broker.getPosition(bar.timestamp.toString());
    const portfolio = broker.getPortfolio();

    // Golden cross: short MA crosses above long MA
    if (
      prevShortMA > 0 &&
      prevLongMA > 0 &&
      prevShortMA <= prevLongMA &&
      shortMA > longMA
    ) {
      // Buy signal - use 95% of available cash
      const quantity = (portfolio.cash * 0.95) / bar.close;
      return {
        symbol: bar.timestamp.toString(),
        action: 'buy',
        quantity: Math.floor(quantity * 100) / 100,
        reason: `Golden cross: Short MA (${shortMA.toFixed(2)}) crossed above Long MA (${longMA.toFixed(2)})`,
        confidence: 0.7,
        timestamp: bar.timestamp,
      };
    }

    // Death cross: short MA crosses below long MA
    if (
      prevShortMA > 0 &&
      prevLongMA > 0 &&
      prevShortMA >= prevLongMA &&
      shortMA < longMA &&
      position &&
      position.quantity > 0
    ) {
      return {
        symbol: bar.timestamp.toString(),
        action: 'sell',
        quantity: position.quantity,
        reason: `Death cross: Short MA (${shortMA.toFixed(2)}) crossed below Long MA (${longMA.toFixed(2)})`,
        confidence: 0.7,
        timestamp: bar.timestamp,
      };
    }

    return null;
  }

  private calculateSMA(period: number): number {
    const relevantPrices = this.prices.slice(-period);
    const sum = relevantPrices.reduce((a, b) => a + b, 0);
    return sum / relevantPrices.length;
  }

  onStart(initialCapital: number): void {
    this.prices = [];
    this.shortMA = [];
    this.longMA = [];
  }
}
