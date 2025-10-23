import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
    }

    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Get business data
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('subscription_status, billing_plan, created_at')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get calls data
    const { data: calls, error: callsError } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('business_id', businessId)

    if (callsError) {
      logger.error('Error fetching calls for ROI', { error: callsError.message, businessId })
    }

    // Get appointments data
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)

    if (appointmentsError) {
      logger.error('Error fetching appointments for ROI', { error: appointmentsError.message, businessId })
    }

    // Get billing history
    const { data: billingHistory, error: billingError } = await supabaseAdmin
      .from('billing_history')
      .select('*')
      .eq('business_id', businessId)

    if (billingError) {
      logger.error('Error fetching billing history for ROI', { error: billingError.message, businessId })
    }

    // Calculate metrics
    const totalCalls = calls?.length || 0
    const totalAppointments = appointments?.length || 0
    const totalRevenue = appointments?.reduce((sum, apt) => sum + (apt.estimated_value || 0), 0) || 0

    // Calculate costs
    const monthlySubscription = business.billing_plan === 'premium' ? 200 : 100
    const perBookingFees = billingHistory?.reduce((sum, bill) => sum + (bill.amount || 0), 0) || 0
    
    // Calculate months since signup
    const signupDate = new Date(business.created_at)
    const monthsSinceSignup = Math.max(1, Math.ceil((Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    
    const totalSubscriptionCosts = monthlySubscription * monthsSinceSignup
    const totalCosts = totalSubscriptionCosts + perBookingFees

    // Calculate ROI
    const netProfit = totalRevenue - totalCosts
    const roi = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0

    // Calculate break-even
    const avgRevenuePerAppointment = totalAppointments > 0 ? totalRevenue / totalAppointments : 0
    const avgCallsPerAppointment = totalCalls > 0 ? totalCalls / totalAppointments : 0
    const breakEvenCalls = avgRevenuePerAppointment > 0 ? Math.ceil(totalCosts / avgRevenuePerAppointment) : 0

    // Calculate payback period (months to break even)
    const monthlyRevenue = totalRevenue / monthsSinceSignup
    const paybackPeriod = monthlyRevenue > 0 ? Math.ceil(totalCosts / monthlyRevenue) : 0

    const roiData = {
      totalCalls,
      totalAppointments,
      totalRevenue,
      monthlySubscription,
      perBookingFees,
      totalCosts,
      netProfit,
      roi,
      paybackPeriod,
      breakEvenCalls
    }

    logger.info('ROI calculated', { 
      businessId, 
      totalCalls, 
      totalAppointments, 
      totalRevenue, 
      totalCosts, 
      roi 
    })

    return NextResponse.json({
      success: true,
      roi: roiData,
      calculatedAt: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Error calculating ROI', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to calculate ROI' 
    }, { status: 500 })
  }
}
