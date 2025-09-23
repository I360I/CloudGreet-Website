import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { telynyxClient } from '@/lib/telynyx'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const businessId = request.headers.get('x-business-id')
    
    if (!userId || !businessId) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    const body = await request.json()
    const { trigger, customerData, callData } = body

    // Get business configuration
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    const { data: agent } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single()

    let followUpMessage = ''
    let followUpType = ''

    // Generate personalized follow-up based on trigger
    switch (trigger) {
      case 'missed_call':
        followUpMessage = await generateMissedCallFollowUp(business, customerData)
        followUpType = 'missed_call_recovery'
        break
      
      case 'no_show':
        followUpMessage = await generateNoShowFollowUp(business, customerData)
        followUpType = 'no_show_follow_up'
        break
      
      case 'quote_request':
        followUpMessage = await generateQuoteFollowUp(business, customerData, callData)
        followUpType = 'quote_follow_up'
        break
      
      case 'appointment_reminder':
        followUpMessage = await generateAppointmentReminder(business, customerData)
        followUpType = 'appointment_reminder'
        break
      
      case 'satisfaction_survey':
        followUpMessage = await generateSatisfactionSurvey(business, customerData)
        followUpType = 'satisfaction_survey'
        break
      
      case 'win_back':
        followUpMessage = await generateWinBackMessage(business, customerData)
        followUpType = 'win_back_campaign'
        break
      
      default:
        followUpMessage = await generateGenericFollowUp(business, customerData)
        followUpType = 'general_follow_up'
    }

    // Send the follow-up message
    if (customerData.phone) {
      try {
        await telynyxClient.sendSMS(
          customerData.phone,
          followUpMessage,
          business.phone_number
        )
      } catch (error) {
        logger.error('Failed to send follow-up SMS', error as Error, {
          businessId,
          customerPhone: customerData.phone,
          followUpType
        })
      }
    }

    // Log the follow-up
    await supabaseAdmin
      .from('sms_logs')
      .insert({
        business_id: businessId,
        to_number: customerData.phone,
        from_number: business.phone_number,
        message: followUpMessage,
        direction: 'outbound',
        type: followUpType,
        status: 'sent',
        created_at: new Date().toISOString()
      })

    // Schedule next follow-up if needed
    if (shouldScheduleNextFollowUp(trigger)) {
      await scheduleNextFollowUp(businessId, customerData, trigger)
    }

    logger.info('Follow-up message sent', {
      businessId,
      customerPhone: customerData.phone,
      followUpType,
      trigger
    })

    return NextResponse.json({
      success: true,
      data: {
        message: followUpMessage,
        type: followUpType,
        sent: true,
        nextFollowUp: shouldScheduleNextFollowUp(trigger)
      }
    })

  } catch (error) {
    logger.error('Follow-up automation error', error as Error)
    return NextResponse.json({
      success: false,
      message: 'Failed to send follow-up'
    }, { status: 500 })
  }
}

async function generateMissedCallFollowUp(business: any, customerData: any) {
  const prompt = `Generate a professional, friendly SMS follow-up for a missed call. 
  
  Business: ${business.business_name} (${business.business_type})
  Customer: ${customerData.name || 'Valued Customer'}
  
  The message should:
  - Be professional but warm
  - Acknowledge the missed call
  - Offer to help
  - Include a clear call-to-action
  - Be under 160 characters
  - Include the business phone number
  
  Make it sound natural and not robotic.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
    temperature: 0.7
  })

  return response.choices[0]?.message?.content || 
    `Hi! We missed your call to ${business.business_name}. We'd love to help! Call us back at ${business.phone_number} or reply to this message.`
}

async function generateNoShowFollowUp(business: any, customerData: any) {
  const prompt = `Generate a gentle, understanding SMS follow-up for a no-show appointment.
  
  Business: ${business.business_name} (${business.business_type})
  Customer: ${customerData.name || 'Valued Customer'}
  
  The message should:
  - Be understanding and not accusatory
  - Offer to reschedule
  - Be professional but empathetic
  - Include a clear next step
  - Be under 160 characters
  
  Make it sound caring and helpful.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
    temperature: 0.7
  })

  return response.choices[0]?.message?.content || 
    `Hi ${customerData.name}! We missed you at your appointment. No worries - life happens! Let's reschedule. Reply or call ${business.phone_number}.`
}

