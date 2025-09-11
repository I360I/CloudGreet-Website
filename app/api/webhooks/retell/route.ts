import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('📞 Retell webhook received:', body.event_type)
    
    // Verify webhook signature (you should implement this for production)
    // const signature = request.headers.get('x-retell-signature')
    
    const { event_type, data } = body
    
    // Handle different Retell events
    switch (event_type) {
      case 'call_started':
        await handleCallStarted(data)
        break
      case 'call_ended':
        await handleCallEnded(data)
        break
      case 'call_analyzed':
        await handleCallAnalyzed(data)
        break
      case 'booking_created':
        await handleBookingCreated(data)
        break
      default:
        console.log('Unhandled Retell event:', event_type)
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error processing Retell webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCallStarted(data: any) {
  console.log('📞 Call started:', data.call_id)
  
  // Update user stats - increment total calls
  if (data.agent_id) {
    await updateUserStats(data.agent_id, {
      total_calls: 'increment'
    })
  }
}

async function handleCallEnded(data: any) {
  console.log('📞 Call ended:', data.call_id)
  
  // Update user stats with call duration and outcome
  if (data.agent_id) {
    const updates: any = {
      last_call_date: new Date().toISOString()
    }
    
    // If call resulted in a booking, increment active jobs
    if (data.call_outcome === 'booking_created') {
      updates.active_jobs = 'increment'
      updates.total_revenue = 'increment' // Add booking fee
    }
    
    await updateUserStats(data.agent_id, updates)
  }
}

async function handleCallAnalyzed(data: any) {
  console.log('📞 Call analyzed:', data.call_id)
  
  // Update user stats with call analysis results
  if (data.agent_id && data.analysis) {
    const updates: any = {}
    
    // Update customer rating based on sentiment
    if (data.analysis.sentiment_score) {
      updates.customer_rating = data.analysis.sentiment_score
    }
    
    await updateUserStats(data.agent_id, updates)
  }
}

async function handleBookingCreated(data: any) {
  console.log('📅 Booking created:', data.booking_id)
  
  // Update user stats for new booking
  if (data.agent_id) {
    await updateUserStats(data.agent_id, {
      active_jobs: 'increment',
      total_revenue: 'increment'
    })
  }
}

async function updateUserStats(agentId: string, updates: any) {
  try {
    const { supabaseAdmin } = await import('../../../../lib/supabase')
    
    // Find user by agent ID
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, total_calls, active_jobs, total_revenue, customer_rating')
      .eq('retell_agent_id', agentId)
      .single()
    
    if (userError || !user) {
      console.log('User not found for agent ID:', agentId)
      return
    }
    
    // Prepare update data
    const updateData: any = {}
    
    if (updates.total_calls === 'increment') {
      updateData.total_calls = (user.total_calls || 0) + 1
    }
    
    if (updates.active_jobs === 'increment') {
      updateData.active_jobs = (user.active_jobs || 0) + 1
    }
    
    if (updates.total_revenue === 'increment') {
      updateData.total_revenue = (user.total_revenue || 0) + 50 // $50 per booking
    }
    
    if (updates.customer_rating) {
      updateData.customer_rating = updates.customer_rating
    }
    
    if (updates.last_call_date) {
      updateData.last_call_date = updates.last_call_date
    }
    
    // Update user stats
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user.id)
    
    if (updateError) {
      console.error('Error updating user stats:', updateError)
    } else {
      console.log('✅ User stats updated:', updateData)
    }
    
  } catch (error) {
    console.error('Error in updateUserStats:', error)
  }
}