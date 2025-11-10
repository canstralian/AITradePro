import { Router } from 'express';
import { backtestingService } from './service';
import { backtestConfigSchema } from './types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/backtesting/strategies
 * Get all available strategies
 */
router.get('/strategies', async (req, res) => {
  try {
    const strategies = backtestingService.getAvailableStrategies();
    res.json({ strategies });
  } catch (error) {
    logger.error('Failed to get strategies', { error });
    res.status(500).json({ error: 'Failed to get strategies' });
  }
});

/**
 * GET /api/backtesting/strategies/:id
 * Get strategy by ID
 */
router.get('/strategies/:id', async (req, res) => {
  try {
    const strategy = await backtestingService.getStrategy(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }
    
    res.json(strategy);
  } catch (error) {
    logger.error('Failed to get strategy', { error });
    res.status(500).json({ error: 'Failed to get strategy' });
  }
});

/**
 * POST /api/backtesting/strategies
 * Create a new strategy
 */
router.post('/strategies', async (req, res) => {
  try {
    const { name, description, type, parameters } = req.body;
    
    if (!name || !description || !type || !parameters) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, description, type, parameters' 
      });
    }

    const id = await backtestingService.createStrategy({
      name,
      description,
      type,
      parameters,
      isActive: true,
    });

    res.json({ id, message: 'Strategy created successfully' });
  } catch (error) {
    logger.error('Failed to create strategy', { error });
    res.status(500).json({ error: 'Failed to create strategy' });
  }
});

/**
 * POST /api/backtesting/run
 * Run a backtest
 */
router.post('/run', async (req, res) => {
  try {
    const config = backtestConfigSchema.parse(req.body);
    const runId = await backtestingService.runBacktest(config);
    
    res.json({ 
      runId, 
      message: 'Backtest started',
      status: 'running',
    });
  } catch (error) {
    logger.error('Failed to start backtest', { error });
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Failed to start backtest' 
    });
  }
});

/**
 * GET /api/backtesting/runs
 * Get all backtest runs
 */
router.get('/runs', async (req, res) => {
  try {
    // Validate and cap limit parameter to prevent DoS
    let limit = parseInt(req.query.limit as string, 10);
    if (isNaN(limit) || limit < 1) {
      limit = 50;
    } else {
      limit = Math.min(limit, 1000); // Cap at 1000 for security
    }
    const runs = await backtestingService.getBacktestRuns(limit);
    res.json({ runs });
  } catch (error) {
    logger.error('Failed to get backtest runs', { error });
    res.status(500).json({ error: 'Failed to get backtest runs' });
  }
});

/**
 * GET /api/backtesting/runs/:id
 * Get backtest run by ID
 */
router.get('/runs/:id', async (req, res) => {
  try {
    const run = await backtestingService.getBacktestRun(req.params.id);
    
    if (!run) {
      return res.status(404).json({ error: 'Backtest run not found' });
    }
    
    res.json(run);
  } catch (error) {
    logger.error('Failed to get backtest run', { error });
    res.status(500).json({ error: 'Failed to get backtest run' });
  }
});

/**
 * GET /api/backtesting/runs/:id/trades
 * Get trades for a backtest run
 */
router.get('/runs/:id/trades', async (req, res) => {
  try {
    const trades = await backtestingService.getBacktestTrades(req.params.id);
    res.json({ trades });
  } catch (error) {
    logger.error('Failed to get backtest trades', { error });
    res.status(500).json({ error: 'Failed to get backtest trades' });
  }
});

/**
 * GET /api/backtesting/runs/:id/performance
 * Get performance data for a backtest run
 */
router.get('/runs/:id/performance', async (req, res) => {
  try {
    const performance = await backtestingService.getBacktestPerformance(req.params.id);
    res.json({ performance });
  } catch (error) {
    logger.error('Failed to get backtest performance', { error });
    res.status(500).json({ error: 'Failed to get backtest performance' });
  }
});

/**
 * POST /api/backtesting/paper-trading/start
 * Start a paper trading session
 */
router.post('/paper-trading/start', async (req, res) => {
  try {
    const { strategyId, symbol, initialCapital } = req.body;
    
    if (!strategyId || !symbol || !initialCapital) {
      return res.status(400).json({ 
        error: 'Missing required fields: strategyId, symbol, initialCapital' 
      });
    }

    const sessionId = await backtestingService.startPaperTrading(
      strategyId,
      symbol,
      parseFloat(initialCapital)
    );

    res.json({ 
      sessionId, 
      message: 'Paper trading session started',
    });
  } catch (error) {
    logger.error('Failed to start paper trading', { error });
    res.status(500).json({ error: 'Failed to start paper trading' });
  }
});

/**
 * POST /api/backtesting/paper-trading/:id/stop
 * Stop a paper trading session
 */
router.post('/paper-trading/:id/stop', async (req, res) => {
  try {
    await backtestingService.stopPaperTrading(req.params.id);
    res.json({ message: 'Paper trading session stopped' });
  } catch (error) {
    logger.error('Failed to stop paper trading', { error });
    res.status(500).json({ error: 'Failed to stop paper trading' });
  }
});

/**
 * GET /api/backtesting/paper-trading/sessions
 * Get paper trading sessions
 */
router.get('/paper-trading/sessions', async (req, res) => {
  try {
    const activeOnly = req.query.active === 'true';
    const sessions = await backtestingService.getPaperTradingSessions(activeOnly);
    res.json({ sessions });
  } catch (error) {
    logger.error('Failed to get paper trading sessions', { error });
    res.status(500).json({ error: 'Failed to get paper trading sessions' });
  }
});

export default router;
