import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { normalizeContactName } from '@/lib/scrapers/normalize'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET  /api/admin/leads/normalize-contact-names
 *   Read-only: previews what every lead's contact_name would become,
 *   without writing anything.
 * POST /api/admin/leads/normalize-contact-names
 *   Applies it - updates every lead whose contact_name would change.
 *
 * Texas license databases (TDLR) publish owner names as "LASTNAME,
 * FIRST MIDDLE [SUFFIX]" - all caps, last name first. Correct data,
 * confusing shape (a rep sees a comma + 2-3 tokens and reasonably
 * wonders if that's multiple people). normalizeContactName (lib/
 * scrapers/normalize.ts) reorders to "First Middle Last Suffix" and
 * title-cases everything; already-correct-order names (TSBPE, cold
 * calls, etc) just get re-cased, not reordered. New scrapes get this
 * automatically via promote.ts - this route is the one-time backfill
 * for every lead that predates that fix.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, contact_name')
    .not('contact_name', 'is', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const changes = (leads || [])
    .map((l) => ({ id: l.id, old_name: l.contact_name, new_name: normalizeContactName(l.contact_name) }))
    .filter((c) => c.new_name && c.new_name !== c.old_name)

  return NextResponse.json({
    success: true,
    total_with_contact_name: (leads || []).length,
    would_change: changes.length,
    sample: changes.slice(0, 30),
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, contact_name')
    .not('contact_name', 'is', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const changes = (leads || [])
    .map((l) => ({ id: l.id, old_name: l.contact_name, new_name: normalizeContactName(l.contact_name) }))
    .filter((c) => c.new_name && c.new_name !== c.old_name)

  let updated = 0
  const failures: { id: string; error: string }[] = []
  for (const c of changes) {
    const { error: updErr } = await supabaseAdmin
      .from('leads')
      .update({ contact_name: c.new_name })
      .eq('id', c.id)
    if (updErr) failures.push({ id: c.id, error: updErr.message })
    else updated++
  }

  logger.info('leads contact_name backfill run', { total: changes.length, updated, failed: failures.length })

  return NextResponse.json({
    success: true,
    total_with_contact_name: (leads || []).length,
    updated,
    failed: failures.length,
    failures: failures.slice(0, 10),
    sample: changes.slice(0, 30),
  })
}
