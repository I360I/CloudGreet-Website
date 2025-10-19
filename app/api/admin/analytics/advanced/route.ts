import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminToken } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic' // Fixed for deployment

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const adminPayload = verifyAdminToken(token)
    
    if (!adminPayload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'
    const startDate = new Date()
    
    // Calculate date range
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(startDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(startDate.getDate() - 90)
        break
      default:
        startDate.setDate(startDate.getDate() - 30)
    }

    const dateFilter = startDate.toISOString()

    // Fetch advanced analytics data
    const [
      { data: businesses, error: businessesError },
      { data: calls, error: callsError },
      { data: appointments, error: appointmentsError },
      { data: leads, error: leadsError },
      { data: revenue, error: revenueError }
    ] = await Promise.all([
      supabase
        .from('businesses')
        .select('id, created_at, subscription_status')
        .gte('created_at', dateFilter),
      supabase
        .from('calls')
        .select('id, created_at, call_status, duration')
        .gte('created_at', dateFilter),
      supabase
        .from('appointments')
        .select('id, created_at, status, value')
        .gte('created_at', dateFilter),
      supabase
        .from('leads')
        .select('id, created_at, outreach_status, total_score')
        .gte('created_at', dateFilter),
      supabase
        .from('stripe_payments')
        .select('id, created_at, amount, status')
        .gte('created_at', dateFilter)
    ])

    if (businessesError || callsError || appointmentsError || leadsError || revenueError) {
      console.error('Error fetching analytics data:', { businessesError, callsError, appointmentsError, leadsError, revenueError })
    }

    // Calculate metrics
    const totalBusinesses = businesses?.length || 0
    const activeBusinesses = businesses?.filter(b => b.subscription_status === 'active').length || 0
    const totalCalls = calls?.length || 0
    const answeredCalls = calls?.filter(c => c.call_status === 'answered').length || 0
    const totalAppointments = appointments?.length || 0
    const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0
    const totalLeads = leads?.length || 0
    const convertedLeads = leads?.filter(l => l.outreach_status === 'converted').length || 0
    const totalRevenue = revenue?.filter(r => r.status === 'succeeded').reduce((sum, r) => sum + (r.amount || 0), 0) || 0

    // Calculate conversion rates
    const callConversionRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0
    const appointmentConversionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0
    const leadConversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

    // Calculate average values
    const avgCallDuration = calls?.filter(c => c.duration).reduce((sum, c) => sum + (c.duration || 0), 0) / (calls?.filter(c => c.duration).length || 1)
    const avgAppointmentValue = appointments?.filter(a => a.value).reduce((sum, a) => sum + (a.value || 0), 0) / (appointments?.filter(a => a.value).length || 1)
    const avgLeadScore = leads?.filter(l => l.total_score).reduce((sum, l) => sum + (l.total_score || 0), 0) / (leads?.filter(l => l.total_score).length || 1)

    const analytics = {
      period,
      date_range: {
        start: dateFilter,
        end: new Date().toISOString()
      },
      overview: {
        total_businesses: totalBusinesses,
        active_businesses: activeBusinesses,
        total_calls: totalCalls,
        total_appointments: totalAppointments,
        total_leads: totalLeads,
        total_revenue: totalRevenue
      },
      conversion_rates: {
        call_conversion: Math.round(callConversionRate * 100) / 100,
        appointment_conversion: Math.round(appointmentConversionRate * 100) / 100,
        lead_conversion: Math.round(leadConversionRate * 100) / 100
      },
      averages: {
        call_duration: Math.round(avgCallDuration),
        appointment_value: Math.round(avgAppointmentValue * 100) / 100,
        lead_score: Math.round(avgLeadScore * 100) / 100
      },
      performance: {
        calls_answered: answeredCalls,
        appointments_completed: completedAppointments,
        leads_converted: convertedLeads,
        revenue_generated: totalRevenue
      }
    }

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Advanced analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
