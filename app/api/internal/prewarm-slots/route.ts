import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { writeSlotCache } from '@/lib/slot-cache'
import { resolveBusinessTimezone } from '@/lib/timezones'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 10

/**
 * Internal-only endpoint that prewarms the slot cache for a business.
 *
 * Why this is its own route: Vercel serverless kills fire-and-forget
 * async work the instant the parent function returns its response.
 * `void prewarmSlotCache(...)` inside the call_inbound handler never
 * had time to complete - hence every lookup_availability mid-call was
 * a cache miss, hence the 2-second silent gap.
 *
 * By POSTing to a separate endpoint, the prewarm gets its own
 * serverless invocation lifetime (~10s ceiling), and the call_inbound
 * handler returns in ~50ms.
 *
 * Auth: requires X-CG-Internal header to match INTERNAL_API_TOKEN if
 * set. Falls back to host-allowlist when the token isn't configured.
 * Not exposed publicly.
 */
export async function POST(request: NextRequest) {
  // Cheap-ish authz: same-origin or shared secret. This endpoint only
  // does idempotent read+write of cached availability, so the blast
  // radius of a forged call is "pay Cal.com a few extra requests."
  const tokenHdr = request.headers.get('x-cg-internal') || ''
  const expected = process.env.INTERNAL_API_TOKEN || ''
  if (expected && tokenHdr !== expected) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({})) as { businessId?: string }
  const businessId = (body.businessId || '').trim()
  if (!businessId) {
    return NextResponse.json({ ok: false, error: 'businessId required' }, { status: 400 })
  }

  try {
    const { data: biz } = await supabaseAdmin
      .from('businesses')
      .select('cal_com_api_key, cal_com_event_type_id, timezone, state')
      .eq('id', businessId)
      .maybeSingle()
    const apiKey = (biz as any)?.cal_com_api_key as string | null
    const eventTypeId = (biz as any)?.cal_com_event_type_id as number | null
    if (!apiKey || !eventTypeId) {
      return NextResponse.json({ ok: true, skipped: 'no_cal_com_config' })
    }
    const tz = resolveBusinessTimezone({
      explicit: (biz as any)?.timezone,
      state: (biz as any)?.state,
    })

    const { listAvailableSlots } = await import('@/lib/calcom')
    const start = new Date()
    start.setUTCDate(start.getUTCDate() + 1)
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 7)

    const rawSlots = await listAvailableSlots(apiKey, {
      eventTypeId,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      timeZone: tz,
    })

    // Convert to business TZ for display, store both.
    const slots = rawSlots.map((iso) => isoInZone(iso, tz))
    const slots_display = rawSlots.map((iso) => formatHuman(iso, tz))

    await writeSlotCache(businessId, 'week', {
      slots, slots_display, timezone: tz, source: 'calcom', scope: 'week',
    })

    return NextResponse.json({ ok: true, count: slots.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    logger.warn('prewarm-slots failed', { businessId, error: msg })
    return NextResponse.json({ ok: false, error: msg.slice(0, 200) }, { status: 500 })
  }
}

// Duplicates of helpers from voice-webhook to keep this endpoint
// self-contained (so a change to the webhook can't accidentally
// break the prewarm path). Both formatters produce identical output.
function isoInZone(iso: string, tz: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(d).reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value
      return acc
    }, {})
    const hour = parts.hour === '24' ? '00' : parts.hour
    const utcMs = d.getTime()
    const asLocal = new Date(`${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}Z`).getTime()
    const offsetMin = Math.round((asLocal - utcMs) / 60000)
    const sign = offsetMin >= 0 ? '+' : '-'
    const off = Math.abs(offsetMin)
    const offH = String(Math.floor(off / 60)).padStart(2, '0')
    const offM = String(off % 60).padStart(2, '0')
    return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}${sign}${offH}:${offM}`
  } catch {
    return iso
  }
}

function formatHuman(iso: string, tz: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz, weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(d).replace(',', '')
  } catch {
    return iso
  }
}
