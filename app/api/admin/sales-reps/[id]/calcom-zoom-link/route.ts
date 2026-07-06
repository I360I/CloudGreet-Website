import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { getMe, listEventTypes } from '@/lib/calcom'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET  /api/admin/sales-reps/[id]/calcom-zoom-link
 *   Read-only: lists the rep's Cal.com event types and flags which
 *   (if any) has a Zoom location attached, without changing anything.
 * POST /api/admin/sales-reps/[id]/calcom-zoom-link
 *   Sets sales_reps.booking_url to the rep's Zoom-connected event
 *   type's URL (https://cal.com/{username}/{slug}). This is the link
 *   sent out by /api/sales/leads/[id]/send-booking-link - for a
 *   setter, that route resolves to their ASSIGNED rep's booking_url,
 *   so pointing a rep's link here fixes it for every setter routed to
 *   them too (e.g. Ed -> Darrin).
 *
 * Body (POST, optional): { eventTypeId?: number } - pick a specific
 * event type by id instead of auto-picking the first Zoom one found
 * (useful if a rep has more than one Zoom-configured event type).
 */

const ZOOM_LOCATION_TYPE = 'integrations:zoom_video'

async function repApiKey(repId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('sales_reps')
    .select('cal_api_key')
    .eq('id', repId)
    .maybeSingle()
  return (data as any)?.cal_api_key || null
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = await repApiKey(params.id)
  if (!apiKey) return NextResponse.json({ error: 'This rep has no Cal.com API key on file.' }, { status: 400 })

  try {
    const [me, eventTypes] = await Promise.all([getMe(apiKey), listEventTypes(apiKey)])
    const withZoom = eventTypes.map((et) => ({
      id: et.id,
      title: et.title,
      slug: et.slug,
      lengthInMinutes: et.lengthInMinutes,
      hidden: et.hidden,
      has_zoom: (et.locations || []).some((l) => l.type === ZOOM_LOCATION_TYPE),
      url: me.username ? `https://cal.com/${me.username}/${et.slug}` : null,
    }))
    return NextResponse.json({
      success: true,
      username: me.username,
      event_types: withZoom,
      zoom_event_types: withZoom.filter((e) => e.has_zoom),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    return NextResponse.json({ error: `Cal.com error: ${msg}` }, { status: 502 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = await repApiKey(params.id)
  if (!apiKey) return NextResponse.json({ error: 'This rep has no Cal.com API key on file.' }, { status: 400 })

  const body = await request.json().catch(() => ({})) as { eventTypeId?: number }

  try {
    const [me, eventTypes] = await Promise.all([getMe(apiKey), listEventTypes(apiKey)])
    if (!me.username) {
      return NextResponse.json({ error: "This rep's Cal.com account has no username set - can't build a booking URL." }, { status: 502 })
    }

    let target = body.eventTypeId
      ? eventTypes.find((et) => et.id === body.eventTypeId)
      : eventTypes.find((et) => (et.locations || []).some((l) => l.type === ZOOM_LOCATION_TYPE))

    if (!target) {
      return NextResponse.json({
        error: 'No Zoom-connected event type found on this Cal.com account. Add a Zoom location to an event type in Cal.com first, or pass eventTypeId explicitly.',
        event_types: eventTypes.map((et) => ({ id: et.id, title: et.title, slug: et.slug })),
      }, { status: 404 })
    }

    const bookingUrl = `https://cal.com/${me.username}/${target.slug}`
    const { error: dbErr } = await supabaseAdmin
      .from('sales_reps')
      .update({ booking_url: bookingUrl })
      .eq('id', params.id)
    if (dbErr) return NextResponse.json({ error: `DB update failed: ${dbErr.message}` }, { status: 500 })

    logger.info('rep booking_url set to Zoom event type', { repId: params.id, eventTypeId: target.id, bookingUrl })
    return NextResponse.json({
      success: true,
      booking_url: bookingUrl,
      event_type: { id: target.id, title: target.title, slug: target.slug },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    return NextResponse.json({ error: `Cal.com error: ${msg}` }, { status: 502 })
  }
}
