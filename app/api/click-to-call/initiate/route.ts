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

    // Get your real business (not demo)
    let businessId: string
    
    // Try to find your actual business first
    const { data: existingBusiness } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingBusiness) {
      businessId = existingBusiness.id
      console.log('📞 Using existing business:', businessId)
    } else {
      // Fallback: Create a business for this call
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
        console.error('❌ Error creating business:', businessError)
        return NextResponse.json({ 
          error: 'Failed to create business' 
        }, { status: 500 })
      }

      businessId = newBusiness.id
      console.log('📞 Created new business:', businessId)
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
