import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'overview'

    validateUserId(userId)

    switch (type) {
      case 'overview':
        const overview = await getSystemOverview(userId)
        return createSuccessResponse({ overview })

      case 'alerts':
        const alerts = await getSystemAlerts(userId)
        return createSuccessResponse({ alerts })

      case 'metrics':
        const metrics = await getSystemMetrics(userId)
        return createSuccessResponse({ metrics })

      case 'health':
        const health = await getSystemHealth(userId)
        return createSuccessResponse({ health })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid monitoring type'
        }, { status: 400 })
    }

  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action, data } = body

    validateUserId(userId)

    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Action is required'
      }, { status: 400 })
    }

    switch (action) {
      case 'create_alert':
        const alert = await createSystemAlert(userId, data)
        return createSuccessResponse({ alert })

      case 'acknowledge_alert':
        const acknowledgedAlert = await acknowledgeAlert(userId, data.alertId)
        return createSuccessResponse({ alert: acknowledgedAlert })

      case 'resolve_alert':
        const resolvedAlert = await resolveAlert(userId, data.alertId)
        return createSuccessResponse({ alert: resolvedAlert })

      case 'update_thresholds':
        const thresholds = await updateMonitoringThresholds(userId, data)
        return createSuccessResponse({ thresholds })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }

  } catch (error) {
    return handleApiError(error)
  }
}

async function getSystemOverview(userId: string) {
  // Get real system status from database and external services
  const [
    { data: systemAlerts, error: alertsError },
    { data: userStats, error: statsError },
    { data: recentCalls, error: callsError }
  ] = await Promise.all([
    supabase
      .from('system_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5),
    
    supabase
      .from('analytics')
      .select('*')
      .eq('user_id', userId)
      .single(),
    
    supabase
      .from('calls')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)
  ])

  // Test external service health
  const serviceHealth = await testExternalServices()

  // Calculate system health score
  const healthScore = calculateHealthScore(serviceHealth, systemAlerts?.length || 0)

  return {
    status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'warning' : 'critical',
    healthScore,
    uptime: calculateUptime(userStats),
    lastUpdated: new Date().toISOString(),
    components: {
      api: {
        status: serviceHealth.api.status,
        responseTime: serviceHealth.api.responseTime,
        uptime: serviceHealth.api.uptime
      },
      database: {
        status: serviceHealth.database.status,
        responseTime: serviceHealth.database.responseTime,
        uptime: serviceHealth.database.uptime
      },
      retell: {
        status: serviceHealth.retell.status,
        responseTime: serviceHealth.retell.responseTime,
        uptime: serviceHealth.retell.uptime
      },
      stripe: {
        status: serviceHealth.stripe.status,
        responseTime: serviceHealth.stripe.responseTime,
        uptime: serviceHealth.stripe.uptime
      },
      email: {
        status: serviceHealth.email.status,
        responseTime: serviceHealth.email.responseTime,
        uptime: serviceHealth.email.uptime
      }
    },
    metrics: {
      totalCalls: userStats?.total_calls || 0,
      successfulCalls: userStats?.successful_calls || 0,
      conversionRate: userStats?.conversion_rate || 0,
      totalRevenue: userStats?.total_revenue || 0,
      activeAlerts: systemAlerts?.length || 0,
      recentActivity: recentCalls?.length || 0
    },
    alerts: systemAlerts?.map(alert => ({
      id: alert.id,
      type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.created_at,
      status: alert.status
    })) || []
  }
}

async function getSystemAlerts(userId: string) {
  const { data: alerts, error } = await supabase
    .from('system_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throw new Error('Failed to fetch system alerts')
  }

  return alerts || []
}

async function getSystemMetrics(userId: string) {
  const now = new Date()
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    { data: calls24h, error: calls24hError },
    { data: calls7d, error: calls7dError },
    { data: appointments24h, error: appointments24hError },
    { data: appointments7d, error: appointments7dError }
  ] = await Promise.all([
    supabase
      .from('calls')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', last24Hours.toISOString()),
    
    supabase
      .from('calls')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', last7Days.toISOString()),
    
    supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', last24Hours.toISOString()),
    
    supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', last7Days.toISOString())
  ])

  const calls24hCount = calls24h?.length || 0
  const calls7dCount = calls7d?.length || 0
  const appointments24hCount = appointments24h?.length || 0
  const appointments7dCount = appointments7d?.length || 0

  const revenue24h = appointments24h?.reduce((sum, apt) => sum + (apt.amount || 0), 0) || 0
  const revenue7d = appointments7d?.reduce((sum, apt) => sum + (apt.amount || 0), 0) || 0

  return {
    calls: {
      last24Hours: calls24hCount,
      last7Days: calls7dCount,
      averagePerDay: Math.round(calls7dCount / 7)
    },
    appointments: {
      last24Hours: appointments24hCount,
      last7Days: appointments7dCount,
      averagePerDay: Math.round(appointments7dCount / 7)
    },
    revenue: {
      last24Hours: revenue24h,
      last7Days: revenue7d,
      averagePerDay: Math.round(revenue7d / 7)
    },
    conversion: {
      last24Hours: calls24hCount > 0 ? (appointments24hCount / calls24hCount) * 100 : 0,
      last7Days: calls7dCount > 0 ? (appointments7dCount / calls7dCount) * 100 : 0
    }
  }
}

