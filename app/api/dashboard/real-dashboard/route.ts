import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Real dashboard widgets with actual data sources
const DASHBOARD_WIDGETS = {
  'real-time-calls': {
    id: 'real-time-calls',
    type: 'realtime',
    title: 'Live Call Monitor',
    description: 'Real-time call activity and status',
    component: 'RealTimeCallsWidget',
    dataSource: 'calls',
    refreshInterval: 2000,
    realTime: true,
    size: 'large',
    position: { x: 0, y: 0 }
  },
  'revenue-metrics': {
    id: 'revenue-metrics',
    type: 'kpi',
    title: 'Revenue Dashboard',
    description: 'Real revenue metrics and trends',
    component: 'RevenueMetricsWidget',
    dataSource: 'billing',
    refreshInterval: 5000,
    realTime: false,
    size: 'medium',
    position: { x: 1, y: 0 }
  },
  'conversion-funnel': {
    id: 'conversion-funnel',
    type: 'analytics',
    title: 'Conversion Funnel',
    description: 'Real conversion tracking and analysis',
    component: 'ConversionFunnelWidget',
    dataSource: 'conversion_events',
    refreshInterval: 10000,
    realTime: false,
    size: 'large',
    position: { x: 0, y: 1 }
  },
  'customer-satisfaction': {
    id: 'customer-satisfaction',
    type: 'metrics',
    title: 'Customer Satisfaction',
    description: 'Real customer feedback and ratings',
    component: 'CustomerSatisfactionWidget',
    dataSource: 'calls',
    refreshInterval: 15000,
    realTime: false,
    size: 'medium',
    position: { x: 1, y: 1 }
  },
  'appointment-calendar': {
    id: 'appointment-calendar',
    type: 'calendar',
    title: 'Appointment Calendar',
    description: 'Real appointment bookings and schedule',
    component: 'AppointmentCalendarWidget',
    dataSource: 'appointments',
    refreshInterval: 30000,
    realTime: false,
    size: 'full',
    position: { x: 0, y: 2 }
  },
  'ai-performance': {
    id: 'ai-performance',
    type: 'performance',
    title: 'AI Performance',
    description: 'Real AI response times and accuracy',
    component: 'AIPerformanceWidget',
    dataSource: 'ai_metrics',
    refreshInterval: 5000,
    realTime: true,
    size: 'medium',
    position: { x: 2, y: 0 }
  },
  'lead-qualification': {
    id: 'lead-qualification',
    type: 'analytics',
    title: 'Lead Qualification',
    description: 'Real lead scoring and qualification rates',
    component: 'LeadQualificationWidget',
    dataSource: 'leads',
    refreshInterval: 20000,
    realTime: false,
    size: 'medium',
    position: { x: 2, y: 1 }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const layoutId = searchParams.get('layoutId') || 'default'

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Get real dashboard data
    const dashboardData = await getRealDashboardData(businessId)
    
    // Get widget configurations
    const widgets = await getWidgetConfigurations(businessId, layoutId)
    
    // Get real-time state
    const currentState = await getCurrentState(businessId)

    return NextResponse.json({
      success: true,
      layout: {
        id: layoutId,
        name: getLayoutName(layoutId),
        widgets: widgets
      },
      data: dashboardData,
      currentState,
      lastUpdated: new Date().toISOString()
    })

  } catch (error: any) {
    logger.error('Real dashboard error', { 
      error: error.message,
      businessId: request.url.includes('businessId') ? new URL(request.url).searchParams.get('businessId') : 'unknown'
    })
    
    return NextResponse.json({ 
      error: 'Failed to generate real dashboard',
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, widgetId, configuration } = body

    if (!businessId || !widgetId) {
      return NextResponse.json({ error: 'Business ID and widget ID are required' }, { status: 400 })
    }

    // Save widget configuration
    const { data: savedConfig, error: saveError } = await supabaseAdmin
      .from('dashboard_widgets')
      .upsert({
        business_id: businessId,
        widget_id: widgetId,
        configuration: configuration,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) {
      logger.error('Failed to save widget configuration', { 
        error: saveError.message,
        businessId,
        widgetId 
      })
      return NextResponse.json({ 
        error: 'Failed to save widget configuration',
        details: saveError.message 
      }, { status: 500 })
    }

    logger.info('Widget configuration saved', { businessId, widgetId })

    return NextResponse.json({
      success: true,
      configuration: savedConfig
    })

  } catch (error: any) {
    logger.error('Dashboard configuration error', { 
      error: error.message
    })
    
    return NextResponse.json({ 
      error: 'Failed to save dashboard configuration',
      details: error.message 
    }, { status: 500 })
  }
}

async function getRealDashboardData(businessId: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000))
  const monthStart = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000))

  // Get real call data
  const { data: calls } = await supabaseAdmin
    .from('calls')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', monthStart.toISOString())

  // Get real appointment data
  const { data: appointments } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', monthStart.toISOString())

  // Get real revenue data
  const { data: revenue } = await supabaseAdmin
    .from('billing_transactions')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', monthStart.toISOString())

  // Get real conversion events
  const { data: conversionEvents } = await supabaseAdmin
    .from('conversion_events')
    .select('*')
    .eq('business_id', businessId)
    .gte('timestamp', monthStart.toISOString())

  // Calculate real metrics
  const totalCalls = calls?.length || 0
  const answeredCalls = calls?.filter(call => call.status === 'answered' || call.status === 'completed').length || 0
  const missedCalls = calls?.filter(call => call.status === 'missed').length || 0
  const totalAppointments = appointments?.length || 0
  const totalRevenue = revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
  const conversionRate = answeredCalls > 0 ? (totalAppointments / answeredCalls) * 100 : 0

  // Today's metrics
  const todayCalls = calls?.filter(call => new Date(call.created_at) >= today).length || 0
  const todayAppointments = appointments?.filter(apt => new Date(apt.created_at) >= today).length || 0
  const todayRevenue = revenue?.filter(r => new Date(r.created_at) >= today).reduce((sum, r) => sum + (r.amount || 0), 0) || 0

  // Week's metrics
  const weekCalls = calls?.filter(call => new Date(call.created_at) >= weekStart).length || 0
  const weekAppointments = appointments?.filter(apt => new Date(apt.created_at) >= weekStart).length || 0
  const weekRevenue = revenue?.filter(r => new Date(r.created_at) >= weekStart).reduce((sum, r) => sum + (r.amount || 0), 0) || 0

  return {
    overview: {
      totalCalls,
      answeredCalls,
      missedCalls,
      totalAppointments,
      totalRevenue,
      conversionRate
    },
    today: {
      calls: todayCalls,
      appointments: todayAppointments,
      revenue: todayRevenue
    },
    week: {
      calls: weekCalls,
      appointments: weekAppointments,
      revenue: weekRevenue
    },
    month: {
      calls: totalCalls,
      appointments: totalAppointments,
      revenue: totalRevenue
    },
    performance: {
      callAnswerRate: totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0,
      avgCallDuration: calls?.length > 0 ? calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length : 0,
      avgSatisfaction: calls?.length > 0 ? calls.reduce((sum, call) => sum + (call.satisfaction_score || 4), 0) / calls.length : 4,
      revenuePerCall: totalCalls > 0 ? totalRevenue / totalCalls : 0,
      revenuePerAppointment: totalAppointments > 0 ? totalRevenue / totalAppointments : 0
    }
  }
}

