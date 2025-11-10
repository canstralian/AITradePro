import { z } from 'zod';

// Zod schemas for validation
export const BacktestParamsSchema = z.object({
  strategyId: z.string().min(1, 'Strategy ID is required'),
  assetSymbol: z.string().min(1, 'Asset symbol is required'),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  initialCapital: z.number().positive('Initial capital must be positive'),
  parameters: z.record(z.unknown()).default({}),
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
  sharpeRatio?: number;
  maxDrawdown?: number;
  winRate?: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin?: number;
  avgLoss?: number;
  profitFactor?: number;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  parametersSchema: Record<string, unknown>;
  defaultParameters?: Record<string, unknown>;
}

export interface BacktestStatus {
  backtestId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}
