// Production monitoring and logging
import { supabaseAdmin } from './supabase';

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: any;
  timestamp?: string;
  userId?: string;
  businessId?: string;
  sessionId?: string;
}

export interface MetricEntry {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: string;
}

class Logger {
  private async logToDatabase(entry: LogEntry) {
    try {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'system_log',
        details: {
          level: entry.level,
          message: entry.message,
          context: entry.context,
          userId: entry.userId,
          businessId: entry.businessId,
          sessionId: entry.sessionId,
        },
      });
    } catch (error) {
      console.error('Failed to log to database:', error);
    }
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  info(message: string, context?: any) {
    const formatted = this.formatMessage('info', message, context);
    console.log(formatted);
    
    if (process.env.NODE_ENV === 'production') {
      this.logToDatabase({
        level: 'info',
        message,
        context,
        timestamp: new Date().toISOString(),
      });
    }
  }

  warn(message: string, context?: any) {
    const formatted = this.formatMessage('warn', message, context);
    console.warn(formatted);
    
    if (process.env.NODE_ENV === 'production') {
      this.logToDatabase({
        level: 'warn',
        message,
        context,
        timestamp: new Date().toISOString(),
      });
    }
  }

  error(message: string, context?: any) {
    const formatted = this.formatMessage('error', message, context);
    console.error(formatted);
    
    // Always log errors to database in production
    this.logToDatabase({
      level: 'error',
      message,
      context,
      timestamp: new Date().toISOString(),
    });

    // Send SMS notification for critical errors
    if (message.includes('CRITICAL') || message.includes('FAILED') || message.includes('ERROR')) {
      this.sendSystemErrorNotification(message, context);
    }
  }

  private async sendSystemErrorNotification(message: string, context?: any) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'system_error',
          message: `${message}${context ? ` - ${JSON.stringify(context)}` : ''}`,
          priority: 'urgent'
        })
      });
    } catch (error) {
      console.error('Failed to send system error notification:', error);
    }
  }

  debug(message: string, context?: any) {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('debug', message, context);
      console.debug(formatted);
    }
  }
}

class MetricsCollector {
  private async recordMetric(metric: MetricEntry) {
    try {
      await supabaseAdmin.from('performance_metrics').insert({
        metric_name: metric.name,
        metric_value: metric.value,
        tags: metric.tags || {},
        timestamp: metric.timestamp || new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  increment(name: string, tags?: Record<string, string>) {
    this.recordMetric({ name, value: 1, tags });
  }

  gauge(name: string, value: number, tags?: Record<string, string>) {
    this.recordMetric({ name, value, tags });
  }

  timing(name: string, duration: number, tags?: Record<string, string>) {
    this.recordMetric({ name, value: duration, tags: { ...tags, unit: 'ms' } });
  }
}

class PerformanceMonitor {
  private metrics = new MetricsCollector();
  private logger = new Logger();

  async recordApiCall(endpoint: string, method: string, duration: number, statusCode: number) {
    this.metrics.timing('api.call.duration', duration, {
      endpoint,
      method,
      status: statusCode.toString(),
    });

    this.metrics.increment('api.call.count', {
      endpoint,
      method,
      status: statusCode.toString(),
    });

    if (statusCode >= 400) {
      this.logger.warn(`API call failed: ${method} ${endpoint}`, {
        statusCode,
        duration,
      });
    }
  }

  async recordDatabaseQuery(table: string, operation: string, duration: number) {
    this.metrics.timing('database.query.duration', duration, {
      table,
      operation,
    });

    this.metrics.increment('database.query.count', {
      table,
      operation,
    });
  }

  async recordExternalApiCall(service: string, endpoint: string, duration: number, success: boolean) {
    this.metrics.timing('external.api.duration', duration, {
      service,
      endpoint,
      success: success.toString(),
    });

    this.metrics.increment('external.api.count', {
      service,
      endpoint,
      success: success.toString(),
    });

    if (!success) {
      this.logger.error(`External API call failed: ${service} ${endpoint}`, {
        duration,
      });
    }
  }

  async recordBusinessEvent(businessId: string, event: string, data?: any) {
    this.metrics.increment('business.event', {
      business_id: businessId,
      event,
    });

    this.logger.info(`Business event: ${event}`, {
      businessId,
      event,
      data,
    });
  }

  async recordUserAction(userId: string, action: string, businessId?: string) {
    this.metrics.increment('user.action', {
      user_id: userId,
      action,
      business_id: businessId || 'unknown',
    });

    this.logger.info(`User action: ${action}`, {
      userId,
      action,
      businessId,
    });
  }

  async getHealthMetrics() {
    try {
      // Get recent error count
      const { data: errors } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('details->>level', 'error')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Get recent API call metrics
      const { data: apiCalls } = await supabaseAdmin
        .from('performance_metrics')
        .select('*')
        .eq('metric_name', 'api.call.count')
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      return {
        errorsLast24h: errors?.length || 0,
        apiCallsLastHour: apiCalls?.length || 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get health metrics', error);
      return {
        errorsLast24h: 0,
        apiCallsLastHour: 0,
        timestamp: new Date().toISOString(),
        error: 'Failed to fetch metrics',
      };
    }
  }
}

export const logger = new Logger();
export const metrics = new MetricsCollector();
export const performanceMonitor = new PerformanceMonitor();
