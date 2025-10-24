import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, businessId } = await request.json()

    if (!phoneNumber || !businessId) {
      return NextResponse.json({ 
        error: 'Phone number and business ID are required' 
      }, { status: 400 })
    }

    // Get business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*, ai_agents(*)')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ 
        error: 'Business not found' 
      }, { status: 404 })
    }

    // Create a test call using Telnyx
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: phoneNumber,
        from: business.phone_number,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-webhook`,
        webhook_url_method: 'POST',
        answer_on_bridge: true,
        client_state: `test-call-${Date.now()}`,
        command_id: `test-${businessId}-${Date.now()}`
      })
    })

    if (!telnyxResponse.ok) {
      const errorData = await telnyxResponse.json()
      logger.error('Telnyx call creation failed', { error: errorData })
      return NextResponse.json({ 
        error: 'Failed to initiate test call',
        details: errorData 
      }, { status: 500 })
    }

    const callData = await telnyxResponse.json()
    const callId = callData.data.call_control_id

    // Store test call record
    await supabaseAdmin
      .from('calls')
      .insert({
        call_id: callId,
        caller_phone: business.phone_number,
        business_phone: phoneNumber,
        business_id: businessId,
        status: 'initiated',
        call_type: 'test',
        started_at: new Date().toISOString()
      })

    logger.info('Test call initiated', { 
      callId, 
      businessId, 
      phoneNumber,
      businessPhone: business.phone_number 
    })

    return NextResponse.json({
      success: true,
      callId,
      message: 'Test call initiated - you should receive a call shortly',
      businessName: business.business_name,
      businessPhone: business.phone_number,
      testPhone: phoneNumber
    })

  } catch (error: any) {
    logger.error('Test call error', { 
      error: error.message,
      stack: error.stack 
    })
    
    return NextResponse.json({ 
      error: 'Test call failed',
      details: error.message 
    }, { status: 500 })
  }
}