async function getWidgetConfigurations(businessId: string, layoutId: string) {
  // Get saved widget configurations
  const { data: savedWidgets } = await supabaseAdmin
    .from('dashboard_widgets')
    .select('*')
    .eq('business_id', businessId)

  // Get layout-specific widgets
  const layoutWidgets = getLayoutWidgets(layoutId)
  
  // Merge saved configurations with layout widgets
  const widgets = layoutWidgets.map(widget => {
    const savedConfig = savedWidgets?.find(sw => sw.widget_id === widget.id)
    return {
      ...widget,
      configuration: savedConfig?.configuration || {},
      isConfigured: !!savedConfig
    }
  })

  return widgets
}

function getLayoutWidgets(layoutId: string) {
  switch (layoutId) {
    case 'executive':
      return [
        DASHBOARD_WIDGETS['revenue-metrics'],
        DASHBOARD_WIDGETS['conversion-funnel'],
        DASHBOARD_WIDGETS['ai-performance']
      ]
    case 'operations':
      return [
        DASHBOARD_WIDGETS['real-time-calls'],
        DASHBOARD_WIDGETS['appointment-calendar'],
        DASHBOARD_WIDGETS['customer-satisfaction']
      ]
    case 'analytics':
      return [
        DASHBOARD_WIDGETS['conversion-funnel'],
        DASHBOARD_WIDGETS['lead-qualification'],
        DASHBOARD_WIDGETS['ai-performance']
      ]
    default:
      return [
        DASHBOARD_WIDGETS['real-time-calls'],
        DASHBOARD_WIDGETS['revenue-metrics'],
        DASHBOARD_WIDGETS['conversion-funnel'],
        DASHBOARD_WIDGETS['customer-satisfaction']
      ]
  }
}

async function getCurrentState(businessId: string) {
  const now = new Date()
  
  // Get active calls
  const { data: activeCalls } = await supabaseAdmin
    .from('calls')
    .select('*')
    .eq('business_id', businessId)
    .in('status', ['ringing', 'answered'])
    .gte('created_at', new Date(now.getTime() - 5 * 60 * 1000).toISOString()) // Last 5 minutes

  // Get today's revenue
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const { data: todayRevenue } = await supabaseAdmin
    .from('billing_transactions')
    .select('amount')
    .eq('business_id', businessId)
    .gte('created_at', todayStart.toISOString())

  // Get pending appointments
  const { data: pendingAppointments } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'scheduled')
    .gte('scheduled_date', now.toISOString())

  // Get system health
  const systemHealth = await getSystemHealth()

  return {
    activeCalls: activeCalls?.length || 0,
    todayRevenue: todayRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
    pendingAppointments: pendingAppointments?.length || 0,
    systemHealth,
    lastUpdated: now.toISOString()
  }
}

async function getSystemHealth() {
  try {
    // Check database connectivity
    const { error: dbError } = await supabaseAdmin
      .from('businesses')
      .select('count')
      .limit(1)

    // Check external services
    const services = {
      database: !dbError,
      openai: !!process.env.OPENAI_API_KEY,
      telnyx: !!process.env.TELNYX_API_KEY,
      stripe: !!process.env.STRIPE_SECRET_KEY
    }

    const overallHealth = Object.values(services).every(status => status) ? 'healthy' : 'degraded'

    return {
      status: overallHealth,
      services,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    return {
      status: 'unhealthy',
      services: {
        database: false,
        openai: false,
        telnyx: false,
        stripe: false
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

function getLayoutName(layoutId: string) {
  switch (layoutId) {
    case 'executive': return 'Executive Dashboard'
    case 'operations': return 'Operations Dashboard'
    case 'analytics': return 'Analytics Dashboard'
    default: return 'Default Dashboard'
  }
}
