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
    
    // Use the hardcoded connection ID since environment variable isn't working
    const connectionId = '2786691125270807749'
    
    console.log('📞 Environment TELNYX_CONNECTION_ID:', process.env.TELNYX_CONNECTION_ID)
    console.log('📞 Environment TELNYX_API_KEY exists:', !!process.env.TELNYX_API_KEY)
    console.log('📞 Using connection ID:', connectionId)
    console.log('📞 Using toll-free number:', fromNumber)
    console.log('📞 All environment variables:', Object.keys(process.env).filter(key => key.includes('TELNYX')))
    
    if (!connectionId) {
      console.error('❌ TELNYX_CONNECTION_ID not configured')
      return NextResponse.json({
        error: 'Telnyx connection not configured'
      }, { status: 503 })
    }

    // Create Telnyx outbound call using Call Control API v2
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
    console.log('📞 API Key exists:', !!process.env.TELNYX_API_KEY)
    console.log('📞 API Key length:', process.env.TELNYX_API_KEY?.length || 0)
    console.log('📞 Connection ID being used:', connectionId)
    console.log('📞 From number being used:', fromNumber)
    console.log('📞 To number being used:', formattedPhone)

    // First, let's verify the connection exists and get Call Control Apps
    console.log('📞 Verifying connection exists...')
    
    // Check regular connections
    const connectionCheckResponse = await fetch('https://api.telnyx.com/v2/connections', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (connectionCheckResponse.ok) {
      const connections = await connectionCheckResponse.json()
      console.log('📞 Available connections:', connections.data?.map((c: any) => ({ id: c.id, name: c.connection_name, type: c.connection_type })))
      const foundConnection = connections.data?.find((c: any) => c.id === connectionId)
      console.log('📞 Connection found:', !!foundConnection)
      if (foundConnection) {
        console.log('📞 Connection details:', { id: foundConnection.id, name: foundConnection.connection_name, active: foundConnection.active, type: foundConnection.connection_type })
      }
    } else {
      console.log('📞 Failed to fetch connections:', connectionCheckResponse.status)
    }

    // Check Call Control Apps specifically
    console.log('📞 Checking Call Control Apps...')
    const callControlResponse = await fetch('https://api.telnyx.com/v2/call_control_applications', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (callControlResponse.ok) {
      const callControlApps = await callControlResponse.json()
      console.log('📞 Available Call Control Apps:', callControlApps.data?.map((c: any) => ({ id: c.id, name: c.application_name, active: c.active })))
      const foundCallControlApp = callControlApps.data?.find((c: any) => c.id === connectionId)
      console.log('📞 Call Control App found:', !!foundCallControlApp)
      if (foundCallControlApp) {
        console.log('📞 Call Control App details:', { id: foundCallControlApp.id, name: foundCallControlApp.application_name, active: foundCallControlApp.active })
      }
    } else {
      console.log('📞 Failed to fetch Call Control Apps:', callControlResponse.status)
    }

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
        payload: callPayload,
        headers: Object.fromEntries(telnyxResponse.headers.entries())
      })
      
      // Try to parse error data as JSON for better error messages
      let errorMessage = `Telnyx API error: ${telnyxResponse.status} - ${errorData}`
      try {
        const errorJson = JSON.parse(errorData)
        if (errorJson.errors && errorJson.errors.length > 0) {
          errorMessage = `Telnyx Error: ${errorJson.errors[0].title} - ${errorJson.errors[0].detail}`
        }
      } catch (e) {
        // Keep original error message if JSON parsing fails
      }
      
      return NextResponse.json({
        error: errorMessage
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
