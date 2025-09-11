import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json()
    
    console.log('Azure Phone Webhook received:', webhookData)

    // Handle different Azure Communication Services events
    switch (webhookData.eventType) {
      case 'IncomingCall':
        return await handleIncomingCall(webhookData)
      case 'CallEnded':
        return await handleCallEnded(webhookData)
      case 'CallRecordingAvailable':
        return await handleCallRecording(webhookData)
      default:
        return NextResponse.json({ status: 'ok' })
    }

  } catch (error) {
    console.error('Azure webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleIncomingCall(data: any) {
  // Extract phone number from the call
  const businessPhone = data.to
  const callerPhone = data.from
  
  // Find the business that owns this phone number
  const { data: business, error: businessError } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', businessPhone)
    .single()

  if (businessError || !business) {
    console.error('Business not found for phone number:', businessPhone)
    return NextResponse.json({ 
      error: 'Business not found',
      action: 'reject_call'
    })
  }

  // Log the incoming call
  const { data: callLog, error: callError } = await supabase
    .from('call_logs')
    .insert({
      user_id: business.id,
      phone_number: businessPhone,
      caller_phone: callerPhone,
      call_status: 'in_progress',
      call_type: 'inbound',
      started_at: new Date().toISOString(),
      business_name: business.business_name
    })
    .select()
    .single()

  if (callError) {
    console.error('Error logging call:', callError)
  }

  // Return call handling instructions to Azure
  return NextResponse.json({
    action: 'answer_call',
    call_id: callLog?.id,
    business_id: business.id,
    retell_agent_id: business.retell_agent_id,
    instructions: {
      transfer_to_ai: true,
      ai_agent_id: business.retell_agent_id,
      business_context: {
        name: business.business_name,
        type: business.business_type,
        services: business.services || []
      }
    }
  })
}

async function handleCallEnded(data: any) {
  // Update call log with end time and duration
  const { error } = await supabase
    .from('call_logs')
    .update({
      call_status: 'completed',
      call_duration: data.duration,
      ended_at: new Date().toISOString(),
      call_quality: data.quality,
      appointment_scheduled: data.appointment_scheduled || false
    })
    .eq('id', data.call_id)

  if (error) {
    console.error('Error updating call log:', error)
  }

  // If an appointment was scheduled, create it
  if (data.appointment_scheduled && data.appointment_data) {
    const { error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        user_id: data.business_id,
        customer_name: data.appointment_data.customer_name,
        customer_email: data.appointment_data.customer_email,
        customer_phone: data.appointment_data.customer_phone,
        service_type: data.appointment_data.service_type,
        appointment_date: data.appointment_data.appointment_date,
        duration_minutes: data.appointment_data.duration || 60,
        status: 'scheduled',
        notes: `Booked via AI phone call. Call ID: ${data.call_id}`,
        call_id: data.call_id
      })

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError)
    }
  }

  return NextResponse.json({ 
    status: 'call_processed',
    appointment_scheduled: data.appointment_scheduled 
  })
}

async function handleCallRecording(data: any) {
  // Update call log with recording URL
  const { error } = await supabase
    .from('call_logs')
    .update({
      recording_url: data.recording_url,
      recording_duration: data.recording_duration
    })
    .eq('id', data.call_id)

  if (error) {
    console.error('Error updating call recording:', error)
  }

  return NextResponse.json({ 
    status: 'recording_processed' 
  })
}

