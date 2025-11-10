# Node.js MCP Client Implementation

## Overview

This document outlines the Node.js MCP client implementation for communicating with the Python backtesting MCP server.

## File Structure

```
server/
├── services/
│   ├── mcp-backtesting-client.ts    # MCP client service
│   ├── backtesting-worker.ts        # Backtesting worker integration
│   └── backtesting-storage.ts       # Backtesting data access layer
├── routes/
│   └── backtesting-routes.ts        # REST API routes for backtesting
└── types/
    └── backtesting.ts               # TypeScript type definitions
```

## Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "zod": "^3.24.2"
  }
}
```

## Implementation

### 1. `server/types/backtesting.ts` - Type Definitions

```typescript
import { z } from 'zod';

// Zod schemas for validation
export const BacktestParamsSchema = z.object({
  strategyId: z.string(),
  assetSymbol: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  initialCapital: z.number().positive(),
  parameters: z.record(z.unknown()),
});

export const BacktestResultSchema = z.object({
  backtestId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  finalCapital: z.number().optional(),
  totalReturn: z.number().optional(),
  metrics: z.record(z.unknown()).optional(),
  trades: z.array(z.unknown()).optional(),
  equityCurve: z.array(z.number()).optional(),
});

// TypeScript types
export type BacktestParams = z.infer<typeof BacktestParamsSchema>;
export type BacktestResult = z.infer<typeof BacktestResultSchema>;

export interface BacktestTrade {
  entryDate: string;
  exitDate: string | null;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  status: 'open' | 'closed';
}

