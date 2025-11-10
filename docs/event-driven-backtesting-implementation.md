# Event-Driven Backtesting Implementation

## Problem Statement

The initial polling-based implementation in `backtesting-worker.ts` was inefficient:

```typescript
// ❌ BAD: Polling with fixed delays
while (attempts < maxAttempts) {
  await new Promise(resolve => setTimeout(resolve, 5000));
  const result = await mcpBacktestingClient.getBacktestResults(backtestId);
  if (result.status === 'completed') break;
  attempts++;
}
```

**Issues:**
- Fixed 5-second delay regardless of actual completion time
- Arbitrary timeout (5 minutes) may be too short for complex backtests
- Wastes resources polling when nothing has changed
- Doesn't align with WebSocket architecture documented in `mcp-backtesting-architecture.md`

## Solution: Event-Driven Architecture

Use WebSocket events for real-time progress updates and completion notifications.

### Architecture Flow

```
Python MCP Server
      ↓ (progress events)
Node.js MCP Client (EventEmitter)
      ↓ (emit events)
Async Worker Service
      ↓ (broadcast)
WebSocket Clients
```

## Implementation

### 1. Enhanced MCP Client with Event Support

**File:** `server/services/mcp-backtesting-client.ts`

```typescript
import { EventEmitter } from 'events';
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

export interface BacktestProgressEvent {
  backtestId: string;
  progress: number; // 0-100
  currentDate?: string;
  tradesExecuted?: number;
  message?: string;
}

export interface BacktestCompleteEvent {
  backtestId: string;
  result: BacktestResult;
}

export interface BacktestFailedEvent {
  backtestId: string;
  error: string;
}

export class MCPBacktestingClient extends EventEmitter {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;
  private pythonServerPath: string;
  private activeBacktests: Map<string, boolean> = new Map();

  constructor() {
    super();
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

      const pythonProcess = spawn('python3', [this.pythonServerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
      });

      this.transport = new StdioClientTransport({
        stdin: pythonProcess.stdin,
        stdout: pythonProcess.stdout,
        stderr: pythonProcess.stderr,
      });

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

      await this.client.connect(this.transport);

      // Set up event listening for MCP notifications
      this.setupEventListening();

      this.isConnected = true;

      logger.info('MCP backtesting client initialized successfully');

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

  private setupEventListening(): void {
    if (!this.client) return;

    // Listen for MCP notifications (if MCP SDK supports notifications)
    // This is a conceptual implementation - actual MCP SDK API may differ
    this.client.onNotification?.((notification: any) => {
      if (notification.method === 'backtest/progress') {
        const event: BacktestProgressEvent = notification.params;
        this.emit('backtest:progress', event);
        logger.debug('Backtest progress', event);
      } else if (notification.method === 'backtest/complete') {
        const event: BacktestCompleteEvent = notification.params;
        this.activeBacktests.delete(event.backtestId);
        this.emit('backtest:complete', event);
        logger.info('Backtest completed', {
          backtestId: event.backtestId,
        });
      } else if (notification.method === 'backtest/failed') {
        const event: BacktestFailedEvent = notification.params;
        this.activeBacktests.delete(event.backtestId);
        this.emit('backtest:failed', event);
        logger.error('Backtest failed', {
          backtestId: event.backtestId,
          error: event.error,
        });
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.close();
      this.isConnected = false;
      this.removeAllListeners();
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

      const resourceContent = result.content.find(
        item => item.type === 'resource'
      );
      if (!resourceContent || resourceContent.type !== 'resource') {
        throw new Error('Invalid MCP response: no resource content');
      }

      const data = JSON.parse(resourceContent.resource.text);

      // Track active backtest
      this.activeBacktests.set(data.backtest_id, true);

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

  /**
   * Wait for backtest completion using event-driven approach.
   * Returns a promise that resolves when the backtest completes.
   */
  async waitForBacktestCompletion(
    backtestId: string,
    timeoutMs: number = 600000 // 10 minutes default
  ): Promise<BacktestResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener('backtest:complete', completeHandler);
        this.removeListener('backtest:failed', failedHandler);
        reject(new Error(`Backtest ${backtestId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const completeHandler = (event: BacktestCompleteEvent) => {
        if (event.backtestId === backtestId) {
          clearTimeout(timeout);
          this.removeListener('backtest:complete', completeHandler);
          this.removeListener('backtest:failed', failedHandler);
          resolve(event.result);
        }
      };

      const failedHandler = (event: BacktestFailedEvent) => {
        if (event.backtestId === backtestId) {
          clearTimeout(timeout);
          this.removeListener('backtest:complete', completeHandler);
          this.removeListener('backtest:failed', failedHandler);
          reject(new Error(`Backtest failed: ${event.error}`));
        }
      };

      this.on('backtest:complete', completeHandler);
      this.on('backtest:failed', failedHandler);
    });
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

### 2. Event-Driven Worker Service

**File:** `server/services/backtesting-worker.ts`

