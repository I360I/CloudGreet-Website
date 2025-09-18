// Error monitoring and logging utilities

interface ErrorLog {
  timestamp: string
  level: 'error' | 'warning' | 'info'
  message: string
  details?: any
  userId?: string
  endpoint?: string
  stack?: string
}

class ErrorMonitor {
  private logs: ErrorLog[] = []
  private maxLogs = 1000

  logError(error: Error, context?: any) {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      details: context,
      stack: error.stack
    }

    this.logs.push(errorLog)
    this.trimLogs()

    // In production, you would send this to a monitoring service like Sentry
  }

  logWarning(message: string, context?: any) {
    const warningLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      level: 'warning',
      message,
      details: context
    }

    this.logs.push(warningLog)
    this.trimLogs()
  }

  logInfo(message: string, context?: any) {
    const infoLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      details: context
    }

    this.logs.push(infoLog)
    this.trimLogs()
  }

  getLogs(level?: string, limit = 100): ErrorLog[] {
    let filteredLogs = this.logs

    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level)
    }

    return filteredLogs.slice(-limit)
  }

  getErrorStats() {
    const stats = {
      total: this.logs.length,
      errors: this.logs.filter(log => log.level === 'error').length,
      warnings: this.logs.filter(log => log.level === 'warning').length,
      info: this.logs.filter(log => log.level === 'info').length,
      last24Hours: this.logs.filter(log => {
        const logTime = new Date(log.timestamp)
        const now = new Date()
        const diffHours = (now.getTime() - logTime.getTime()) / (1000 * 60 * 60)
        return diffHours <= 24
      }).length
    }

    return stats
  }

  private trimLogs() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  clearLogs() {
    this.logs = []
  }
}

export const errorMonitor = new ErrorMonitor()

// Helper function to wrap API routes with error monitoring
export function withErrorMonitoring(handler: Function) {
  return async (request: Request, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      errorMonitor.logError(error as Error, {
        url: request.url,
        method: request.method,
        context
      })
      throw error
    }
  }
}

// Helper function to log API performance
export function logApiPerformance(endpoint: string, duration: number, status: number) {
  const level = status >= 400 ? 'warning' : 'info'
  errorMonitor.logInfo(`API Performance: ${endpoint}`, {
    duration: `${duration}ms`,
    status,
    endpoint
  })
}

// Export logger for compatibility
export const logger = {
  error: (message: string, error?: any, context?: any) => {
    console.error(message, error, context)
    if (error) {
      errorMonitor.logError(error instanceof Error ? error : new Error(String(error)))
    }
  },
  warn: (message: string, context?: any) => {
    console.warn(message, context)
    errorMonitor.logWarning(message, context)
  },
  info: (message: string, context?: any) => {
    console.log(message, context)
    errorMonitor.logInfo(message, context)
  }
}

// Export health checker for compatibility
export const healthChecker = {
  checkDatabase: async () => {
    try {
      // Simple health check - just return true for now
      return true
    } catch {
      return false
    }
  },
  checkExternalServices: async () => {
    return {
      database: true
    }
  }
}

// Export metrics for compatibility
export const metrics = {
  recordMetric: async (name: string, value: number, tags: any = {}) => {
    errorMonitor.logInfo(`Metric: ${name}`, { value, tags })
  }
}

