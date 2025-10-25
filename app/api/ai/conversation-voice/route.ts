import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    const body = await request.json()
    const { 
      businessId,
      message, 
      conversationHistory = [], 
      callerName,
      callerPhone
    } = body

    if (!businessId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get business context for AI
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*, ai_agents(*)')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for voice conversation', { businessId, error: businessError?.message })
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const agent = business.ai_agents
    const businessName = business.business_name || 'CloudGreet'
    const businessType = business.business_type || 'AI Receptionist Service'
    const services = agent?.configuration?.services || business.services || ['General Services']
    const hours = agent?.configuration?.hours || business.business_hours || '24/7'

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are ${businessName}'s AI receptionist - a professional, helpful assistant for a ${businessType} business.

BUSINESS DETAILS:
- Company: ${businessName}
- Type: ${businessType}
- Services: ${services.join(', ')}
- Hours: ${hours}
- Phone: ${business.phone_number}

INSTRUCTIONS:
- Be warm, professional, and helpful
- Keep responses brief for phone calls (under 20 words)
- If they want to book an appointment, say "I'd be happy to book that for you!"
- Ask for their name and phone number if booking
- Be conversational and natural
- If they ask about services, mention ${services.join(', ')}
- If they ask about hours, say "${hours}"

CURRENT CALLER: ${callerName || 'Unknown'} (${callerPhone || 'Unknown'})`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ]

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-turbo', // Latest GPT-5 for enhanced voice conversations
      messages: messages as any,
      max_tokens: 80, // Shorter for voice
      temperature: 0.7,
      presence_penalty: 0.3,
      frequency_penalty: 0.2,
      top_p: 0.9,
      stop: ['\n\n', 'Customer:', 'Caller:', 'Human:', 'User:']
    })

    const aiResponse = completion.choices[0]?.message?.content || 'I understand you need assistance. How can I help you today?'

    // Check for appointment booking intent
    let appointmentBooked = false
    let appointmentDetails = ''

    const bookingKeywords = ['book', 'schedule', 'appointment', 'meeting', 'visit', 'service', 'set up', 'arrange']
    const hasBookingIntent = bookingKeywords.some(keyword =>
      aiResponse.toLowerCase().includes(keyword) || message.toLowerCase().includes(keyword)
    )

    // Also check if AI explicitly mentions booking
    const explicitBooking = aiResponse.toLowerCase().includes('book') ||
                           aiResponse.toLowerCase().includes('schedule') ||
                           aiResponse.toLowerCase().includes('appointment')

    if (hasBookingIntent || explicitBooking) {
      try {
        appointmentDetails = `Appointment request: ${message}`
        
        // Create appointment in database
        const { data: appointment, error: aptError } = await supabaseAdmin
          .from('appointments')
          .insert({
            business_id: businessId,
            customer_name: callerName || 'Unknown',
            customer_phone: callerPhone || 'Unknown',
            service_type: 'Phone Consultation',
            appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default to tomorrow
            scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: 'scheduled',
            notes: appointmentDetails,
            source: 'ai_voice_call',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (!aptError && appointment) {
          appointmentBooked = true
          
          // Create Google Calendar event if connected
          try {
            const { createCalendarEvent } = await import('@/lib/calendar')
            await createCalendarEvent(businessId, {
              title: `Appointment with ${callerName || 'Customer'}`,
              start: appointment.scheduled_date,
              end: new Date(new Date(appointment.scheduled_date).getTime() + (appointment.duration_minutes || 60) * 60000).toISOString(),
              description: `Phone: ${callerPhone}\nService: ${appointment.service_type}\nNotes: ${appointment.notes}`,
              location: appointment.address || 'Phone Consultation',
              attendees: [callerPhone] // Add phone as attendee
            })
          } catch (calendarError) {
            logger.error('Failed to create Google Calendar event', { 
              error: calendarError instanceof Error ? calendarError.message : 'Unknown error',
              businessId,
              appointmentId: appointment.id
            })
          }
          
          // Charge per-booking fee automatically
          try {
            const { data: business } = await supabaseAdmin
              .from('businesses')
              .select('stripe_customer_id, subscription_status')
              .eq('id', businessId)
              .single()

            if (business?.stripe_customer_id && business.subscription_status === 'active') {
              // Create booking fee charge
              const bookingFee = parseInt(process.env.BOOKING_FEE || '50')
              
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://cloudgreet.com'}/api/billing/per-booking`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.JWT_SECRET}` // Internal call
                },
                body: JSON.stringify({
                  appointmentId: appointment.id,
                  customerName: callerName || 'Unknown',
                  serviceType: 'Phone Consultation',
                  estimatedValue: 0
                })
              }).catch(err => logger.error('Failed to charge booking fee', { error: err }))
            }
          } catch (billingError) {
            logger.error('Booking fee automation failed', { error: billingError })
            // Don't fail the appointment if billing fails
          }
          
          // Send notification to business owner
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://cloudgreet.com'}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'client_booking',
              message: `New appointment booked via AI: ${callerName} - ${appointmentDetails}`,
              businessId: businessId,
              priority: 'high'
            })
          }).catch(err => logger.error('Failed to send booking notification', { error: err }))
        }
      } catch (bookingError) {
        logger.error('Failed to book appointment from AI', { error: bookingError, aiResponse })
      }
    }

    // Clean response (remove booking command if present)
    const cleanResponse = aiResponse.replace(/BOOK_APPOINTMENT: .+/, 'Perfect! I\'ve scheduled that appointment for you. You\'ll receive a confirmation shortly.')

    // Log conversation in database
    await supabaseAdmin
      .from('conversations')
      .insert({
        business_id: businessId,
        customer_name: callerName,
        customer_phone: callerPhone,
        message: message,
        ai_response: cleanResponse,
        appointment_booked: appointmentBooked,
        duration: Date.now() - startTime
      })

    return NextResponse.json({
      success: true,
      response: cleanResponse,
      appointmentBooked,
      conversationId: requestId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Voice AI conversation error', {
      requestId,
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Return a graceful fallback response
    return NextResponse.json({
      success: true, // Return success so call doesn't drop
      response: "I apologize, I'm having a brief technical issue. Let me transfer you to someone who can help.",
      shouldTransfer: true
    })
  }
}
