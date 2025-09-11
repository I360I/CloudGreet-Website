import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // For now, use test user ID to ensure API always works
    // TODO: Implement proper client-side authentication
    const userId = '00000000-0000-0000-0000-000000000001'

    // Get user's phone integration details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('phone_number, retell_agent_id, business_name, business_type')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({
        phone_number: null,
        retell_agent_id: null,
        status: 'inactive',
        last_call: null,
        total_calls: 0,
        appointments_scheduled: 0
      })
    }

    // Get call statistics
    const { data: callStats, error: callError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })

    if (callError) {
      console.error('Error fetching call stats:', callError)
    }

    // Get appointment statistics
    const { data: appointmentStats, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'scheduled')

    if (appointmentError) {
      console.error('Error fetching appointment stats:', appointmentError)
    }

    const totalCalls = callStats?.length || 0
    const appointmentsScheduled = appointmentStats?.length || 0
    const lastCall = callStats?.[0]?.started_at || null

    // Determine status
    let status: 'active' | 'inactive' | 'pending' = 'inactive'
    if (user.phone_number && user.retell_agent_id) {
      status = 'active'
    } else if (user.phone_number || user.retell_agent_id) {
      status = 'pending'
    }

    return NextResponse.json({
      phone_number: user.phone_number,
      retell_agent_id: user.retell_agent_id,
      status,
      last_call: lastCall,
      total_calls: totalCalls,
      appointments_scheduled: appointmentsScheduled,
      business_name: user.business_name,
      business_type: user.business_type
    })

  } catch (error) {
    console.error('Error fetching phone status:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch phone status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
