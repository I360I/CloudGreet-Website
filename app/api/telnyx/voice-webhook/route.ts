import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import OpenAI from 'openai'
import { sanitizeRequestBody, sanitizeString } from '@/lib/security'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Telnyx voice webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  // Set timeout for the entire function
  const timeoutId = setTimeout(() => {
    logger.error('Function timeout - returning default response');
  }, 8000); // 8 second timeout
  
  try {
    const rawBody = await request.json()
    
    // Sanitize input
    const body = sanitizeRequestBody(rawBody)
    
    // Extract call information
    const {
      data: {
        event_type,
        payload: {
          call_control_id,
          call_leg_id,
          from,
          to,
          direction,
          state
        } = {}
      } = {}
    } = body

    const callId = call_control_id || call_leg_id

    // Sanitize call data
    const sanitizedFrom = sanitizeString(from || '')
    const sanitizedTo = sanitizeString(to || '')
    const sanitizedEventType = sanitizeString(event_type || '')

    logger.info('Premium voice webhook received', { 
      event_type: sanitizedEventType, 
      callId, 
      from: sanitizedFrom, 
      to: sanitizedTo, 
      direction,
      state 
    })

    // Handle call.answered event - PREMIUM REALTIME AI
    if (event_type === 'call.answered') {
      // Get business info and check business hours
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('id, business_hours, timezone, business_name')
        .eq('phone_number', to)
        .single()

      // Check business hours if enabled
      if (business?.business_hours?.enabled) {
        const now = new Date()
        const businessTimezone = business.timezone || 'America/New_York'
        const currentHour = now.toLocaleString('en-US', { 
          timeZone: businessTimezone, 
          hour: 'numeric', 
          hour12: false 
        })
        const currentDay = now.toLocaleString('en-US', { 
          timeZone: businessTimezone, 
          weekday: 'long' 
        }).toLowerCase()

        const todayHours = business.business_hours.hours[currentDay]
        if (todayHours?.enabled) {
          const [startHour, startMin] = todayHours.start.split(':').map(Number)
          const [endHour, endMin] = todayHours.end.split(':').map(Number)
          const currentTime = parseInt(currentHour)
          const startTime = startHour
          const endTime = endHour

          if (currentTime < startTime || currentTime >= endTime) {
            // Outside business hours - play after hours message
            return NextResponse.json({
              call_id: callId,
              status: 'answered',
              instructions: [
                {
                  instruction: 'say',
                  text: business.business_hours.afterHoursMessage || "Thank you for calling! We're currently closed, but our AI assistant is available 24/7 to help you. How can I assist you today?",
                  voice: 'alloy'
                },
                {
                  instruction: 'stream_audio',
                  stream_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://cloudgreet.com"}/api/telnyx/realtime-stream-working`,
                  stream_url_method: 'POST'
                }
              ]
            })
          }
        }
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })

      if (!process.env.OPENAI_API_KEY) {
        logger.error('OpenAI API key not configured')
        return NextResponse.json({
          call_id: callId,
          status: 'error',
          instructions: [
            {
              instruction: 'say',
              text: 'Thank you for calling CloudGreet. Our AI system is currently being configured. Please try again later.',
              voice: 'alloy'
            },
            {
              instruction: 'hangup'
            }
          ]
        }, { status: 500 })
      }

      logger.info('Starting premium realtime AI conversation', { callId, from, to })
      
      return NextResponse.json({
        call_id: callId,
        status: 'answered',
        instructions: [
          {
            instruction: 'stream_audio',
            stream_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://cloudgreet.com"}/api/telnyx/realtime-stream-working`,
            stream_url_method: 'POST',
            stream_url_payload: {
              call_id: callId,
              business_id: business.id,
              conversation_state: {}
            }
          },
          {
            instruction: 'record',
            recording_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://cloudgreet.com"}/api/calls/recording/${callId}`
          }
        ]
      })
    }

    // Handle call.hangup event
    if (event_type === 'call.hangup') {
      logger.info('Premium call ended', { 
        callId, 
        from, 
        to
      })
      
      return NextResponse.json({
        call_id: callId,
        status: 'completed'
      })
    }

    // Handle missed call events
    if (event_type === 'call.missed' || event_type === 'call.busy' || event_type === 'call.failed') {
      logger.info('Missed call detected', { 
        callId, 
        from, 
        to,
        reason: event_type
      })

      // Get business info from phone number
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('id, business_name, phone_number')
        .eq('phone_number', to)
        .single()

      if (business) {
        // Trigger missed call recovery SMS
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://cloudgreet.com"}/api/calls/missed-recovery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callId,
              businessId: business.id,
              callerPhone: from,
              callerName: 'Unknown',
              reason: event_type.replace('call.', '')
            })
          })
        } catch (smsError) {
          logger.error('Failed to send missed call SMS', { 
            error: smsError instanceof Error ? smsError.message : 'Unknown error',
            callId,
            businessId: business.id
          })
        }
      }
      
      return NextResponse.json({
        call_id: callId,
        status: 'missed_handled'
      })
    }

    // Handle other events
    return NextResponse.json({
      call_id: callId,
      status: 'received'
    })

  } catch (error) {
    logger.error('Premium voice webhook error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({
      call_id: 'unknown',
      status: 'error',
      instructions: [
        {
          instruction: 'say',
          text: 'Thank you for calling CloudGreet. Our AI system is currently being configured. Please try again later.',
          voice: 'alloy'
        },
        {
          instruction: 'hangup'
        }
      ]
    }, { status: 500 })
  } finally {
    clearTimeout(timeoutId);
  }
}
