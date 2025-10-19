import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { verifyAdminToken } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Simple test - return debug info immediately
    return NextResponse.json({
      debug: {
        telnyxApiKey: process.env.TELNYX_API_KEY ? 'SET' : 'MISSING',
        messagingProfileId: process.env.TELNYX_MESSAGING_PROFILE_ID ? 'SET' : 'MISSING',
        availableTelnyxVars: Object.keys(process.env).filter(key => key.includes('TELNYX')),
        messagingProfileValue: process.env.TELNYX_MESSAGING_PROFILE_ID
      }
    })

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
        messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID
      })
    })

    if (!telnyxResponse.ok) {
      const errorData = await telnyxResponse.text()
      logger.error('Telnyx SMS error', { 
        error: errorData, 
        leadId, 
        phone: lead.phone 
      })
      
      return NextResponse.json({ 
        error: 'Failed to send SMS',
        details: errorData
      }, { status: 500 })
    }

    const smsData = await telnyxResponse.json()

    // Log the REAL SMS in database
    const { error: logError } = await supabaseAdmin
      .from('sms_messages')
      .insert({
        lead_id: leadId,
        campaign_id: campaignId,
        to_number: lead.phone,
        from_number: process.env.NEXT_PUBLIC_BUSINESS_PHONE_RAW || '+18333956731',
        message: message,
        status: 'sent',
        telnyx_message_id: smsData.data.id,
        created_at: new Date().toISOString()
      })

    if (logError) {
      logger.error('Error logging SMS', { error: logError })
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

    logger.info('Real SMS sent successfully', {
      leadId,
      phone: lead.phone,
      messageId: smsData.data.id
    })

    return NextResponse.json({
      success: true,
      message: 'Real SMS sent successfully',
      data: {
        messageId: smsData.data.id,
        status: 'sent',
        to: lead.phone
      }
    })

  } catch (error) {
    logger.error('Real SMS automation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'real_sms_automation'
    })

    return NextResponse.json({
      success: false,
      error: 'Failed to send real SMS'
    }, { status: 500 })
  }
}

