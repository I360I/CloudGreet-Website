import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/scrape/[id] — job + its scrape_results, scoped to
 * the calling rep (the params.rep_id tag set on creation).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
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

  const phones = Array.from(new Set(
    (results || [])
      .map((r) => normalizePhone(r.phone))
      .filter((p): p is string => !!p),
  ))

  let existingPhonesInLeads: string[] = []
  if (phones.length > 0) {
    const { data: existing } = await supabaseAdmin
      .from('leads')
      .select('phone')
      .not('phone', 'is', null)
    const set = new Set(
      (existing || [])
        .map((e) => normalizePhone(e.phone))
        .filter((p): p is string => !!p),
    )
    existingPhonesInLeads = phones.filter((p) => set.has(p))
  }

  return NextResponse.json({
    success: true,
    job,
    results: results || [],
    existing_phones_in_leads: existingPhonesInLeads,
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
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
