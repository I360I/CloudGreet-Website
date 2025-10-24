import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { requireAdmin } from '@/lib/admin-auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const authCheck = requireAdmin(request)
    if (authCheck.error) return authCheck.response

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'
    const startDate = getStartDate(timeframe)

    // Get revenue data
    const { data: billingHistory } = await supabaseAdmin
      .from('billing_history')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    // Get subscription data
    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select('subscription_status, billing_plan, created_at')
      .gte('created_at', startDate.toISOString())

    // Get appointment data for conversion metrics
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('estimated_value, created_at, business_id')
      .gte('created_at', startDate.toISOString())

    // Calculate metrics
    const totalRevenue = billingHistory?.reduce((sum, record) => sum + (record.amount || 0), 0) || 0
    const subscriptionRevenue = billingHistory?.filter(r => r.description?.includes('Subscription')).reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    const bookingRevenue = billingHistory?.filter(r => r.description?.includes('Booking')).reduce((sum, r) => sum + (r.amount || 0), 0) || 0

    const activeSubscriptions = businesses?.filter(b => b.subscription_status === 'active').length || 0
    const totalSubscriptions = businesses?.length || 0
    const conversionRate = totalSubscriptions > 0 ? (activeSubscriptions / totalSubscriptions) * 100 : 0

    const totalAppointmentValue = appointments?.reduce((sum, apt) => sum + (apt.estimated_value || 0), 0) || 0
    const avgAppointmentValue = appointments?.length > 0 ? totalAppointmentValue / appointments.length : 0

    // Monthly breakdown
    const monthlyData = getMonthlyBreakdown(billingHistory || [], startDate)
    
    // Top performing businesses
    const businessRevenue = getBusinessRevenue(billingHistory || [])
    const topBusinesses = businessRevenue
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return NextResponse.json(createSuccessResponse({
      summary: {
        totalRevenue,
        subscriptionRevenue,
        bookingRevenue,
        activeSubscriptions,
        totalSubscriptions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        avgAppointmentValue: Math.round(avgAppointmentValue * 100) / 100,
        totalAppointments: appointments?.length || 0
      },
      monthlyBreakdown: monthlyData,
      topBusinesses,
      timeframe
    }))

  } catch (error) {
    logger.error('Revenue analytics error', { error })
    return NextResponse.json(createErrorResponse('Failed to fetch revenue analytics'), { status: 500 })
  }
}

function getStartDate(timeframe: string): Date {
  const now = new Date()
  switch (timeframe) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
}

function getMonthlyBreakdown(billingHistory: any[], startDate: Date) {
  const monthlyData: Record<string, number> = {}
  
  billingHistory.forEach(record => {
    const date = new Date(record.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0
    }
    
    monthlyData[monthKey] += record.amount || 0
  })

  return Object.entries(monthlyData)
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

function getBusinessRevenue(billingHistory: any[]) {
  const businessRevenue: Record<string, { businessId: string; revenue: number }> = {}
  
  billingHistory.forEach(record => {
    const businessId = record.business_id
    if (!businessRevenue[businessId]) {
      businessRevenue[businessId] = { businessId, revenue: 0 }
    }
    businessRevenue[businessId].revenue += record.amount || 0
  })

  return Object.values(businessRevenue)
}
