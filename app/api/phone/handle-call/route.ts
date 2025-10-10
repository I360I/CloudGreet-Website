import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let body: any = null
  try {
    body = await request.json()
    const { 
      callId, 
      fromNumber, 
      toNumber, 
      direction = 'inbound',
      state = 'answered'
    } = body

    // Log the incoming call
    const { data: callLog, error: logError } = await supabaseAdmin
      .from('calls')
      .insert({
        call_id: callId,
        from_number: fromNumber,
        to_number: toNumber,
        direction,
        status: state,
        duration: 0,
        business_id: null, // Will be updated when we find the business
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError) {
      console.error('Failed to log call:', logError)
    }

    // Find the business for this phone number
    const { data: phoneRecord, error: phoneError } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('*, businesses(*), ai_agents(*)')
      .eq('number', toNumber)
      .eq('status', 'assigned')
      .single()

    if (phoneError || !phoneRecord) {
      console.error('Business not found for number:', toNumber)
      
      // Return a generic response for unknown numbers
      return NextResponse.json({
        call_id: callId,
        status: 'answered',
        instructions: [
          { 
            instruction: 'say', 
            text: 'Thank you for calling. This number is not currently in service. Please try again later.', 
            voice: 'alloy' 
          },
          { instruction: 'hangup' }
        ]
      })
    }

    const business = phoneRecord.businesses
    const agent = phoneRecord.ai_agents?.[0]

    if (!business) {
      return NextResponse.json({
        call_id: callId,
        status: 'answered',
        instructions: [
          { 
            instruction: 'say', 
            text: 'Thank you for calling. We are currently unavailable. Please try again later.', 
            voice: 'alloy' 
          },
          { instruction: 'hangup' }
        ]
      })
    }

    // Update call log with business info
    if (callLog) {
      await supabaseAdmin
        .from('calls')
        .update({ business_id: business.id })
        .eq('id', callLog.id)
    }

    // Generate AI response based on business type and agent configuration
    const greetingMessage = agent?.greeting_message || business.greeting_message || 
      `Hello! Thank you for calling ${business.business_name}. How can I help you today?`

    const services = business.services || ['General Services']
    const serviceText = services.join(', ')

    // Create the AI conversation flow
    const instructions = [
      {
        instruction: 'say',
        text: greetingMessage,
        voice: agent?.voice || 'alloy',
        language: 'en'
      },
      {
        instruction: 'listen',
        timeout: 10,
        voice: 'alloy'
      }
    ]

    // Store the call context for future interactions
    await supabaseAdmin
      .from('calls')
      .update({
        status: 'in_progress',
        ai_agent_id: agent?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', callLog.id)

    return NextResponse.json({
      call_id: callId,
      status: 'answered',
      instructions,
      business_name: business.business_name,
      agent_active: agent?.is_active || false
    })

  } catch (error) {
    console.error('Call handling error:', error)
    
    return NextResponse.json({
      call_id: body?.callId || 'unknown',
      status: 'answered',
      instructions: [
        { 
          instruction: 'say', 
          text: 'Thank you for calling. We are experiencing technical difficulties. Please try again later.', 
          voice: 'alloy' 
        },
        { instruction: 'hangup' }
      ]
    })
  }
}

// Handle call updates (user responses, call end, etc.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      callId, 
      userResponse, 
      callState,
      duration 
    } = body

    // Update call log
    await supabaseAdmin
      .from('calls')
      .update({
        status: callState,
        duration: duration || 0,
        updated_at: new Date().toISOString()
      })
      .eq('call_id', callId)

    // If call ended, log the completion
    if (callState === 'completed' || callState === 'failed') {
      await supabaseAdmin
        .from('calls')
        .update({
          status: callState,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('call_id', callId)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Call update error:', error)
    return NextResponse.json({ error: 'Failed to update call' }, { status: 500 })
  }
}
