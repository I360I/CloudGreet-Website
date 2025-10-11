import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  // Require admin authentication
  const authCheck = requireAdmin(request)
  if (authCheck.error) {
    logger.warn('Unauthorized admin API access attempt', {
      requestId,
      endpoint: '/api/admin/clients',
      ip: request.ip || 'unknown'
    })
    return authCheck.response
  }
  
  try {
    // Get real clients from database
    const { data: businesses, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select(`
        id,
        business_name,
        email,
        phone_number,
        created_at,
        onboarding_completed,
        users (
          id,
          email,
          last_login
        )
      `)
      .order('created_at', { ascending: false })

    if (businessError) {
      logger.error('Business fetch error', { 
        error: businessError, 
        requestId,
        action: 'get_admin_clients'
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch clients'
      }, { status: 500 })
    }

    // Get call and appointment statistics for each business
    const clientsWithStats = await Promise.all(
      (businesses || []).map(async (business) => {
        // Get call count
        const { count: callsCount } = await supabaseAdmin
          .from('calls')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id)

        // Get appointment count
        const { count: appointmentsCount } = await supabaseAdmin
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id)

        // Calculate monthly revenue (estimated)
        const monthlyRevenue = (appointmentsCount || 0) * 500 // $500 per appointment average

        return {
          id: business.id,
          business_name: business.business_name,
          email: business.email,
          phone_number: business.phone_number,
          created_at: business.created_at,
          subscription_status: business.onboarding_completed ? 'active' : 'pending',
          monthly_revenue: monthlyRevenue,
          calls_count: callsCount || 0,
          appointments_count: appointmentsCount || 0,
          last_activity: business.users?.[0]?.last_login || business.created_at
        }
      })
    )

    await logger.info('Admin clients fetched successfully', {
      requestId,
      clientCount: clientsWithStats.length,
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: clientsWithStats,
      meta: {
        requestId,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    logger.error('Admin clients error', { error: error instanceof Error ? error.message : 'Unknown error', 
      requestId,
      endpoint: 'admin_clients',
      responseTime: Date.now() - startTime
    })
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch clients'
    }, { status: 500 })
  }
}
