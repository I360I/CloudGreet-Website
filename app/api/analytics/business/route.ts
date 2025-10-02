import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
    
    // Decode JWT token
    const decoded = jwt.verify(token, jwtSecret) as any
    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Get date range from query params
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'
    
    const now = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Get call analytics
    const { data: calls, error: callsError } = await supabaseAdmin
      .from('call_logs')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())

    // Get appointment analytics
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())

    if (callsError || appointmentsError) {
      return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
    }

    // Calculate metrics
    const totalCalls = calls?.length || 0
    const answeredCalls = calls?.filter(call => call.status === 'completed').length || 0
    const missedCalls = calls?.filter(call => call.status === 'no_answer').length || 0
    const avgCallDuration = calls?.length > 0 
      ? Math.round(calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length)
      : 0

    const totalAppointments = appointments?.length || 0
    const completedAppointments = appointments?.filter(apt => apt.status === 'completed').length || 0
    const scheduledAppointments = appointments?.filter(apt => apt.status === 'scheduled').length || 0
    const cancelledAppointments = appointments?.filter(apt => apt.status === 'cancelled').length || 0

    // Calculate conversion rate (appointments per call)
    const conversionRate = totalCalls > 0 ? Math.round((totalAppointments / totalCalls) * 100) : 0

    // Calculate revenue (assuming $200 per appointment)
    const estimatedRevenue = completedAppointments * 200

    // Call volume by day
    const callVolume = {}
    calls?.forEach(call => {
      const date = new Date(call.created_at).toISOString().split('T')[0]
      callVolume[date] = (callVolume[date] || 0) + 1
    })

    // Appointment volume by day
    const appointmentVolume = {}
    appointments?.forEach(apt => {
      const date = new Date(apt.created_at).toISOString().split('T')[0]
      appointmentVolume[date] = (appointmentVolume[date] || 0) + 1
    })

    // Top service types
    const serviceTypes = {}
    appointments?.forEach(apt => {
      const service = apt.service_type || 'General Service'
      serviceTypes[service] = (serviceTypes[service] || 0) + 1
    })

    const topServices = Object.entries(serviceTypes)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([service, count]) => ({ service, count }))

    // Peak calling hours
    const hourDistribution = {}
    calls?.forEach(call => {
      const hour = new Date(call.created_at).getHours()
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1
    })

    const peakHours = Object.entries(hourDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))

    const analytics = {
      summary: {
        totalCalls,
        answeredCalls,
        missedCalls,
        avgCallDuration,
        totalAppointments,
        completedAppointments,
        scheduledAppointments,
        cancelledAppointments,
        conversionRate,
        estimatedRevenue
      },
      trends: {
        callVolume,
        appointmentVolume
      },
      insights: {
        topServices,
        peakHours,
        answerRate: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
        completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0
      },
      timeframe,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch analytics' 
    }, { status: 500 })
  }
}
