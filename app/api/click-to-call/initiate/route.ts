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

    // Check if Telnyx is configured
    if (!process.env.TELNYX_API_KEY) {
      console.error('❌ Telnyx API key not configured')
      return NextResponse.json({ 
        error: 'Telnyx not configured' 
      }, { status: 503 })
    }

    // Use a simple business ID for demo calls
    const businessId = 'demo-business-id'
    console.log('📞 Using demo business ID for click-to-call')

    // Use a simple agent ID for demo calls
    const agentId = 'demo-agent-id'
    console.log('📞 Using demo agent ID for click-to-call')

    // Use your real toll-free number
    const fromNumber = '+18333956731'
    
    // Get connection ID from environment
    const connectionId = process.env.TELNYX_CONNECTION_ID
    
    if (!connectionId) {
      console.error('❌ TELNYX_CONNECTION_ID not configured')
      return NextResponse.json({
        error: 'Telnyx connection not configured'
      }, { status: 503 })
    }
    
    console.log('📞 Using toll-free number:', fromNumber)
    console.log('📞 Using connection ID:', connectionId)

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
      console.error('❌ Telnyx API error:', {
        status: telnyxResponse.status,
        statusText: telnyxResponse.statusText,
        error: errorData,
        payload: callPayload
      })
      return NextResponse.json({
        error: `Telnyx API error: ${telnyxResponse.status} - ${errorData}`
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
      message: 'Call initiated successfully! Check your phone.',
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
