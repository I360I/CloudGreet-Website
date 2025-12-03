import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin Client Management API
 * 
 * GET: List all clients (businesses) with activity summary
 * GET /:id: Get detailed client information with full activity
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // Return list of all clients
    return await getClientsList(request)

  } catch (error) {
    logger.error('Admin clients GET failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

/**
 * Get list of all clients with activity summary
 */
async function getClientsList(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status') // 'active', 'inactive', 'suspended', 'cancelled'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build query for businesses
    let query = supabaseAdmin
      .from('businesses')
      .select('id, business_name, email, phone_number, business_type, subscription_status, account_status, onboarding_completed, created_at, updated_at', { count: 'exact' })

    // Apply filters
    if (status) {
      if (status === 'active') {
        query = query.eq('subscription_status', 'active')
      } else {
        query = query.eq('account_status', status)
      }
    }
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: businesses, error, count } = await query

    if (error) {
      logger.error('Failed to fetch clients', { error: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    // Optimize: Use SQL aggregation to get all stats in one query per business
    // This eliminates N+1 query pattern
    const businessIds = (businesses || []).map(b => b.id)
    
    if (businessIds.length === 0) {
      return NextResponse.json({
        success: true,
        clients: [],
        statistics: {
          total: count || 0,
          active: 0,
          inactive: 0,
          suspended: 0,
          cancelled: 0
        },
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: false
        }
      })
    }

    // Batch fetch call stats using SQL aggregation
    const { data: callStats } = await supabaseAdmin.rpc('get_business_call_stats', {
      business_ids: businessIds
    }).catch(async () => {
      // Fallback: If RPC doesn't exist, use optimized batch queries
      const { data: allCalls } = await supabaseAdmin
        .from('calls')
        .select('business_id, created_at')
        .in('business_id', businessIds)
        .order('created_at', { ascending: false })

      // Group by business_id and get counts and latest dates
      const statsMap = new Map<string, { count: number; lastCall: string | null }>()
      businessIds.forEach(id => statsMap.set(id, { count: 0, lastCall: null }))
      
      // Process calls to get counts and latest dates per business
      const callMap = new Map<string, string[]>()
      allCalls?.forEach(call => {
        if (!callMap.has(call.business_id)) {
          callMap.set(call.business_id, [])
        }
        callMap.get(call.business_id)!.push(call.created_at)
      })
      
      // Update stats with correct counts and latest dates
      callMap.forEach((dates, businessId) => {
        const stats = statsMap.get(businessId)
        if (stats) {
          stats.count = dates.length
          // Get latest date (dates are already sorted DESC from query)
          stats.lastCall = dates && dates.length > 0 ? dates[0] : null
        }
      })
      
      return { data: Array.from(statsMap.entries()).map(([business_id, stats]) => ({
        business_id,
        call_count: stats.count,
        last_call_date: stats.lastCall
      })) }
    })

    // Batch fetch appointment stats using SQL aggregation
    const { data: appointmentStats } = await supabaseAdmin.rpc('get_business_appointment_stats', {
      business_ids: businessIds
    }).catch(async () => {
      // Fallback: If RPC doesn't exist, use optimized batch queries
      const { data: allAppointments } = await supabaseAdmin
        .from('appointments')
        .select('business_id, scheduled_date')
        .in('business_id', businessIds)
        .order('scheduled_date', { ascending: false })

      // Group by business_id and get counts and latest dates
      const statsMap = new Map<string, { count: number; lastAppointment: string | null }>()
      businessIds.forEach(id => statsMap.set(id, { count: 0, lastAppointment: null }))
      
      // Process appointments to get counts and latest dates per business
      const appointmentMap = new Map<string, string[]>()
      allAppointments?.forEach(apt => {
        if (!appointmentMap.has(apt.business_id)) {
          appointmentMap.set(apt.business_id, [])
        }
        if (apt.scheduled_date) {
          appointmentMap.get(apt.business_id)!.push(apt.scheduled_date)
        }
      })
      
      // Update stats with correct counts and latest dates
      appointmentMap.forEach((dates, businessId) => {
        const stats = statsMap.get(businessId)
        if (stats) {
          stats.count = dates.length
          // Get latest date (dates are already sorted DESC from query)
          stats.lastAppointment = dates[0] || null
        }
      })
      
      return { data: Array.from(statsMap.entries()).map(([business_id, stats]) => ({
        business_id,
        appointment_count: stats.count,
        last_appointment_date: stats.lastAppointment
      })) }
    })

    // Create lookup maps for O(1) access
    interface CallStat {
      business_id: string
      call_count?: number
      last_call_date?: string | null
    }
    interface AppointmentStat {
      business_id: string
      appointment_count?: number
      last_appointment_date?: string | null
    }
    const callStatsMap = new Map(
      (callStats || []).map((stat: CallStat) => [
        stat.business_id,
        { count: stat.call_count || 0, lastCall: stat.last_call_date || null }
      ])
    )
    const appointmentStatsMap = new Map(
      (appointmentStats || []).map((stat: AppointmentStat) => [
        stat.business_id,
        { count: stat.appointment_count || 0, lastAppointment: stat.last_appointment_date || null }
      ])
    )

    // Combine business data with stats
    const clientsWithActivity = (businesses || []).map((business) => {
      const callStats = callStatsMap.get(business.id) || { count: 0, lastCall: null }
      const appointmentStats = appointmentStatsMap.get(business.id) || { count: 0, lastAppointment: null }

      return {
        ...business,
        totalCalls: callStats.count,
        totalAppointments: appointmentStats.count,
        lastCallDate: callStats.lastCall,
        lastAppointmentDate: appointmentStats.lastAppointment
      }
    })

    // Get statistics
    const { data: allBusinesses } = await supabaseAdmin
      .from('businesses')
      .select('subscription_status, account_status')

    const statistics = {
      total: count || 0,
      active: allBusinesses?.filter(b => b.subscription_status === 'active').length || 0,
      inactive: allBusinesses?.filter(b => b.subscription_status === 'inactive').length || 0,
      suspended: allBusinesses?.filter(b => b.account_status === 'suspended').length || 0,
      cancelled: allBusinesses?.filter(b => b.account_status === 'cancelled').length || 0
    }

    return NextResponse.json({
      success: true,
      clients: clientsWithActivity,
      statistics,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    logger.error('Failed to fetch clients list', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

