import { NextRequest, NextResponse } from 'next/server'

interface PerformanceMetrics {
  requestId: string
  endpoint: string
  method: string
  startTime: number
  endTime: number
  duration: number
  statusCode: number
  userAgent?: string
  ip?: string
  memoryUsage?: NodeJS.MemoryUsage
  cpuUsage?: NodeJS.CpuUsage
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private alerts: Array<{
    id: string
    type: 'slow_response' | 'high_error_rate' | 'memory_leak' | 'cpu_spike'
    message: string
    timestamp: number
    severity: 'low' | 'medium' | 'high' | 'critical'
    resolved: boolean
  }> = []

  // Track performance metrics
  trackRequest(
    requestId: string,
    endpoint: string,
    method: string,
    startTime: number,
    endTime: number,
    statusCode: number,
    request?: NextRequest
  ) {
    const duration = endTime - startTime
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    const metric: PerformanceMetrics = {
      requestId,
      endpoint,
      method,
      startTime,
      endTime,
      duration,
      statusCode,
      userAgent: request?.headers.get('user-agent') || undefined,
      ip: request?.ip || request?.headers.get('x-forwarded-for') || undefined,
      memoryUsage,
      cpuUsage
    }

    this.metrics.push(metric)

    // Check for performance issues
    this.checkPerformanceIssues(metric)

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  // Check for performance issues and create alerts
  private checkPerformanceIssues(metric: PerformanceMetrics) {
    const now = Date.now()

    // Slow response time alert
    if (metric.duration > 5000) { // 5 seconds
      this.createAlert(
        'slow_response',
        `Slow response detected: ${metric.endpoint} took ${metric.duration}ms`,
        'high',
        now
      )
    }

    // High error rate alert
    const recentMetrics = this.metrics.filter(m => m.startTime > now - 60000) // Last minute
    const errorRate = recentMetrics.filter(m => m.statusCode >= 400).length / recentMetrics.length
    if (recentMetrics.length > 10 && errorRate > 0.1) { // 10% error rate
      this.createAlert(
        'high_error_rate',
        `High error rate detected: ${(errorRate * 100).toFixed(1)}% in last minute`,
        'critical',
        now
      )
    }

    // Memory leak detection
    if (metric.memoryUsage && metric.memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      this.createAlert(
        'memory_leak',
        `High memory usage detected: ${Math.round(metric.memoryUsage.heapUsed / 1024 / 1024)}MB`,
        'medium',
        now
      )
    }

    // CPU spike detection
    if (metric.cpuUsage && metric.cpuUsage.user + metric.cpuUsage.system > 1000000) { // 1 second
      this.createAlert(
        'cpu_spike',
        `High CPU usage detected: ${Math.round((metric.cpuUsage.user + metric.cpuUsage.system) / 1000000)}s`,
        'medium',
        now
      )
    }
  }

  // Create performance alert
  private createAlert(
    type: 'slow_response' | 'high_error_rate' | 'memory_leak' | 'cpu_spike',
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    timestamp: number
  ) {
    const alertId = `${type}_${timestamp}_${Math.random().toString(36).substring(7)}`
    
    // Check if similar alert already exists and is recent
    const recentAlert = this.alerts.find(
      a => a.type === type && 
           !a.resolved && 
           a.timestamp > timestamp - 300000 // 5 minutes
    )

    if (!recentAlert) {
      this.alerts.push({
        id: alertId,
        type,
        message,
        timestamp,
        severity,
        resolved: false
      })

      // Log critical alerts
      if (severity === 'critical') {
        // CRITICAL PERFORMANCE ALERT
      } else if (severity === 'high') {
        // HIGH PERFORMANCE ALERT
      }
    }
  }

  // Get performance metrics
  getMetrics(timeRange?: number) {
    const now = Date.now()
    const cutoff = timeRange ? now - timeRange : 0
    
    return this.metrics.filter(m => m.startTime > cutoff)
  }

  // Get active alerts
  getActiveAlerts() {
    return this.alerts.filter(a => !a.resolved)
  }

  // Resolve alert
  resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    const now = Date.now()
    const lastHour = this.metrics.filter(m => m.startTime > now - 3600000)
    const lastDay = this.metrics.filter(m => m.startTime > now - 86400000)

    const avgResponseTime = lastHour.length > 0 
      ? lastHour.reduce((sum, m) => sum + m.duration, 0) / lastHour.length 
      : 0

    const errorRate = lastHour.length > 0 
      ? lastHour.filter(m => m.statusCode >= 400).length / lastHour.length 
      : 0

    const totalRequests = lastDay.length
    const activeAlerts = this.alerts.filter(a => !a.resolved).length

    return {
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      totalRequests,
      activeAlerts,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Performance monitoring middleware
export function withPerformanceMonitoring(handler: Function) {
  return async (request: NextRequest) => {
    const startTime = Date.now()
    const requestId = Math.random().toString(36).substring(7)
    const url = new URL(request.url)
    const endpoint = url.pathname

    try {
      const response = await handler(request)
      const endTime = Date.now()

      // Track successful request
      performanceMonitor.trackRequest(
        requestId,
        endpoint,
        request.method,
        startTime,
        endTime,
        response.status || 200,
        request
      )

      return response
    } catch (error) {
      const endTime = Date.now()

      // Track failed request
      performanceMonitor.trackRequest(
        requestId,
        endpoint,
        request.method,
        startTime,
        endTime,
        500,
        request
      )

      throw error
    }
  }
}

// Performance monitoring API endpoint
export async function GET() {
  try {
    const summary = performanceMonitor.getPerformanceSummary()
    const activeAlerts = performanceMonitor.getActiveAlerts()
    const recentMetrics = performanceMonitor.getMetrics(3600000) // Last hour

    return NextResponse.json({
      success: true,
      data: {
        summary,
        activeAlerts,
        recentMetrics: recentMetrics.slice(-100), // Last 100 requests
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get performance metrics'
    }, { status: 500 })
  }
}
