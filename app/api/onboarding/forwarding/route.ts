import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Persists the contractor's chosen carrier / line type / forwarding mode.
 */
export async function POST(request: NextRequest) {
 try {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.businessId) {
   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const carrier: string = String(body.carrier || '').slice(0, 50)
  const lineType: string = String(body.lineType || '').slice(0, 50)
  const mode: string = String(body.mode || '').slice(0, 50)

  if (!carrier || !lineType || !mode) {
   return NextResponse.json({ success: false, error: 'carrier, lineType, mode are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
   .from('businesses')
   .update({
    forwarding_carrier: carrier,
    forwarding_line_type: lineType,
    forwarding_mode: mode,
    updated_at: new Date().toISOString(),
   })
   .eq('id', authResult.businessId)

  if (error) {
   return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
 } catch (e) {
  return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
 }
}

/**
 * Polled by the wizard while listening for a verification test call. Returns
 * { verified: true } once we see an inbound call on the business's Retell
 * number that arrived AFTER they hit "Start verification".
 */
export async function GET(request: NextRequest) {
 try {
  const authResult = await requireAuth(request)
  if (!authResult.success || !authResult.businessId) {
   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const since = request.nextUrl.searchParams.get('since')
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 5 * 60 * 1000)
  const sinceIso = sinceDate.toISOString()
  const sinceMs = sinceDate.getTime()

  const { data: calls } = await supabaseAdmin
   .from('calls')
   .select('id, created_at, from_number, status')
   .eq('business_id', authResult.businessId)
   .gte('created_at', sinceIso)
   .order('created_at', { ascending: false })
   .limit(1)

  let verified = !!(calls && calls.length > 0)
  let retellFallback = false

  // Webhook delivery can lag (call_started fires when the call connects,
  // and call_ended only after the caller hangs up). If our DB hasn't
  // picked anything up yet, ask Retell directly - the call exists on
  // their side as soon as it routes through, even before our webhook
  // lands. This is what fixes the "27 checks so far" stall when the
  // forwarding clearly worked but we can't see it.
  if (!verified) {
   try {
    const { data: biz } = await supabaseAdmin
     .from('businesses')
     .select('retell_agent_id')
     .eq('id', authResult.businessId)
     .maybeSingle()
    const agentId = biz?.retell_agent_id
    const apiKey = process.env.RETELL_API_KEY
    if (agentId && apiKey) {
     const resp = await fetch('https://api.retellai.com/v2/list-calls', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
       filter_criteria: {
        agent_id: [agentId],
        start_timestamp: { lower_threshold: sinceMs },
       },
       sort_order: 'descending',
       limit: 5,
      }),
     })
     if (resp.ok) {
      const json = await resp.json().catch(() => ({}))
      const items: any[] = Array.isArray(json) ? json : (json.calls || json.data || [])
      if (items.length > 0) {
       verified = true
       retellFallback = true
      }
     }
    }
   } catch (e) {
    logger.warn('verify fallback to Retell list-calls failed', {
     error: e instanceof Error ? e.message : 'Unknown',
    })
   }
  }

  // Subscription gate: a contractor can technically complete the test
  // call even without paying. Don't flip onboarding_completed (and don't
  // tell them they're "live") until Stripe shows an active or trialing
  // subscription. Otherwise we'd start routing real calls for a free
  // account.
  let subscriptionStatus: string | null = null
  if (verified) {
   const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('subscription_status')
    .eq('id', authResult.businessId)
    .maybeSingle()
   subscriptionStatus = biz?.subscription_status || null
  }
  const paid = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

  if (verified) {
   // Flip onboarding_completed regardless of paid status so the
   // contractor (and the rep doing the demo) can immediately see the
   // test call replay on /dashboard/calls. Billing gating happens in
   // the call-routing layer, not here.
   await supabaseAdmin
    .from('businesses')
    .update({
     forwarding_verified_at: new Date().toISOString(),
     onboarding_completed: true,
     updated_at: new Date().toISOString(),
    })
    .eq('id', authResult.businessId)
  }

  return NextResponse.json({
   success: true,
   verified,
   paid,
   subscriptionStatus,
   call: calls?.[0] || null,
   source: verified ? (retellFallback ? 'retell' : 'db') : null,
  })
 } catch (e) {
  logger.error('Forwarding verify error', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
 }
}
