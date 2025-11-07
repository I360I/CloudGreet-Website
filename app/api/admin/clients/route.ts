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

    // Get activity stats for each business
    const clientsWithActivity = await Promise.all(
      (businesses || []).map(async (business) => {
        // Get call count
        const { count: callCount } = await supabaseAdmin
          .from('calls')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id)

        // Get appointment count
        const { count: appointmentCount } = await supabaseAdmin
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id)

        // Get last call date
        const { data: lastCallData } = await supabaseAdmin
          .from('calls')
          .select('created_at')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(1)
        const lastCall = lastCallData && lastCallData.length > 0 ? lastCallData[0] : null

        // Get last appointment date
        const { data: lastAppointmentData } = await supabaseAdmin
          .from('appointments')
          .select('scheduled_date')
          .eq('business_id', business.id)
          .order('scheduled_date', { ascending: false })
          .limit(1)
        const lastAppointment = lastAppointmentData && lastAppointmentData.length > 0 ? lastAppointmentData[0] : null

        return {
          ...business,
          totalCalls: callCount || 0,
          totalAppointments: appointmentCount || 0,
          lastCallDate: lastCall?.created_at || null,
          lastAppointmentDate: lastAppointment?.scheduled_date || null
        }
      })
    )

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

