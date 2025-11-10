import { WebSocket } from 'ws';
import { getDatabase } from '../db';
import { 
  strategies, 
  backtestRuns, 
  backtestTrades,
  backtestPerformance,
  paperTradingSessions,
  InsertStrategy,
} from '../../shared/backtesting-schema';
import { strategyRegistry } from './strategy';
import { BacktestEngine } from './engine';
import { BacktestConfig } from './types';
import { logger } from '../utils/logger';
import { eq, desc } from 'drizzle-orm';
import { MovingAverageCrossoverStrategy } from './strategies/moving-average';
import { RSIStrategy } from './strategies/rsi';

/**
 * BacktestingService - manages backtesting operations
 */
export class BacktestingService {
  private connectedClients: Set<WebSocket> = new Set();

  constructor() {
    this.registerDefaultStrategies();
  }

  /**
   * Register default strategies
   */
  private registerDefaultStrategies(): void {
    strategyRegistry.register(new MovingAverageCrossoverStrategy());
    strategyRegistry.register(new RSIStrategy());
  }

  /**
   * Add WebSocket client
   */
  addClient(ws: WebSocket): void {
    this.connectedClients.add(ws);
    ws.on('close', () => {
      this.connectedClients.delete(ws);
    });
  }

  /**
   * Broadcast message to all clients
   */
  private broadcast(message: any): void {
    const payload = JSON.stringify(message);
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  /**
   * Create a new strategy
   */
  async createStrategy(data: Omit<InsertStrategy, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const db = getDatabase();
    const id = `strategy_${Date.now()}`;
    
    await (db as any).insert(strategies).values({
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return id;
  }

  /**
   * Get all strategies
   */
  async getStrategies(): Promise<any[]> {
    const db = getDatabase();
    return await (db as any).select().from(strategies).orderBy(desc(strategies.createdAt));
  }

  /**
   * Get strategy by ID
   */
  async getStrategy(id: string): Promise<any> {
    const db = getDatabase();
    const results = await (db as any).select().from(strategies).where(eq(strategies.id, id));
    return results[0] || null;
  }

  /**
   * Run a backtest
   */
  async runBacktest(config: BacktestConfig): Promise<string> {
    const strategy = strategyRegistry.get(config.strategyId);
    
    if (!strategy) {
      throw new Error(`Strategy not found: ${config.strategyId}`);
    }

    const engine = new BacktestEngine(strategy, config);
    
    // Run backtest in background
    this.executeBacktestAsync(engine, strategy.name);
    
    return engine.getRunId();
  }

  /**
   * Execute backtest asynchronously
   */
  private async executeBacktestAsync(engine: BacktestEngine, strategyName: string): Promise<void> {
    try {
      const runId = engine.getRunId();
      
      this.broadcast({
        type: 'backtest_started',
        data: { runId, strategyName },
      });

      const result = await engine.run();
      
      this.broadcast({
        type: 'backtest_completed',
        data: { 
          runId, 
          metrics: result.metrics,
          finalValue: result.finalPortfolio.totalValue,
        },
      });

      logger.info(`Backtest completed: ${runId}`);
    } catch (error) {
      logger.error('Backtest execution failed', { error });
      
      this.broadcast({
        type: 'backtest_failed',
        data: { 
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Get backtest runs
   */
  async getBacktestRuns(limit: number = 50): Promise<any[]> {
    const db = getDatabase();
    return await (db as any)
      .select()
      .from(backtestRuns)
      .orderBy(desc(backtestRuns.createdAt))
      .limit(limit);
  }

  /**
   * Get backtest run by ID
   */
  async getBacktestRun(id: string): Promise<any> {
    const db = getDatabase();
    const results = await (db as any).select().from(backtestRuns).where(eq(backtestRuns.id, id));
    return results[0] || null;
  }

  /**
   * Get backtest trades
   */
  async getBacktestTrades(runId: string): Promise<any[]> {
    const db = getDatabase();
    return await (db as any)
      .select()
      .from(backtestTrades)
      .where(eq(backtestTrades.backtestRunId, runId))
      .orderBy(backtestTrades.timestamp);
  }

  /**
   * Get backtest performance data
   */
  async getBacktestPerformance(runId: string): Promise<any[]> {
    const db = getDatabase();
    return await (db as any)
      .select()
      .from(backtestPerformance)
      .where(eq(backtestPerformance.backtestRunId, runId))
      .orderBy(backtestPerformance.timestamp);
  }

  /**
   * Get available strategies from registry
   */
  getAvailableStrategies(): Array<{ id: string; name: string; description: string }> {
    return strategyRegistry.list();
  }

  /**
   * Start paper trading session
   */
  async startPaperTrading(strategyId: string, symbol: string, initialCapital: number): Promise<string> {
    const db = getDatabase();
    const id = `session_${Date.now()}`;

    await (db as any).insert(paperTradingSessions).values({
      id,
      strategyId,
      name: `Paper Trading - ${new Date().toISOString()}`,
      assetSymbol: symbol,
      initialCapital: initialCapital.toFixed(2),
      currentCapital: initialCapital.toFixed(2),
      isActive: true,
      startedAt: new Date(),
    });

    this.broadcast({
      type: 'paper_trading_started',
      data: { sessionId: id, strategyId, symbol },
    });

    return id;
  }

  /**
   * Stop paper trading session
   */
  async stopPaperTrading(sessionId: string): Promise<void> {
    const db = getDatabase();
    
    await (db as any)
      .update(paperTradingSessions)
      .set({ 
        isActive: false, 
        stoppedAt: new Date(),
      })
      .where(eq(paperTradingSessions.id, sessionId));

    this.broadcast({
      type: 'paper_trading_stopped',
      data: { sessionId },
    });
  }

  /**
   * Get paper trading sessions
   */
  async getPaperTradingSessions(activeOnly: boolean = false): Promise<any[]> {
    const db = getDatabase();
    const query = (db as any).select().from(paperTradingSessions);
    
    if (activeOnly) {
      return await query.where(eq(paperTradingSessions.isActive, true));
    }
    
    return await query.orderBy(desc(paperTradingSessions.startedAt));
  }
}

// Export singleton instance
export const backtestingService = new BacktestingService();
