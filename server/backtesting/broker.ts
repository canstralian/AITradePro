import { nanoid } from 'nanoid';
import {
  IBroker,
  Order,
  OrderSide,
  OrderStatus,
  OrderType,
  Position,
  Portfolio,
  IClock,
} from './types';

/**
 * PaperBroker - simulates order execution for backtesting and paper trading
 * Handles position management, commission, and slippage
 */
export class PaperBroker implements IBroker {
  private cash: number;
  private positions: Map<string, Position> = new Map();
  private currentPrices: Map<string, number> = new Map();
  private orders: Order[] = [];
  private commission: number;
  private slippage: number;
  private clock: IClock;
  private initialCapital: number;

  constructor(
    initialCapital: number,
    commission: number = 0.001,
    slippage: number = 0.0005,
    clock: IClock
  ) {
    this.cash = initialCapital;
    this.initialCapital = initialCapital;
    this.commission = commission;
    this.slippage = slippage;
    this.clock = clock;
  }

  async submitOrder(
    order: Omit<Order, 'id' | 'status' | 'timestamp'>
  ): Promise<Order> {
    const fullOrder: Order = {
      ...order,
      id: nanoid(),
      status: OrderStatus.PENDING,
      timestamp: this.clock.getCurrentTime(),
    };

    // Get current price
    const currentPrice = this.currentPrices.get(order.symbol);
    if (!currentPrice) {
      fullOrder.status = OrderStatus.REJECTED;
      this.orders.push(fullOrder);
      throw new Error(`No price data for ${order.symbol}`);
    }

    // Calculate execution price with slippage
    let executionPrice = currentPrice;
    if (order.type === OrderType.MARKET) {
      // Apply slippage for market orders
      const slippageAmount = currentPrice * this.slippage;
      executionPrice =
        order.side === OrderSide.BUY
          ? currentPrice + slippageAmount
          : currentPrice - slippageAmount;
    } else if (order.type === OrderType.LIMIT && order.price) {
      // For limit orders, use the limit price
      executionPrice = order.price;
    }

    // Calculate commission
    const orderValue = executionPrice * order.quantity;
    const commissionAmount = orderValue * this.commission;

    // Check if we have enough cash for buy orders
    if (order.side === OrderSide.BUY) {
      const totalCost = orderValue + commissionAmount;
      if (totalCost > this.cash) {
        fullOrder.status = OrderStatus.REJECTED;
        this.orders.push(fullOrder);
        throw new Error(
          `Insufficient funds: need ${totalCost.toFixed(2)}, have ${this.cash.toFixed(2)}`
        );
      }
    }

    // Execute the order
    if (order.side === OrderSide.BUY) {
      this.executeBuy(order.symbol, order.quantity, executionPrice, commissionAmount);
    } else {
      this.executeSell(order.symbol, order.quantity, executionPrice, commissionAmount);
    }

    fullOrder.status = OrderStatus.FILLED;
    fullOrder.filledPrice = executionPrice;
    fullOrder.commission = commissionAmount;
    fullOrder.slippage = Math.abs(executionPrice - currentPrice);

    this.orders.push(fullOrder);
    return fullOrder;
  }

  private executeBuy(
    symbol: string,
    quantity: number,
    price: number,
    commission: number
  ): void {
    const totalCost = price * quantity + commission;
    this.cash -= totalCost;

    const existingPosition = this.positions.get(symbol);
    if (existingPosition) {
      // Update existing position
      const totalQuantity = existingPosition.quantity + quantity;
      const totalCost =
        existingPosition.averagePrice * existingPosition.quantity +
        price * quantity;
      existingPosition.quantity = totalQuantity;
      existingPosition.averagePrice = totalCost / totalQuantity;
      existingPosition.currentPrice = price;
      existingPosition.unrealizedPnL =
        (price - existingPosition.averagePrice) * totalQuantity;
    } else {
      // Create new position
      this.positions.set(symbol, {
        symbol,
        quantity,
        averagePrice: price,
        currentPrice: price,
        unrealizedPnL: 0,
        realizedPnL: 0,
      });
    }
  }

  private executeSell(
    symbol: string,
    quantity: number,
    price: number,
    commission: number
  ): void {
    const position = this.positions.get(symbol);
    if (!position || position.quantity < quantity) {
      throw new Error(
        `Insufficient position: trying to sell ${quantity}, have ${position?.quantity || 0}`
      );
    }

    const totalValue = price * quantity - commission;
    this.cash += totalValue;

    // Calculate realized P&L
    const realizedPnL = (price - position.averagePrice) * quantity;
    position.realizedPnL += realizedPnL;

    // Update position
    position.quantity -= quantity;
    position.currentPrice = price;

    if (position.quantity === 0) {
      this.positions.delete(symbol);
    } else {
      position.unrealizedPnL =
        (price - position.averagePrice) * position.quantity;
    }
  }

  updatePrice(symbol: string, price: number): void {
    this.currentPrices.set(symbol, price);

    const position = this.positions.get(symbol);
    if (position) {
      position.currentPrice = price;
      position.unrealizedPnL =
        (price - position.averagePrice) * position.quantity;
    }
  }

  getPosition(symbol: string): Position | null {
    return this.positions.get(symbol) || null;
  }

  getPortfolio(): Portfolio {
    let positionValue = 0;
    const positionsArray = Array.from(this.positions.values());
    for (const position of positionsArray) {
      positionValue += position.currentPrice * position.quantity;
    }

    return {
      cash: this.cash,
      positions: new Map(this.positions),
      totalValue: this.cash + positionValue,
      initialCapital: this.initialCapital,
    };
  }

  getOrders(): Order[] {
    return [...this.orders];
  }

  reset(initialCapital: number): void {
    this.cash = initialCapital;
    this.initialCapital = initialCapital;
    this.positions.clear();
    this.orders = [];
    this.currentPrices.clear();
  }
}
