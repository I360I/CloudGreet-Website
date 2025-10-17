import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'
import { telnyxClient } from '@/lib/telnyx'

export const dynamic = 'force-dynamic'

/**
 * APOLLO KILLER: SMS Outreach
 * 
 * Send personalized SMS to leads
 * Tracks responses
 */

export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const { leadId, leadIds, message } = await request.json()

    const ids = leadId ? [leadId] : leadIds

    if (!ids || ids.length === 0) {
      return NextResponse.json({
        error: 'leadId or leadIds required'
      }, { status: 400 })
    }

    if (!message) {
      return NextResponse.json({
        error: 'message required'
      }, { status: 400 })
    }

    const results = []

    for (const id of ids) {
      try {
        // Get lead data
        const { data: lead } = await supabaseAdmin
          .from('enriched_leads')
          .select('*')
          .eq('id', id)
          .single()

        if (!lead || !lead.owner_phone) {
          results.push({
            leadId: id,
            success: false,
            error: 'No phone number'
          })
          continue
        }

        // Personalize message
        const personalizedMessage = personalizeSMS(message, lead)

        // Send SMS via Telnyx
        const smsResult = await telnyxClient.sendSMS(
          lead.owner_phone,
          personalizedMessage,
          process.env.TELNYX_PHONE_NUMBER
        )

        // Update lead outreach status
        await supabaseAdmin
          .from('enriched_leads')
          .update({
            outreach_status: 'contacted',
            first_contact_date: lead.first_contact_date || new Date().toISOString(),
            last_contact_date: new Date().toISOString(),
            contact_attempts: (lead.contact_attempts || 0) + 1,
            sms_sent: (lead.sms_sent || 0) + 1,
            last_sms_sent_at: new Date().toISOString()
          })
          .eq('id', id)

        logger.info('Outreach SMS sent', {
          leadId: id,
          business: lead.business_name,
          to: lead.owner_phone
        })

        results.push({
          leadId: id,
          success: true,
          messageId: smsResult.data.id
        })

      } catch (error) {
        logger.error('Failed to send outreach SMS', {
          leadId: id,
          error: error instanceof Error ? error.message : 'Unknown'
        })

        results.push({
          leadId: id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Rate limit: wait 1s between SMS
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: results.length - successCount,
      results
    })

  } catch (error) {
    logger.error('Outreach SMS API error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'Failed to send SMS'
    }, { status: 500 })
  }
}

/**
 * Personalize SMS message
 */
function personalizeSMS(message: string, lead: any): string {
  const name = lead.owner_name ? lead.owner_name.split(' ')[0] : ''
  const business = lead.business_name

  let personalized = message
    .replace('{name}', name)
    .replace('{first_name}', name)
    .replace('{business}', business)
    .replace('{business_name}', business)

  // Add STOP message (A2P compliance)
  personalized += '\n\nReply STOP to opt out.'

  return personalized
}

