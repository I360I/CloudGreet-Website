import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/scrape/[id] - job + its scrape_results, scoped to
 * the calling rep (the params.rep_id tag set on creation).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data: job } = await supabaseAdmin
    .from('scrape_jobs').select('*').eq('id', params.id).maybeSingle()
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  if (job.params?.rep_id !== auth.userId) {
    return NextResponse.json({ error: 'Not your job' }, { status: 403 })
  }

  const { data: results } = await supabaseAdmin
    .from('scrape_results')
    .select('*')
    .eq('job_id', params.id)
    .order('created_at', { ascending: true })

  // Drop any result row whose phone is already in `leads` - don't just
  // flag them as dup. Marking-but-keeping them ate visible scrape slots
  // and made reps feel they were scraping garbage (even when promote
  // would have correctly reused the existing lead row). The runner
  // already dedupes at insert time; this is the belt-and-suspenders
  // pass for older scrape_jobs predating that filter.
  const phones = Array.from(new Set(
    (results || [])
      .map((r) => normalizePhone(r.phone))
      .filter((p): p is string => !!p),
  ))
  const dupePhones = new Set<string>()
  if (phones.length > 0) {
    const { data: existing } = await supabaseAdmin
      .from('leads')
      .select('phone')
      .not('phone', 'is', null)
    const leadsSet = new Set(
      (existing || [])
        .map((e) => normalizePhone(e.phone))
        .filter((p): p is string => !!p),
    )
    for (const p of phones) {
      if (leadsSet.has(p)) dupePhones.add(p)
    }
  }
  const filtered = (results || []).filter((r) => {
    const p = normalizePhone(r.phone)
    return !p || !dupePhones.has(p)
  })

  return NextResponse.json({
    success: true,
    job,
    results: filtered,
    // Retain the field for any UI still reading it - empty by design now.
    existing_phones_in_leads: [],
    dropped_as_existing_in_leads: (results?.length || 0) - filtered.length,
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data: job } = await supabaseAdmin
    .from('scrape_jobs').select('params').eq('id', params.id).maybeSingle()
  if (!job) return NextResponse.json({ success: true })
  if (job.params?.rep_id !== auth.userId) {
    return NextResponse.json({ error: 'Not your job' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('scrape_jobs').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null
  const digits = p.replace(/[^0-9]/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return p.trim()
}
