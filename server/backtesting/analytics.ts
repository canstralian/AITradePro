import { Order, OrderSide, PerformanceMetrics, Portfolio } from './types';

/**
 * Analytics - calculates performance metrics for backtest results
 */
export class Analytics {
  /**
   * Calculate comprehensive performance metrics
   */
  static calculateMetrics(
    trades: Order[],
    equityCurve: Array<{ timestamp: Date; value: number }>,
    initialCapital: number
  ): PerformanceMetrics {
    const filledTrades = trades.filter(t => t.filledPrice);
    
    // Calculate returns
    const finalValue = equityCurve.length > 0 
      ? equityCurve[equityCurve.length - 1].value 
      : initialCapital;
    const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;

    // Calculate annualized return
    const daysDuration = this.calculateDurationInDays(equityCurve);
    const annualizedReturn = daysDuration > 0
      ? (Math.pow(finalValue / initialCapital, 365 / daysDuration) - 1) * 100
      : 0;

    // Calculate Sharpe ratio
    const sharpeRatio = this.calculateSharpeRatio(equityCurve);

    // Calculate max drawdown
    const { maxDrawdown, maxDrawdownDuration } = this.calculateMaxDrawdown(equityCurve);

    // Trade statistics
    const { winningTrades, losingTrades, wins, losses } = this.categorizeTradesByPnL(filledTrades);
    const totalTrades = filledTrades.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const averageWin = wins.length > 0 
      ? wins.reduce((a, b) => a + b, 0) / wins.length 
      : 0;
    const averageLoss = losses.length > 0 
      ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) 
      : 0;

    const totalWins = wins.reduce((a, b) => a + b, 0);
    const totalLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const largestWin = wins.length > 0 ? Math.max(...wins) : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses) : 0;

    return {
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      maxDrawdown,
      maxDrawdownDuration,
      winRate,
      profitFactor,
      totalTrades,
      winningTrades,
      losingTrades,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
    };
  }

  /**
   * Calculate Sharpe ratio (assumes risk-free rate of 2%)
   */
  private static calculateSharpeRatio(
    equityCurve: Array<{ timestamp: Date; value: number }>
  ): number {
    if (equityCurve.length < 2) {
      return 0;
    }

    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const returnPct =
        (equityCurve[i].value - equityCurve[i - 1].value) /
        equityCurve[i - 1].value;
      returns.push(returnPct);
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = this.calculateStdDev(returns);

    if (stdDev === 0) {
      return 0;
    }

    const riskFreeRate = 0.02 / 252; // 2% annual, daily
    return ((avgReturn - riskFreeRate) / stdDev) * Math.sqrt(252);
  }

  /**
   * Calculate standard deviation
   */
  private static calculateStdDev(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate maximum drawdown and duration
   */
  private static calculateMaxDrawdown(
    equityCurve: Array<{ timestamp: Date; value: number }>
  ): { maxDrawdown: number; maxDrawdownDuration: number } {
    if (equityCurve.length === 0) {
      return { maxDrawdown: 0, maxDrawdownDuration: 0 };
    }

    let maxDrawdown = 0;
    let maxDrawdownDuration = 0;
    let peak = equityCurve[0].value;
    let peakIndex = 0;

    for (let i = 0; i < equityCurve.length; i++) {
      const currentValue = equityCurve[i].value;

      if (currentValue > peak) {
        peak = currentValue;
        peakIndex = i;
      }

      const drawdown = ((peak - currentValue) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownDuration = i - peakIndex;
      }
    }

    return { maxDrawdown, maxDrawdownDuration };
  }

  /**
   * Categorize trades by P&L
   */
  private static categorizeTradesByPnL(trades: Order[]): {
    winningTrades: number;
    losingTrades: number;
    wins: number[];
    losses: number[];
  } {
    const wins: number[] = [];
    const losses: number[] = [];

    // Group trades into pairs (buy + sell)
    const buyTrades = trades.filter(t => t.side === OrderSide.BUY);
    const sellTrades = trades.filter(t => t.side === OrderSide.SELL);

    for (let i = 0; i < Math.min(buyTrades.length, sellTrades.length); i++) {
      const buy = buyTrades[i];
      const sell = sellTrades[i];

      if (buy.filledPrice && sell.filledPrice) {
        const pnl =
          (sell.filledPrice - buy.filledPrice) * sell.quantity -
          (buy.commission || 0) -
          (sell.commission || 0);

        if (pnl > 0) {
          wins.push(pnl);
        } else {
          losses.push(pnl);
        }
      }
    }

    return {
      winningTrades: wins.length,
      losingTrades: losses.length,
      wins,
      losses,
    };
  }

  /**
   * Calculate duration in days
   */
  private static calculateDurationInDays(
    equityCurve: Array<{ timestamp: Date; value: number }>
  ): number {
    if (equityCurve.length < 2) {
      return 0;
    }

    const start = equityCurve[0].timestamp.getTime();
    const end = equityCurve[equityCurve.length - 1].timestamp.getTime();
    return (end - start) / (1000 * 60 * 60 * 24);
  }

  /**
   * Generate drawdown curve
   */
  static generateDrawdownCurve(
    equityCurve: Array<{ timestamp: Date; value: number }>
  ): Array<{ timestamp: Date; drawdown: number }> {
    const drawdownCurve: Array<{ timestamp: Date; drawdown: number }> = [];
    let peak = 0;

    for (const point of equityCurve) {
      if (point.value > peak) {
        peak = point.value;
      }

      const drawdown = peak > 0 ? ((peak - point.value) / peak) * 100 : 0;
      drawdownCurve.push({
        timestamp: point.timestamp,
        drawdown,
      });
    }

    return drawdownCurve;
  }
}
