import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, businessId } = body
    
    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 })
    }

    // REAL Telnyx call initiation
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: phoneNumber,
        from: process.env.TELNYX_PHONE_NUMBER, // Your Telnyx phone number
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-webhook`,
        webhook_failover_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-webhook-failover`,
        client_state: JSON.stringify({
          business_id: businessId,
          call_type: 'test_call'
        })
      })
    })

    if (!telnyxResponse.ok) {
      const errorText = await telnyxResponse.text()
      console.error('Telnyx API error:', errorText)
      return NextResponse.json({
        success: false,
        error: 'Failed to initiate call with Telnyx'
      }, { status: 500 })
    }

    const callData = await telnyxResponse.json()
    
    return NextResponse.json({
      success: true,
      message: 'Real call initiated successfully',
      call_id: callData.data.id,
      phone_number: phoneNumber,
      business_id: businessId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Call initiation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to initiate call'
    }, { status: 500 })
  }
}
