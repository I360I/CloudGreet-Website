import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { verifyAdminToken } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const adminPayload = verifyAdminToken(token)
    
    if (!adminPayload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { leadId, message, campaignId } = await request.json()

    if (!leadId || !message) {
      return NextResponse.json({ 
        error: 'Lead ID and message are required' 
      }, { status: 400 })
    }

    // Check if Telnyx is configured
    if (!process.env.TELNYX_API_KEY) {
      return NextResponse.json({ 
        error: 'SMS not configured',
        message: 'TELNYX_API_KEY is missing'
      }, { status: 503 })
    }

    if (!process.env.TELNYX_PHONE_NUMBER) {
      return NextResponse.json({
        error: 'Messaging profile not configured',
        message: 'TELNYX_PHONE_NUMBER is missing'
      }, { status: 503 })
    }

    // Continue with SMS sending logic

    // For test leads, use your phone number directly
    let phoneNumber
    if (leadId === 'test-lead-id') {
      phoneNumber = process.env.PERSONAL_PHONE || '+17372960092'
    } else {
      // Get lead data from database
      const { data: lead, error: leadError } = await supabaseAdmin
        .from('enriched_leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (leadError || !lead) {
        return NextResponse.json({ 
          error: 'Lead not found' 
        }, { status: 404 })
      }
      phoneNumber = lead.phone
    }

    // Format phone number to E.164 format for Telnyx
    const formatPhoneNumber = (phone: string) => {
      // Remove all non-digit characters
      const digits = phone.replace(/\D/g, '')
      
      // If it has 10 digits, add +1
      if (digits.length === 10) {
        return '+1' + digits
      }
      
      // If it starts with 1 and has 11 digits, add +
      if (digits.length === 11 && digits.startsWith('1')) {
        return '+' + digits
      }
      
      // If it already starts with + and has 11 digits total, return as is
      if (phone.startsWith('+') && phone.length === 12) {
        return phone
      }
      
      // For test numbers like 555-1234, use your real phone number
      if (phone.includes('555') || phone.length < 10) {
        return '+17372960092' // Your real phone number
      }
      
      // Default: assume it needs +1 prefix
      return '+1' + digits
    }

    phoneNumber = formatPhoneNumber(phoneNumber)

    // Send REAL SMS via Telnyx
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: phoneNumber,
        from: process.env.NEXT_PUBLIC_BUSINESS_PHONE_RAW || '+18333956731',
        text: message,
        messaging_profile_id: process.env.TELNYX_PHONE_NUMBER
      })
    })

    if (!telnyxResponse.ok) {
      const errorData = await telnyxResponse.text()
      logger.error('Telnyx SMS error', { 
        error: errorData, 
        leadId, 
        phone: phoneNumber
      })
      
      return NextResponse.json({ 
        error: 'Failed to send SMS',
        details: errorData
      }, { status: 500 })
    }

    const smsData = await telnyxResponse.json()

    // Log the REAL SMS in database (only if not a test lead)
    if (leadId !== 'test-lead-id') {
      const { error: logError } = await supabaseAdmin
        .from('sms_messages')
        .insert({
          lead_id: leadId,
          campaign_id: campaignId,
          to_number: phoneNumber,
          from_number: process.env.NEXT_PUBLIC_BUSINESS_PHONE_RAW || '+18333956731',
          message: message,
          status: 'sent',
          telnyx_message_id: smsData.data.id,
          created_at: new Date().toISOString()
        })

      if (logError) {
        logger.error('Error logging SMS', { error: logError.message })
      }

      // Update lead status
      await supabaseAdmin
        .from('enriched_leads')
        .update({ 
          outreach_status: 'contacted',
          last_contact_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
    }

    logger.info('Real SMS sent successfully', {
      leadId,
      phone: phoneNumber,
      messageId: smsData.data.id
    })

    return NextResponse.json({
      success: true,
      message: 'Real SMS sent successfully',
      data: {
        messageId: smsData.data.id,
        status: 'sent',
        to: phoneNumber
      }
    })

  } catch (error) {
    logger.error('Real SMS automation error', {
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error',
      endpoint: 'real_sms_automation'
    })

    return NextResponse.json({
      success: false,
      error: 'Failed to send real SMS'
    }, { status: 500 })
  }
}
