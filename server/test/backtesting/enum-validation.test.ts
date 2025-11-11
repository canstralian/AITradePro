import { describe, it, expect } from 'vitest';
import { 
  insertStrategySchema, 
  insertBacktestRunSchema, 
  insertBacktestTradeSchema 
} from '../../../shared/backtesting-schema';
import { nanoid } from 'nanoid';

describe('ENUM Validation Tests', () => {
  describe('Strategy Type ENUM', () => {
    it('should accept valid strategy types', () => {
      const validTypes = ['trend', 'mean_reversion', 'momentum', 'arbitrage', 'custom'];
      
      validTypes.forEach(type => {
        const strategy = {
          id: nanoid(),
          name: 'Test Strategy',
          description: 'Test description',
          type,
          parameters: {},
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const result = insertStrategySchema.safeParse(strategy);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid strategy types', () => {
      const invalidTypes = ['invalid', 'TREND', 'trend_following', 'other'];
      
      invalidTypes.forEach(type => {
        const strategy = {
          id: nanoid(),
          name: 'Test Strategy',
          description: 'Test description',
          type,
          parameters: {},
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const result = insertStrategySchema.safeParse(strategy);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Backtest Run Status ENUM', () => {
    it('should accept valid backtest run statuses', () => {
      const validStatuses = ['pending', 'running', 'completed', 'failed'];
      
      validStatuses.forEach(status => {
        const run = {
          id: nanoid(),
          strategyId: nanoid(),
          name: 'Test Run',
          assetSymbol: 'BTC',
          startDate: new Date(),
          endDate: new Date(),
          initialCapital: '10000',
          status,
          createdAt: new Date(),
        };
        
        const result = insertBacktestRunSchema.safeParse(run);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid backtest run statuses', () => {
      const invalidStatuses = ['invalid', 'PENDING', 'complete', 'error'];
      
      invalidStatuses.forEach(status => {
        const run = {
          id: nanoid(),
          strategyId: nanoid(),
          name: 'Test Run',
          assetSymbol: 'BTC',
          startDate: new Date(),
          endDate: new Date(),
          initialCapital: '10000',
          status,
          createdAt: new Date(),
        };
        
        const result = insertBacktestRunSchema.safeParse(run);
        expect(result.success).toBe(false);
      });
    });

    it('should default to pending status', () => {
      const run = {
        id: nanoid(),
        strategyId: nanoid(),
        name: 'Test Run',
        assetSymbol: 'BTC',
        startDate: new Date(),
        endDate: new Date(),
        initialCapital: '10000',
        createdAt: new Date(),
      };
      
      const result = insertBacktestRunSchema.safeParse(run);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('pending');
      }
    });
  });

  describe('Backtest Trade Direction ENUM', () => {
    it('should accept valid trade directions', () => {
      const validDirections = ['long', 'short'];
      
      validDirections.forEach(direction => {
        const trade = {
          id: nanoid(),
          backtestRunId: nanoid(),
          assetSymbol: 'BTC',
          type: 'buy',
          direction,
          orderType: 'market',
          quantity: '1.5',
          price: '45000',
          commission: '0',
          slippage: '0',
          total: '67500',
          portfolioValue: '100000',
          openedAt: new Date(),
          timestamp: new Date(),
        };
        
        const result = insertBacktestTradeSchema.safeParse(trade);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid trade directions', () => {
      const invalidDirections = ['invalid', 'LONG', 'buy', 'sell'];
      
      invalidDirections.forEach(direction => {
        const trade = {
          id: nanoid(),
          backtestRunId: nanoid(),
          assetSymbol: 'BTC',
          type: 'buy',
          direction,
          orderType: 'market',
          quantity: '1.5',
          price: '45000',
          commission: '0',
          slippage: '0',
          total: '67500',
          portfolioValue: '100000',
          openedAt: new Date(),
          timestamp: new Date(),
        };
        
        const result = insertBacktestTradeSchema.safeParse(trade);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Backtest Trade Status ENUM', () => {
    it('should accept valid trade statuses', () => {
      const validStatuses = ['open', 'closed'];
      
      validStatuses.forEach(status => {
        const trade = {
          id: nanoid(),
          backtestRunId: nanoid(),
          assetSymbol: 'BTC',
          type: 'buy',
          direction: 'long',
          orderType: 'market',
          quantity: '1.5',
          price: '45000',
          commission: '0',
          slippage: '0',
          total: '67500',
          portfolioValue: '100000',
          status,
          openedAt: new Date(),
          timestamp: new Date(),
        };
        
        const result = insertBacktestTradeSchema.safeParse(trade);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid trade statuses', () => {
      const invalidStatuses = ['invalid', 'OPEN', 'pending', 'filled'];
      
      invalidStatuses.forEach(status => {
        const trade = {
          id: nanoid(),
          backtestRunId: nanoid(),
          assetSymbol: 'BTC',
          type: 'buy',
          direction: 'long',
          orderType: 'market',
          quantity: '1.5',
          price: '45000',
          commission: '0',
          slippage: '0',
          total: '67500',
          portfolioValue: '100000',
          status,
          openedAt: new Date(),
          timestamp: new Date(),
        };
        
        const result = insertBacktestTradeSchema.safeParse(trade);
        expect(result.success).toBe(false);
      });
    });

    it('should default to open status', () => {
      const trade = {
        id: nanoid(),
        backtestRunId: nanoid(),
        assetSymbol: 'BTC',
        type: 'buy',
        direction: 'long',
        orderType: 'market',
        quantity: '1.5',
        price: '45000',
        commission: '0',
        slippage: '0',
        total: '67500',
        portfolioValue: '100000',
        openedAt: new Date(),
        timestamp: new Date(),
      };
      
      const result = insertBacktestTradeSchema.safeParse(trade);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('open');
      }
    });
  });

  describe('Complete Trade Lifecycle', () => {
    it('should validate a complete trade with all ENUM fields', () => {
      const openTrade = {
        id: nanoid(),
        backtestRunId: nanoid(),
        assetSymbol: 'ETH',
        type: 'buy',
        direction: 'long' as const,
        orderType: 'market',
        quantity: '10',
        price: '2800',
        commission: '1.4',
        slippage: '0.5',
        total: '28000',
        portfolioValue: '100000',
        status: 'open' as const,
        openedAt: new Date('2025-01-01T10:00:00Z'),
        timestamp: new Date('2025-01-01T10:00:00Z'),
      };
      
      const result = insertBacktestTradeSchema.safeParse(openTrade);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.direction).toBe('long');
        expect(result.data.status).toBe('open');
      }
    });

    it('should validate a closed trade with exit price', () => {
      const closedTrade = {
        id: nanoid(),
        backtestRunId: nanoid(),
        assetSymbol: 'ETH',
        type: 'sell',
        direction: 'short' as const,
        orderType: 'market',
        quantity: '10',
        price: '2800',
        exitPrice: '2750',
        commission: '1.4',
        slippage: '0.5',
        total: '27500',
        pnl: '500',
        portfolioValue: '100500',
        status: 'closed' as const,
        openedAt: new Date('2025-01-01T10:00:00Z'),
        closedAt: new Date('2025-01-02T15:00:00Z'),
        timestamp: new Date('2025-01-02T15:00:00Z'),
      };
      
      const result = insertBacktestTradeSchema.safeParse(closedTrade);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.direction).toBe('short');
        expect(result.data.status).toBe('closed');
        expect(result.data.exitPrice).toBeDefined();
        expect(result.data.closedAt).toBeDefined();
      }
    });
  });

  describe('Case Sensitivity', () => {
    it('should be case-sensitive for strategy types', () => {
      const uppercaseType = {
        id: nanoid(),
        name: 'Test Strategy',
        description: 'Test description',
        type: 'TREND',
        parameters: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = insertStrategySchema.safeParse(uppercaseType);
      expect(result.success).toBe(false);
    });

    it('should be case-sensitive for run statuses', () => {
      const uppercaseStatus = {
        id: nanoid(),
        strategyId: nanoid(),
        name: 'Test Run',
        assetSymbol: 'BTC',
        startDate: new Date(),
        endDate: new Date(),
        initialCapital: '10000',
        status: 'PENDING',
        createdAt: new Date(),
      };
      
      const result = insertBacktestRunSchema.safeParse(uppercaseStatus);
      expect(result.success).toBe(false);
    });
  });
});
