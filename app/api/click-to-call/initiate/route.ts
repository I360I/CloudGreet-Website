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
      }, { call_status: 400 })
    }

    // Validate phone number format
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      return NextResponse.json({ 
        error: 'Please enter a valid phone number' 
      }, { call_status: 400 })
    }

    // Format phone number for Telnyx
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`

    console.log('🚀 Initiating click-to-call for:', formattedPhone)

    // Check if Telnyx is configured
    if (!process.env.TELYNX_API_KEY) {
      console.error('❌ Telnyx API key not configured')
      return NextResponse.json({ 
        error: 'Telnyx not configured' 
      }, { call_status: 503 })
    }

      // Create AI conversation session for demo call
      const aiSessionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/conversation-demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessType: businessType || 'HVAC',
          businessName: businessName,
          services: services,
          hours: hours
        })
      });
      
      if (!aiSessionResponse.ok) {
        throw new Error('Failed to create AI session');
      }
      
      const aiSession = await aiSessionResponse.json();
      
      if (!aiSession.success) {
        throw new Error(aiSession.error || 'Failed to create AI session');
      }
    
    // Create or get demo business and agent for click-to-call
    const businessId = '00000000-0000-0000-0000-000000000001'; // Fixed UUID for demo business
    const agentId = '00000000-0000-0000-0000-000000000002'; // Fixed UUID for demo agent
    
    // Check if demo business exists
    const { data: existingBusiness } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .single();
    
    if (!existingBusiness) {
      // Create demo business
      const { data: demoBusiness, error: businessError } = await supabaseAdmin
        .from('businesses')
        .insert({
          id: businessId,
          business_name: 'CloudGreet Demo',
          business_type: 'HVAC',
          owner_name: 'Demo Owner',
          phone_number: '+18333956731',
          email: 'demo@cloudgreet.com',
          address: '123 Demo Street, Demo City, DC 12345',
          business_hours: {
            mon: { open: '00:00', close: '23:59' },
            tue: { open: '00:00', close: '23:59' },
            wed: { open: '00:00', close: '23:59' },
            thu: { open: '00:00', close: '23:59' },
            fri: { open: '00:00', close: '23:59' },
            sat: { open: '00:00', close: '23:59' },
            sun: { open: '00:00', close: '23:59' }
          },
          services: ['HVAC Repair', 'Heating Installation', 'Cooling Installation', 'Maintenance'],
          service_areas: ['Demo City', 'Demo County'],
          greeting_message: 'Thank you for calling CloudGreet Demo! How can I help you today?',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (businessError) {
        console.error('❌ Failed to create demo business:', businessError)
      } else {
        console.log('✅ Created demo business for click-to-call')
      }
    } else {
      // Update existing demo business to be 24/7 available
      const { error: updateError } = await supabaseAdmin
        .from('businesses')
        .update({
          business_hours: {
            mon: { open: '00:00', close: '23:59' },
            tue: { open: '00:00', close: '23:59' },
            wed: { open: '00:00', close: '23:59' },
            thu: { open: '00:00', close: '23:59' },
            fri: { open: '00:00', close: '23:59' },
            sat: { open: '00:00', close: '23:59' },
            sun: { open: '00:00', close: '23:59' }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId)
      
      if (updateError) {
        console.error('❌ Failed to update demo business hours:', updateError)
      } else {
        console.log('✅ Updated demo business to be 24/7 available')
      }
    }
    
      // Check if demo agent exists, if not create it
      const { data: existingAgent } = await supabaseAdmin
        .from('ai_agents')
        .select('id')
        .eq('id', agentId)
        .single()
    
    if (!existingAgent) {
      // Create demo AI agent
      const { data: demoAgent, error: agentError } = await supabaseAdmin
        .from('ai_agents')
        .insert({
          id: agentId,
          business_id: businessId,
          agent_name: 'CloudGreet Demo Agent',
          is_active: true,
          configuration: {
            greeting_message: 'Thank you for calling CloudGreet Demo! How can I help you today?',
            voice: 'alloy',
            tone: 'professional',
            business_type: 'HVAC',
            services: ['HVAC Repair', 'Heating Installation', 'Cooling Installation', 'Maintenance'],
            custom_instructions: 'You are a professional AI receptionist for CloudGreet Demo, an HVAC company. Help customers with their heating and cooling needs, schedule appointments, and provide excellent service.',
            ai_model: 'gpt-4o-realtime-preview-2024-12-17'
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (agentError) {
        console.error('❌ Failed to create demo agent:', agentError)
      } else {
        console.log('✅ Created demo AI agent for click-to-call')
      }
    }
    
      console.log('📞 Using demo business and agent for click-to-call - UUID FIX DEPLOYED')

    // Use your real toll-free number
    const fromNumber = '+18333956731'
    
    // Use the Connection ID from environment (this is the voice profile you mentioned)
    const connectionId = process.env.TELNYX_CONNECTION_ID || '2786691125270807749'
    
    console.log('📞 Environment TELNYX_CONNECTION_ID:', process.env.TELNYX_CONNECTION_ID)
    console.log('📞 Environment TELYNX_API_KEY exists:', !!process.env.TELYNX_API_KEY)
    console.log('📞 Using Connection ID:', connectionId)
    console.log('📞 Using toll-free number:', fromNumber)
    console.log('📞 All environment variables:', Object.keys(process.env).filter(key => key.includes('TELNYX')))
    
    if (!process.env.TELYNX_API_KEY) {
      console.error('❌ TELYNX_API_KEY not configured')
      return NextResponse.json({
        error: 'Telnyx API key not configured'
      }, { call_status: 503 })
    }

    // Create the call payload for Telnyx API v2 (October 2025)
    // Use connection_id parameter as required by current Telnyx API v2
    const callPayload = {
      to: formattedPhone,
      from: fromNumber,
      connection_id: connectionId,
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-webhook`,
      webhook_url_method: 'POST'
    }

    console.log('📞 Creating Telnyx outbound call:', callPayload)
    console.log('📞 API Key exists:', !!process.env.TELYNX_API_KEY)
    console.log('📞 API Key length:', process.env.TELYNX_API_KEY?.length || 0)
    console.log('📞 Connection ID being used:', connectionId)
    console.log('📞 From number being used:', fromNumber)
    console.log('📞 To number being used:', formattedPhone)

    // Test webhook accessibility first
    console.log('📞 Testing webhook accessibility...')
    try {
      const webhookTestResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telnyx/voice-webhook`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Telnyx-Webhook-Test'
        }
      })
      console.log('📞 Webhook test response:', webhookTestResponse.status, webhookTestResponse.statusText)
    } catch (webhookError) {
      console.log('📞 Webhook test failed:', webhookError)
    }

    console.log('📞 Making Telnyx API call with payload:', JSON.stringify(callPayload, null, 2))
    
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELYNX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callPayload)
    })

    if (!telnyxResponse.ok) {
      const errorData = await telnyxResponse.text()
      console.error('❌ Telnyx API error:', {
        call_status: telnyxResponse.status,
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
      }, { call_status: 500 })
    }

    const callData = await telnyxResponse.json()
    console.log('✅ Telnyx call created:', callData)

    // Store the outbound call in database with AI session information
    const { error: callError } = await supabaseAdmin
      .from('calls')
      .insert({
        business_id: businessId,
        call_id: callData.data.call_control_id,
        customer_phone: formattedPhone,
        agent_id: aiSession.sessionId,
        call_call_status: 'initiated',
        transcript: aiSession.aiResponse,
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
    }, { call_status: 500 })
  }
}

