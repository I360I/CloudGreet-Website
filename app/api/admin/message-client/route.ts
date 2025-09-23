import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, message, type = 'sms' } = body

    if (!clientId || !message) {
      return NextResponse.json({ error: 'Client ID and message are required' }, { status: 400 })
    }

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from('businesses')
      .select('business_name, phone_number, email')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Log the message in SMS logs table
    const { data: messageLog, error: logError } = await supabase
      .from('sms_logs')
      .insert({
        business_id: clientId,
        phone_number: client.phone_number,
        message: message,
        direction: 'outbound',
        status: 'sent',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError) {
      // Console error removed for production
    }

    // Here you would integrate with your SMS service (Twilio, etc.)
    // For now, we'll simulate sending the message
    const messageResult = {
      id: messageLog?.id || `msg_${Date.now()}`,
      clientId,
      clientName: client.business_name,
      phoneNumber: client.phone_number,
      message,
      type,
      status: 'sent',
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({ 
      success: true, 
      message: messageResult
    })
  } catch (error) {
    // Console error removed for production
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