export interface BacktestMetrics {
  finalCapital: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  parametersSchema: Record<string, unknown>;
  defaultParameters?: Record<string, unknown>;
}
```

### 2. `server/services/mcp-backtesting-client.ts` - MCP Client Service

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import { logger } from '../utils/logger';
import type {
  BacktestParams,
  BacktestResult,
  BacktestMetrics,
  TradingStrategy,
} from '../types/backtesting';

export class MCPBacktestingClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;
  private pythonServerPath: string;

  constructor() {
    // Path to Python MCP server
    this.pythonServerPath =
      process.env.PYTHON_BACKTESTING_SERVER_PATH ||
      './server/python-services/backtesting-mcp/main.py';
  }

  async initialize(): Promise<void> {
    if (this.isConnected) {
      logger.warn('MCP client already initialized');
      return;
    }

    try {
      logger.info('Initializing MCP backtesting client', {
        serverPath: this.pythonServerPath,
      });

      // Spawn Python process
      const pythonProcess = spawn('python3', [this.pythonServerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
      });

      // Create stdio transport
      this.transport = new StdioClientTransport({
        stdin: pythonProcess.stdin,
        stdout: pythonProcess.stdout,
        stderr: pythonProcess.stderr,
      });

      // Create MCP client
      this.client = new Client(
        {
          name: 'aitradepro-backend',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      // Connect to server
      await this.client.connect(this.transport);

      this.isConnected = true;

      logger.info('MCP backtesting client initialized successfully');

      // Handle process errors
      pythonProcess.on('error', error => {
        logger.error('Python process error', { error: error.message });
      });

      pythonProcess.on('exit', (code, signal) => {
        logger.warn('Python process exited', { code, signal });
        this.isConnected = false;
      });
    } catch (error) {
      logger.error('Failed to initialize MCP client', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.close();
      this.isConnected = false;
      logger.info('MCP client disconnected');
    }
  }

  private ensureConnected(): void {
    if (!this.isConnected || !this.client) {
      throw new Error('MCP client not connected. Call initialize() first.');
    }
  }

  async runBacktest(params: BacktestParams): Promise<BacktestResult> {
    this.ensureConnected();

    logger.info('Running backtest via MCP', {
      strategy: params.strategyId,
      asset: params.assetSymbol,
    });

    try {
      const result = await this.client!.callTool({
        name: 'run_backtest',
        arguments: {
          strategy_id: params.strategyId,
          asset_symbol: params.assetSymbol,
          start_date: params.startDate,
          end_date: params.endDate,
          initial_capital: params.initialCapital,
          parameters: params.parameters,
        },
      });

      // Parse MCP response
      const resourceContent = result.content.find(
        item => item.type === 'resource'
      );
      if (!resourceContent || resourceContent.type !== 'resource') {
        throw new Error('Invalid MCP response: no resource content');
      }

      const data = JSON.parse(resourceContent.resource.text);

      logger.info('Backtest started', { backtestId: data.backtest_id });

      return {
        backtestId: data.backtest_id,
        status: data.status,
      };
    } catch (error) {
      logger.error('Failed to run backtest', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async getBacktestResults(backtestId: string): Promise<BacktestResult> {
    this.ensureConnected();

    logger.info('Fetching backtest results', { backtestId });

    try {
      const result = await this.client!.callTool({
        name: 'get_backtest_results',
        arguments: {
          backtest_id: backtestId,
        },
      });

      const resourceContent = result.content.find(
        item => item.type === 'resource'
      );
      if (!resourceContent || resourceContent.type !== 'resource') {
        throw new Error('Invalid MCP response: no resource content');
      }

      const data = JSON.parse(resourceContent.resource.text);

      return {
        backtestId: data.backtest_id,
        status: data.status,
        finalCapital: data.final_capital,
        totalReturn: data.total_return,
        metrics: data.metrics,
        trades: data.trades,
        equityCurve: data.equity_curve,
      };
    } catch (error) {
      logger.error('Failed to fetch backtest results', {
        backtestId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async listStrategies(): Promise<TradingStrategy[]> {
    this.ensureConnected();

    logger.info('Fetching available strategies');

    try {
      const result = await this.client!.callTool({
        name: 'list_strategies',
        arguments: {},
      });

      const resourceContent = result.content.find(
        item => item.type === 'resource'
      );
      if (!resourceContent || resourceContent.type !== 'resource') {
        throw new Error('Invalid MCP response: no resource content');
      }

      const strategies = JSON.parse(resourceContent.resource.text);

      return strategies.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        parametersSchema: s.parameters_schema,
        defaultParameters: s.default_parameters,
      }));
    } catch (error) {
      logger.error('Failed to list strategies', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async validateStrategy(strategyConfig: {
    strategyId: string;
    parameters: Record<string, unknown>;
  }): Promise<{ valid: boolean; errors: string[] }> {
    this.ensureConnected();

    logger.info('Validating strategy', {
      strategyId: strategyConfig.strategyId,
    });

    try {
      const result = await this.client!.callTool({
        name: 'validate_strategy',
        arguments: {
          strategy_config: {
            strategy_id: strategyConfig.strategyId,
            parameters: strategyConfig.parameters,
          },
        },
      });

      const resourceContent = result.content.find(
        item => item.type === 'resource'
      );
      if (!resourceContent || resourceContent.type !== 'resource') {
        throw new Error('Invalid MCP response: no resource content');
      }

      const validation = JSON.parse(resourceContent.resource.text);

      return {
        valid: validation.valid,
        errors: validation.errors || [],
      };
    } catch (error) {
      logger.error('Failed to validate strategy', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async getMetrics(
    backtestId: string,
    metricNames?: string[]
  ): Promise<BacktestMetrics> {
    this.ensureConnected();

    logger.info('Fetching backtest metrics', {
      backtestId,
      metrics: metricNames,
    });

    try {
      const result = await this.client!.callTool({
        name: 'get_metrics',
        arguments: {
          backtest_id: backtestId,
          metrics: metricNames || [],
        },
      });

      const resourceContent = result.content.find(
        item => item.type === 'resource'
      );
      if (!resourceContent || resourceContent.type !== 'resource') {
        throw new Error('Invalid MCP response: no resource content');
      }

      const metrics = JSON.parse(resourceContent.resource.text);

      return metrics as BacktestMetrics;
    } catch (error) {
      logger.error('Failed to fetch metrics', {
        backtestId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
}

// Singleton instance
export const mcpBacktestingClient = new MCPBacktestingClient();
```

