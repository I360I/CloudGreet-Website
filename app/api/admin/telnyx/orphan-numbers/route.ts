import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { releaseTelnyxNumber } from '@/lib/telnyx/rep-numbers'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Telnyx orphan reconciler.
 *
 * The dialer auto-buys local-presence numbers and evicts old ones. If a
 * buy/evict/release step fails at the wrong moment, a number can be left
 * live at Telnyx with no row in any of our tables - an "orphan" that bills
 * ~$1/mo forever and only surfaces in a manual audit. This endpoint diffs
 * Telnyx's actual inventory against every place we track numbers and reports
 * (GET) or releases (POST) the orphans. Leak-source-agnostic: it catches any
 * orphan regardless of which failure path created it.
 *
 * Toll-free numbers are NEVER auto-released (a verified toll-free is worth
 * far more than the $2/mo, and re-verification takes weeks) unless you pass
 * include_toll_free:true AND name them explicitly.
 *
 *   GET  -> { total, orphans: [...], orphan_count, monthly_waste_estimate }
 *   POST { dry_run?: bool, numbers?: string[], include_toll_free?: bool }
 *        -> releases orphan locals (or the named orphans); reports each.
 */

const TF_PREFIXES = ['+1800', '+1888', '+1877', '+1866', '+1855', '+1844', '+1833']
const isTollFree = (n: string) => TF_PREFIXES.some((p) => n.startsWith(p))

async function listTelnyxNumbers(apiKey: string) {
  const all: any[] = []
  let page = 1
  for (;;) {
    const res = await fetch(
      `https://api.telnyx.com/v2/phone_numbers?page%5Bnumber%5D=${page}&page%5Bsize%5D=100`,
      { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store' },
    )
    if (!res.ok) throw new Error(`Telnyx list failed (${res.status})`)
    const j = await res.json()
    const data = j.data || []
    all.push(...data)
    if (data.length < 100) break
    page += 1
  }
  return all
}

/** Every number we legitimately track, normalized to E.164. */
async function loadKnownNumbers(): Promise<Set<string>> {
  const known = new Set<string>()
  const add = (v?: string | null) => { if (v && /^\+\d{10,15}$/.test(v.trim())) known.add(v.trim()) }

  const [reps, ai, tolls] = await Promise.all([
    supabaseAdmin.from('sales_rep_phone_numbers').select('phone_number'),
    supabaseAdmin.from('phone_numbers').select('phone_number'),
    supabaseAdmin.from('toll_free_numbers').select('phone_number, number'),
  ])
  for (const r of reps.data || []) add((r as any).phone_number)
  for (const r of ai.data || []) add((r as any).phone_number)
  for (const r of tolls.data || []) { add((r as any).phone_number); add((r as any).number) }

  // Env-configured numbers (business line, notifications sender, etc.).
  add(process.env.CLOUDGREET_NOTIFICATIONS_FROM)
  add(process.env.BUSINESS_PHONE)
  add(process.env.TELYNX_PHONE_NUMBER)
  add(process.env.TELNYX_OUTBOUND_FROM_NUMBER)
  return known
}

async function computeOrphans(apiKey: string) {
  const [tn, known] = await Promise.all([listTelnyxNumbers(apiKey), loadKnownNumbers()])
  const orphans = tn
    .filter((p) => p.phone_number && !known.has(p.phone_number))
    .map((p) => ({
      phone_number: p.phone_number as string,
      id: p.id as string,
      type: p.phone_number_type as string,
      connection: p.connection_name || null,
      purchased_at: (p.purchased_at || '').slice(0, 10),
      toll_free: isTollFree(p.phone_number),
    }))
  return { total: tn.length, known: known.size, orphans }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'TELNYX_API_KEY missing' }, { status: 500 })

  try {
    const { total, known, orphans } = await computeOrphans(apiKey)
    const locals = orphans.filter((o) => !o.toll_free)
    return NextResponse.json({
      total_telnyx_numbers: total,
      known_tracked: known,
      orphan_count: orphans.length,
      releasable_local_orphans: locals.length,
      // Local ~$1/mo, toll-free ~$2/mo - rough monthly bleed if left.
      monthly_waste_estimate_usd: Number((locals.length * 1 + (orphans.length - locals.length) * 2).toFixed(2)),
      orphans,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'TELNYX_API_KEY missing' }, { status: 500 })

  const body = (await request.json().catch(() => ({}))) as {
    dry_run?: boolean
    numbers?: string[]
    include_toll_free?: boolean
  }

  try {
    const { orphans } = await computeOrphans(apiKey)
    // Only ever act on confirmed orphans. If specific numbers are named,
    // intersect with the orphan set so a typo can't release a live number.
    let targets = orphans
    if (Array.isArray(body.numbers) && body.numbers.length > 0) {
      const want = new Set(body.numbers.map((n) => n.trim()))
      targets = orphans.filter((o) => want.has(o.phone_number))
    }
    // Toll-frees are protected unless explicitly opted in.
    if (!body.include_toll_free) targets = targets.filter((o) => !o.toll_free)

    if (body.dry_run) {
      return NextResponse.json({ dry_run: true, would_release: targets.map((t) => t.phone_number) })
    }

    const results: { phone_number: string; released: boolean; error?: string }[] = []
    for (const t of targets) {
      const r = await releaseTelnyxNumber(t.phone_number)
      results.push({ phone_number: t.phone_number, released: r.ok === true, error: r.ok === true ? undefined : r.error })
    }
    const released = results.filter((r) => r.released).length
    logger.info('telnyx orphan reconcile', { released, attempted: results.length })
    return NextResponse.json({ attempted: results.length, released, results })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 502 })
  }
}
