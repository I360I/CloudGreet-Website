import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { requireAuth } from '@/lib/auth-middleware'
import { CONFIG } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId || !authResult.businessId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    // Use businessId from auth token, but allow override via query param for admin access
    const requestedBusinessId = searchParams.get('businessId')
    const businessId = requestedBusinessId || authResult.businessId

    // Verify tenant isolation - user can only access their own business
    if (businessId !== authResult.businessId) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this business' },
        { status: 403 }
      )
    }

    // Fetch totals - optimized queries
    const callsCount = await supabaseAdmin
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)

    const apptsCount = await supabaseAdmin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)

    // Defaults if null
    const totalCalls = callsCount.count ?? 0
    const totalAppointments = apptsCount.count ?? 0

    // ROI model using CONFIG
    const avgTicket = CONFIG.BUSINESS.AVERAGE_TICKET
    const closeRate = CONFIG.BUSINESS.CLOSE_RATE
    const subscription = CONFIG.BUSINESS.MONTHLY_COST
    const perBookingFee = CONFIG.BUSINESS.PER_BOOKING_FEE

    const estimatedRevenue = Math.round(totalAppointments * closeRate * avgTicket)
    const fees = subscription + totalAppointments * perBookingFee
    const roi = estimatedRevenue - fees

    return NextResponse.json({
      success: true,
      roi,
      metrics: {
        totalCalls,
        totalAppointments,
        estimatedRevenue,
        fees,
        closeRate,
        avgTicket
      }
    })
  } catch (error) {
    logger.error('ROI metrics failed', { error: (error as Error).message })
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 })
  }
}



