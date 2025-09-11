// Comprehensive monitoring and alerting system

import { supabase } from './supabase'

export interface Alert {
  id: string
  type: 'error' | 'warning' | 'info' | 'success'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  component: string
  userId?: string
  metadata?: any
  timestamp: string
  resolved?: boolean
  resolvedAt?: string
}

export interface Metric {
  name: string
  value: number
  unit: string
  timestamp: string
  tags?: { [key: string]: string }
}

export interface HealthCheck {
  component: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  lastChecked: string
  details?: any
}

class MonitoringSystem {
  private alerts: Alert[] = []
  private metrics: Metric[] = []
  private healthChecks: Map<string, HealthCheck> = new Map()
  private thresholds: Map<string, { min?: number; max?: number; critical?: number }> = new Map()

  // Initialize monitoring system
  initialize() {
    // Set up default thresholds
    this.setThreshold('api_response_time', { max: 1000, critical: 5000 })
    this.setThreshold('database_response_time', { max: 500, critical: 2000 })
    this.setThreshold('error_rate', { max: 5, critical: 10 })
    this.setThreshold('memory_usage', { max: 80, critical: 95 })
    this.setThreshold('cpu_usage', { max: 80, critical: 95 })

    // Start periodic health checks
    this.startHealthChecks()
    
    // Start metrics collection
    this.startMetricsCollection()
  }

  // Set monitoring thresholds
  setThreshold(metricName: string, threshold: { min?: number; max?: number; critical?: number }) {
    this.thresholds.set(metricName, threshold)
  }

  // Record a metric
  recordMetric(name: string, value: number, unit: string = '', tags?: { [key: string]: string }) {
    const metric: Metric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      tags
    }

    this.metrics.push(metric)

    // Check thresholds and create alerts if needed
    this.checkThresholds(name, value)

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  // Create an alert
  createAlert(alert: Omit<Alert, 'id' | 'timestamp'>) {
    const newAlert: Alert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    }

    this.alerts.push(newAlert)

    // Store in database
    this.storeAlert(newAlert)

    // Send real-time notification
    this.sendRealtimeAlert(newAlert)

    // Keep only last 500 alerts in memory
    if (this.alerts.length > 500) {
      this.alerts = this.alerts.slice(-500)
    }

