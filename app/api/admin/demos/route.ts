import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { listBookings } from '@/lib/calcom'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/demos
 *
 * Every inbound demo signal from the landing page, in one feed:
 *   - cal_booking : real demo appointments on the CloudGreet Cal.com
 *     (booked via the chat concierge OR the /contact embed)
 *   - chat_lead   : demo requests captured by the chat (demo_leads)
 *   - demo_call   : "have our AI call me" requests (demo_calls)
 *   - rep_demo    : demos reps scheduled with their leads (closes.demo_scheduled_at)
 *
 * Sorted newest-first. Booked chat leads are skipped from the lead list
 * since they show up as the authoritative cal_booking.
 */
type DemoItem = {
 id: string
 kind: 'cal_booking' | 'chat_lead' | 'demo_call' | 'rep_demo'
 name: string | null
 email: string | null
 phone: string | null
 when: string
 status: string | null
 detail: string | null
 source: string
}

export async function GET(request: NextRequest) {
 const adminAuth = await requireAdmin(request)
 if (!adminAuth.success) {
  return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
 }

 const items: DemoItem[] = []

 // 1. Cal.com demo bookings (last 14 days through next 90).
 const CAL_KEY = process.env.CALCOM_DEMO_API_KEY || ''
 if (CAL_KEY) {
  try {
   const afterStart = new Date(Date.now() - 14 * 86400_000).toISOString()
   const beforeEnd = new Date(Date.now() + 90 * 86400_000).toISOString()
   const bookings = await listBookings(CAL_KEY, { afterStart, beforeEnd })
   for (const b of bookings) {
    const a = (b.attendees && b.attendees[0]) || {}
    items.push({
     id: `cal_${b.uid}`,
     kind: 'cal_booking',
     name: a.name || null,
     email: a.email || null,
     phone: a.phoneNumber || null,
     when: b.start,
     status: b.status || 'accepted',
     detail: b.title || 'Demo',
     source: 'calcom',
    })
   }
  } catch (e) {
   logger.error('admin demos: cal bookings failed', { error: e instanceof Error ? e.message : 'unknown' })
  }
 }

 // 2. Chat-captured leads (skip ones already booked on the calendar).
 const { data: leads } = await supabaseAdmin
  .from('demo_leads')
  .select('id, name, email, phone, preferred_time, notes, source, created_at')
  .order('created_at', { ascending: false })
  .limit(300)
 for (const l of leads || []) {
  if ((l.notes || '').includes('booked ')) continue
  items.push({
   id: `lead_${l.id}`,
   kind: 'chat_lead',
   name: l.name || null,
   email: l.email || null,
   phone: l.phone || null,
   when: l.created_at,
   status: 'new',
   detail: [l.preferred_time && `prefers ${l.preferred_time}`, l.notes].filter(Boolean).join(' · ') || null,
   source: l.source || 'web_chat',
  })
 }

 // 3. "AI calls you" demo-call requests.
 const { data: calls } = await supabaseAdmin
  .from('demo_calls')
  .select('id, phone, status, created_at')
  .order('created_at', { ascending: false })
  .limit(300)
 for (const c of calls || []) {
  items.push({
   id: `call_${c.id}`,
   kind: 'demo_call',
   name: null,
   email: null,
   phone: c.phone || null,
   when: c.created_at,
   status: c.status || 'requested',
   detail: 'Asked our AI to call them',
   source: 'ai_call',
  })
 }

 // 4. Rep-scheduled demos (closes rows the mark-demo flow stamps).
 //    Same window as Cal: last 14 days back, all future.
 const { data: repDemos } = await supabaseAdmin
  .from('closes')
  .select('id, rep_id, prospect_business_name, prospect_contact_name, prospect_email, prospect_phone, demo_scheduled_at, status')
  .not('demo_scheduled_at', 'is', null)
  .gte('demo_scheduled_at', new Date(Date.now() - 14 * 86400_000).toISOString())
  .order('demo_scheduled_at', { ascending: false })
  .limit(300)
 if (repDemos?.length) {
  const repIds = Array.from(new Set(repDemos.map((d) => d.rep_id).filter(Boolean)))
  const { data: reps } = await supabaseAdmin
   .from('custom_users')
   .select('id, name, first_name, email')
   .in('id', repIds)
  const repName = (id: string) => {
   const r = (reps || []).find((x) => x.id === id)
   return r?.first_name || r?.name || r?.email || 'rep'
  }
  for (const d of repDemos) {
   items.push({
    id: `rep_${d.id}`,
    kind: 'rep_demo',
    name: d.prospect_contact_name || d.prospect_business_name || null,
    email: d.prospect_email || null,
    phone: d.prospect_phone || null,
    when: d.demo_scheduled_at,
    status: d.status === 'pending' ? 'scheduled' : d.status,
    detail: [d.prospect_business_name, `set by ${repName(d.rep_id)}`].filter(Boolean).join(' · '),
    source: 'rep',
   })
  }
 }

 items.sort((a, b) => (a.when < b.when ? 1 : -1))

 const stats = {
  total: items.length,
  bookings: items.filter((i) => i.kind === 'cal_booking' || i.kind === 'rep_demo').length,
  leads: items.filter((i) => i.kind === 'chat_lead').length,
  calls: items.filter((i) => i.kind === 'demo_call').length,
 }

 return NextResponse.json({ items: items.slice(0, 400), stats })
}