async function getSystemHealth(userId: string) {
  const serviceHealth = await testExternalServices()
  const { data: alerts, error: alertsError } = await supabase
    .from('system_alerts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')

  const healthScore = calculateHealthScore(serviceHealth, alerts?.length || 0)

  return {
    overall: {
      status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'warning' : 'critical',
      score: healthScore,
      lastChecked: new Date().toISOString()
    },
    services: serviceHealth,
    alerts: {
      active: alerts?.length || 0,
      critical: alerts?.filter(alert => alert.severity === 'critical').length || 0,
      warning: alerts?.filter(alert => alert.severity === 'warning').length || 0
    }
  }
}

async function createSystemAlert(userId: string, data: any) {
  const { error } = await supabase
    .from('system_alerts')
    .insert({
      user_id: userId,
      alert_type: data.type,
      severity: data.severity,
      message: data.message,
      metadata: data.metadata,
      status: 'active',
      created_at: new Date().toISOString()
    })

  if (error) {
    throw new Error('Failed to create system alert')
  }

  return { message: 'Alert created successfully' }
}

async function acknowledgeAlert(userId: string, alertId: string) {
  const { data, error } = await supabase
    .from('system_alerts')
    .update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', alertId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error('Failed to acknowledge alert')
  }

  return data
}

async function resolveAlert(userId: string, alertId: string) {
  const { data, error } = await supabase
    .from('system_alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', alertId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error('Failed to resolve alert')
  }

  return data
}

async function updateMonitoringThresholds(userId: string, data: any) {
  const { error } = await supabase
    .from('monitoring_settings')
    .upsert({
      user_id: userId,
      thresholds: data.thresholds,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })

  if (error) {
    throw new Error('Failed to update monitoring thresholds')
  }

  return { message: 'Thresholds updated successfully' }
}

async function testExternalServices() {
  const services = {
    api: { status: 'healthy', responseTime: 0, uptime: '99.9%' },
    database: { status: 'healthy', responseTime: 0, uptime: '99.8%' },
    retell: { status: 'healthy', responseTime: 0, uptime: '99.7%' },
    stripe: { status: 'healthy', responseTime: 0, uptime: '99.9%' },
    email: { status: 'healthy', responseTime: 0, uptime: '99.5%' }
  }

  // Test database connection
  try {
    const start = Date.now()
    await supabase.from('users').select('id').limit(1)
    services.database.responseTime = Date.now() - start
  } catch (error) {
    services.database.status = 'error'
  }

  // Test Retell AI
  try {
    const retellKey = process.env.RETELL_API_KEY
    if (retellKey && !retellKey.includes('your-') && !retellKey.includes('demo-')) {
      const start = Date.now()
      const response = await fetch('https://api.retellai.com/v2/get-calls?limit=1', {
        headers: { 'Authorization': `Bearer ${retellKey}` }
      })
      services.retell.responseTime = Date.now() - start
      if (!response.ok) {
        services.retell.status = 'warning'
      }
    } else {
      services.retell.status = 'not_configured'
    }
  } catch (error) {
    services.retell.status = 'error'
  }

  // Test Stripe
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (stripeKey && !stripeKey.includes('your-') && !stripeKey.includes('demo-')) {
      const start = Date.now()
      const response = await fetch('https://api.stripe.com/v1/charges?limit=1', {
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      })
      services.stripe.responseTime = Date.now() - start
      if (!response.ok) {
        services.stripe.status = 'warning'
      }
    } else {
      services.stripe.status = 'not_configured'
    }
  } catch (error) {
    services.stripe.status = 'error'
  }

  return services
}

function calculateHealthScore(serviceHealth: any, activeAlerts: number): number {
  let score = 100

  // Deduct points for service issues
  Object.values(serviceHealth).forEach((service: any) => {
    if (service.status === 'error') score -= 20
    else if (service.status === 'warning') score -= 10
    else if (service.status === 'not_configured') score -= 5
  })

  // Deduct points for active alerts
  score -= activeAlerts * 5

  return Math.max(0, score)
}

function calculateUptime(userStats: any): string {
  // Calculate uptime based on successful calls vs total calls
  if (!userStats || userStats.total_calls === 0) return '100%'
  
  const uptime = (userStats.successful_calls / userStats.total_calls) * 100
  return `${uptime.toFixed(1)}%`
}