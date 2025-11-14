import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { verifyJWT } from '@/lib/auth-middleware'
import { CONFIG } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyJWT(request)
    if (!authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'
    let businessId = searchParams.get('businessId')

    // If businessId not provided, default to user's business
    if (!businessId) {
      const { data: userBusiness, error: businessError } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('owner_id', authResult.user.id)
        .single()

      if (businessError || !userBusiness) {
        // Return empty charts data instead of 404 for users without businesses
        return NextResponse.json({
          success: true,
          charts: {
            callVolume: [],
            bookingRate: [],
            revenueTrend: [],
            conversionFunnel: []
          }
        })
      }
      businessId = userBusiness.id
    }

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    let days = 30
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        days = 7
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        days = 30
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        days = 90
        break
      default:
        startDate.setDate(now.getDate() - 30)
        days = 30
    }

    // Verify business ownership
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    if (business.owner_id !== authResult.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Fetch calls for timeframe - only select needed fields
    const { data: calls, error: callsError } = await supabaseAdmin
      .from('calls')
      .select('created_at, status')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())

    // Fetch appointments for timeframe - only select created_at
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('created_at')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())

    if (callsError || appointmentsError) {
      logger.error('Error fetching chart data', { 
        callsError: callsError?.message, 
        appointmentsError: appointmentsError?.message 
      })
      return NextResponse.json(
        { error: 'Failed to fetch chart data' },
        { status: 500 }
      )
    }

    // Generate daily data for revenue trend
    const revenueLabels: string[] = []
    const revenueData: number[] = []
    const avgTicket = CONFIG.BUSINESS.AVERAGE_TICKET
    const closeRate = CONFIG.BUSINESS.CLOSE_RATE

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      revenueLabels.push(dateStr)
      
      const dayAppointments = appointments?.filter(a => {
        if (!a?.created_at) return false
        const aptDate = new Date(a.created_at).toISOString().split('T')[0]
        return aptDate === dateStr
      }).length || 0
      
      revenueData.push(dayAppointments * closeRate * avgTicket)
    }

    // Generate call volume data (weekly for 7d, daily for 30d, weekly for 90d)
    const callLabels: string[] = []
    const callData: number[] = []
    
    if (timeframe === '7d') {
      // Daily for 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' })
        
        callLabels.push(dateStr)
        
        const dayCalls = calls?.filter(c => {
          if (!c?.created_at) return false
          const callDate = new Date(c.created_at).toISOString().split('T')[0]
          const dateStrFull = date.toISOString().split('T')[0]
          return callDate === dateStrFull
        }).length || 0
        
        callData.push(dayCalls)
      }
    } else if (timeframe === '30d') {
      // Weekly for 30 days
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - (i * 7 + 7))
        const weekEnd = new Date(now)
        weekEnd.setDate(weekEnd.getDate() - (i * 7))
        
        callLabels.push(`Week ${4 - i}`)
        
        const weekCalls = calls?.filter(c => {
          if (!c?.created_at) return false
          const callDate = new Date(c.created_at)
          return callDate >= weekStart && callDate < weekEnd
        }).length || 0
        
        callData.push(weekCalls)
      }
    } else {
      // Monthly for 90 days
      for (let i = 2; i >= 0; i--) {
        const monthStart = new Date(now)
        monthStart.setMonth(monthStart.getMonth() - (i + 1))
        const monthEnd = new Date(now)
        monthEnd.setMonth(monthEnd.getMonth() - i)
        
        callLabels.push(monthStart.toLocaleDateString('en-US', { month: 'short' }))
        
        const monthCalls = calls?.filter(c => {
          if (!c?.created_at) return false
          const callDate = new Date(c.created_at)
          return callDate >= monthStart && callDate < monthEnd
        }).length || 0
        
        callData.push(monthCalls)
      }
    }

    // Calculate conversion data (outcomes) with null safety
    const completedCalls = calls?.filter(c => c?.status === 'completed').length || 0
    const missedCalls = calls?.filter(c => c?.status === 'missed' || c?.status === 'no_answer').length || 0
    const totalCalls = calls?.length || 0
    const appointmentsCount = appointments?.length || 0

    const revenueChartData = {
      labels: revenueLabels,
      datasets: [{
        label: 'Revenue ($)',
        data: revenueData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      }]
    }

    const callChartData = {
      labels: callLabels,
      datasets: [{
        label: 'Calls',
        data: callData,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }]
    }

    const conversionChartData = {
      labels: ['Appointments', 'Completed Calls', 'Missed Calls'],
      datasets: [{
        data: [appointmentsCount, completedCalls, missedCalls],
        backgroundColor: [
          'rgba(147, 51, 234, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgb(147, 51, 234)',
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 2
      }]
    }

    return NextResponse.json({
      success: true,
      charts: {
        revenueData: revenueChartData,
        callData: callChartData,
        conversionData: conversionChartData
      },
      timeframe
    })

  } catch (error) {
    logger.error('Real charts error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    )
  }
}