### 3. `server/services/backtesting-worker.ts` - Worker Integration

```typescript
import { asyncWorkerService, WorkerTask } from './async-workers';
import { mcpBacktestingClient } from './mcp-backtesting-client';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import type { BacktestParams } from '../types/backtesting';

export async function enqueueBacktest(
  params: BacktestParams,
  priority: 'low' | 'medium' | 'high' = 'medium'
): Promise<string> {
  logger.info('Enqueueing backtest task', {
    strategy: params.strategyId,
    asset: params.assetSymbol,
    priority,
  });

  const taskId = await asyncWorkerService.enqueueTask({
    type: 'backtest_strategy',
    payload: params,
    priority,
  });

  return taskId;
}

export async function processBacktestTask(
  task: WorkerTask
): Promise<unknown> {
  const params = task.payload as BacktestParams;

  logger.info('Processing backtest task', {
    taskId: task.id,
    strategy: params.strategyId,
  });

  try {
    // Start backtest via MCP
    const result = await mcpBacktestingClient.runBacktest(params);

    // Poll for completion (simplified - should use event-driven approach)
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s

      const backtestResult = await mcpBacktestingClient.getBacktestResults(
        result.backtestId
      );

      if (backtestResult.status === 'completed') {
        logger.info('Backtest completed', {
          backtestId: result.backtestId,
          finalCapital: backtestResult.finalCapital,
        });

        // Store results in database
        // await storage.saveBacktestResults(backtestResult);

        return backtestResult;
      }

      if (backtestResult.status === 'failed') {
        throw new Error(`Backtest failed: ${result.backtestId}`);
      }

      attempts++;
    }

    throw new Error('Backtest timeout');
  } catch (error) {
    logger.error('Backtest task failed', {
      taskId: task.id,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

// Register backtest task handler with async worker service
export function registerBacktestingWorkers() {
  // This would integrate with the existing async-workers.ts
  // by extending the processTask method to handle backtest tasks
  logger.info('Backtesting workers registered');
}
```

### 4. `server/routes/backtesting-routes.ts` - REST API Routes

```typescript
import type { Express } from 'express';
import { mcpBacktestingClient } from '../services/mcp-backtesting-client';
import { enqueueBacktest } from '../services/backtesting-worker';
import { validateSchema } from '../middleware/validation';
import { BacktestParamsSchema } from '../types/backtesting';
import { logger } from '../utils/logger';

export function registerBacktestingRoutes(app: Express) {
  // List available strategies
  app.get('/api/backtesting/strategies', async (req, res) => {
    try {
      const strategies = await mcpBacktestingClient.listStrategies();
      res.json(strategies);
    } catch (error) {
      logger.error('Failed to fetch strategies', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ message: 'Failed to fetch strategies' });
    }
  });

  // Start a backtest
  app.post(
    '/api/backtesting/run',
    validateSchema({ body: BacktestParamsSchema }),
    async (req, res) => {
      try {
        const params = req.body;

        // Validate strategy first
        const validation = await mcpBacktestingClient.validateStrategy({
          strategyId: params.strategyId,
          parameters: params.parameters,
        });

        if (!validation.valid) {
          return res.status(400).json({
            message: 'Invalid strategy configuration',
            errors: validation.errors,
          });
        }

        // Enqueue backtest task
        const taskId = await enqueueBacktest(params, 'medium');

        res.json({
          taskId,
          status: 'queued',
          message: 'Backtest queued successfully',
        });
      } catch (error) {
        logger.error('Failed to start backtest', {
          error: error instanceof Error ? error.message : error,
        });
        res.status(500).json({ message: 'Failed to start backtest' });
      }
    }
  );

  // Get backtest results
  app.get('/api/backtesting/results/:backtestId', async (req, res) => {
    try {
      const { backtestId } = req.params;
      const results = await mcpBacktestingClient.getBacktestResults(
        backtestId
      );

      res.json(results);
    } catch (error) {
      logger.error('Failed to fetch backtest results', {
        backtestId: req.params.backtestId,
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ message: 'Failed to fetch backtest results' });
    }
  });

  // Get backtest metrics
  app.get('/api/backtesting/metrics/:backtestId', async (req, res) => {
    try {
      const { backtestId } = req.params;
      const metricNames = req.query.metrics
        ? (req.query.metrics as string).split(',')
        : undefined;

      const metrics = await mcpBacktestingClient.getMetrics(
        backtestId,
        metricNames
      );

      res.json(metrics);
    } catch (error) {
      logger.error('Failed to fetch metrics', {
        backtestId: req.params.backtestId,
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ message: 'Failed to fetch metrics' });
    }
  });

  // Validate strategy configuration
  app.post('/api/backtesting/validate-strategy', async (req, res) => {
    try {
      const { strategyId, parameters } = req.body;

      const validation = await mcpBacktestingClient.validateStrategy({
        strategyId,
        parameters,
      });

      res.json(validation);
    } catch (error) {
      logger.error('Failed to validate strategy', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ message: 'Failed to validate strategy' });
    }
  });
}
```

