import { describe, it, expect, beforeEach } from 'vitest';
import { PaperBroker } from '../../backtesting/broker';
import { LiveClock } from '../../backtesting/clocks';
import { OrderSide, OrderType } from '../../backtesting/types';

describe('PaperBroker', () => {
  let broker: PaperBroker;
  let clock: LiveClock;

  beforeEach(() => {
    clock = new LiveClock();
    broker = new PaperBroker(10000, 0.001, 0.0005, clock);
  });

  describe('Order Execution', () => {
    it('should execute a buy order successfully', async () => {
      broker.updatePrice('BTC', 50000);

      const order = await broker.submitOrder({
        symbol: 'BTC',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity: 0.1,
      });

      expect(order.status).toBe('filled');
      expect(order.filledPrice).toBeGreaterThan(0);
      expect(order.commission).toBeGreaterThan(0);

      const portfolio = broker.getPortfolio();
      expect(portfolio.cash).toBeLessThan(10000);

      const position = broker.getPosition('BTC');
      expect(position).not.toBeNull();
      expect(position?.quantity).toBe(0.1);
    });

    it('should execute a sell order successfully', async () => {
      broker.updatePrice('BTC', 50000);

      // First buy
      await broker.submitOrder({
        symbol: 'BTC',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity: 0.1,
      });

      // Then sell
      broker.updatePrice('BTC', 51000);
      const sellOrder = await broker.submitOrder({
        symbol: 'BTC',
        side: OrderSide.SELL,
        type: OrderType.MARKET,
        quantity: 0.1,
      });

      expect(sellOrder.status).toBe('filled');

      const position = broker.getPosition('BTC');
      expect(position).toBeNull();
    });

    it('should reject buy order with insufficient funds', async () => {
      broker.updatePrice('BTC', 50000);

      await expect(
        broker.submitOrder({
          symbol: 'BTC',
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          quantity: 1, // Too much
        })
      ).rejects.toThrow('Insufficient funds');
    });

    it('should reject sell order with insufficient position', async () => {
      broker.updatePrice('BTC', 50000);

      await expect(
        broker.submitOrder({
          symbol: 'BTC',
          side: OrderSide.SELL,
          type: OrderType.MARKET,
          quantity: 0.1,
        })
      ).rejects.toThrow('Insufficient position');
    });

    it('should apply commission correctly', async () => {
      broker.updatePrice('BTC', 50000);

      const order = await broker.submitOrder({
        symbol: 'BTC',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity: 0.1,
      });

      const expectedCommission = (order.filledPrice || 50000) * 0.1 * 0.001;
      expect(order.commission).toBeCloseTo(expectedCommission, 2);
    });

    it('should apply slippage to market orders', async () => {
      broker.updatePrice('BTC', 50000);

      const order = await broker.submitOrder({
        symbol: 'BTC',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity: 0.1,
      });

      // Buy orders should have positive slippage
      expect(order.filledPrice).toBeGreaterThan(50000);
      expect(order.slippage).toBeGreaterThan(0);
    });
  });

  describe('Position Management', () => {
    it('should track position correctly', async () => {
      broker.updatePrice('BTC', 50000);

      await broker.submitOrder({
        symbol: 'BTC',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity: 0.1,
      });

      const position = broker.getPosition('BTC');
      expect(position).not.toBeNull();
      expect(position?.symbol).toBe('BTC');
      expect(position?.quantity).toBe(0.1);
      expect(position?.averagePrice).toBeCloseTo(50000, -2);
    });

    it('should update position average price on multiple buys', async () => {
      broker.updatePrice('BTC', 50000);
      await broker.submitOrder({
        symbol: 'BTC',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity: 0.05,
      });

      broker.updatePrice('BTC', 52000);
      await broker.submitOrder({
        symbol: 'BTC',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity: 0.05,
      });

      const position = broker.getPosition('BTC');
      expect(position?.quantity).toBe(0.1);
      // Average should be between 50000 and 52000
      expect(position?.averagePrice).toBeGreaterThan(50000);
      expect(position?.averagePrice).toBeLessThan(52000);
    });

    it('should calculate unrealized P&L correctly', async () => {
      broker.updatePrice('BTC', 50000);
      await broker.submitOrder({
        symbol: 'BTC',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity: 0.1,
      });

      broker.updatePrice('BTC', 55000);
      const position = broker.getPosition('BTC');
      
      // Should have positive P&L
      expect(position?.unrealizedPnL).toBeGreaterThan(0);
    });
  });

  describe('Portfolio Tracking', () => {
    it('should track portfolio value correctly', async () => {
      const initialPortfolio = broker.getPortfolio();
      expect(initialPortfolio.totalValue).toBe(10000);
      expect(initialPortfolio.cash).toBe(10000);

      broker.updatePrice('BTC', 50000);
      await broker.submitOrder({
        symbol: 'BTC',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity: 0.1,
      });

      const portfolio = broker.getPortfolio();
      // With commission and slippage, portfolio value will be slightly less
      expect(portfolio.totalValue).toBeGreaterThan(9990);
      expect(portfolio.totalValue).toBeLessThan(10010);
      expect(portfolio.cash).toBeLessThan(10000);
    });

    it('should reflect price changes in portfolio value', async () => {
      broker.updatePrice('BTC', 50000);
      await broker.submitOrder({
        symbol: 'BTC',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity: 0.1,
      });

      broker.updatePrice('BTC', 55000);
      const portfolio = broker.getPortfolio();
      
      // Portfolio value should increase
      expect(portfolio.totalValue).toBeGreaterThan(10000);
    });
  });
});
