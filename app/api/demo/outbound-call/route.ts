import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/demo/outbound-call  { phone }
 *
 * Visitor enters their own number on the landing page; our demo AI agent
 * places a one-time outbound call to it (Retell create-phone-call from the
 * demo line +17379370084, which has an outbound agent attached).
 *
 * This is an UNAUTHENTICATED endpoint that triggers real, billable phone
 * calls, so it is rate-limited three ways via the demo_calls log:
 *   - 1 call per phone number / 10 min   (no hammering one number)
 *   - 3 calls per IP / hour              (no single-source abuse)
 *   - 100 calls / day globally           (hard cost ceiling)
 * The visitor entering their own number + tapping "Call me" is the TCPA
 * consent for this single call.
 */
const DEMO_FROM = '+17379370084'

function normalizeUsPhone(raw: string): string | null {
 const digits = String(raw || '').replace(/\D/g, '')
 if (digits.length === 10) return '+1' + digits
 if (digits.length === 11 && digits.startsWith('1')) return '+' + digits
 return null
}

export async function POST(request: NextRequest) {
 const body = await request.json().catch(() => ({} as any))
 const to = normalizeUsPhone(body?.phone)
 if (!to) {
  return NextResponse.json({ error: 'Please enter a valid US phone number.' }, { status: 400 })
 }

 const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
 const now = Date.now()
 const since = (mins: number) => new Date(now - mins * 60_000).toISOString()

 // Rate limits (cheap head-count queries against the indexed log).
 const perPhone = await supabaseAdmin
  .from('demo_calls').select('id', { count: 'exact', head: true })
  .eq('phone', to).gte('created_at', since(10))
 if ((perPhone.count || 0) >= 1) {
  return NextResponse.json({ error: 'We just called that number. Give it a couple minutes and try again.' }, { status: 429 })
 }
 const perIp = await supabaseAdmin
  .from('demo_calls').select('id', { count: 'exact', head: true })
  .eq('ip', ip).gte('created_at', since(60))
 if ((perIp.count || 0) >= 3) {
  return NextResponse.json({ error: 'That is a few demo calls from your network already. Try again later or book a demo.' }, { status: 429 })
 }
 const global = await supabaseAdmin
  .from('demo_calls').select('id', { count: 'exact', head: true })
  .gte('created_at', since(1440))
 if ((global.count || 0) >= 100) {
  return NextResponse.json({ error: 'Demo calls are busy right now. Please book a demo instead.' }, { status: 429 })
 }

 const key = process.env.RETELL_API_KEY
 if (!key) {
  logger.error('demo outbound-call: missing RETELL_API_KEY')
  return NextResponse.json({ error: 'Demo is temporarily unavailable.' }, { status: 503 })
 }

 let callId: string | null = null
 try {
  const r = await fetch('https://api.retellai.com/v2/create-phone-call', {
   method: 'POST',
   headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
   body: JSON.stringify({ from_number: DEMO_FROM, to_number: to }),
  })
  const j = await r.json().catch(() => ({} as any))
  if (!r.ok) {
   logger.error('demo outbound-call: Retell rejected', { status: r.status, body: j })
   await supabaseAdmin.from('demo_calls').insert({ phone: to, ip, status: 'failed' })
   return NextResponse.json({ error: 'Could not place the call. Try again or book a demo.' }, { status: 502 })
  }
  callId = j?.call_id || null
 } catch (e) {
  logger.error('demo outbound-call: Retell request failed', { error: e instanceof Error ? e.message : 'unknown' })
  return NextResponse.json({ error: 'Could not place the call right now.' }, { status: 502 })
 }

 await supabaseAdmin.from('demo_calls').insert({ phone: to, ip, status: 'requested', retell_call_id: callId })
 logger.info('demo outbound-call placed', { to_last4: to.slice(-4), call_id: callId })
 return NextResponse.json({ success: true })
}