### 5. Integration with `server/index.ts`

Add to `server/index.ts`:

```typescript
import { mcpBacktestingClient } from './services/mcp-backtesting-client';
import { registerBacktestingRoutes } from './routes/backtesting-routes';
import { registerBacktestingWorkers } from './services/backtesting-worker';

// In the startup sequence
async function startServer() {
  // ... existing code ...

  // Initialize MCP backtesting client
  try {
    await mcpBacktestingClient.initialize();
    logger.info('MCP backtesting client initialized');
  } catch (error) {
    logger.error('Failed to initialize MCP client', {
      error: error instanceof Error ? error.message : error,
    });
    // Continue without backtesting features
  }

  // Register backtesting routes
  registerBacktestingRoutes(app);

  // Register backtesting workers
  registerBacktestingWorkers();

  // ... rest of startup ...
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mcpBacktestingClient.disconnect();
  process.exit(0);
});
```

## Testing

```typescript
// tests/mcp-backtesting-client.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mcpBacktestingClient } from '../services/mcp-backtesting-client';

describe('MCP Backtesting Client', () => {
  beforeAll(async () => {
    await mcpBacktestingClient.initialize();
  });

  afterAll(async () => {
    await mcpBacktestingClient.disconnect();
  });

  it('should list available strategies', async () => {
    const strategies = await mcpBacktestingClient.listStrategies();
    expect(strategies).toBeInstanceOf(Array);
    expect(strategies.length).toBeGreaterThan(0);
  });

  it('should validate strategy configuration', async () => {
    const validation = await mcpBacktestingClient.validateStrategy({
      strategyId: 'sma_crossover',
      parameters: {
        fast_period: 10,
        slow_period: 30,
      },
    });

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should run a backtest', async () => {
    const result = await mcpBacktestingClient.runBacktest({
      strategyId: 'sma_crossover',
      assetSymbol: 'BTC',
      startDate: '2023-01-01T00:00:00Z',
      endDate: '2023-12-31T23:59:59Z',
      initialCapital: 10000,
      parameters: {
        fast_period: 10,
        slow_period: 30,
      },
    });

    expect(result.backtestId).toBeDefined();
    expect(result.status).toBe('running');
  });
});
```

## Environment Variables

Add to `.env`:

```bash
# Python MCP Backtesting Server
PYTHON_BACKTESTING_SERVER_PATH=./server/python-services/backtesting-mcp/main.py
```

## Next Steps

1. Install MCP SDK: `npm install @modelcontextprotocol/sdk`
2. Create type definitions
3. Implement MCP client service
4. Integrate with existing async worker service
5. Add REST API routes
6. Write tests
7. Update server initialization
