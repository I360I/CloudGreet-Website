import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

/**
 * Email Click Tracking
 * 
 * This endpoint tracks clicks on links in emails
 * Records click events and redirects to the actual destination
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const url = searchParams.get('url')
    const linkId = searchParams.get('linkId') || 'unknown'

    // Decode the destination URL
    const destinationUrl = url ? decodeURIComponent(url) : 'https://cloudgreet.com'

    if (leadId) {
      // Get lead to verify it exists
      const { data: lead } = await supabaseAdmin
        .from('enriched_leads')
        .select('id, business_name, emails_clicked')
        .eq('id', leadId)
        .single()

      if (lead) {
        // Update email click tracking
        await supabaseAdmin
          .from('enriched_leads')
          .update({
            emails_clicked: (lead.emails_clicked || 0) + 1,
            last_email_clicked_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId)

        // Log for analytics
        logger.info('Email link clicked', {
          leadId,
          business: lead.business_name,
          clickCount: (lead.emails_clicked || 0) + 1,
          linkId,
          destinationUrl,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          referer: request.headers.get('referer')
        })

        // Record detailed tracking event
        await supabaseAdmin
          .from('email_tracking_events')
          .insert({
            lead_id: leadId,
            event_type: 'click',
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            user_agent: request.headers.get('user-agent'),
            timestamp: new Date().toISOString(),
            metadata: {
              linkId,
              destinationUrl,
              referer: request.headers.get('referer'),
              accept_language: request.headers.get('accept-language')
            }
          })
          .select()
          .single()
      }
    }

    // Redirect to destination URL
    return NextResponse.redirect(destinationUrl, { status: 302 })

  } catch (error) {
    logger.error('Email click tracking error', {
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error',
      url: request.url
    })

    // Redirect to fallback URL on error
    return NextResponse.redirect('https://cloudgreet.com', { status: 302 })
  }
}
