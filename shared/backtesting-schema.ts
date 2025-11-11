import {
  pgTable,
  text,
  decimal,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// PostgreSQL ENUM types for better data integrity
export const backtestRunStatusEnum = pgEnum('backtest_run_status', [
  'pending',
  'running',
  'completed',
  'failed',
]);

export const backtestTradeDirectionEnum = pgEnum('backtest_trade_direction', [
  'long',
  'short',
]);

export const backtestTradeStatusEnum = pgEnum('backtest_trade_status', [
  'open',
  'closed',
]);

export const tradingStrategyTypeEnum = pgEnum('trading_strategy_type', [
  'trend',
  'mean_reversion',
  'momentum',
  'arbitrage',
  'custom',
]);

// Strategy definitions table
export const strategies = pgTable('strategies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  type: tradingStrategyTypeEnum('type').notNull(),
  parameters: jsonb('parameters').notNull(), // Strategy-specific parameters
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Backtest runs table
export const backtestRuns = pgTable('backtest_runs', {
  id: text('id').primaryKey(),
  strategyId: text('strategy_id')
    .notNull()
    .references(() => strategies.id),
  name: text('name').notNull(),
  assetSymbol: text('asset_symbol').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  initialCapital: decimal('initial_capital', { precision: 20, scale: 2 }).notNull(),
  finalCapital: decimal('final_capital', { precision: 20, scale: 2 }),
  totalReturn: decimal('total_return', { precision: 10, scale: 4 }),
  sharpeRatio: decimal('sharpe_ratio', { precision: 10, scale: 4 }),
  maxDrawdown: decimal('max_drawdown', { precision: 10, scale: 4 }),
  winRate: decimal('win_rate', { precision: 5, scale: 2 }),
  totalTrades: integer('total_trades'),
  winningTrades: integer('winning_trades'),
  losingTrades: integer('losing_trades'),
  status: backtestRunStatusEnum('status').notNull().default('pending'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'), // Additional run-specific data
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Simulated trades from backtests
export const backtestTrades = pgTable('backtest_trades', {
  id: text('id').primaryKey(),
  backtestRunId: text('backtest_run_id')
    .notNull()
    .references(() => backtestRuns.id),
  assetSymbol: text('asset_symbol').notNull(),
  type: text('type').notNull(), // 'buy', 'sell'
  direction: backtestTradeDirectionEnum('direction').notNull(), // 'long', 'short'
  orderType: text('order_type').notNull(), // 'market', 'limit'
  quantity: decimal('quantity', { precision: 20, scale: 8 }).notNull(),
  price: decimal('price', { precision: 15, scale: 8 }).notNull(),
  exitPrice: decimal('exit_price', { precision: 15, scale: 8 }), // Exit price for closed positions
  commission: decimal('commission', { precision: 15, scale: 8 }).notNull().default('0'),
  slippage: decimal('slippage', { precision: 15, scale: 8 }).notNull().default('0'),
  total: decimal('total', { precision: 20, scale: 2 }).notNull(),
  pnl: decimal('pnl', { precision: 20, scale: 2 }),
  portfolioValue: decimal('portfolio_value', { precision: 20, scale: 2 }).notNull(),
  signal: text('signal'), // Signal that triggered the trade
  status: backtestTradeStatusEnum('status').notNull().default('open'), // 'open', 'closed'
  openedAt: timestamp('opened_at').notNull(), // When position was opened
  closedAt: timestamp('closed_at'), // When position was closed
  timestamp: timestamp('timestamp').notNull(),
});

// Performance snapshots for equity curves
export const backtestPerformance = pgTable('backtest_performance', {
  id: text('id').primaryKey(),
  backtestRunId: text('backtest_run_id')
    .notNull()
    .references(() => backtestRuns.id),
  timestamp: timestamp('timestamp').notNull(),
  portfolioValue: decimal('portfolio_value', { precision: 20, scale: 2 }).notNull(),
  cashBalance: decimal('cash_balance', { precision: 20, scale: 2 }).notNull(),
  positionValue: decimal('position_value', { precision: 20, scale: 2 }).notNull(),
  totalReturn: decimal('total_return', { precision: 10, scale: 4 }).notNull(),
  drawdown: decimal('drawdown', { precision: 10, scale: 4 }).notNull(),
});

// Paper trading sessions
export const paperTradingSessions = pgTable('paper_trading_sessions', {
  id: text('id').primaryKey(),
  strategyId: text('strategy_id')
    .notNull()
    .references(() => strategies.id),
  name: text('name').notNull(),
  assetSymbol: text('asset_symbol').notNull(),
  initialCapital: decimal('initial_capital', { precision: 20, scale: 2 }).notNull(),
  currentCapital: decimal('current_capital', { precision: 20, scale: 2 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  stoppedAt: timestamp('stopped_at'),
});

// Paper trades (live simulation)
export const paperTrades = pgTable('paper_trades', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => paperTradingSessions.id),
  assetSymbol: text('asset_symbol').notNull(),
  type: text('type').notNull(), // 'buy', 'sell'
  orderType: text('order_type').notNull(), // 'market', 'limit'
  quantity: decimal('quantity', { precision: 20, scale: 8 }).notNull(),
  price: decimal('price', { precision: 15, scale: 8 }).notNull(),
  commission: decimal('commission', { precision: 15, scale: 8 }).notNull().default('0'),
  total: decimal('total', { precision: 20, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'filled', 'cancelled' - keeping as text for paper trading flexibility
  portfolioValue: decimal('portfolio_value', { precision: 20, scale: 2 }).notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

// Zod schemas for validation with explicit ENUM validation
export const insertStrategySchema = createInsertSchema(strategies, {
  parameters: z.record(z.any()),
  type: z.enum(['trend', 'mean_reversion', 'momentum', 'arbitrage', 'custom']),
});
export const selectStrategySchema = createSelectSchema(strategies);

export const insertBacktestRunSchema = createInsertSchema(backtestRuns, {
  metadata: z.record(z.any()).optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed']).default('pending'),
});
export const selectBacktestRunSchema = createSelectSchema(backtestRuns);

export const insertBacktestTradeSchema = createInsertSchema(backtestTrades, {
  direction: z.enum(['long', 'short']),
  status: z.enum(['open', 'closed']).default('open'),
});
export const selectBacktestTradeSchema = createSelectSchema(backtestTrades);

export const insertBacktestPerformanceSchema = createInsertSchema(backtestPerformance);
export const selectBacktestPerformanceSchema = createSelectSchema(backtestPerformance);

export const insertPaperTradingSessionSchema = createInsertSchema(paperTradingSessions);
export const selectPaperTradingSessionSchema = createSelectSchema(paperTradingSessions);

export const insertPaperTradeSchema = createInsertSchema(paperTrades);
export const selectPaperTradeSchema = createSelectSchema(paperTrades);

// TypeScript types
export type Strategy = z.infer<typeof selectStrategySchema>;
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type BacktestRun = z.infer<typeof selectBacktestRunSchema>;
export type InsertBacktestRun = z.infer<typeof insertBacktestRunSchema>;
export type BacktestTrade = z.infer<typeof selectBacktestTradeSchema>;
export type InsertBacktestTrade = z.infer<typeof insertBacktestTradeSchema>;
export type BacktestPerformance = z.infer<typeof selectBacktestPerformanceSchema>;
export type InsertBacktestPerformance = z.infer<typeof insertBacktestPerformanceSchema>;
export type PaperTradingSession = z.infer<typeof selectPaperTradingSessionSchema>;
export type InsertPaperTradingSession = z.infer<typeof insertPaperTradingSessionSchema>;
export type PaperTrade = z.infer<typeof selectPaperTradeSchema>;
export type InsertPaperTrade = z.infer<typeof insertPaperTradeSchema>;
