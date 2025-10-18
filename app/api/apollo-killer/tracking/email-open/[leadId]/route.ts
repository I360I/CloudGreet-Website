import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

/**
 * Email Open Tracking Pixel
 * 
 * This endpoint is called when the 1x1 tracking pixel is loaded in emails
 * Records email open events and updates lead engagement metrics
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const leadId = params.leadId

    if (!leadId) {
      // Return transparent pixel even on error to avoid broken images
      return new NextResponse(TRANSPARENT_PIXEL_BASE64, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // Get lead to verify it exists
    const { data: lead } = await supabaseAdmin
      .from('enriched_leads')
      .select('id, business_name, emails_opened, last_email_opened_at')
      .eq('id', leadId)
      .single()

    if (lead) {
      // Update email open tracking
      await supabaseAdmin
        .from('enriched_leads')
        .update({
          emails_opened: (lead.emails_opened || 0) + 1,
          last_email_opened_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)

      // Log for analytics
      logger.info('Email opened', {
        leadId,
        business: lead.business_name,
        openCount: (lead.emails_opened || 0) + 1,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        referer: request.headers.get('referer')
      })

      // Record detailed tracking event
      await supabaseAdmin
        .from('email_tracking_events')
        .insert({
          lead_id: leadId,
          event_type: 'open',
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
          metadata: {
            referer: request.headers.get('referer'),
            accept_language: request.headers.get('accept-language')
          }
        })
        .select()
        .single()
    }

    // Always return transparent pixel (even if lead not found)
    return new NextResponse(TRANSPARENT_PIXEL_BASE64, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    logger.error('Email tracking error', {
      leadId: params.leadId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    // Always return pixel to avoid broken images in emails
    return new NextResponse(TRANSPARENT_PIXEL_BASE64, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}

// 1x1 transparent PNG pixel (base64 encoded)
const TRANSPARENT_PIXEL_BASE64 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
)
