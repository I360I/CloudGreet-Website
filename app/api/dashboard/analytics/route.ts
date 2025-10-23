/**
 * Dashboard Analytics API
 * Provides chart data and analytics for the client dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get business ID from user
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    const businessId = business.id
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'

    // Calculate date range
    const now = new Date()
    const daysBack = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 30
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    // Fetch call volume data
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('created_at, status, duration')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Fetch appointment data
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('created_at, estimated_value')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Process call volume by day
    const callsByDay: { [key: string]: number } = {}
    calls?.forEach(call => {
      const date = new Date(call.created_at).toLocaleDateString()
      callsByDay[date] = (callsByDay[date] || 0) + 1
    })

    // Process appointment volume by day
    const appointmentsByDay: { [key: string]: number } = {}
    appointments?.forEach(apt => {
      const date = new Date(apt.created_at).toLocaleDateString()
      appointmentsByDay[date] = (appointmentsByDay[date] || 0) + 1
    })

    // Process revenue by day
    const revenueByDay: { [key: string]: number } = {}
    appointments?.forEach(apt => {
      const date = new Date(apt.created_at).toLocaleDateString()
      revenueByDay[date] = (revenueByDay[date] || 0) + (apt.estimated_value || 0)
    })

    // Process call outcomes
    const outcomes: { [key: string]: number } = {}
    calls?.forEach(call => {
      outcomes[call.status] = (outcomes[call.status] || 0) + 1
    })

    // Generate labels for the timeframe
    const labels: string[] = []
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      labels.push(date.toLocaleDateString())
    }

    // Build chart data
    const analytics = {
      revenueData: {
        labels,
        values: labels.map(label => revenueByDay[label] || 0)
      },
      callData: {
        labels: labels.slice(-7), // Last 7 days for call chart
        values: labels.slice(-7).map(label => callsByDay[label] || 0)
      },
      conversionData: {
        answered: outcomes['answered'] || outcomes['completed'] || 0,
        booked: appointments?.length || 0,
        missed: outcomes['missed'] || outcomes['no-answer'] || 0
      },
      dailyCalls: labels.map(label => ({
        date: label,
        count: callsByDay[label] || 0
      })),
      dailyAppointments: labels.map(label => ({
        date: label,
        count: appointmentsByDay[label] || 0
      })),
      callOutcomes: Object.entries(outcomes).map(([label, count]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        count
      })),
      conversionRate: calls && calls.length > 0 
        ? Math.round((appointments?.length || 0) / calls.length * 100) 
        : 0
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('Dashboard analytics error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

