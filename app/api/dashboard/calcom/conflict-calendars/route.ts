import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { listConnectedCalendars, setCalendarConflictCheck, CalcomError } from '@/lib/calcom'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * The "Check for conflicts" calendars from Cal.com, surfaced in our UI.
 *
 * GET  -> list the contractor's connected calendars + which are conflict-checked
 * POST -> { selections: [{ integration, externalId, credentialId, enabled }] }
 *         turn conflict-checking on/off for each, then return the fresh list.
 *
 * Uses the business's stored Cal.com API key, so the client never touches
 * Cal.com's own settings page.
 */
async function getApiKey(request: NextRequest): Promise<{ apiKey: string } | { error: NextResponse }> {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('cal_com_api_key')
    .eq('id', auth.businessId)
    .maybeSingle()
  const apiKey = (biz as any)?.cal_com_api_key as string | null
  if (!apiKey) {
    return { error: NextResponse.json({ success: false, error: 'Cal.com is not connected yet.' }, { status: 400 }) }
  }
  return { apiKey }
}

export async function GET(request: NextRequest) {
  const r = await getApiKey(request)
  if ('error' in r) return r.error
  try {
    const groups = await listConnectedCalendars(r.apiKey)
    return NextResponse.json({ success: true, groups })
  } catch (e) {
    const msg = e instanceof CalcomError ? e.message : (e instanceof Error ? e.message : 'Unknown')
    logger.warn('listConnectedCalendars failed', { error: msg })
    return NextResponse.json({ success: false, error: `Could not load calendars: ${msg}` }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const r = await getApiKey(request)
  if ('error' in r) return r.error

  const body = await request.json().catch(() => ({} as any))
  const selections = Array.isArray(body?.selections) ? body.selections : []
  if (!selections.length) {
    return NextResponse.json({ success: false, error: 'No selections provided' }, { status: 400 })
  }

  const failures: string[] = []
  for (const s of selections) {
    if (!s || typeof s.externalId !== 'string' || typeof s.integration !== 'string') continue
    try {
      await setCalendarConflictCheck(
        r.apiKey,
        { integration: s.integration, externalId: s.externalId, credentialId: Number(s.credentialId) },
        !!s.enabled,
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown'
      failures.push(`${s.name || s.externalId}: ${msg}`)
      logger.warn('setCalendarConflictCheck failed', { externalId: s.externalId, enabled: !!s.enabled, error: msg })
    }
  }

  // Return the fresh state so the UI reflects what actually stuck.
  let groups: any[] = []
  try { groups = await listConnectedCalendars(r.apiKey) } catch { /* best effort */ }

  return NextResponse.json({
    success: failures.length === 0,
    groups,
    ...(failures.length ? { error: `Some calendars didn't update: ${failures.join('; ')}` } : {}),
  })
}
