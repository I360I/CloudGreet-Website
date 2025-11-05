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
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }

    // Verify business ownership
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found', { businessId, error: businessError?.message || JSON.stringify(businessError) })
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    if (business.owner_id !== authResult.user.id) {
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



