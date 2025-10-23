import { supabaseAdmin, isSupabaseConfigured } from './supabase'
import { logger } from './monitoring'

export interface PerformanceMetrics {
  responseTime: number
  memoryUsage: number
  cpuUsage: number
  errorRate: number
  requestCount: number
  timestamp: string
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  memoryUsage: number
  cpuUsage: number
  diskUsage: number
  activeConnections: number
  lastHealthCheck: string
}

export async function recordPerformanceMetrics(
  endpoint: string,
  metrics: Omit<PerformanceMetrics, 'timestamp'>
): Promise<void> {
  try {
    if (!isSupabaseConfigured()) {
      logger.info('Performance metrics recorded (demo mode)', { 
        endpoint, 
        metrics: JSON.stringify(metrics) 
      })
      return
    }

    const { error } = await supabaseAdmin
      .from('performance_metrics')
      .insert({
        endpoint,
        response_time: metrics.responseTime,
        memory_usage: metrics.memoryUsage,
        cpu_usage: metrics.cpuUsage,
        error_rate: metrics.errorRate,
        request_count: metrics.requestCount,
        recorded_at: new Date().toISOString()
      })

    if (error) {
      logger.error('Failed to record performance metrics', { 
        error: error instanceof Error ? error.message : error, 
        endpoint, 
        metrics: JSON.stringify(metrics) 
      })
    }
  } catch (error) {
    logger.error('Performance metrics recording error', { 
      error: error instanceof Error ? error.message : error, 
      endpoint, 
      metrics: JSON.stringify(metrics) 
    })
  }
}

export async function getPerformanceMetrics(
  endpoint?: string,
  hours: number = 24
): Promise<PerformanceMetrics[]> {
  try {
    if (!isSupabaseConfigured()) {
      logger.info('Performance metrics requested (demo mode)', { endpoint, hours })
      return [
        {
          responseTime: 150,
          memoryUsage: 45.2,
          cpuUsage: 12.8,
          errorRate: 0.5,
          requestCount: 1250,
          timestamp: new Date().toISOString()
        }
      ]
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    let query = supabaseAdmin
      .from('performance_metrics')
      .select('*')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false })

    if (endpoint) {
      query = query.eq('endpoint', endpoint)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to fetch performance metrics', { 
        error: error instanceof Error ? error.message : error, 
        endpoint, 
        hours 
      })
      return []
    }

    return (data || []).map(record => ({
      responseTime: record.response_time,
      memoryUsage: record.memory_usage,
      cpuUsage: record.cpu_usage,
      errorRate: record.error_rate,
      requestCount: record.request_count,
      timestamp: record.recorded_at
    }))
  } catch (error) {
    logger.error('Performance metrics fetch error', { 
      error: error instanceof Error ? error.message : error, 
      endpoint, 
      hours 
    })
    return []
  }
}

export async function getSystemHealth(): Promise<SystemHealth> {
  try {
    if (!isSupabaseConfigured()) {
      logger.info('System health requested (demo mode)')
      return {
        status: 'healthy',
        uptime: 86400, // 24 hours in seconds
        memoryUsage: 45.2,
        cpuUsage: 12.8,
        diskUsage: 23.1,
        activeConnections: 42,
        lastHealthCheck: new Date().toISOString()
      }
    }

    // Get latest system health record
    const { data: healthRecord, error } = await supabaseAdmin
      .from('system_health')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !healthRecord) {
      logger.error('Failed to fetch system health', { 
        error: error?.message || 'Unknown error' 
      })
      return {
        status: 'unhealthy',
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0,
        activeConnections: 0,
        lastHealthCheck: new Date().toISOString()
      }
    }

    return {
      status: healthRecord.status,
      uptime: healthRecord.uptime,
      memoryUsage: healthRecord.memory_usage,
      cpuUsage: healthRecord.cpu_usage,
      diskUsage: healthRecord.disk_usage,
      activeConnections: healthRecord.active_connections,
      lastHealthCheck: healthRecord.recorded_at
    }
  } catch (error) {
    logger.error('System health fetch error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return {
      status: 'unhealthy',
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      diskUsage: 0,
      activeConnections: 0,
      lastHealthCheck: new Date().toISOString()
    }
  }
}

export async function recordSystemHealth(health: Omit<SystemHealth, 'lastHealthCheck'>): Promise<void> {
  try {
    if (!isSupabaseConfigured()) {
      logger.info('System health recorded (demo mode)', { 
        health: JSON.stringify(health) 
      })
      return
    }

    const { error } = await supabaseAdmin
      .from('system_health')
      .insert({
        status: health.status,
        uptime: health.uptime,
        memory_usage: health.memoryUsage,
        cpu_usage: health.cpuUsage,
        disk_usage: health.diskUsage,
        active_connections: health.activeConnections,
        recorded_at: new Date().toISOString()
      })

    if (error) {
      logger.error('Failed to record system health', {
        error: error instanceof Error ? error.message : error,
        health: JSON.stringify(health)
      })
    }
  } catch (error) {
    logger.error('System health recording error', { 
      error: error instanceof Error ? error.message : error, 
      health: JSON.stringify(health) 
    })
  }
}

export function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage()
    return Math.round((usage.heapUsed / usage.heapTotal) * 100 * 100) / 100
  }
  return 0
}

export function getCpuUsage(): number {
  // Simplified CPU usage calculation
  // In a real implementation, you'd use a library like 'usage' or 'pidusage'
  // Use real system metrics if available, otherwise return 0
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const usage = process.cpuUsage();
      return Math.round((usage.user + usage.system) / 1000000); // Convert to seconds
    }
    return 0
}

export function getUptime(): number {
  if (typeof process !== 'undefined' && process.uptime) {
    return process.uptime()
  }
  return 0
}

export async function monitorEndpoint<T>(
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  const startMemory = getMemoryUsage()
  
  try {
    const result = await fn()
    const endTime = Date.now()
    const endMemory = getMemoryUsage()
    
    await recordPerformanceMetrics(endpoint, {
      responseTime: endTime - startTime,
      memoryUsage: endMemory,
      cpuUsage: getCpuUsage(),
      errorRate: 0,
      requestCount: 1
    })
    
    return result
  } catch (error) {
    const endTime = Date.now()
    const endMemory = getMemoryUsage()
    
    await recordPerformanceMetrics(endpoint, {
      responseTime: endTime - startTime,
      memoryUsage: endMemory,
      cpuUsage: getCpuUsage(),
      errorRate: 1,
      requestCount: 1
    })
    
    throw error
  }
}

const performanceMonitor = {
  recordMetrics: recordPerformanceMetrics,
  getMetrics: getPerformanceMetrics,
  getHealth: getSystemHealth,
  recordHealth: recordSystemHealth,
  monitorEndpoint: monitorEndpoint
}

export { performanceMonitor }
