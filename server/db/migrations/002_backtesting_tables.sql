-- Migration: Add backtesting tables
-- This migration adds the necessary tables for storing backtest runs, results, and trades

-- Trading strategies table
CREATE TABLE IF NOT EXISTS trading_strategies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  strategy_type TEXT NOT NULL, -- 'trend', 'mean_reversion', 'momentum', etc.
  parameters_schema JSONB NOT NULL,
  default_parameters JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backtesting configurations
CREATE TABLE IF NOT EXISTS backtest_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  initial_capital DECIMAL NOT NULL,
  parameters JSONB,
  status TEXT NOT NULL, -- 'pending', 'running', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- Backtest results and metrics
CREATE TABLE IF NOT EXISTS backtest_results (
  id TEXT PRIMARY KEY,
  backtest_run_id TEXT NOT NULL UNIQUE,
  final_capital DECIMAL NOT NULL,
  total_return DECIMAL NOT NULL,
  sharpe_ratio DECIMAL,
  max_drawdown DECIMAL,
  win_rate DECIMAL,
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  avg_win DECIMAL,
  avg_loss DECIMAL,
  profit_factor DECIMAL,
  metrics JSONB,
  equity_curve JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (backtest_run_id) REFERENCES backtest_runs(id) ON DELETE CASCADE
);

-- Individual backtest trades
CREATE TABLE IF NOT EXISTS backtest_trades (
  id TEXT PRIMARY KEY,
  backtest_run_id TEXT NOT NULL,
  entry_date TIMESTAMP NOT NULL,
  exit_date TIMESTAMP,
  direction TEXT NOT NULL, -- 'long', 'short'
  entry_price DECIMAL NOT NULL,
  exit_price DECIMAL,
  quantity DECIMAL NOT NULL,
  pnl DECIMAL,
  pnl_percent DECIMAL,
  status TEXT NOT NULL, -- 'open', 'closed'
  FOREIGN KEY (backtest_run_id) REFERENCES backtest_runs(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_backtest_runs_user_id ON backtest_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_strategy_id ON backtest_runs(strategy_id);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_asset_id ON backtest_runs(asset_id);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_status ON backtest_runs(status);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_created_at ON backtest_runs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_backtest_trades_run_id ON backtest_trades(backtest_run_id);
CREATE INDEX IF NOT EXISTS idx_backtest_trades_entry_date ON backtest_trades(entry_date);
CREATE INDEX IF NOT EXISTS idx_backtest_trades_status ON backtest_trades(status);

CREATE INDEX IF NOT EXISTS idx_trading_strategies_type ON trading_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_trading_strategies_active ON trading_strategies(is_active);

-- Insert default strategies
INSERT INTO trading_strategies (id, name, description, strategy_type, parameters_schema, default_parameters, is_active)
VALUES
(
  'sma_crossover',
  'SMA Crossover',
  'Simple Moving Average crossover strategy. Generates buy signal when fast SMA crosses above slow SMA.',
  'trend',
  '{"fast_period": {"type": "integer", "minimum": 1, "maximum": 200, "default": 10}, "slow_period": {"type": "integer", "minimum": 1, "maximum": 200, "default": 30}, "position_size": {"type": "number", "minimum": 0, "maximum": 1, "default": 0.95}}'::jsonb,
  '{"fast_period": 10, "slow_period": 30, "position_size": 0.95}'::jsonb,
  true
),
(
  'rsi',
  'RSI Strategy',
  'Relative Strength Index overbought/oversold strategy. Buys when RSI is oversold, sells when overbought.',
  'mean_reversion',
  '{"period": {"type": "integer", "minimum": 2, "maximum": 50, "default": 14}, "oversold": {"type": "number", "minimum": 0, "maximum": 100, "default": 30}, "overbought": {"type": "number", "minimum": 0, "maximum": 100, "default": 70}, "position_size": {"type": "number", "minimum": 0, "maximum": 1, "default": 0.95}}'::jsonb,
  '{"period": 14, "oversold": 30, "overbought": 70, "position_size": 0.95}'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Add comments to tables
COMMENT ON TABLE trading_strategies IS 'Available trading strategies for backtesting';
COMMENT ON TABLE backtest_runs IS 'Backtest execution metadata and configuration';
COMMENT ON TABLE backtest_results IS 'Performance metrics and results from completed backtests';
COMMENT ON TABLE backtest_trades IS 'Individual trade records from backtest executions';
