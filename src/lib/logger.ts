/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Logger Utility for Client-Side Components
 *
 * This logger provides a structured way to log messages in frontend components.
 * It replaces console.log/error/warn statements with a consistent interface.
 *
 * In production, this can be extended to send logs to a monitoring service.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

class Logger {
  private context?: string;
  private isDevelopment = process.env.NODE_ENV === 'development';

  constructor(context?: string) {
    this.context = context;
  }

  /**
   * Create a child logger with a specific context
   */
  withContext(context: string): Logger {
    return new Logger(context);
  }

  /**
   * Format the log entry with context and timestamp
   */
  private formatEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
    return {
      level,
      message: this.context ? `[${this.context}] ${message}` : message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, data?: Record<string, unknown>): void {
    if (!this.isDevelopment) return;

    const entry = this.formatEntry('debug', message, data);
    console.debug(`[DEBUG] ${entry.timestamp} - ${entry.message}`, data || '');
  }

  /**
   * Log informational messages
   */
  info(message: string, data?: Record<string, unknown>): void {
    const entry = this.formatEntry('info', message, data);
    console.log(`[INFO] ${entry.timestamp} - ${entry.message}`, data || '');
  }

  /**
   * Log warning messages
   */
  warn(message: string, data?: Record<string, unknown>): void {
    const entry = this.formatEntry('warn', message, data);
    console.warn(`[WARN] ${entry.timestamp} - ${entry.message}`, data || '');
  }

  /**
   * Log error messages with structured error data
   */
  error(message: string, data?: Record<string, unknown>): void {
    const entry = this.formatEntry('error', message, data);
    console.error(`[ERROR] ${entry.timestamp} - ${entry.message}`, data || '');
  }
}

// Export a singleton instance
export const logger = new Logger();

// Export the class for creating contextual loggers
export { Logger };
