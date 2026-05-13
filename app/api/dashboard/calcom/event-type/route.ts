import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import {
 updateEventType,
 locationFromPreset,
 type EventTypeLocationPreset,
 type CalcomLocation,
} from '@/lib/calcom'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  lengthInMinutes?: number
 }

 const { data: biz } = await supabaseAdmin
  .from('businesses')
  .select('cal_com_api_key, cal_com_event_type_id')
  .eq('id', auth.businessId)
  .maybeSingle()
 const apiKey = (biz as any)?.cal_com_api_key as string | null
 const eventTypeId = (biz as any)?.cal_com_event_type_id as number | null
 if (!apiKey || !eventTypeId) {
  return NextResponse.json({ error: 'Cal.com is not connected for this business' }, { status: 400 })
 }

 const patch: Record<string, any> = {}
 if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim().slice(0, 120)
 if (typeof body.slug === 'string' && body.slug.trim()) {
  patch.slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60)
 }
 if (typeof body.lengthInMinutes === 'number' && body.lengthInMinutes >= 5 && body.lengthInMinutes <= 480) {
  patch.lengthInMinutes = body.lengthInMinutes
 }
 if (body.locationPreset) {
  const loc: CalcomLocation = body.locationPreset === 'attendee_address' && body.locationAddress
   ? { type: 'address', address: body.locationAddress.trim().slice(0, 200) }
   : locationFromPreset(body.locationPreset)
  patch.locations = [loc]
 }
 if (Object.keys(patch).length === 0) {
  return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
 }

 try {
  const updated = await updateEventType(apiKey, eventTypeId, patch)
  // Mirror the slug onto businesses so booking URLs we render stay in sync.
  if (patch.slug) {
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
