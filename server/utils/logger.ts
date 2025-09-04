interface LogLevel {
  level: number;
  name: string;
  color?: string;
}

const LOG_LEVELS: Record<string, LogLevel> = {
  ERROR: { level: 0, name: 'ERROR', color: '\x1b[31m' }, // Red
  WARN: { level: 1, name: 'WARN', color: '\x1b[33m' },  // Yellow
  INFO: { level: 2, name: 'INFO', color: '\x1b[36m' },  // Cyan
  DEBUG: { level: 3, name: 'DEBUG', color: '\x1b[90m' }, // Gray
};

const RESET_COLOR = '\x1b[0m';

class Logger {
  private currentLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.currentLevel = LOG_LEVELS[envLevel] || LOG_LEVELS.INFO;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  private shouldLog(level: LogLevel): boolean {
    return level.level <= this.currentLevel.level;
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const levelStr = this.isDevelopment && level.color 
      ? `${level.color}${level.name}${RESET_COLOR}`
      : level.name;
    
    let formatted = `[${timestamp}] ${levelStr}: ${message}`;
    
    if (meta && typeof meta === 'object') {
      formatted += ` ${JSON.stringify(meta, null, 2)}`;
    } else if (meta) {
      formatted += ` ${String(meta)}`;
    }
    
    return formatted;
  }

  private log(level: LogLevel, message: string, meta?: any): void {
    if (!this.shouldLog(level)) return;
    
    const formatted = this.formatMessage(level, message, meta);
    
    if (level.level === 0) { // ERROR
      console.error(formatted);
    } else if (level.level === 1) { // WARN
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  error(message: string, meta?: any): void {
    this.log(LOG_LEVELS.ERROR, message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log(LOG_LEVELS.WARN, message, meta);
  }

  info(message: string, meta?: any): void {
    this.log(LOG_LEVELS.INFO, message, meta);
  }

  debug(message: string, meta?: any): void {
    this.log(LOG_LEVELS.DEBUG, message, meta);
  }

  // Convenience method for API logging
  apiLog(method: string, path: string, statusCode: number, duration: number, response?: any): void {
    const message = `${method} ${path} ${statusCode} in ${duration}ms`;
    
    if (statusCode >= 500) {
      this.error(message, { response });
    } else if (statusCode >= 400) {
      this.warn(message, { response });
    } else {
      this.info(message);
    }
  }
}

export const logger = new Logger();