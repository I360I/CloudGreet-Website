import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { handleApiError, createSuccessResponse } from '../../../../lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    // Check admin access (in a real app, you'd verify admin role)
    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail) {
      return NextResponse.json({ 
        success: false,
        error: 'Admin configuration missing' 
      }, { status: 503 })
    }

    // Calculate real admin stats from database
    const [
      { data: totalUsers, error: usersError },
      { data: activeUsers, error: activeUsersError },
      { data: totalCalls, error: callsError },
      { data: totalAppointments, error: appointmentsError },
      { data: monthlyRevenue, error: revenueError },
      { data: newUsersThisMonth, error: newUsersError }
    ] = await Promise.all([
      // Total clients
      supabase
        .from('users')
        .select('id', { count: 'exact' }),
      
      // Active clients (users with recent activity)
      supabase
        .from('users')
        .select('id', { count: 'exact' })
        .gte('last_active', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Total calls
      supabase
        .from('calls')
        .select('id', { count: 'exact' }),
      
      // Total appointments
      supabase
        .from('appointments')
        .select('id', { count: 'exact' }),
      
      // Monthly revenue
      supabase
        .from('appointments')
        .select('amount')
        .gte('start_time', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .lt('start_time', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()),
      
      // New users this month
      supabase
        .from('users')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .lt('created_at', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString())
    ])

    if (usersError || activeUsersError || callsError || appointmentsError || revenueError || newUsersError) {
      throw new Error('Failed to fetch admin statistics')
    }

    const totalClients = totalUsers?.length || 0
    const activeClients = activeUsers?.length || 0
    const totalCallsCount = totalCalls?.length || 0
    const totalBookings = totalAppointments?.length || 0
    const monthlyRevenueAmount = monthlyRevenue?.reduce((sum, apt) => sum + (apt.amount || 0), 0) || 0
    const newClientsThisMonth = newUsersThisMonth?.length || 0

    // Calculate conversion rate
    const averageConversionRate = totalCallsCount > 0 ? (totalBookings / totalCallsCount) * 100 : 0

    // Calculate churn rate (users who haven't been active in 90 days)
    const { data: churnedUsers, error: churnError } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .lt('last_active', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

    const churnRate = totalClients > 0 ? ((churnedUsers?.length || 0) / totalClients) * 100 : 0

    // Get business type distribution
    const { data: businessTypes, error: businessTypesError } = await supabase
      .from('users')
      .select('business_type')
      .not('business_type', 'is', null)

    const businessTypeDistribution = businessTypes?.reduce((acc: any, user: any) => {
      const type = user.business_type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {}) || {}

    // Get revenue by business type
    const { data: revenueByType, error: revenueByTypeError } = await supabase
      .from('appointments')
      .select(`
        amount,
        users!inner(business_type)
      `)
      .gte('start_time', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    const revenueByBusinessType = revenueByType?.reduce((acc: any, apt: any) => {
      const type = apt.users?.business_type || 'unknown'
      acc[type] = (acc[type] || 0) + (apt.amount || 0)
      return acc
    }, {}) || {}

    // Get top performing clients
    const { data: topClients, error: topClientsError } = await supabase
      .from('appointments')
      .select(`
        user_id,
        amount,
        users!inner(name, business_type)
      `)
      .gte('start_time', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    const clientPerformance = topClients?.reduce((acc: any, apt: any) => {
      const userId = apt.user_id
      if (!acc[userId]) {
        acc[userId] = {
          name: apt.users?.name || 'Unknown',
          businessType: apt.users?.business_type || 'unknown',
          revenue: 0,
          appointmentCount: 0
        }
      }
      acc[userId].revenue += apt.amount || 0
      acc[userId].appointmentCount += 1
      return acc
    }, {}) || {}

    const topPerformingClients = Object.values(clientPerformance)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10)

    const stats = {
      overview: {
        totalClients,
        activeClients,
        monthlyRevenue: monthlyRevenueAmount,
        totalCalls: totalCallsCount,
        totalBookings,
        averageConversionRate: Math.round(averageConversionRate * 100) / 100,
        newClientsThisMonth,
        churnRate: Math.round(churnRate * 100) / 100
      },
      distribution: {
        businessTypes: businessTypeDistribution,
        revenueByBusinessType
      },
      performance: {
        topClients: topPerformingClients,
        averageRevenuePerClient: totalClients > 0 ? Math.round(monthlyRevenueAmount / totalClients) : 0,
        averageCallsPerClient: totalClients > 0 ? Math.round(totalCallsCount / totalClients) : 0
      },
      trends: {
        clientGrowth: calculateClientGrowth(),
        revenueGrowth: calculateRevenueGrowth(),
        callVolumeGrowth: calculateCallVolumeGrowth()
      }
    }

    return createSuccessResponse({ stats })

  } catch (error) {
    return handleApiError(error)
  }
}

// Helper functions for trend calculations
async function calculateClientGrowth(): Promise<number> {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [lastMonthUsers, thisMonthUsers] = await Promise.all([
    supabase
      .from('users')
      .select('id', { count: 'exact' })
      .gte('created_at', new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString())
      .lt('created_at', new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1).toISOString()),
    
    supabase
      .from('users')
      .select('id', { count: 'exact' })
      .gte('created_at', new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString())
      .lt('created_at', new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 1).toISOString())
  ])

  const lastMonthCount = lastMonthUsers.data?.length || 0
  const thisMonthCount = thisMonthUsers.data?.length || 0

  return lastMonthCount > 0 ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0
}

async function calculateRevenueGrowth(): Promise<number> {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [lastMonthRevenue, thisMonthRevenue] = await Promise.all([
    supabase
      .from('appointments')
      .select('amount')
      .gte('start_time', new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString())
      .lt('start_time', new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1).toISOString()),
    
    supabase
      .from('appointments')
      .select('amount')
      .gte('start_time', new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString())
      .lt('start_time', new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 1).toISOString())
  ])

  const lastMonthAmount = lastMonthRevenue.data?.reduce((sum, apt) => sum + (apt.amount || 0), 0) || 0
  const thisMonthAmount = thisMonthRevenue.data?.reduce((sum, apt) => sum + (apt.amount || 0), 0) || 0

  return lastMonthAmount > 0 ? ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100 : 0
}

async function calculateCallVolumeGrowth(): Promise<number> {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [lastMonthCalls, thisMonthCalls] = await Promise.all([
    supabase
      .from('calls')
      .select('id', { count: 'exact' })
      .gte('created_at', new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString())
      .lt('created_at', new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1).toISOString()),
    
    supabase
      .from('calls')
      .select('id', { count: 'exact' })
      .gte('created_at', new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString())
      .lt('created_at', new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 1).toISOString())
  ])

  const lastMonthCount = lastMonthCalls.data?.length || 0
  const thisMonthCount = thisMonthCalls.data?.length || 0

  return lastMonthCount > 0 ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0
}