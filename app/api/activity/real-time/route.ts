import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Real-time activity feed API
 * Fetches actual activity data from database
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (!businessId) {
      return NextResponse.json({
        activities: [],
        message: 'Business ID is required'
      }, { status: 400 })
    }

    // Fetch real activities from database
    const activities = await getRealActivities(businessId, limit)

    return NextResponse.json({
      success: true,
      activities,
      timestamp: new Date().toISOString(),
      message: `Fetched ${activities.length} real activities`
    })

  } catch (error) {
    logger.error('Real-time activity API error', {
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
    })

    return NextResponse.json({
      success: false,
      activities: [],
      error: 'Failed to fetch real-time activities'
    }, { status: 500 })
  }
}

async function getRealActivities(businessId: string, limit: number) {
  try {
    const activities = []

    // Get recent calls
    const { data: calls, error: callsError } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!callsError && calls) {
      calls.forEach(call => {
        activities.push({
          id: `call-${call.id}`,
          type: 'call',
          title: call.call_status === 'answered' ? 'Call Answered' : 'Call Received',
          description: `Call from ${call.customer_phone || 'unknown number'}`,
          timestamp: new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: call.call_status === 'answered' ? 'success' : 'warning',
          value: call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : 'Unknown'
        })
      })
    }

    // Get recent appointments
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!appointmentsError && appointments) {
      appointments.forEach(apt => {
        activities.push({
          id: `appointment-${apt.id}`,
          type: 'appointment',
          title: apt.status === 'confirmed' ? 'Appointment Confirmed' : 'Appointment Scheduled',
          description: `Appointment for ${apt.customer_name || 'customer'}`,
          timestamp: new Date(apt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: apt.status === 'confirmed' ? 'success' : 'info',
          value: apt.estimated_value ? `$${apt.estimated_value}` : 'No value'
        })
      })
    }

    // Get recent leads
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!leadsError && leads) {
      leads.forEach(lead => {
        activities.push({
          id: `lead-${lead.id}`,
          type: 'message',
          title: 'New Lead Created',
          description: `Lead from ${lead.source || 'unknown source'}`,
          timestamp: new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'info',
          value: lead.status || 'New'
        })
      })
    }

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

  } catch (error) {
    logger.error('Error fetching real activities', { error })
    return []
  }
}


