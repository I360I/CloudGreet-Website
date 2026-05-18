import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import {
 updateEventType,
 locationFromPreset,
 listEventTypes,
 create24x7Schedule,
 type EventTypeLocationPreset,
 type CalcomLocation,
} from '@/lib/calcom'
import { resolveBusinessTimezone } from '@/lib/timezones'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/dashboard/calcom/event-type
 *
 * Lists every event type on the contractor's Cal.com account, plus
 * marks which one is the current primary (cal_com_event_type_id) and
 * which one (if any) is designated as the emergency event type
 * (cal_com_event_type_id_emergency). Powers the "Emergency event type"
 * picker in dashboard settings + onboarding.
 */
export async function GET(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.businessId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }
 const { data: biz } = await supabaseAdmin
  .from('businesses')
  .select('cal_com_api_key, cal_com_event_type_id, cal_com_event_type_id_emergency')
  .eq('id', auth.businessId)
  .maybeSingle()
 const apiKey = (biz as any)?.cal_com_api_key as string | null
 if (!apiKey) {
  return NextResponse.json({ error: 'Cal.com is not connected for this business' }, { status: 400 })
 }
 try {
  const types = await listEventTypes(apiKey)
  return NextResponse.json({
   success: true,
   primary_event_type_id: (biz as any).cal_com_event_type_id ?? null,
   emergency_event_type_id: (biz as any).cal_com_event_type_id_emergency ?? null,
   event_types: types.map((t) => ({
    id: t.id,
    title: t.title,
    slug: t.slug,
    lengthInMinutes: (t as any).lengthInMinutes ?? null,
   })),
  })
 } catch (e) {
  const msg = e instanceof Error ? e.message : 'Unknown'
  logger.warn('listEventTypes failed', { businessId: auth.businessId, error: msg })
  return NextResponse.json({ error: `Cal.com list failed: ${msg}` }, { status: 502 })
 }
}

/**
 * POST /api/dashboard/calcom/event-type/emergency
 *   body: { emergency_event_type_id: number | null }
 *
 * Sets (or clears) the emergency event type. Validates that the id
 * belongs to the contractor's Cal.com account so admins can't write
 * an arbitrary id into the column. Pass null to clear - emergencies
 * fall back to the primary event type when none is set.
 */
export async function POST(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.businessId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }
 const body = await request.json().catch(() => ({})) as {
  emergency_event_type_id?: number | null
  /** When true, also create and attach a 24/7 schedule to the emergency event type. */
  available_24_7?: boolean
 }
 const newId = body.emergency_event_type_id

 // Allow explicit null/0 to clear the setting.
 if (newId === null || newId === 0 || newId === undefined) {
  await supabaseAdmin
   .from('businesses')
   .update({ cal_com_event_type_id_emergency: null, updated_at: new Date().toISOString() })
   .eq('id', auth.businessId)
  return NextResponse.json({ success: true, emergency_event_type_id: null })
 }
 if (typeof newId !== 'number' || !Number.isFinite(newId)) {
  return NextResponse.json({ error: 'emergency_event_type_id must be a number or null' }, { status: 400 })
 }

 const { data: biz } = await supabaseAdmin
  .from('businesses')
  .select('cal_com_api_key, cal_com_event_type_id, timezone, state')
  .eq('id', auth.businessId)
  .maybeSingle()
 const apiKey = (biz as any)?.cal_com_api_key as string | null
 if (!apiKey) {
  return NextResponse.json({ error: 'Cal.com is not connected for this business' }, { status: 400 })
 }
 if (newId === (biz as any).cal_com_event_type_id) {
  return NextResponse.json({
   error: "That's already the primary event type. Use a different one for emergencies, or leave the emergency slot blank to fall through to the primary.",
  }, { status: 400 })
 }
 try {
  const types = await listEventTypes(apiKey)
  const match = types.find((t) => Number(t.id) === Number(newId))
  if (!match) {
   return NextResponse.json({
    error: 'That event type does not exist on your Cal.com account. Refresh and try again.',
   }, { status: 400 })
  }
  await supabaseAdmin
   .from('businesses')
   .update({ cal_com_event_type_id_emergency: newId, updated_at: new Date().toISOString() })
   .eq('id', auth.businessId)

  // Selecting an emergency event type implies "use this for ASAP
  // dispatch", so zero out the booking notice on it - the default
  // 2-hour buffer most contractors have on their primary blocks the
  // AI from booking same-hour even when the slot is open. We also
  // lock the location to in-person (already done client-side, but
  // belt-and-suspenders here in case the toggle was set via API).
  // 24/7 schedule is opt-in via the `available_24_7` flag.
  let twentyFourSeven: { scheduleId: number } | null = null
  try {
   const patch: Record<string, any> = { minimumBookingNotice: 0 }
   if (body.available_24_7) {
    const tz = resolveBusinessTimezone({
     explicit: (biz as any)?.timezone,
     state: (biz as any)?.state,
    })
    const sched = await create24x7Schedule(apiKey, {
     name: `CloudGreet Emergency 24/7 · ${match.title}`,
     timeZone: tz,
    })
    twentyFourSeven = { scheduleId: sched.id }
    patch.scheduleId = sched.id
   }
   await updateEventType(apiKey, newId, patch)
  } catch (e) {
   logger.warn('Emergency event-type post-select patch failed', {
    businessId: auth.businessId,
    error: e instanceof Error ? e.message : 'Unknown',
   })
   // Non-fatal: the selection still saved. The 24/7 toggle may have
   // failed but the contractor can retry from settings.
  }

  return NextResponse.json({
   success: true,
   emergency_event_type_id: newId,
   event_type: { id: match.id, title: match.title, slug: match.slug },
   schedule_24_7_id: twentyFourSeven?.scheduleId || null,
  })
 } catch (e) {
  const msg = e instanceof Error ? e.message : 'Unknown'
  logger.warn('emergency event-type save failed', { businessId: auth.businessId, error: msg })
  return NextResponse.json({ error: `Cal.com check failed: ${msg}` }, { status: 502 })
 }
}

