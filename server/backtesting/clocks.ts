import { IClock } from './types';

/**
 * HistoricalClock - for backtesting on historical data
 * Allows controlled time progression through historical market data
 */
export class HistoricalClock implements IClock {
  private currentTime: Date;
  private timeStep: number; // milliseconds

  constructor(startDate: Date, timeStep: number = 60000) {
    // Default: 1 minute
    this.currentTime = new Date(startDate);
    this.timeStep = timeStep;
  }

  getCurrentTime(): Date {
    return new Date(this.currentTime);
  }

  advance(): void {
    this.currentTime = new Date(this.currentTime.getTime() + this.timeStep);
  }

  setTime(time: Date): void {
    this.currentTime = new Date(time);
  }

  isHistorical(): boolean {
    return true;
  }
}

/**
 * LiveClock - for paper trading and live simulation
 * Uses real system time
 */
export class LiveClock implements IClock {
  getCurrentTime(): Date {
    return new Date();
  }

  isHistorical(): boolean {
    return false;
  }
}

/**
 * PaperTradingClock - for near-real-time paper trading
 * Uses real time but can be paused/resumed
 */
export class PaperTradingClock implements IClock {
  private isPaused: boolean = false;
  private pausedTime: Date | null = null;

  getCurrentTime(): Date {
    if (this.isPaused && this.pausedTime) {
      return new Date(this.pausedTime);
    }
    return new Date();
  }

  pause(): void {
    if (!this.isPaused) {
      this.isPaused = true;
      this.pausedTime = new Date();
    }
  }

  resume(): void {
    this.isPaused = false;
    this.pausedTime = null;
  }

  isHistorical(): boolean {
    return false;
  }
}
