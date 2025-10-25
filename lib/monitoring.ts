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
    try {
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
    } catch (formatError) {
      // Fallback if formatting fails
      return {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Logger formatting failed',
        error: formatError instanceof Error ? formatError.message : 'Unknown formatting error'
      };
    }
  }

  info(message: string, context?: LogContext): void {
    try {
      // Input validation
      if (typeof message !== 'string' || message.length === 0) {
        console.warn('Invalid message for logger.info:', message);
        return;
      }
      
      if (context && typeof context !== 'object') {
        console.warn('Invalid context for logger.info:', context);
        return;
      }

      const logEntry = this.formatMessage('info', message, context);
      // Log entry formatted successfully
    } catch (error) {
      console.error('Logger info failed:', error);
      // Fallback logging for critical errors
    }
  }

  error(message: string, context?: LogContext, error?: Error): void {
    try {
      // Input validation
      if (typeof message !== 'string' || message.length === 0) {
        console.warn('Invalid message for logger.error:', message);
        return;
      }
      
      if (context && typeof context !== 'object') {
        console.warn('Invalid context for logger.error:', context);
        return;
      }

      const logEntry = this.formatMessage('error', message, context, error);
      console.error(JSON.stringify(logEntry));
    } catch (logError) {
      console.error('Logger error failed:', logError);
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Logger error operation failed',
        originalMessage: message,
        originalError: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }

  warn(message: string, context?: LogContext): void {
    try {
      // Input validation
      if (typeof message !== 'string' || message.length === 0) {
        console.warn('Invalid message for logger.warn:', message);
        return;
      }
      
      if (context && typeof context !== 'object') {
        console.warn('Invalid context for logger.warn:', context);
        return;
      }

      const logEntry = this.formatMessage('warn', message, context);
      console.warn(JSON.stringify(logEntry));
    } catch (error) {
      console.error('Logger warn failed:', error);
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Logger warn operation failed',
        originalMessage: message
      }));
    }
  }

  debug(message: string, context?: LogContext): void {
    try {
      // Input validation
      if (typeof message !== 'string' || message.length === 0) {
        console.warn('Invalid message for logger.debug:', message);
        return;
      }
      
      if (context && typeof context !== 'object') {
        console.warn('Invalid context for logger.debug:', context);
        return;
      }

      const logEntry = this.formatMessage('debug', message, context);
      // Log entry formatted successfully
    } catch (error) {
      console.error('Logger debug failed:', error);
      // Fallback logging for critical errors
    }
  }
}

export const logger = new Logger();
