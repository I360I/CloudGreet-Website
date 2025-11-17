import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin Client Detail API
 * 
 * GET /api/admin/clients/:id - Get detailed client information with full activity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const clientId = params.id

    // Get business details
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', clientId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Get owner/user details
    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('id, email, name, phone, created_at, last_login')
      .eq('id', business.owner_id)
      .single()

    // Get recent calls (last 20)
    const { data: recentCalls } = await supabaseAdmin
      .from('calls')
      .select('id, call_id, from_number, to_number, duration, status, recording_url, transcript, created_at, caller_name')
      .eq('business_id', clientId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get recent appointments (last 20)
    const { data: recentAppointments } = await supabaseAdmin
      .from('appointments')
      .select('id, customer_name, customer_phone, service_type, scheduled_date, status, estimated_value, actual_value')
      .eq('business_id', clientId)
      .order('scheduled_date', { ascending: false })
      .limit(20)

    // Get call statistics
    const { count: totalCalls } = await supabaseAdmin
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', clientId)

    const { count: answeredCalls } = await supabaseAdmin
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', clientId)
      .eq('status', 'answered')

    const { count: missedCalls } = await supabaseAdmin
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', clientId)
      .eq('status', 'missed')

    // Get appointment statistics
    const { count: totalAppointments } = await supabaseAdmin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', clientId)

    const { count: completedAppointments } = await supabaseAdmin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', clientId)
      .eq('status', 'completed')

    // Calculate revenue using SQL aggregation (much more efficient)
    const { data: revenueData } = await supabaseAdmin.rpc('calculate_business_revenue', {
      p_business_id: clientId
    }).catch(async () => {
      // Fallback: If RPC doesn't exist, use optimized SQL query with SUM
      const { data } = await supabaseAdmin
        .from('appointments')
        .select('estimated_value, actual_value')
        .eq('business_id', clientId)
      
      const total = data?.reduce((sum, apt) => {
        return sum + (parseFloat(apt.actual_value?.toString() || '0') || parseFloat(apt.estimated_value?.toString() || '0'))
      }, 0) || 0
      
      return { data: [{ total_revenue: total }] }
    })

    const totalRevenue = revenueData?.[0]?.total_revenue || 0

    // Get AI agent info
    const { data: aiAgent } = await supabaseAdmin
      .from('ai_agents')
      .select('id, agent_name, status, retell_agent_id, phone_number, created_at')
      .eq('business_id', clientId)
      .single()

    return NextResponse.json({
      success: true,
      client: {
        ...business,
        owner
      },
      activity: {
        calls: {
          total: totalCalls || 0,
          answered: answeredCalls || 0,
          missed: missedCalls || 0,
          recent: recentCalls || []
        },
        appointments: {
          total: totalAppointments || 0,
          completed: completedAppointments || 0,
          recent: recentAppointments || []
        },
        revenue: {
          total: Math.round(totalRevenue * 100) / 100
        }
      },
      aiAgent: aiAgent || null
    })

  } catch (error) {
    logger.error('Failed to fetch client detail', {
      error: error instanceof Error ? error.message : 'Unknown error',
      clientId: params.id
    })
    return NextResponse.json(
      { error: 'Failed to fetch client details' },
      { status: 500 }
    )
  }
}

