import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json()
    
    console.log('Retell AI Webhook received:', webhookData)

    // Handle different webhook events
    switch (webhookData.event) {
      case 'call_started':
        return await handleCallStarted(webhookData)
      case 'call_ended':
        return await handleCallEnded(webhookData)
      case 'appointment_requested':
        return await handleAppointmentRequest(webhookData)
      case 'call_transcription':
        return await handleCallTranscription(webhookData)
      default:
        return NextResponse.json({ status: 'ok' })
    }

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCallStarted(data: any) {
  // Log the call start
  const { data: callLog, error } = await supabase
    .from('call_logs')
    .insert({
      user_id: data.user_id || '00000000-0000-0000-0000-000000000001',
      phone_number: data.phone_number,
      caller_phone: data.caller_phone,
      call_status: 'in_progress',
      call_type: 'inbound',
      started_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error logging call start:', error)
  }

  return NextResponse.json({ 
    status: 'call_logged',
    call_id: callLog?.id 
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
      transcript: data.transcript,
      sentiment_score: data.sentiment_score,
      appointment_scheduled: data.appointment_scheduled
    })
    .eq('id', data.call_id)

  if (error) {
    console.error('Error updating call log:', error)
  }

  return NextResponse.json({ 
    status: 'call_updated',
    appointment_scheduled: data.appointment_scheduled 
  })
}

async function handleAppointmentRequest(data: any) {
  // Create appointment in calendar
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      user_id: data.user_id || '00000000-0000-0000-0000-000000000001',
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      service_type: data.service_type,
      appointment_date: data.preferred_date,
      duration_minutes: data.duration || 60,
      status: 'scheduled',
      notes: `Booked via AI phone call. Call ID: ${data.call_id}`
    })

  if (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json({ 
      error: 'Failed to create appointment',
      details: error.message 
    }, { status: 500 })
  }

  // Update call log with appointment ID
  await supabase
    .from('call_logs')
    .update({
      appointment_id: appointment?.id,
      appointment_scheduled: true
    })
    .eq('id', data.call_id)

  return NextResponse.json({ 
    status: 'appointment_created',
    appointment_id: appointment?.id,
    appointment_date: data.preferred_date
  })
}

async function handleCallTranscription(data: any) {
  // Update call log with transcription
  const { error } = await supabase
    .from('call_logs')
    .update({
      transcript: data.transcript,
      sentiment_score: data.sentiment_score,
      intent: data.intent
    })
    .eq('id', data.call_id)

  if (error) {
    console.error('Error updating transcription:', error)
  }

  return NextResponse.json({ 
    status: 'transcription_updated' 
  })
}