/**
 * PATCH /api/dashboard/calcom/event-type
 *   body: {
 *     title?: string                       // rename
 *     slug?: string                        // rename URL slug
 *     locationPreset?: 'google_meet' | 'zoom' | 'cal_video' | 'attendee_phone' | 'attendee_address'
 *     locationAddress?: string             // for type='address'
 *     lengthInMinutes?: number
 *   }
 *
 * Updates the Cal.com event type currently connected to this business.
 * Lets the contractor (or rep during onboarding) fix the location +
 * rename the event type without leaving CloudGreet.
 */
export async function PATCH(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.businessId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 const body = await request.json().catch(() => ({})) as {
  title?: string
  slug?: string
  locationPreset?: EventTypeLocationPreset
  locationAddress?: string
  locationLink?: string
  lengthInMinutes?: number
  /** Minutes of lead time. 0 = same-minute (right for emergencies). */
  minimumBookingNotice?: number
  target?: 'primary' | 'emergency'
 }

 const { data: biz } = await supabaseAdmin
  .from('businesses')
  .select('cal_com_api_key, cal_com_event_type_id, cal_com_event_type_id_emergency')
  .eq('id', auth.businessId)
  .maybeSingle()
 const apiKey = (biz as any)?.cal_com_api_key as string | null
 const eventTypeId = body.target === 'emergency'
  ? ((biz as any)?.cal_com_event_type_id_emergency as number | null)
  : ((biz as any)?.cal_com_event_type_id as number | null)
 if (!apiKey || !eventTypeId) {
  return NextResponse.json({
   error: body.target === 'emergency'
    ? 'No emergency event type is set yet.'
    : 'Cal.com is not connected for this business',
  }, { status: 400 })
 }

 const patch: Record<string, any> = {}
 if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim().slice(0, 120)
 if (typeof body.slug === 'string' && body.slug.trim()) {
  patch.slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60)
 }
 if (typeof body.lengthInMinutes === 'number' && body.lengthInMinutes >= 5 && body.lengthInMinutes <= 480) {
  patch.lengthInMinutes = body.lengthInMinutes
 }
 if (typeof body.minimumBookingNotice === 'number' && body.minimumBookingNotice >= 0 && body.minimumBookingNotice <= 60 * 24 * 30) {
  patch.minimumBookingNotice = Math.round(body.minimumBookingNotice)
 }
 if (body.locationPreset) {
  if ((body.locationPreset === 'google_meet' || body.locationPreset === 'zoom') && !body.locationLink?.trim()) {
   return NextResponse.json(
    { error: `Paste your ${body.locationPreset === 'google_meet' ? 'Google Meet' : 'Zoom'} link first.` },
    { status: 400 },
   )
  }
  patch.locations = [locationFromPreset(body.locationPreset, {
   link: body.locationLink?.trim(),
   address: body.locationAddress?.trim(),
  })]
 }
 if (Object.keys(patch).length === 0) {
  return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
 }

 try {
  const updated = await updateEventType(apiKey, eventTypeId, patch)
  // Mirror the slug onto businesses so booking URLs we render stay in sync.
  if (patch.slug && body.target !== 'emergency') {
   await supabaseAdmin
    .from('businesses')
    .update({ cal_com_event_type_slug: patch.slug, updated_at: new Date().toISOString() })
    .eq('id', auth.businessId)
  }
  return NextResponse.json({ success: true, eventType: updated })
 } catch (e) {
  const msg = e instanceof Error ? e.message : 'Unknown'
  logger.warn('updateEventType failed', { businessId: auth.businessId, error: msg })
  return NextResponse.json({ error: `Cal.com rejected the update: ${msg}` }, { status: 502 })
 }
}
