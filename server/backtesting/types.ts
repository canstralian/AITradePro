import { z } from 'zod';

// Clock interface - allows switching between historical and live time
export interface IClock {
  getCurrentTime(): Date;
  advance?(): void; // For historical clocks
  isHistorical(): boolean;
}

// Market data bar for backtesting
export interface MarketBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Order types
export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderStatus {
  PENDING = 'pending',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

// Order interface
export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number; // For limit orders
  status: OrderStatus;
  timestamp: Date;
  filledPrice?: number;
  commission?: number;
  slippage?: number;
}

// Position interface
export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

// Portfolio state
export interface Portfolio {
  cash: number;
  positions: Map<string, Position>;
  totalValue: number;
  initialCapital: number;
}

// Trading signal
export interface Signal {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  quantity?: number;
  reason: string;
  confidence?: number;
  timestamp: Date;
}

// Broker interface - executes orders
export interface IBroker {
  submitOrder(order: Omit<Order, 'id' | 'status' | 'timestamp'>): Promise<Order>;
  getPosition(symbol: string): Position | null;
  getPortfolio(): Portfolio;
  updatePrice(symbol: string, price: number): void;
}

// Strategy interface
export interface IStrategy {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  
  // Initialize strategy with parameters
  initialize(params: Record<string, any>): void;
  
  // Called on each new market bar
  onBar(bar: MarketBar, broker: IBroker): Promise<Signal | null>;
  
  // Called when backtest starts
  onStart?(initialCapital: number): void;
  
  // Called when backtest ends
  onEnd?(portfolio: Portfolio): void;
}

// Backtest configuration
export const backtestConfigSchema = z.object({
  strategyId: z.string(),
  symbol: z.string(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  initialCapital: z.number().positive(),
  commission: z.number().nonnegative().default(0.001), // 0.1% default
  slippage: z.number().nonnegative().default(0.0005), // 0.05% default
});

export type BacktestConfig = z.infer<typeof backtestConfigSchema>;

// Performance metrics
export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
}

// Backtest result
export interface BacktestResult {
  runId: string;
  strategyId: string;
  config: BacktestConfig;
  metrics: PerformanceMetrics;
  trades: Order[];
  equityCurve: { timestamp: Date; value: number }[];
  drawdownCurve: { timestamp: Date; drawdown: number }[];
  finalPortfolio: Portfolio;
}

// Strategy parameters validation
export const strategyParametersSchema = z.object({
  // Common parameters
  riskPerTrade: z.number().min(0).max(1).optional(),
  maxPositionSize: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
});

export type StrategyParameters = z.infer<typeof strategyParametersSchema>;
