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

    // Get a demo business or create one for demo purposes
    let businessId: string
    
    // Try to find an existing demo business
    const { data: existingBusiness } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('business_name', businessName)
      .eq('status', 'active')
      .single()

    if (existingBusiness) {
      businessId = existingBusiness.id
    } else {
      // Create a demo business for this call
      const { data: newBusiness, error: businessError } = await supabaseAdmin
        .from('businesses')
        .insert({
          business_name: businessName,
          business_type: businessType,
          services: services,
          business_hours: {
            mon: { open: '09:00', close: '17:00' },
            tue: { open: '09:00', close: '17:00' },
            wed: { open: '09:00', close: '17:00' },
            thu: { open: '09:00', close: '17:00' },
            fri: { open: '09:00', close: '17:00' },
            sat: { open: '10:00', close: '15:00' },
            sun: { open: '10:00', close: '15:00' }
          },
          after_hours_policy: 'voicemail',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (businessError) {
        console.error('❌ Error creating demo business:', businessError)
        return NextResponse.json({ 
          error: 'Failed to create demo business' 
        }, { status: 500 })
      }

      businessId = newBusiness.id
    }

    // Get or create AI agent for this business
    let agentId: string
    
    const { data: existingAgent } = await supabaseAdmin
      .from('ai_agents')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .single()

    if (existingAgent) {
      agentId = existingAgent.id
    } else {
      // Create AI agent for this business
      const { data: newAgent, error: agentError } = await supabaseAdmin
        .from('ai_agents')
        .insert({
          business_id: businessId,
          agent_name: 'Sarah',
          greeting_message: `Hello! Thank you for calling ${businessName}. I'm Sarah, your AI receptionist. How can I help you today?`,
          voice: 'alloy',
          status: 'active',
          configuration: {
            greeting_message: `Hello! Thank you for calling ${businessName}. I'm Sarah, your AI receptionist. How can I help you today?`,
            voice: 'alloy',
            language: 'en',
            personality: 'professional',
            escalation_threshold: 0.7,
            max_conversation_turns: 10
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (agentError) {
        console.error('❌ Error creating AI agent:', agentError)
        return NextResponse.json({ 
          error: 'Failed to create AI agent' 
        }, { status: 500 })
      }

      agentId = newAgent.id
    }

    // Get a phone number for outbound calls
    const { data: phoneNumbers } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('number, connection_id')
      .eq('status', 'assigned')
      .limit(1)

    if (!phoneNumbers || phoneNumbers.length === 0) {
      return NextResponse.json({ 
        error: 'No phone numbers available for outbound calls' 
      }, { status: 503 })
    }

    const fromNumber = phoneNumbers[0].number
    const connectionId = phoneNumbers[0].connection_id

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
        call_type: 'demo',
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
        call_type: 'demo',
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
