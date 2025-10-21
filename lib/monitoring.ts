interface LogContext {
  [key: string]: string | number | boolean | undefined;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: string;
  stack?: string;
}

class Logger {
  private formatMessage(level: string, message: string, context?: LogContext, error?: Error): LogEntry {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      context
    };

    if (error) {
      logEntry.error = error.message;
      logEntry.stack = error.stack;
    }

    return logEntry;
  }

  info(message: string, context?: LogContext): void {
    const logEntry = this.formatMessage('info', message, context);
    console.log(JSON.stringify(logEntry));
  }

  error(message: string, context?: LogContext, error?: Error): void {
    const logEntry = this.formatMessage('error', message, context, error);
    console.error(JSON.stringify(logEntry));
  }

  warn(message: string, context?: LogContext): void {
    const logEntry = this.formatMessage('warn', message, context);
    console.warn(JSON.stringify(logEntry));
  }

  debug(message: string, context?: LogContext): void {
    const logEntry = this.formatMessage('debug', message, context);
    console.log(JSON.stringify(logEntry));
  }
}

export const logger = new Logger();