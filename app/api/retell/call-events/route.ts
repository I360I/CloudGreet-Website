import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { verifyRetellSignature } from '@/lib/webhook-verification'
import { notifyAdmin } from '@/lib/notifications/notify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/retell/call-events
 *
 * Retell call-lifecycle webhook (call_started / call_ended / call_analyzed).
 * Looks up the business_id by:
 *   1. agent_id → businesses.retell_agent_id
 *   2. fallback: to_number → phone_numbers.phone_number (provider='retell')
 * Then upserts a row in calls keyed by retell_call_id, scoped to business_id.
 */
export async function POST(request: NextRequest) {
 try {
  const rawBody = await request.text()

  let body: any
  try { body = JSON.parse(rawBody) } catch {
   return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType: string = body.event || body.type || 'unknown'

  // Allow Retell ping
  if (eventType === 'ping') return NextResponse.json({ ok: true })

  // Verify signature in production
  if (process.env.NODE_ENV === 'production') {
   const signature = request.headers.get('x-retell-signature')
   const valid = verifyRetellSignature(rawBody, signature)
   if (!valid) {
    logger.warn('Retell call-events: invalid signature', { eventType })
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 })
   }
  }

  const call = body.call || body.data?.call || body.data || {}
  const callId: string | undefined = call.call_id || body.call_id
  const agentId: string | undefined = call.agent_id || body.agent_id
  const fromNumber: string | undefined = call.from_number
  const toNumber: string | undefined = call.to_number
  const transcript: string | undefined = call.transcript
  const recordingUrl: string | undefined = call.recording_url
  const startTs: number | undefined = call.start_timestamp || call.start_time
  const endTs: number | undefined = call.end_timestamp || call.end_time
  const durationMs: number | undefined = call.duration_ms
  const callAnalysis = call.call_analysis || null
  const sentiment = callAnalysis?.user_sentiment || callAnalysis?.sentiment || null
  const summary = callAnalysis?.call_summary || callAnalysis?.summary || null
  const disconnectionReason = call.disconnection_reason || null

  if (!callId) {
   return NextResponse.json({ ok: false, error: 'missing call_id' }, { status: 400 })
  }

  // 1) Resolve business_id
  let businessId: string | null = null
  if (agentId) {
   const { data: byAgent } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('retell_agent_id', agentId)
    .maybeSingle()
   if (byAgent) businessId = byAgent.id
  }
  if (!businessId && toNumber) {
   const { data: byPhone } = await supabaseAdmin
    .from('phone_numbers')
    .select('business_id')
    .eq('phone_number', toNumber)
    .eq('provider', 'retell')
    .maybeSingle()
   if (byPhone) businessId = byPhone.business_id
  }
  if (!businessId && toNumber) {
   const { data: byBizPhone } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('phone_number', toNumber)
    .maybeSingle()
   if (byBizPhone) businessId = byBizPhone.id
  }
  if (!businessId) {
   // Silent-drop path: Retell saw a call we can't tie to a business.
   // Log loud + fire admin notification so this never disappears
   // unnoticed. 200 still since retries won't help if our DB is missing
   // the mapping - the operator has to fix the number-to-business link.
   logger.error('Retell call-events: no business match', { callId, agentId, toNumber, fromNumber, eventType })
   await notifyAdmin({
    type: 'call.unmatched',
    severity: 'critical',
    title: 'Inbound call not linked to a business',
    body: `Retell ${eventType} fired but no business matched. ${fromNumber || 'unknown'} -> ${toNumber || 'unknown'}, agent ${agentId || 'none'}, call ${callId}.`,
    metadata: {
     retell_call_id: callId,
     event_type: eventType,
     agent_id: agentId || null,
     to_number: toNumber || null,
     from_number: fromNumber || null,
    },
   })
   return NextResponse.json({ ok: true, ignored: true, reason: 'no_business_match' })
  }

  // 2) Compute duration in seconds
  let durationSec: number | null = null
  if (typeof durationMs === 'number') durationSec = Math.round(durationMs / 1000)
  else if (startTs && endTs) durationSec = Math.round((endTs - startTs) / 1000)

  // 3) Determine status from event
  let status = 'in_progress'
  if (eventType === 'call_ended' || eventType === 'call_analyzed') status = 'completed'
  if (disconnectionReason && /(failed|error|busy|no_answer)/i.test(disconnectionReason)) status = 'failed'

  // 4) Upsert: try update by retell_call_id, then insert if not present
  const { data: existing } = await supabaseAdmin
   .from('calls')
   .select('id')
   .eq('retell_call_id', callId)
   .maybeSingle()

  const baseRow: Record<string, unknown> = {
   business_id: businessId,
   retell_call_id: callId,
   call_id: callId,
   from_number: fromNumber || '',
   to_number: toNumber || '',
   status,
   direction: 'inbound',
  }
  if (durationSec !== null) baseRow.duration = durationSec
  if (transcript) baseRow.transcript = transcript
  if (recordingUrl) baseRow.recording_url = recordingUrl
  if (sentiment) baseRow.sentiment = sentiment
  if (summary) baseRow.call_summary = summary
  // Flatten Retell's custom_analysis_data (the structured fields
  // defined by post_call_analysis_data on the agent) into our
  // call_extractions jsonb column. The calls table has no
  // call_analysis column - writing to it 500'd every analyzed
  // webhook and dropped all transcript saves for analyzed events.
  if (callAnalysis) {
   const extractions = callAnalysis.custom_analysis_data || callAnalysis
   if (extractions && typeof extractions === 'object') {
    baseRow.call_extractions = extractions
   }
  }

  if (existing) {
   const { error: upErr } = await supabaseAdmin
    .from('calls')
    .update({ ...baseRow, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
   if (upErr) {
    logger.error('Retell call-events update failed', { error: upErr.message, callId })
    return NextResponse.json({ ok: false, error: 'db_update_failed' }, { status: 500 })
   }
  } else {
   const { error: insErr } = await supabaseAdmin
    .from('calls')
    .insert({ ...baseRow, created_at: new Date().toISOString() })
   if (insErr) {
    logger.error('Retell call-events insert failed', { error: insErr.message, callId })
    return NextResponse.json({ ok: false, error: 'db_insert_failed' }, { status: 500 })
   }
  }

  return NextResponse.json({ ok: true, businessId, eventType, status })
 } catch (error) {
  logger.error('Retell call-events handler error', {
   error: error instanceof Error ? error.message : 'unknown',
  })
  return NextResponse.json({ ok: false, error: 'handler_error' }, { status: 500 })
 }
}
