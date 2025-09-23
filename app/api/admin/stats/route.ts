import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get real statistics from database
    const { supabaseAdmin } = await import('@/lib/supabase')
    
    // Query real data from database
    const [businessesResult, callsResult, appointmentsResult] = await Promise.all([
      supabaseAdmin().from('businesses').select('id, subscription_status, created_at'),
      supabaseAdmin().from('call_logs').select('id, created_at, status'),
      supabaseAdmin().from('appointments').select('id, created_at, actual_value, estimated_value')
    ])

    const businesses = businessesResult.data || []
    const calls = callsResult.data || []
    const appointments = appointmentsResult.data || []

    // Calculate real statistics
    const totalClients = businesses.length
    const activeClients = businesses.filter(b => (b as any).subscription_status === 'active').length
    const trialClients = businesses.filter(b => (b as any).subscription_status === 'inactive').length
    
    const totalCalls = calls.length
    const totalAppointments = appointments.length
    
    const totalRevenue = appointments.reduce((sum, apt) => {
      const value = (apt as any).actual_value || (apt as any).estimated_value || 0
      return sum + value
    }, 0)

    // Calculate monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const monthlyRevenue = appointments
      .filter(apt => new Date((apt as any).created_at) >= thirtyDaysAgo)
      .reduce((sum, apt) => {
        const value = (apt as any).actual_value || (apt as any).estimated_value || 0
        return sum + value
      }, 0)

    // Get system uptime from system_health table
    const { data: healthData } = await supabaseAdmin().from('system_health')
      .select('status, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    const systemUptime = healthData && healthData.length > 0 
      ? (healthData.filter(h => (h as any).status === 'healthy').length / healthData.length) * 100
      : 100

    const stats = {
      totalClients,
      activeClients,
      trialClients,
      totalRevenue,
      monthlyRevenue,
      totalCalls,
      totalAppointments,
      systemUptime: Math.round(systemUptime * 10) / 10,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    // Log error to database
    try {
      const { supabaseAdmin } = await import('@/lib/supabase')
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'admin_stats_error',
        error_message: 'Admin stats API error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        details: error instanceof Error ? error.stack : null,
        created_at: new Date().toISOString()
      } as any)
    } catch (logError) {
      // Silent fail for logging
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch stats'
    }, { status: 500 })
  }
}