    return newAlert
  }

  // Update health check status
  updateHealthCheck(component: string, status: HealthCheck) {
    this.healthChecks.set(component, {
      ...status,
      lastChecked: new Date().toISOString()
    })

    // Create alert if status is unhealthy
    if (status.status === 'unhealthy') {
      this.createAlert({
        type: 'error',
        severity: 'critical',
        title: `${component} is unhealthy`,
        message: `Component ${component} is reporting unhealthy status`,
        component,
        metadata: status.details
      })
    }
  }

  // Check thresholds and create alerts
  private checkThresholds(metricName: string, value: number) {
    const threshold = this.thresholds.get(metricName)
    if (!threshold) return

    let severity: 'low' | 'medium' | 'high' | 'critical' | null = null
    let message = ''

    if (threshold.critical !== undefined && value >= threshold.critical) {
      severity = 'critical'
      message = `${metricName} is at critical level: ${value}${threshold.critical ? ' (threshold: ' + threshold.critical + ')' : ''}`
    } else if (threshold.max !== undefined && value >= threshold.max) {
      severity = 'high'
      message = `${metricName} exceeds maximum threshold: ${value} (threshold: ${threshold.max})`
    } else if (threshold.min !== undefined && value <= threshold.min) {
      severity = 'medium'
      message = `${metricName} is below minimum threshold: ${value} (threshold: ${threshold.min})`
    }

    if (severity) {
      this.createAlert({
        type: 'warning',
        severity,
        title: `Threshold Alert: ${metricName}`,
        message,
        component: 'monitoring',
        metadata: { metricName, value, threshold }
      })
    }
  }

  // Store alert in database
  private async storeAlert(alert: Alert) {
    try {
      await supabase
        .from('system_alerts')
        .insert({
          alert_type: alert.type,
          severity: alert.severity,
          message: alert.message,
          component: alert.component,
          user_id: alert.userId,
          metadata: alert.metadata,
          status: 'active',
          created_at: alert.timestamp
        })
    } catch (error) {
      console.error('Failed to store alert:', error)
    }
  }

  // Send real-time alert
  private sendRealtimeAlert(alert: Alert) {
    // This would integrate with your real-time system
    console.log(`[ALERT ${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`)
  }

  // Start periodic health checks
  private startHealthChecks() {
    setInterval(async () => {
      await this.performHealthChecks()
    }, 30000) // Every 30 seconds
  }

  // Perform health checks
  private async performHealthChecks() {
    // Check database connection
    await this.checkDatabaseHealth()
    
    // Check external APIs
    await this.checkExternalAPIs()
    
    // Check system resources
    await this.checkSystemResources()
  }

  // Check database health
  private async checkDatabaseHealth() {
    const startTime = Date.now()
    
    try {
      await supabase.from('users').select('id').limit(1)
      const responseTime = Date.now() - startTime
      
      this.updateHealthCheck('database', {
        component: 'database',
        status: responseTime < 500 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString()
      })

      this.recordMetric('database_response_time', responseTime, 'ms')
    } catch (error) {
      this.updateHealthCheck('database', {
        component: 'database',
        status: 'unhealthy',
        lastChecked: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
    }
  }

  // Check external APIs
  private async checkExternalAPIs() {
    const apis = [
      { name: 'retell', url: 'https://api.retellai.com/v2/get-calls?limit=1', key: 'RETELL_API_KEY' },
      { name: 'stripe', url: 'https://api.stripe.com/v1/charges?limit=1', key: 'STRIPE_SECRET_KEY' },
      { name: 'resend', url: 'https://api.resend.com/emails', key: 'RESEND_API_KEY' }
    ]

    for (const api of apis) {
      const startTime = Date.now()
      
      try {
        const apiKey = process.env[api.key]
        if (!apiKey || apiKey.includes('your-') || apiKey.includes('demo-')) {
          this.updateHealthCheck(api.name, {
            component: api.name,
            status: 'degraded',
            lastChecked: new Date().toISOString(),
            details: { error: 'API key not configured' }
          })
          continue
        }

        const response = await fetch(api.url, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        
        const responseTime = Date.now() - startTime
        
        this.updateHealthCheck(api.name, {
          component: api.name,
          status: response.ok ? 'healthy' : 'degraded',
          responseTime,
          lastChecked: new Date().toISOString(),
          details: { status: response.status }
        })

        this.recordMetric(`${api.name}_response_time`, responseTime, 'ms')
      } catch (error) {
        this.updateHealthCheck(api.name, {
          component: api.name,
          status: 'unhealthy',
          lastChecked: new Date().toISOString(),
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }
    }
  }

  // Check system resources
  private async checkSystemResources() {
    // Memory usage (simplified)
    const memUsage = process.memoryUsage()
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
    
    this.recordMetric('memory_usage', memUsagePercent, '%')
    
    // CPU usage (simplified - in production you'd use a proper CPU monitoring library)
    const cpuUsage = process.cpuUsage()
    this.recordMetric('cpu_usage', cpuUsage.user / 1000000, 'seconds')
  }

  // Start metrics collection
  private startMetricsCollection() {
    setInterval(() => {
      // Collect various metrics
      this.recordMetric('active_connections', this.getActiveConnectionsCount())
      this.recordMetric('alerts_count', this.alerts.length)
      this.recordMetric('metrics_count', this.metrics.length)
    }, 60000) // Every minute
  }

  // Get active connections count (placeholder)
  private getActiveConnectionsCount(): number {
    // This would integrate with your connection tracking
    return 0
  }

  // Get current alerts
  getAlerts(limit: number = 50): Alert[] {
    return this.alerts
      .filter(alert => !alert.resolved)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  // Get current metrics
  getMetrics(metricName?: string, limit: number = 100): Metric[] {
    let filtered = this.metrics
    
    if (metricName) {
      filtered = filtered.filter(metric => metric.name === metricName)
    }
    
    return filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  // Get health status
  getHealthStatus(): { overall: 'healthy' | 'degraded' | 'unhealthy'; components: HealthCheck[] } {
    const components = Array.from(this.healthChecks.values())
    const unhealthyCount = components.filter(c => c.status === 'unhealthy').length
    const degradedCount = components.filter(c => c.status === 'degraded').length
    
    let overall: 'healthy' | 'degraded' | 'unhealthy'
    if (unhealthyCount > 0) {
      overall = 'unhealthy'
    } else if (degradedCount > 0) {
      overall = 'degraded'
    } else {
      overall = 'healthy'
    }
    
    return { overall, components }
  }

  // Resolve alert
  async resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      alert.resolvedAt = new Date().toISOString()
      
      // Update in database
      try {
        await supabase
          .from('system_alerts')
          .update({
            status: 'resolved',
            resolved_at: alert.resolvedAt
          })
          .eq('id', alertId)
      } catch (error) {
        console.error('Failed to resolve alert in database:', error)
      }
    }
  }
}

// Singleton instance
export const monitoringSystem = new MonitoringSystem()

// Initialize monitoring on import
monitoringSystem.initialize()

// Helper functions
export function recordAPICall(endpoint: string, responseTime: number, statusCode: number) {
  monitoringSystem.recordMetric('api_response_time', responseTime, 'ms', { endpoint })
  monitoringSystem.recordMetric('api_calls_total', 1, 'count', { endpoint, status: statusCode.toString() })
  
  if (statusCode >= 400) {
    monitoringSystem.recordMetric('api_errors_total', 1, 'count', { endpoint, status: statusCode.toString() })
  }
}

export function recordDatabaseQuery(table: string, responseTime: number, success: boolean) {
  monitoringSystem.recordMetric('database_query_time', responseTime, 'ms', { table })
  monitoringSystem.recordMetric('database_queries_total', 1, 'count', { table, success: success.toString() })
  
  if (!success) {
    monitoringSystem.recordMetric('database_errors_total', 1, 'count', { table })
  }
}

export function recordBusinessMetric(userId: string, metricName: string, value: number) {
  monitoringSystem.recordMetric(`business_${metricName}`, value, '', { userId })
}

export function createSystemAlert(
  type: 'error' | 'warning' | 'info' | 'success',
  severity: 'low' | 'medium' | 'high' | 'critical',
  title: string,
  message: string,
  component: string,
  userId?: string,
  metadata?: any
) {
  return monitoringSystem.createAlert({
    type,
    severity,
    title,
    message,
    component,
    userId,
    metadata
  })
}
