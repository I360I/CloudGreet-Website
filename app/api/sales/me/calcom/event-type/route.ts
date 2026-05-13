import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import {
 listEventTypes,
 updateEventType,
 locationFromPreset,
 type EventTypeLocationPreset,
 type CalcomLocation,
} from '@/lib/calcom'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Rep-scoped Cal.com event type management for the rep's personal
 * scheduling link. Distinct from the client-scoped editors which
 * touch the contractor's event type - this one updates the rep's own
 * demo-call event type so they can keep it Google Meet / Zoom focused
 * without leaving CloudGreet.
 *
 * GET   → list the rep's event types
 * PATCH → { eventTypeId, title?, locationPreset?, locationAddress?, lengthInMinutes? }
 */
async function repApiKey(userId: string): Promise<string | null> {
 const { data } = await supabaseAdmin
  .from('sales_reps')
  .select('cal_api_key')
  .eq('id', userId)
  .maybeSingle()
 return (data as any)?.cal_api_key || null
}

export async function GET(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.userId || auth.role !== 'sales') {
  return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
 }
 const apiKey = await repApiKey(auth.userId)
 if (!apiKey) return NextResponse.json({ error: 'Cal.com not connected' }, { status: 400 })
 try {
  const eventTypes = await listEventTypes(apiKey)
  return NextResponse.json({ success: true, eventTypes })
 } catch (e) {
  const msg = e instanceof Error ? e.message : 'Unknown'
  return NextResponse.json({ error: `Cal.com error: ${msg}` }, { status: 502 })
 }
}

export async function PATCH(request: NextRequest) {
 const auth = await requireAuth(request)
 if (!auth.success || !auth.userId || auth.role !== 'sales') {
  return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
 }
 const apiKey = await repApiKey(auth.userId)
 if (!apiKey) return NextResponse.json({ error: 'Cal.com not connected' }, { status: 400 })

 const body = await request.json().catch(() => ({})) as {
  eventTypeId?: number | string
  title?: string
  slug?: string
  locationPreset?: EventTypeLocationPreset
  locationAddress?: string
  lengthInMinutes?: number
 }
 const eventTypeId = Number(body.eventTypeId)
 if (!eventTypeId || isNaN(eventTypeId)) {
  return NextResponse.json({ error: 'eventTypeId required' }, { status: 400 })
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
  return NextResponse.json({ success: true, eventType: updated })
 } catch (e) {
  const msg = e instanceof Error ? e.message : 'Unknown'
  logger.warn('rep updateEventType failed', { userId: auth.userId, error: msg })
  return NextResponse.json({ error: `Cal.com rejected the update: ${msg}` }, { status: 502 })
 }
}
