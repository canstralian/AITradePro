import { nanoid } from 'nanoid';
import { getDatabase } from '../db';
import { 
  backtestRuns, 
  backtestTrades, 
  backtestPerformance,
  InsertBacktestRun,
  InsertBacktestTrade,
  InsertBacktestPerformance,
} from '../../shared/backtesting-schema';
import { marketData } from '../../shared/schema';
import { HistoricalClock } from './clocks';
import { PaperBroker } from './broker';
import { IStrategy, BacktestConfig, BacktestResult, MarketBar, OrderSide, OrderType } from './types';
import { Analytics } from './analytics';
import { logger } from '../utils/logger';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

/**
 * BacktestEngine - runs backtests on historical data
 */
export class BacktestEngine {
  private strategy: IStrategy;
  private config: BacktestConfig;
  private clock: HistoricalClock;
  private broker: PaperBroker;
  private runId: string;
  private equityCurve: Array<{ timestamp: Date; value: number }> = [];

  constructor(strategy: IStrategy, config: BacktestConfig) {
    this.strategy = strategy;
    this.config = config;
    this.runId = nanoid();
    
    const startDate = typeof config.startDate === 'string' 
      ? new Date(config.startDate) 
      : config.startDate;
    
    this.clock = new HistoricalClock(startDate);
    this.broker = new PaperBroker(
      config.initialCapital,
      config.commission || 0.001,
      config.slippage || 0.0005,
      this.clock
    );
  }

