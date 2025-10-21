import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Simple click-to-call initiated')
    
    const { phoneNumber, businessName } = await request.json()

    // Basic validation
    if (!phoneNumber || !businessName) {
      return NextResponse.json({ 
        error: 'Phone number and business name are required' 
      }, { status: 400 })
    }

    // Format phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`

    console.log('📞 Formatted phone:', formattedPhone)

    // Check if Telnyx is configured
    if (!process.env.TELYNX_API_KEY) {
      console.error('❌ Telnyx API key not configured')
      return NextResponse.json({ 
        error: 'Telnyx not configured' 
      }, { status: 503 })
    }

    // Use demo business ID
    const businessId = '00000000-0000-0000-0000-000000000001'
    const fromNumber = '+18333956731'
    const connectionId = process.env.TELYNX_CONNECTION_ID || '2786688063168841616'

    console.log('📞 Making Telnyx call...')

    // Create the call payload
    const callPayload = {
      to: formattedPhone,
      from: fromNumber,
      connection_id: connectionId,
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-webhook`,
      webhook_url_method: 'POST'
    }

    console.log('📞 Call payload:', JSON.stringify(callPayload, null, 2))

    // Make Telnyx API call with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const telnyxResponse = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callPayload),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!telnyxResponse.ok) {
      const errorText = await telnyxResponse.text()
      console.error('❌ Telnyx API error:', {
        status: telnyxResponse.status,
        statusText: telnyxResponse.statusText,
        error: errorText
      })
      
      return NextResponse.json({
        error: `Telnyx API error: ${telnyxResponse.status} - ${errorText}`
      }, { status: 500 })
    }

    const callData = await telnyxResponse.json()
    console.log('✅ Telnyx call created:', callData)

    // Store the call in database (simplified)
    const { error: callError } = await supabaseAdmin
      .from('calls')
      .insert({
        business_id: businessId,
        call_id: callData.data.call_control_id,
        customer_phone: formattedPhone,
        call_status: 'initiated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (callError) {
      console.error('❌ Error storing call:', callError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      message: 'Call initiated successfully! Check your phone.',
      call_id: callData.data.call_control_id,
      to: formattedPhone,
      from: fromNumber
    })

  } catch (error) {
    console.error('❌ Click-to-call error:', error)
    
    // Return a proper JSON error response
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to initiate call'
    }, { status: 500 })
  }
}
