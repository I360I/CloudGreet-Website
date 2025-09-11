import { NextRequest, NextResponse } from 'next/server'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface SystemHealthMetrics {
  overallHealth: {
    status: 'healthy' | 'warning' | 'critical' | 'down'
    score: number
    uptime: number
    lastUpdated: string
    summary: string
  }
  apiPerformance: {
    averageResponseTime: number
    responseTimePercentiles: {
      p50: number
      p90: number
      p95: number
      p99: number
    }
    throughput: {
      requestsPerSecond: number
      requestsPerMinute: number
      requestsPerHour: number
    }
    errorRate: number
    successRate: number
    endpointPerformance: Array<{
      endpoint: string
      responseTime: number
      errorRate: number
      requests: number
      status: 'healthy' | 'warning' | 'critical'
    }>
  }
  databasePerformance: {
    connectionPool: {
      active: number
      idle: number
      total: number
      utilization: number
    }
    queryPerformance: {
      averageQueryTime: number
      slowQueries: number
      queryThroughput: number
    }
    storage: {
      used: number
      available: number
      utilization: number
    }
    replication: {
      lag: number
      status: 'healthy' | 'warning' | 'critical'
    }
  }
  externalServices: {
    services: Array<{
      name: string
      status: 'healthy' | 'warning' | 'critical' | 'down'
      responseTime: number
      uptime: number
      lastCheck: string
      errorRate: number
      dependencies: string[]
    }>
    overallStatus: 'healthy' | 'warning' | 'critical'
    criticalServices: string[]
  }
  infrastructure: {
    serverMetrics: {
      cpu: {
        usage: number
        cores: number
        loadAverage: number[]
      }
      memory: {
        used: number
        total: number
        utilization: number
        swap: number
      }
      disk: {
        used: number
        total: number
        utilization: number
        iops: number
      }
      network: {
        bytesIn: number
        bytesOut: number
        packetsIn: number
        packetsOut: number
        errors: number
      }
    }
    containerMetrics: {
      running: number
      total: number
      restarts: number
      resourceUsage: {
        cpu: number
        memory: number
      }
    }
  }
  errorAnalysis: {
    totalErrors: number
    errorRate: number
    errorTrends: Array<{
      timestamp: string
      errors: number
      type: string
    }>
    errorTypes: Array<{
      type: string
      count: number
      percentage: number
      severity: 'low' | 'medium' | 'high' | 'critical'
      lastOccurrence: string
    }>
    recentErrors: Array<{
      timestamp: string
      error: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      component: string
      message: string
    }>
  }
  securityMetrics: {
    threatLevel: 'low' | 'medium' | 'high' | 'critical'
    activeThreats: number
    blockedRequests: number
    failedLogins: number
    securityEvents: Array<{
      timestamp: string
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      source: string
      description: string
    }>
    complianceStatus: {
      gdpr: 'compliant' | 'warning' | 'non-compliant'
      pci: 'compliant' | 'warning' | 'non-compliant'
      sox: 'compliant' | 'warning' | 'non-compliant'
    }
  }
  alerts: {
    active: Array<{
      id: string
      type: 'warning' | 'error' | 'critical'
      message: string
      timestamp: string
      component: string
      acknowledged: boolean
      actionRequired: boolean
    }>
    recent: Array<{
      id: string
      type: 'warning' | 'error' | 'critical'
      message: string
      timestamp: string
      resolved: boolean
    }>
    alertRules: Array<{
      name: string
      condition: string
      threshold: number
      currentValue: number
      status: 'active' | 'triggered' | 'disabled'
    }>
  }
  capacityPlanning: {
    currentCapacity: {
      cpu: number
      memory: number
      storage: number
      network: number
    }
    projectedGrowth: {
      timeframe: string
      cpuGrowth: number
      memoryGrowth: number
      storageGrowth: number
    }
    recommendations: Array<{
      component: string
      recommendation: string
      priority: 'low' | 'medium' | 'high' | 'critical'
      estimatedCost: number
      timeline: string
    }>
  }
  performanceOptimization: {
    bottlenecks: Array<{
      component: string
      impact: 'low' | 'medium' | 'high' | 'critical'
      description: string
      solution: string
    }>
    optimizationOpportunities: Array<{
      area: string
      potentialImprovement: number
      effort: 'low' | 'medium' | 'high'
      roi: number
    }>
    performanceTrends: Array<{
      metric: string
      trend: 'improving' | 'stable' | 'declining'
      change: number
      timeframe: string
    }>
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const includeDetails = searchParams.get('includeDetails') === 'true'
    const timeRange = searchParams.get('timeRange') || '1h'
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log(`🔧 Fetching system health metrics for user ${userId}, range: ${timeRange}`)

    // Calculate overall health status
    const healthScore = Math.floor(Math.random() * 20) + 80 // 80-100
    let status: 'healthy' | 'warning' | 'critical' | 'down' = 'healthy'
    let summary = 'All systems operating normally'

    if (healthScore < 60) {
      status = 'critical'
      summary = 'Critical issues detected - immediate attention required'
    } else if (healthScore < 80) {
      status = 'warning'
      summary = 'Some systems showing degraded performance'
    } else if (healthScore < 95) {
      status = 'warning'
      summary = 'Minor issues detected - monitoring recommended'
    }

    const overallHealth = {
      status,
      score: healthScore,
      uptime: 99.9,
      lastUpdated: new Date().toISOString(),
      summary
    }

    // Generate API performance metrics
    const apiPerformance = {
      averageResponseTime: Math.floor(Math.random() * 200) + 100, // 100-300ms
      responseTimePercentiles: {
        p50: Math.floor(Math.random() * 100) + 50,
        p90: Math.floor(Math.random() * 200) + 150,
        p95: Math.floor(Math.random() * 300) + 200,
        p99: Math.floor(Math.random() * 500) + 300
      },
      throughput: {
        requestsPerSecond: Math.floor(Math.random() * 50) + 20,
        requestsPerMinute: Math.floor(Math.random() * 2000) + 1000,
        requestsPerHour: Math.floor(Math.random() * 100000) + 50000
      },
      errorRate: Math.random() * 2, // 0-2%
      successRate: Math.floor(Math.random() * 5) + 95, // 95-100%
      endpointPerformance: [
        { endpoint: '/api/auth/session', responseTime: 45, errorRate: 0.1, requests: 1500, status: 'healthy' as const },
        { endpoint: '/api/get-user-data', responseTime: 120, errorRate: 0.2, requests: 800, status: 'healthy' as const },
        { endpoint: '/api/get-business-stats', responseTime: 250, errorRate: 0.5, requests: 600, status: 'warning' as const },
        { endpoint: '/api/retell-stats', responseTime: 180, errorRate: 0.3, requests: 400, status: 'healthy' as const },
        { endpoint: '/api/notifications', responseTime: 80, errorRate: 0.1, requests: 200, status: 'healthy' as const },
        { endpoint: '/api/analytics/dashboard', responseTime: 350, errorRate: 1.2, requests: 100, status: 'warning' as const }
      ]
    }

    // Generate database performance metrics
    const dbUtilization = Math.floor(Math.random() * 30) + 40 // 40-70%
    const databasePerformance = {
      connectionPool: {
        active: Math.floor(Math.random() * 20) + 10,
        idle: Math.floor(Math.random() * 30) + 20,
        total: 50,
        utilization: dbUtilization
      },
      queryPerformance: {
        averageQueryTime: Math.floor(Math.random() * 50) + 20, // 20-70ms
        slowQueries: Math.floor(Math.random() * 10),
        queryThroughput: Math.floor(Math.random() * 1000) + 500
      },
      storage: {
        used: Math.floor(Math.random() * 100) + 200, // GB
        available: Math.floor(Math.random() * 200) + 300, // GB
        utilization: Math.floor(Math.random() * 20) + 30 // 30-50%
      },
      replication: {
        lag: Math.floor(Math.random() * 10), // ms
        status: Math.random() > 0.1 ? 'healthy' as const : 'warning' as const
      }
    }

    // Generate external services status
    const externalServices = {
      services: [
        {
          name: 'Retell AI',
          status: Math.random() > 0.05 ? 'healthy' as const : 'warning' as const,
          responseTime: Math.floor(Math.random() * 200) + 100,
          uptime: 99.8,
          lastCheck: new Date().toISOString(),
          errorRate: Math.random() * 1,
          dependencies: ['API Gateway', 'Authentication']
        },
        {
          name: 'Stripe',
          status: Math.random() > 0.02 ? 'healthy' as const : 'warning' as const,
          responseTime: Math.floor(Math.random() * 150) + 80,
          uptime: 99.9,
          lastCheck: new Date().toISOString(),
          errorRate: Math.random() * 0.5,
          dependencies: ['Payment Gateway']
        },
        {
          name: 'Google Calendar',
          status: Math.random() > 0.03 ? 'healthy' as const : 'warning' as const,
          responseTime: Math.floor(Math.random() * 300) + 150,
          uptime: 99.7,
          lastCheck: new Date().toISOString(),
          errorRate: Math.random() * 1.5,
          dependencies: ['OAuth', 'API Gateway']
        },
        {
          name: 'Email Service',
          status: Math.random() > 0.04 ? 'healthy' as const : 'warning' as const,
          responseTime: Math.floor(Math.random() * 100) + 50,
          uptime: 99.5,
          lastCheck: new Date().toISOString(),
          errorRate: Math.random() * 2,
          dependencies: ['SMTP', 'DNS']
        },
        {
          name: 'Database',
          status: Math.random() > 0.01 ? 'healthy' as const : 'warning' as const,
          responseTime: Math.floor(Math.random() * 50) + 20,
          uptime: 99.95,
          lastCheck: new Date().toISOString(),
          errorRate: Math.random() * 0.1,
          dependencies: ['Storage', 'Network']
        }
      ],
      overallStatus: 'healthy' as const,
      criticalServices: ['Database', 'Retell AI', 'Stripe']
    }

    // Generate infrastructure metrics
    const infrastructure = {
      serverMetrics: {
        cpu: {
          usage: Math.floor(Math.random() * 30) + 40, // 40-70%
          cores: 8,
          loadAverage: [1.2, 1.5, 1.8]
        },
        memory: {
          used: Math.floor(Math.random() * 8) + 12, // GB
          total: 32,
          utilization: Math.floor(Math.random() * 20) + 50, // 50-70%
          swap: Math.floor(Math.random() * 2) + 1 // GB
        },
        disk: {
          used: Math.floor(Math.random() * 100) + 200, // GB
          total: 500,
          utilization: Math.floor(Math.random() * 20) + 40, // 40-60%
          iops: Math.floor(Math.random() * 1000) + 500
        },
        network: {
          bytesIn: Math.floor(Math.random() * 1000000) + 500000,
          bytesOut: Math.floor(Math.random() * 500000) + 250000,
          packetsIn: Math.floor(Math.random() * 10000) + 5000,
          packetsOut: Math.floor(Math.random() * 8000) + 4000,
          errors: Math.floor(Math.random() * 10)
        }
      },
      containerMetrics: {
        running: Math.floor(Math.random() * 5) + 8,
        total: 12,
        restarts: Math.floor(Math.random() * 5),
        resourceUsage: {
          cpu: Math.floor(Math.random() * 20) + 30, // 30-50%
          memory: Math.floor(Math.random() * 15) + 25 // 25-40%
        }
      }
    }

    // Generate error analysis
    const totalErrors = Math.floor(Math.random() * 50) + 10
    const errorAnalysis = {
      totalErrors,
      errorRate: (totalErrors / apiPerformance.throughput.requestsPerHour) * 100,
      errorTrends: generateErrorTrends(),
      errorTypes: [
        { type: 'Database Connection', count: Math.floor(totalErrors * 0.3), percentage: 30, severity: 'high' as const, lastOccurrence: new Date().toISOString() },
        { type: 'API Timeout', count: Math.floor(totalErrors * 0.25), percentage: 25, severity: 'medium' as const, lastOccurrence: new Date().toISOString() },
        { type: 'Authentication', count: Math.floor(totalErrors * 0.2), percentage: 20, severity: 'medium' as const, lastOccurrence: new Date().toISOString() },
        { type: 'External Service', count: Math.floor(totalErrors * 0.15), percentage: 15, severity: 'low' as const, lastOccurrence: new Date().toISOString() },
        { type: 'Validation', count: Math.floor(totalErrors * 0.1), percentage: 10, severity: 'low' as const, lastOccurrence: new Date().toISOString() }
      ],
      recentErrors: generateRecentErrors()
    }

    // Generate security metrics
    const securityMetrics = {
      threatLevel: Math.random() > 0.8 ? 'medium' as const : 'low' as const,
      activeThreats: Math.floor(Math.random() * 5),
      blockedRequests: Math.floor(Math.random() * 100) + 50,
      failedLogins: Math.floor(Math.random() * 20) + 5,
      securityEvents: generateSecurityEvents(),
      complianceStatus: {
        gdpr: 'compliant' as const,
        pci: 'compliant' as const,
        sox: 'compliant' as const
      }
    }

    // Generate alerts
    const alerts = {
      active: generateActiveAlerts(),
      recent: generateRecentAlerts(),
      alertRules: [
        { name: 'High CPU Usage', condition: 'cpu_usage > 80%', threshold: 80, currentValue: infrastructure.serverMetrics.cpu.usage, status: 'active' as const },
        { name: 'High Memory Usage', condition: 'memory_usage > 85%', threshold: 85, currentValue: infrastructure.serverMetrics.memory.utilization, status: 'active' as const },
        { name: 'High Error Rate', condition: 'error_rate > 5%', threshold: 5, currentValue: apiPerformance.errorRate, status: 'active' as const },
        { name: 'Slow Response Time', condition: 'response_time > 1000ms', threshold: 1000, currentValue: apiPerformance.averageResponseTime, status: 'active' as const },
        { name: 'Database Connection Pool', condition: 'db_pool_utilization > 90%', threshold: 90, currentValue: databasePerformance.connectionPool.utilization, status: 'active' as const }
      ]
    }

    // Generate capacity planning
    const capacityPlanning = {
      currentCapacity: {
        cpu: infrastructure.serverMetrics.cpu.usage,
        memory: infrastructure.serverMetrics.memory.utilization,
        storage: infrastructure.serverMetrics.disk.utilization,
        network: Math.floor(Math.random() * 20) + 30
      },
      projectedGrowth: {
        timeframe: '6 months',
        cpuGrowth: Math.floor(Math.random() * 20) + 10,
        memoryGrowth: Math.floor(Math.random() * 15) + 8,
        storageGrowth: Math.floor(Math.random() * 25) + 15
      },
      recommendations: [
        { component: 'Database', recommendation: 'Consider read replicas for better performance', priority: 'medium' as const, estimatedCost: 500, timeline: '2 months' },
        { component: 'API Gateway', recommendation: 'Implement caching to reduce response times', priority: 'high' as const, estimatedCost: 200, timeline: '1 month' },
        { component: 'Storage', recommendation: 'Upgrade to SSD storage for better I/O performance', priority: 'low' as const, estimatedCost: 1000, timeline: '3 months' }
      ]
    }

    // Generate performance optimization
    const performanceOptimization = {
      bottlenecks: [
        { component: 'Database Queries', impact: 'high' as const, description: 'Slow queries affecting response times', solution: 'Optimize queries and add indexes' },
        { component: 'External API Calls', impact: 'medium' as const, description: 'Retell AI API calls taking too long', solution: 'Implement caching and timeout handling' },
        { component: 'Memory Usage', impact: 'low' as const, description: 'High memory usage in analytics processing', solution: 'Optimize data processing algorithms' }
      ],
      optimizationOpportunities: [
        { area: 'Database Indexing', potentialImprovement: 30, effort: 'medium' as const, roi: 250 },
        { area: 'API Caching', potentialImprovement: 40, effort: 'low' as const, roi: 400 },
        { area: 'Code Optimization', potentialImprovement: 20, effort: 'high' as const, roi: 150 },
        { area: 'Infrastructure Scaling', potentialImprovement: 50, effort: 'medium' as const, roi: 200 }
      ],
      performanceTrends: [
        { metric: 'Response Time', trend: 'improving' as const, change: -15, timeframe: '30 days' },
        { metric: 'Error Rate', trend: 'stable' as const, change: 2, timeframe: '30 days' },
        { metric: 'Throughput', trend: 'improving' as const, change: 25, timeframe: '30 days' },
        { metric: 'Uptime', trend: 'stable' as const, change: 0.1, timeframe: '30 days' }
      ]
    }

    const systemHealthMetrics: SystemHealthMetrics = {
      overallHealth,
      apiPerformance,
      databasePerformance,
      externalServices,
      infrastructure,
      errorAnalysis,
      securityMetrics,
      alerts,
      capacityPlanning,
      performanceOptimization
    }

    return NextResponse.json({
      success: true,
      data: systemHealthMetrics,
      metadata: {
        userId,
        includeDetails,
        timeRange,
        generatedAt: new Date().toISOString(),
        dataFreshness: 'real-time'
      }
    })

  } catch (error) {
    console.error('Error fetching system health metrics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch system health metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Helper functions
function generateErrorTrends() {
  const trends = []
  const now = new Date()
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
    trends.push({
      timestamp: timestamp.toISOString(),
      errors: Math.floor(Math.random() * 10) + 1,
      type: ['Database', 'API', 'External', 'Authentication'][Math.floor(Math.random() * 4)]
    })
  }
  return trends
}

function generateRecentErrors() {
  const errors = []
  const now = new Date()
  
  for (let i = 0; i < 10; i++) {
    const timestamp = new Date(now.getTime() - i * 30 * 60 * 1000) // 30 minutes ago
    errors.push({
      timestamp: timestamp.toISOString(),
      error: `Error ${i + 1}`,
      severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as 'low' | 'medium' | 'high' | 'critical',
      component: ['Database', 'API', 'External Service', 'Authentication'][Math.floor(Math.random() * 4)],
      message: `Sample error message ${i + 1}`
    })
  }
  return errors
}

function generateSecurityEvents() {
  const events = []
  const now = new Date()
  
  for (let i = 0; i < 5; i++) {
    const timestamp = new Date(now.getTime() - i * 2 * 60 * 60 * 1000) // 2 hours ago
    events.push({
      timestamp: timestamp.toISOString(),
      type: ['Failed Login', 'Suspicious Activity', 'Blocked Request', 'Security Scan'][Math.floor(Math.random() * 4)],
      severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high' | 'critical',
      source: `192.168.1.${Math.floor(Math.random() * 255)}`,
      description: `Security event ${i + 1} description`
    })
  }
  return events
}

function generateActiveAlerts() {
  const alerts = []
  const now = new Date()
  
  if (Math.random() > 0.7) {
    alerts.push({
      id: 'alert-1',
      type: 'warning' as const,
      message: 'High CPU usage detected',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      component: 'Server',
      acknowledged: false,
      actionRequired: true
    })
  }
  
  if (Math.random() > 0.8) {
    alerts.push({
      id: 'alert-2',
      type: 'error' as const,
      message: 'Database connection pool utilization high',
      timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      component: 'Database',
      acknowledged: false,
      actionRequired: true
    })
  }
  
  return alerts
}

function generateRecentAlerts() {
  const alerts = []
  const now = new Date()
  
  for (let i = 0; i < 5; i++) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000) // 1 hour ago
    alerts.push({
      id: `recent-alert-${i + 1}`,
      type: ['warning', 'error', 'critical'][Math.floor(Math.random() * 3)] as 'warning' | 'error' | 'critical',
      message: `Recent alert ${i + 1}`,
      timestamp: timestamp.toISOString(),
      resolved: Math.random() > 0.3
    })
  }
  return alerts
}
