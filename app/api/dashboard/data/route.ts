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
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find user's business - verify tenant isolation
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, phone_number, subscription_status, onboarding_completed')
      .eq('id', authResult.businessId)
      .eq('owner_id', authResult.userId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({
        businessId: null,
        businessName: '',
        phoneNumber: '',
        isActive: false,
        totalCalls: 0,
        totalAppointments: 0,
        totalRevenue: 0,
        recentCalls: [],
        upcomingAppointments: [],
        setupStatus: 'not_started',
        nextSteps: ['Complete onboarding', 'Set up phone number'],
        onboardingCompleted: false,
        hasPhoneNumber: false
      })
    }

    const businessId = business.id

    // Fetch totals - optimized queries
    const { count: totalCalls } = await supabaseAdmin
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)

    const { count: totalAppointments } = await supabaseAdmin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)

    // Calculate revenue using CONFIG
    const avgTicket = CONFIG.BUSINESS.AVERAGE_TICKET
    const closeRate = CONFIG.BUSINESS.CLOSE_RATE
    const totalRevenue = (totalAppointments || 0) * closeRate * avgTicket

    // Fetch recent calls
    const { data: recentCallsData } = await supabaseAdmin
      .from('calls')
      .select('id, from_number, duration, status, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10)

    const recentCalls = (recentCallsData || []).map(call => ({
      id: call.id,
      caller: call.from_number || 'Unknown',
      duration: call.duration ? `${call.duration}s` : '0s',
      status: call.status || 'unknown',
      date: new Date(call.created_at).toLocaleDateString()
    }))

    // Fetch upcoming appointments
    const { data: upcomingApptsData } = await supabaseAdmin
      .from('appointments')
      .select('id, customer_name, service_type, scheduled_date, start_time')
      .eq('business_id', businessId)
      .gte('scheduled_date', new Date().toISOString())
      .order('scheduled_date', { ascending: true })
      .limit(10)

    const upcomingAppointments = (upcomingApptsData || []).map(apt => ({
      id: apt.id,
      customer: apt.customer_name || 'Unknown',
      service: apt.service_type || 'General',
      date: new Date(apt.scheduled_date).toLocaleDateString(),
      time: apt.start_time ? new Date(apt.start_time).toLocaleTimeString() : ''
    }))

    // Determine setup status
    let setupStatus = 'complete'
    const nextSteps: string[] = []

    if (!business.onboarding_completed) {
      setupStatus = 'onboarding'
      nextSteps.push('Complete business profile')
    }

    if (!business.phone_number) {
      setupStatus = 'phone_setup'
      nextSteps.push('Provision phone number')
    }

    if (business.subscription_status !== 'active') {
      setupStatus = 'subscription'
      nextSteps.push('Activate subscription')
    }

    return NextResponse.json({
      businessId: business.id,
      businessName: business.business_name,
      phoneNumber: business.phone_number || '',
      isActive: business.subscription_status === 'active',
      totalCalls: totalCalls || 0,
      totalAppointments: totalAppointments || 0,
      totalRevenue: Math.round(totalRevenue),
      recentCalls,
      upcomingAppointments,
      setupStatus,
      nextSteps: nextSteps.length > 0 ? nextSteps : ['All set!'],
      onboardingCompleted: business.onboarding_completed || false,
      hasPhoneNumber: !!business.phone_number
    })

  } catch (error) {
    logger.error('Dashboard data error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