  /**
   * Run the backtest
   */
  async run(): Promise<BacktestResult> {
    const db = getDatabase();
    
    try {
      // Create backtest run record
      await this.createBacktestRun();
      
      // Update status to running
      await (db as any).update(backtestRuns)
        .set({ status: 'running' })
        .where(eq(backtestRuns.id, this.runId));

      // Fetch historical data
      const historicalData = await this.fetchHistoricalData();
      
      if (historicalData.length === 0) {
        throw new Error('No historical data available for the specified period');
      }

      logger.info(`Starting backtest with ${historicalData.length} data points`);

      // Initialize strategy
      this.strategy.initialize(this.strategy.parameters);
      if (this.strategy.onStart) {
        this.strategy.onStart(this.config.initialCapital);
      }

      // Run simulation
      for (const bar of historicalData) {
        await this.processBar(bar);
      }

      // Finalize strategy
      if (this.strategy.onEnd) {
        this.strategy.onEnd(this.broker.getPortfolio());
      }

      // Calculate metrics
      const orders = this.broker.getOrders();
      const metrics = Analytics.calculateMetrics(
        orders,
        this.equityCurve,
        this.config.initialCapital
      );

      const drawdownCurve = Analytics.generateDrawdownCurve(this.equityCurve);
      const finalPortfolio = this.broker.getPortfolio();

      // Update backtest run with results
      await (db as any).update(backtestRuns)
        .set({
          status: 'completed',
          finalCapital: finalPortfolio.totalValue.toFixed(2),
          totalReturn: metrics.totalReturn.toFixed(4),
          sharpeRatio: metrics.sharpeRatio.toFixed(4),
          maxDrawdown: metrics.maxDrawdown.toFixed(4),
          winRate: metrics.winRate.toFixed(2),
          totalTrades: metrics.totalTrades,
          winningTrades: metrics.winningTrades,
          losingTrades: metrics.losingTrades,
          completedAt: new Date(),
        })
        .where(eq(backtestRuns.id, this.runId));

      logger.info(`Backtest completed: ${this.runId}`);

      return {
        runId: this.runId,
        strategyId: this.strategy.id,
        config: this.config,
        metrics,
        trades: orders,
        equityCurve: this.equityCurve,
        drawdownCurve,
        finalPortfolio,
      };
    } catch (error) {
      logger.error('Backtest failed', { error, runId: this.runId });
      
      // Update status to failed
      await (db as any).update(backtestRuns)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(backtestRuns.id, this.runId));

      throw error;
    }
  }

  /**
   * Process a single market bar
   */
  private async processBar(bar: MarketBar): Promise<void> {
    // Update broker with current price
    this.broker.updatePrice(this.config.symbol, bar.close);

    // Get signal from strategy
    const signal = await this.strategy.onBar(bar, this.broker);

    // Execute signal if present
    if (signal && signal.action !== 'hold') {
      try {
        if (signal.action === 'buy' && signal.quantity) {
          const order = await this.broker.submitOrder({
            symbol: this.config.symbol,
            side: OrderSide.BUY,
            type: OrderType.MARKET,
            quantity: signal.quantity,
          });
          
          await this.persistTrade(order);
        } else if (signal.action === 'sell' && signal.quantity) {
          const order = await this.broker.submitOrder({
            symbol: this.config.symbol,
            side: OrderSide.SELL,
            type: OrderType.MARKET,
            quantity: signal.quantity,
          });
          
          await this.persistTrade(order);
        }
      } catch (error) {
        logger.warn('Failed to execute order', { error, signal });
      }
    }

    // Record portfolio value
    const portfolio = this.broker.getPortfolio();
    this.equityCurve.push({
      timestamp: bar.timestamp,
      value: portfolio.totalValue,
    });

    // Persist performance snapshot periodically
    if (this.equityCurve.length % 10 === 0) {
      await this.persistPerformance(bar.timestamp);
    }

    // Advance clock
    this.clock.advance();
  }

  /**
   * Fetch historical market data
   */
  private async fetchHistoricalData(): Promise<MarketBar[]> {
    const db = getDatabase();
    const startDate = typeof this.config.startDate === 'string'
      ? new Date(this.config.startDate)
      : this.config.startDate;
    const endDate = typeof this.config.endDate === 'string'
      ? new Date(this.config.endDate)
      : this.config.endDate;

    // Query market data
    const data = await (db as any).select()
      .from(marketData)
      .where(
        and(
          gte(marketData.timestamp, startDate),
          lte(marketData.timestamp, endDate)
        )
      )
      .orderBy(marketData.timestamp);

    // Convert to market bars (using close price for all OHLC for simplicity)
    return data.map((d: any) => ({
      timestamp: d.timestamp,
      open: parseFloat(d.price),
      high: parseFloat(d.price) * 1.001,
      low: parseFloat(d.price) * 0.999,
      close: parseFloat(d.price),
      volume: parseFloat(d.volume),
    }));
  }

  /**
   * Create backtest run record
   */
  private async createBacktestRun(): Promise<void> {
    const db = getDatabase();
    const startDate = typeof this.config.startDate === 'string'
      ? new Date(this.config.startDate)
      : this.config.startDate;
    const endDate = typeof this.config.endDate === 'string'
      ? new Date(this.config.endDate)
      : this.config.endDate;

    const run: InsertBacktestRun = {
      id: this.runId,
      strategyId: this.strategy.id,
      name: `${this.strategy.name} - ${new Date().toISOString()}`,
      assetSymbol: this.config.symbol,
      startDate,
      endDate,
      initialCapital: this.config.initialCapital.toFixed(2),
      status: 'pending',
    };

    await (db as any).insert(backtestRuns).values(run);
  }

  /**
   * Persist trade to database
   */
  private async persistTrade(order: any): Promise<void> {
    const db = getDatabase();
    const portfolio = this.broker.getPortfolio();

    // Determine if this is opening or closing a position
    const position = this.broker.getPosition(this.config.symbol);
    const isClosing = position && order.side === 'sell';
    
    const trade: InsertBacktestTrade = {
      id: nanoid(),
      backtestRunId: this.runId,
      assetSymbol: this.config.symbol,
      type: order.side,
      direction: order.side === 'buy' ? 'long' : 'short', // Determine position direction
      orderType: order.type,
      quantity: order.quantity.toFixed(8),
      price: (order.filledPrice || 0).toFixed(8),
      exitPrice: isClosing ? (order.filledPrice || 0).toFixed(8) : undefined,
      commission: (order.commission || 0).toFixed(8),
      slippage: (order.slippage || 0).toFixed(8),
      total: ((order.filledPrice || 0) * order.quantity).toFixed(2),
      portfolioValue: portfolio.totalValue.toFixed(2),
      status: isClosing ? 'closed' : 'open',
      openedAt: order.timestamp,
      closedAt: isClosing ? order.timestamp : undefined,
      timestamp: order.timestamp,
    };

    await (db as any).insert(backtestTrades).values(trade);
  }

  /**
   * Persist performance snapshot
   */
  private async persistPerformance(timestamp: Date): Promise<void> {
    const db = getDatabase();
    const portfolio = this.broker.getPortfolio();
    
    let positionValue = 0;
    const positionsArray = Array.from(portfolio.positions.values());
    for (const position of positionsArray) {
      positionValue += position.currentPrice * position.quantity;
    }

    const totalReturn = 
      ((portfolio.totalValue - portfolio.initialCapital) / portfolio.initialCapital) * 100;

    const peakValue = Math.max(...this.equityCurve.map(p => p.value));
    const drawdown = peakValue > 0 
      ? ((peakValue - portfolio.totalValue) / peakValue) * 100 
      : 0;

    const performance: InsertBacktestPerformance = {
      id: nanoid(),
      backtestRunId: this.runId,
      timestamp,
      portfolioValue: portfolio.totalValue.toFixed(2),
      cashBalance: portfolio.cash.toFixed(2),
      positionValue: positionValue.toFixed(2),
      totalReturn: totalReturn.toFixed(4),
      drawdown: drawdown.toFixed(4),
    };

    await (db as any).insert(backtestPerformance).values(performance);
  }
}
