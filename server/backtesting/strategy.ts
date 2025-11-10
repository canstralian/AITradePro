import { IStrategy, MarketBar, IBroker, Signal, Portfolio } from './types';

/**
 * BaseStrategy - abstract base class for trading strategies
 */
export abstract class BaseStrategy implements IStrategy {
  public id: string;
  public name: string;
  public description: string;
  public parameters: Record<string, any>;

  constructor(
    id: string,
    name: string,
    description: string,
    parameters: Record<string, any> = {}
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.parameters = parameters;
  }

  initialize(params: Record<string, any>): void {
    this.parameters = { ...this.parameters, ...params };
  }

  abstract onBar(bar: MarketBar, broker: IBroker, symbol: string): Promise<Signal | null>;

  onStart?(initialCapital: number): void;
  onEnd?(portfolio: Portfolio): void;
}

/**
 * StrategyRegistry - manages available trading strategies
 */
export class StrategyRegistry {
  private strategies: Map<string, IStrategy> = new Map();

  register(strategy: IStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  unregister(strategyId: string): void {
    this.strategies.delete(strategyId);
  }

  get(strategyId: string): IStrategy | undefined {
    return this.strategies.get(strategyId);
  }

  getAll(): IStrategy[] {
    return Array.from(this.strategies.values());
  }

  has(strategyId: string): boolean {
    return this.strategies.has(strategyId);
  }

  list(): Array<{ id: string; name: string; description: string }> {
    return Array.from(this.strategies.values()).map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
    }));
  }
}

// Global strategy registry instance
export const strategyRegistry = new StrategyRegistry();
