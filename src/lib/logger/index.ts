/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Logger Service - منصة ضيف
 * 
 * خدمة تسجيل موحدة لاستبدال console.log/error المحظورة
 * Solution for RULES.md: "console.log في الإنتاج → logger.info/warn/error"
 * 
 * Features:
 * - Server-side: Structured logging with context
 * - Client-side: Structured logging with context
 * - Production: Redacted sensitive data
 * - Development: Pretty-printed output
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'ai';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  traceId?: string;
}

interface LoggerConfig {
  level: LogLevel;
  isServer: boolean;
  isProduction: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  ai: 4,
};

// Sensitive fields to redact
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'session',
  'otp',
  'credit_card',
  'cardNumber',
];

function redactSensitive(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitive);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

class Logger {
  private config: LoggerConfig;
  private traceId: string | undefined;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      isServer: typeof window === 'undefined',
      isProduction: process.env.NODE_ENV === 'production',
      ...config,
    };
  }

  setTraceId(traceId: string): void {
    this.traceId = traceId;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.config.isProduction ? redactSensitive(context) as Record<string, unknown> : context,
      traceId: this.traceId,
    };
  }

  private output(entry: LogEntry): void {
    const formatted = this.config.isProduction
      ? JSON.stringify(entry)
      : this.prettyPrint(entry);

    // Use process.stdout/stderr on server, console on client
    if (this.config.isServer) {
      if (entry.level === 'error') {
        process.stderr.write(formatted + '\n');
      } else {
        process.stdout.write(formatted + '\n');
      }
    } else {
      // Client-side: use native console with structured format
      // This is allowed because it goes through our logger abstraction
      // In production, this can be extended to send logs to a monitoring service
      const method = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'log';
      
      // Strip ANSI codes on client-side (browsers don't support them well)
      const clientFormatted = this.config.isProduction 
        ? formatted 
        : formatted.replace(/\x1b\[[0-9;]*m/g, '');
      
      console[method](clientFormatted);
    }
  }

  private prettyPrint(entry: LogEntry): string {
    const colors = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
      ai: '\x1b[35m',    // magenta
      reset: '\x1b[0m',
    };

    const color = colors[entry.level] || colors.reset;
    const levelUpper = entry.level.toUpperCase().padEnd(5);
    
    let output = `${color}[${levelUpper}]${colors.reset} ${entry.timestamp} - ${entry.message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n  ${JSON.stringify(entry.context, null, 2)}`;
    }
    
    if (entry.traceId) {
      output += `\n  traceId: ${entry.traceId}`;
    }
    
    return output;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatEntry('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.output(this.formatEntry('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatEntry('warn', message, context));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      this.output(this.formatEntry('error', message, context));
    }
  }

  /**
   * AI-specific logging per constitution Article II
   * "سجّل كل استدعاء AI: التكلفة، المدة، النتيجة"
   */
  ai(data: {
    provider: string;
    model: string;
    operation: string;
    duration: number;
    tokensUsed?: number;
    cost?: number;
    success: boolean;
    cached?: boolean;
  }): void {
    if (this.shouldLog('ai')) {
      this.output(this.formatEntry('ai', `AI Call: ${data.operation}`, {
        provider: data.provider,
        model: data.model,
        duration: `${data.duration}ms`,
        tokensUsed: data.tokensUsed,
        cost: data.cost ? `$${data.cost.toFixed(4)}` : undefined,
        success: data.success,
        cached: data.cached,
      }));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(defaultContext: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }
}

class ChildLogger {
  constructor(
    private parent: Logger,
    private defaultContext: Record<string, unknown>
  ) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.parent.debug(message, { ...this.defaultContext, ...context });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.parent.info(message, { ...this.defaultContext, ...context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.parent.warn(message, { ...this.defaultContext, ...context });
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.parent.error(message, { ...this.defaultContext, ...context });
  }
}

// Singleton instance
let loggerInstance: Logger | null = null;

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

// Create logger instance
export const logger = getLogger();

// Export types
export type { LogLevel, LogEntry, Logger };
