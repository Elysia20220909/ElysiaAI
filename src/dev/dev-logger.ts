/**
 * Development Logger
 * Colored output, level-based logging, performance measurement
 */

import devConfig from './dev-config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
	timestamp: Date;
	level: LogLevel;
	message: string;
	data?: Record<string, unknown>;
	duration?: number;
}

const LOG_COLORS = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m', // Green
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  reset: '\x1b[0m',
};

const LOG_EMOJIS = {
  debug: '[D]',
  info: '[I]',
  warn: '[W]',
  error: '[E]',
};

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class DevLogger {
  private entries: LogEntry[] = [];
  private maxEntries = 1000;

  private shouldLog(level: LogLevel): boolean {
    const currentLevel = LOG_LEVELS[devConfig.logLevel];
    const messageLevel = LOG_LEVELS[level];
    return messageLevel >= currentLevel;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
  ): string {
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    const color = LOG_COLORS[level];
    const emoji = LOG_EMOJIS[level];
    const reset = LOG_COLORS.reset;

    let formattedData = '';
    if (data) {
      if (typeof data === 'string') {
        formattedData = ` ${data}`;
      } else if (devConfig.verboseLogging) {
        formattedData = `\n${JSON.stringify(data, null, 2)}`;
      } else {
        formattedData = ` [${Object.keys(data).length} items]`;
      }
    }

    return `${emoji} ${color}[${timestamp}]${reset} ${message}${formattedData}`;
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    const formatted = this.formatMessage(level, message, data);
    console.log(formatted);
  }

  public debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  public info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  public warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  public error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }

  public time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug(label, { duration: `${duration}ms` });
    };
  }

  public async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.debug(label, { duration: `${duration}ms`, status: 'success' });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(label, {
        duration: `${duration}ms`,
        status: 'failed',
        error: String(error),
      });
      throw error;
    }
  }

  public table(title: string, data: Record<string, unknown>[]): void {
    if (!this.shouldLog('info')) return;
    console.log(`\n[TABLE] ${title}:`);
    console.table(data);
  }

  public getLogs(level?: LogLevel, limit = 100): LogEntry[] {
    let filtered = this.entries;
    if (level) {
      filtered = filtered.filter((e) => e.level === level);
    }
    return filtered.slice(-limit);
  }

  public clearLogs(): void {
    this.entries = [];
    this.info('Logs cleared');
  }

  public exportLogs(filename: string): void {
    const fs = require('node:fs');
    const data = JSON.stringify(this.entries, null, 2);
    fs.writeFileSync(filename, data);
    this.info(`Logs exported: ${filename}`);
  }
}

// Global instance
export const devLogger = new DevLogger();

// Debug macros
export const debug = {
  log: (msg: string, data?: Record<string, unknown>) =>
    devLogger.debug(msg, data),
  info: (msg: string, data?: Record<string, unknown>) =>
    devLogger.info(msg, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    devLogger.warn(msg, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    devLogger.error(msg, data),
  time: (label: string) => devLogger.time(label),
  timeAsync: <T>(label: string, fn: () => Promise<T>) =>
    devLogger.timeAsync(label, fn),
};
