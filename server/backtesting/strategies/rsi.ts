import { BaseStrategy } from '../strategy';
import { MarketBar, IBroker, Signal } from '../types';

/**
 * RSI Strategy
 * Buys when RSI is oversold (<30), sells when overbought (>70)
 */
export class RSIStrategy extends BaseStrategy {
  private period: number;
  private overbought: number;
  private oversold: number;
  private prices: number[] = [];
  private gains: number[] = [];
  private losses: number[] = [];

  constructor(period: number = 14, overbought: number = 70, oversold: number = 30) {
    super(
      'rsi',
      'RSI Strategy',
      'Trades based on Relative Strength Index indicators',
      { period, overbought, oversold }
    );
    this.period = period;
    this.overbought = overbought;
    this.oversold = oversold;
  }

  initialize(params: Record<string, any>): void {
    super.initialize(params);
    this.period = params.period || this.period;
    this.overbought = params.overbought || this.overbought;
    this.oversold = params.oversold || this.oversold;
  }

  async onBar(bar: MarketBar, broker: IBroker): Promise<Signal | null> {
    this.prices.push(bar.close);

    // Need at least period + 1 prices to calculate RSI
    if (this.prices.length < this.period + 1) {
      return null;
    }

    // Calculate price changes
    const currentPrice = this.prices[this.prices.length - 1];
    const previousPrice = this.prices[this.prices.length - 2];
    const change = currentPrice - previousPrice;

    if (change > 0) {
      this.gains.push(change);
      this.losses.push(0);
    } else {
      this.gains.push(0);
      this.losses.push(Math.abs(change));
    }

    // Calculate RSI
    if (this.gains.length < this.period) {
      return null;
    }

    const rsi = this.calculateRSI();
    const position = broker.getPosition(bar.timestamp.toString());
    const portfolio = broker.getPortfolio();

    // Oversold - buy signal
    if (rsi < this.oversold && !position) {
      const quantity = (portfolio.cash * 0.95) / bar.close;
      return {
        symbol: bar.timestamp.toString(),
        action: 'buy',
        quantity: Math.floor(quantity * 100) / 100,
        reason: `RSI oversold: ${rsi.toFixed(2)} < ${this.oversold}`,
        confidence: Math.max(0, (this.oversold - rsi) / this.oversold),
        timestamp: bar.timestamp,
      };
    }

    // Overbought - sell signal
    if (rsi > this.overbought && position && position.quantity > 0) {
      return {
        symbol: bar.timestamp.toString(),
        action: 'sell',
        quantity: position.quantity,
        reason: `RSI overbought: ${rsi.toFixed(2)} > ${this.overbought}`,
        confidence: Math.max(0, (rsi - this.overbought) / (100 - this.overbought)),
        timestamp: bar.timestamp,
      };
    }

    return null;
  }

  private calculateRSI(): number {
    const recentGains = this.gains.slice(-this.period);
    const recentLosses = this.losses.slice(-this.period);

    const avgGain =
      recentGains.reduce((a, b) => a + b, 0) / this.period;
    const avgLoss =
      recentLosses.reduce((a, b) => a + b, 0) / this.period;

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return rsi;
  }

  onStart(initialCapital: number): void {
    this.prices = [];
    this.gains = [];
    this.losses = [];
  }
}