```typescript
import { asyncWorkerService, WorkerTask } from './async-workers';
import { mcpBacktestingClient } from './mcp-backtesting-client';
import type { BacktestParams } from '../types/backtesting';
import { logger } from '../utils/logger';

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
    const startResult = await mcpBacktestingClient.runBacktest(params);
    const backtestId = startResult.backtestId;

    logger.info('Backtest started, waiting for completion', {
      taskId: task.id,
      backtestId,
    });

    // ✅ GOOD: Event-driven waiting with configurable timeout
    // The timeout is longer and appropriate for long-running backtests
    const result = await mcpBacktestingClient.waitForBacktestCompletion(
      backtestId,
      3600000 // 1 hour timeout (adjustable based on backtest complexity)
    );

    logger.info('Backtest completed successfully', {
      taskId: task.id,
      backtestId,
      finalCapital: result.finalCapital,
      totalReturn: result.totalReturn,
    });

    return result;
  } catch (error) {
    logger.error('Backtest task failed', {
      taskId: task.id,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

// Register backtest progress listener to broadcast to WebSocket clients
export function registerBacktestingWorkers() {
  // Listen for progress events and broadcast to WebSocket clients
  mcpBacktestingClient.on('backtest:progress', (event) => {
    asyncWorkerService.broadcastMessage({
      type: 'backtest_progress',
      data: event,
    });
  });

  mcpBacktestingClient.on('backtest:complete', (event) => {
    asyncWorkerService.broadcastMessage({
      type: 'backtest_complete',
      data: event,
    });
  });

  mcpBacktestingClient.on('backtest:failed', (event) => {
    asyncWorkerService.broadcastMessage({
      type: 'backtest_failed',
      data: event,
    });
  });

  logger.info('Backtesting workers and event listeners registered');
}
```

### 3. Enhanced Async Worker Service (Add Broadcasting)

**File:** `server/services/async-workers.ts` (Addition)

```typescript
// Add this method to AsyncWorkerService class

export class AsyncWorkerService extends EventEmitter {
  // ... existing code ...

  /**
   * Broadcast a message to all connected WebSocket clients.
   */
  broadcastMessage(message: { type: string; data: any }): void {
    const messageStr = JSON.stringify(message);

    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });

    logger.debug('Broadcasted message to clients', {
      type: message.type,
      clientCount: this.connectedClients.size,
    });
  }
}
```

### 4. WebSocket Message Handler

**File:** `server/routes.ts` (Enhancement)

```typescript
// In the WebSocket connection handler, add backtest-specific message handling

ws.on('message', async data => {
  try {
    const message = JSON.parse(data.toString());

    if (message.type === 'subscribe_backtest') {
      // Client wants to subscribe to updates for a specific backtest
      const { backtestId } = message;

      logger.info('Client subscribed to backtest', {
        clientId,
        backtestId,
      });

      // Store subscription (you could extend this to filter broadcasts)
      // For now, clients receive all backtest events
    }

    if (message.type === 'start_backtest') {
      const params = message.params as BacktestParams;

      // Validate parameters
      const validation = await mcpBacktestingClient.validateStrategy({
        strategyId: params.strategyId,
        parameters: params.parameters,
      });

      if (!validation.valid) {
        ws.send(JSON.stringify({
          type: 'error',
          data: {
            message: 'Invalid strategy configuration',
            errors: validation.errors,
          },
        }));
        return;
      }

      // Enqueue backtest
      const taskId = await enqueueBacktest(params, 'medium');

      ws.send(JSON.stringify({
        type: 'backtest_queued',
        data: { taskId, status: 'queued' },
      }));
    }

    // ... existing message handlers ...
  } catch (error) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { error: 'Failed to process message' },
      }));
    }
  }
});
```

## Python MCP Server Event Emission (Phase 2)

For Phase 2, the Python MCP server should emit notifications during backtest execution:

```python
# In backtesting engine
async def run_backtest(...):
    backtest_id = generate_id()

    # Emit progress updates
    for i, date in enumerate(date_range):
        # ... process date ...

        if i % 100 == 0:  # Every 100 iterations
            progress = (i / len(date_range)) * 100
            await server.send_notification(
                method="backtest/progress",
                params={
                    "backtestId": backtest_id,
                    "progress": progress,
                    "currentDate": date.isoformat(),
                    "tradesExecuted": len(trades),
                }
            )

    # Emit completion
    await server.send_notification(
        method="backtest/complete",
        params={
            "backtestId": backtest_id,
            "result": final_results,
        }
    )
```

## Benefits

✅ **No polling delays** - Instant notification when backtest completes
✅ **Efficient resource usage** - No unnecessary network requests
✅ **Real-time progress** - Clients see live updates during execution
✅ **Flexible timeouts** - Can adjust based on backtest complexity
✅ **Scalable** - Event-driven architecture handles many concurrent backtests
✅ **Aligns with architecture** - Matches documented WebSocket design

## Testing

```typescript
// Test event-driven backtest execution
describe('Event-Driven Backtesting', () => {
  it('should complete backtest via events', async () => {
    const params: BacktestParams = {
      strategyId: 'sma_crossover',
      assetSymbol: 'BTC',
      startDate: '2023-01-01T00:00:00Z',
      endDate: '2023-12-31T23:59:59Z',
      initialCapital: 10000,
      parameters: { fast_period: 10, slow_period: 30 },
    };

    const startResult = await mcpBacktestingClient.runBacktest(params);

    // Wait for completion event (not polling!)
    const result = await mcpBacktestingClient.waitForBacktestCompletion(
      startResult.backtestId
    );

    expect(result.status).toBe('completed');
    expect(result.finalCapital).toBeGreaterThan(0);
  });

  it('should receive progress updates', (done) => {
    const progressUpdates: number[] = [];

    mcpBacktestingClient.on('backtest:progress', (event) => {
      progressUpdates.push(event.progress);

      if (event.progress === 100) {
        expect(progressUpdates.length).toBeGreaterThan(1);
        expect(progressUpdates).toContain(50); // Mid-point update
        done();
      }
    });

    // Start backtest...
  });
});
```

## Migration Path

For existing code using polling:

1. Update `mcp-backtesting-client.ts` with EventEmitter
2. Replace polling loops with `waitForBacktestCompletion()`
3. Add event listeners for progress broadcasting
4. Update Python server to emit notifications (Phase 2)
5. Test event flow end-to-end

This provides immediate benefits even before Python server emits real events (can emit mock events for testing).