async function generateQuoteFollowUp(business: any, customerData: any, callData: any) {
  const prompt = `Generate a professional SMS follow-up for a quote request.
  
  Business: ${business.business_name} (${business.business_type})
  Customer: ${customerData.name || 'Valued Customer'}
  Service Requested: ${callData?.service || 'your service'}
  
  The message should:
  - Thank them for their interest
  - Mention the quote is being prepared
  - Set expectations for delivery
  - Include contact information
  - Be under 160 characters
  
  Make it professional and reassuring.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
    temperature: 0.7
  })

  return response.choices[0]?.message?.content || 
    `Hi ${customerData.name}! Thanks for your interest in our ${callData?.service || 'services'}. We're preparing your quote and will send it within 24 hours. Questions? Call ${business.phone_number}.`
}

async function generateAppointmentReminder(business: any, customerData: any) {
  const prompt = `Generate a friendly appointment reminder SMS.
  
  Business: ${business.business_name} (${business.business_type})
  Customer: ${customerData.name || 'Valued Customer'}
  Appointment: ${customerData.appointmentDate || 'your appointment'}
  
  The message should:
  - Be friendly and helpful
  - Confirm appointment details
  - Include any important preparation info
  - Provide contact info for changes
  - Be under 160 characters
  
  Make it warm and professional.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
    temperature: 0.7
  })

  return response.choices[0]?.message?.content || 
    `Hi ${customerData.name}! Reminder: Your appointment with ${business.business_name} is tomorrow. Need to reschedule? Call ${business.phone_number}.`
}

async function generateSatisfactionSurvey(business: any, customerData: any) {
  const prompt = `Generate a brief satisfaction survey SMS.
  
  Business: ${business.business_name} (${business.business_type})
  Customer: ${customerData.name || 'Valued Customer'}
  
  The message should:
  - Thank them for their business
  - Ask for a quick rating
  - Be brief and easy to respond to
  - Include contact info for issues
  - Be under 160 characters
  
  Make it simple and appreciative.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
    temperature: 0.7
  })

  return response.choices[0]?.message?.content || 
    `Hi ${customerData.name}! How was your experience with ${business.business_name}? Reply 1-5 stars. Issues? Call ${business.phone_number}.`
}

async function generateWinBackMessage(business: any, customerData: any) {
  const prompt = `Generate a win-back SMS for a customer who hasn't used services recently.
  
  Business: ${business.business_name} (${business.business_type})
  Customer: ${customerData.name || 'Valued Customer'}
  
  The message should:
  - Be warm and personal
  - Offer something special
  - Not be pushy
  - Include a clear offer
  - Be under 160 characters
  
  Make it feel personal and valuable.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
    temperature: 0.7
  })

  return response.choices[0]?.message?.content || 
    `Hi ${customerData.name}! We miss you at ${business.business_name}! Here's 10% off your next service. Call ${business.phone_number} to book.`
}

async function generateGenericFollowUp(business: any, customerData: any) {
  return `Hi ${customerData.name || 'there'}! Thanks for your interest in ${business.business_name}. How can we help you today? Call ${business.phone_number}.`
}

function shouldScheduleNextFollowUp(trigger: string) {
  const triggersWithFollowUp = ['missed_call', 'no_show', 'quote_request']
  return triggersWithFollowUp.includes(trigger)
}

async function scheduleNextFollowUp(businessId: string, customerData: any, trigger: string) {
  // Schedule next follow-up in 3 days
  const nextFollowUpDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  
  await supabaseAdmin
    .from('follow_up_schedule')
    .insert({
      business_id: businessId,
      customer_phone: customerData.phone,
      customer_name: customerData.name,
      trigger: trigger,
      scheduled_date: nextFollowUpDate.toISOString(),
      status: 'scheduled',
      created_at: new Date().toISOString()
    })
}
