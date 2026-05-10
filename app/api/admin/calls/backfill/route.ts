import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { resolveCallBusinessId } from '@/lib/calls/resolve-business'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/calls/backfill
 *
 * One-shot recovery for calls that Retell saw but our webhook never
 * persisted (e.g. silent business-resolution failures before the fix).
 * Pulls recent calls from Retell's API, checks each against the local
 * `calls` table by retell_call_id, and inserts the missing ones.
 *
 * Body:
 *   { lookback_hours?: number, dry_run?: boolean, limit?: number }
 * Defaults: lookback=72h, dry_run=false, limit=500.
 *
 * Returns: { scanned, already_present, inserted, unmatched, samples }
 *   - unmatched: rows where we still couldn't resolve a business; left
 *     uninserted but listed so the operator can fix the mapping.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.RETELL_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RETELL_API_KEY not configured' }, { status: 500 })
  }

  let body: any = {}
  try { body = await request.json() } catch { /* allow empty */ }
  const lookbackHours: number = Math.min(Math.max(Number(body.lookback_hours) || 72, 1), 24 * 30)
  const dryRun: boolean = body.dry_run !== false ? body.dry_run === true : false
  const limit: number = Math.min(Math.max(Number(body.limit) || 500, 1), 1000)

  const sinceMs = Date.now() - lookbackHours * 3600 * 1000

  // Retell list-calls is POST /v2/list-calls with filter_criteria
  // (start_timestamp_after / before in ms) and pagination_key.
  const collected: any[] = []
  let paginationKey: string | undefined = undefined
  for (let page = 0; page < 10 && collected.length < limit; page++) {
    const resp = await fetch('https://api.retellai.com/v2/list-calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter_criteria: { start_timestamp: { lower_threshold: sinceMs } },
        sort_order: 'descending',
        limit: Math.min(100, limit - collected.length),
        pagination_key: paginationKey,
      }),
    })
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '')
      logger.error('Retell list-calls failed', { status: resp.status, body: txt.slice(0, 300) })
      return NextResponse.json({ error: `Retell list-calls ${resp.status}`, detail: txt.slice(0, 300) }, { status: 502 })
    }
    const json = await resp.json().catch(() => ({}))
    const items: any[] = Array.isArray(json) ? json : (json.calls || json.data || [])
    if (items.length === 0) break
    collected.push(...items)
    const last = items[items.length - 1]
    paginationKey = last?.call_id || last?.id
    if (items.length < 100) break
  }

  const stats = {
    scanned: collected.length,
    already_present: 0,
    inserted: 0,
    unmatched: 0,
    dry_run: dryRun,
    lookback_hours: lookbackHours,
  }
  const unmatchedSamples: Array<{ call_id: string; from: string; to: string; agent_id: string }> = []
  const insertedSamples: Array<{ call_id: string; business_id: string; from: string; to: string }> = []

  for (const c of collected) {
    const callId: string | undefined = c.call_id || c.id
    if (!callId) continue

    const { data: existing } = await supabaseAdmin
      .from('calls')
      .select('id')
      .eq('retell_call_id', callId)
      .maybeSingle()
    if (existing) { stats.already_present += 1; continue }

    const agentId: string | undefined = c.agent_id
    const fromNumber: string | undefined = c.from_number
    const toNumber: string | undefined = c.to_number
    const businessId = await resolveCallBusinessId(agentId, toNumber)

    if (!businessId) {
      stats.unmatched += 1
      if (unmatchedSamples.length < 25) {
        unmatchedSamples.push({
          call_id: callId,
          from: fromNumber || '',
          to: toNumber || '',
          agent_id: agentId || '',
        })
      }
      continue
    }

    if (dryRun) {
      stats.inserted += 1
      if (insertedSamples.length < 25) {
        insertedSamples.push({ call_id: callId, business_id: businessId, from: fromNumber || '', to: toNumber || '' })
      }
      continue
    }

    const startTs: number | undefined = c.start_timestamp
    const endTs: number | undefined = c.end_timestamp
    const durationMs: number | undefined = c.duration_ms
    const durationSec =
      typeof durationMs === 'number' ? Math.round(durationMs / 1000)
        : (startTs && endTs ? Math.round((endTs - startTs) / 1000) : null)

    const analysis = c.call_analysis || null
    const row: Record<string, any> = {
      business_id: businessId,
      retell_call_id: callId,
      call_id: callId,
      from_number: fromNumber || '',
      to_number: toNumber || '',
      direction: 'inbound',
      status: 'completed',
      created_at: startTs ? new Date(startTs).toISOString() : new Date().toISOString(),
    }
    if (durationSec !== null) row.duration = durationSec
    if (typeof c.transcript === 'string') row.transcript = c.transcript
    if (typeof c.recording_url === 'string') row.recording_url = c.recording_url
    if (analysis?.user_sentiment) row.sentiment = analysis.user_sentiment
    if (analysis?.call_summary) row.call_summary = analysis.call_summary
    if (analysis) row.call_analysis = analysis
    if (analysis?.custom_analysis_data) row.call_extractions = analysis.custom_analysis_data

    const { error: insErr } = await supabaseAdmin.from('calls').insert(row)
    if (insErr) {
      logger.error('Backfill insert failed', { callId, error: insErr.message })
      continue
    }
    stats.inserted += 1
    if (insertedSamples.length < 25) {
      insertedSamples.push({ call_id: callId, business_id: businessId, from: fromNumber || '', to: toNumber || '' })
    }
  }

  return NextResponse.json({
    success: true,
    stats,
    samples: {
      inserted: insertedSamples,
      unmatched: unmatchedSamples,
    },
  })
}
