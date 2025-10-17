import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, businessName, businessType, services, hours } = await request.json()

    // Validate input
    if (!phoneNumber || !businessName) {
      return NextResponse.json({ 
        error: 'Phone number and business name are required' 
      }, { status: 400 })
    }

    // Validate phone number format
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      return NextResponse.json({ 
        error: 'Please enter a valid phone number' 
      }, { status: 400 })
    }

    // Format phone number for Telnyx
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`

    console.log('🚀 Initiating click-to-call for:', formattedPhone)

    // Use a simple business ID for demo calls
    const businessId = 'demo-business-id'
    console.log('📞 Using demo business ID for click-to-call')

    // Use a simple agent ID for demo calls
    const agentId = 'demo-agent-id'
    console.log('📞 Using demo agent ID for click-to-call')

    // Get a phone number for outbound calls
    const { data: phoneNumbers } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('number, connection_id')
      .eq('status', 'assigned')
      .limit(1)

    let fromNumber: string
    let connectionId: string

    if (!phoneNumbers || phoneNumbers.length === 0) {
      // Fallback to your real toll-free number
      fromNumber = '+18333956731'
      connectionId = process.env.TELNYX_CONNECTION_ID || ''
      
      if (!connectionId) {
        return NextResponse.json({ 
          error: 'No phone numbers available and no connection ID configured' 
        }, { status: 503 })
      }
      
      console.log('📞 Using fallback toll-free number:', fromNumber)
    } else {
      fromNumber = phoneNumbers[0].number
      connectionId = phoneNumbers[0].connection_id
      console.log('📞 Using database toll-free number:', fromNumber)
    }

    // Create Telnyx outbound call using Call Control API
    const callPayload = {
      to: formattedPhone,
      from: fromNumber,
      connection_id: connectionId,
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telnyx/voice-webhook`,
      webhook_failover_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telnyx/voice-webhook`,
      client_state: JSON.stringify({
        business_id: businessId,
        agent_id: agentId,
        call_type: 'click_to_call',
        source: 'click_to_call'
      })
    }

    console.log('📞 Creating Telnyx outbound call:', callPayload)

    const telnyxResponse = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callPayload)
    })

    if (!telnyxResponse.ok) {
      const errorData = await telnyxResponse.text()
      console.error('❌ Telnyx API error:', errorData)
      return NextResponse.json({ 
        error: 'Failed to initiate call with Telnyx' 
      }, { status: 500 })
    }

    const callData = await telnyxResponse.json()
    console.log('✅ Telnyx call created:', callData)

    // Store the outbound call in database
    const { error: callError } = await supabaseAdmin
      .from('calls')
      .insert({
        business_id: businessId,
        call_id: callData.data.call_control_id,
        from_number: fromNumber,
        to_number: formattedPhone,
        status: 'initiated',
        direction: 'outbound',
        call_type: 'click_to_call',
        source: 'click_to_call',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (callError) {
      console.error('❌ Error storing outbound call:', callError)
      // Don't fail the request, just log the error
    }

    logger.info('Click-to-call initiated successfully', {
      to: formattedPhone,
      from: fromNumber,
      business_id: businessId,
      call_control_id: callData.data.call_control_id
    })

    return NextResponse.json({
      success: true,
      message: 'Call initiated successfully',
      call_id: callData.data.call_control_id,
      to: formattedPhone,
      from: fromNumber
    })

  } catch (error: any) {
    console.error('❌ Click-to-call error:', error)
    logger.error('Click-to-call initiation failed', { 
      error: error.message,
      endpoint: 'click_to_call_initiate'
    })
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to initiate call'
    }, { status: 500 })
  }
}
