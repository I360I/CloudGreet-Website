import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/scrape/[id]/promote
 * body: { result_ids?: string[] }
 *
 * Same shape as the admin promote endpoint, but additionally
 * auto-claims each promoted lead to the calling rep so it lands
 * in their "Yours" list immediately. Job ownership is enforced
 * via the params.rep_id tag set when the job was created.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data: job } = await supabaseAdmin
    .from('scrape_jobs').select('params').eq('id', params.id).maybeSingle()
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.params?.rep_id !== auth.userId) {
    return NextResponse.json({ error: 'Not your job' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({} as { result_ids?: string[] }))
  const ids = Array.isArray(body.result_ids) && body.result_ids.length > 0
    ? body.result_ids.map(String)
    : null

  let q = supabaseAdmin
    .from('scrape_results')
    .select('*')
    .eq('job_id', params.id)
    .is('promoted_lead_id', null)
  if (ids) q = q.in('id', ids)

  const { data: results, error: rErr } = await q
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })
  const pending = results || []
  if (pending.length === 0) {
    return NextResponse.json({ success: true, promoted: 0, skipped: 0, claimed: 0 })
  }

  const phones = pending.map((r) => normalizePhone(r.phone)).filter(Boolean) as string[]
  const existingPhonesToLead = new Map<string, string>()
  if (phones.length > 0) {
    const { data: existing } = await supabaseAdmin
      .from('leads')
      .select('id, phone')
      .in('phone', phones)
    for (const e of existing || []) {
      const p = normalizePhone(e.phone)
      if (p) existingPhonesToLead.set(p, e.id)
    }
  }

  let promoted = 0
  let skipped = 0
  let claimed = 0
  const claimsToInsert: { lead_id: string; rep_id: string; claimed: boolean }[] = []
  let firstInsertError: string | null = null

  for (const r of pending) {
    const phone = normalizePhone(r.phone)
    let leadId: string | null = null

    if (phone && existingPhonesToLead.has(phone)) {
      // Already exists — claim it for the rep instead of inserting.
      leadId = existingPhonesToLead.get(phone)!
      skipped++
    } else {
      const { data: lead, error: insertErr } = await supabaseAdmin
        .from('leads')
        .insert({
          name: r.business_name || 'Unknown',
          business_name: r.business_name || 'Unknown',
          contact_name: r.owner_name || null,
          phone: r.phone || null,
          email: r.email || null,
          source: 'scrape',
          status: 'cold',
          notes: [
            r.business_type ? `Trade: ${r.business_type}` : null,
            r.license_no ? `License: ${r.license_no}` : null,
            r.address || r.city ? `Address: ${[r.address, r.city, r.state, r.zip].filter(Boolean).join(', ')}` : null,
            r.website ? `Web: ${r.website}` : null,
            `From scrape job ${params.id}`,
          ].filter(Boolean).join('\n') || null,
        })
        .select('id')
        .single()

      if (insertErr || !lead) {
        if (!firstInsertError) firstInsertError = insertErr?.message || 'Unknown insert error'
        logger.warn('Sales promote: lead insert failed', { error: insertErr?.message })
        continue
      }
      leadId = lead.id
      promoted++
      if (phone) existingPhonesToLead.set(phone, leadId)
    }

    await supabaseAdmin
      .from('scrape_results')
      .update({ promoted_lead_id: leadId })
      .eq('id', r.id)

    if (leadId) {
      claimsToInsert.push({ lead_id: leadId, rep_id: auth.userId, claimed: true })
    }
  }

  // Auto-claim all promoted leads for this rep, ignoring duplicates.
  if (claimsToInsert.length > 0) {
    const { count: beforeCount } = await supabaseAdmin
      .from('lead_assignments')
      .select('lead_id', { count: 'exact', head: true })
      .eq('rep_id', auth.userId)
      .in('lead_id', claimsToInsert.map((c) => c.lead_id))

    const { error: claimErr } = await supabaseAdmin
      .from('lead_assignments')
      .upsert(claimsToInsert, { onConflict: 'lead_id,rep_id', ignoreDuplicates: true })
    if (claimErr) {
      logger.warn('Auto-claim failed (non-fatal)', { error: claimErr.message })
    } else {
      claimed = claimsToInsert.length - (beforeCount ?? 0)
    }
  }

  if (promoted > 0) {
    const { data: jobRow } = await supabaseAdmin
      .from('scrape_jobs').select('promoted_count').eq('id', params.id).single()
    await supabaseAdmin
      .from('scrape_jobs')
      .update({
        promoted_count: (jobRow?.promoted_count ?? 0) + promoted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
  }

  return NextResponse.json({
    success: true,
    promoted,
    skipped,
    claimed,
    ...(firstInsertError ? { error_sample: firstInsertError } : {}),
  })
}

function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null
  const digits = p.replace(/[^0-9]/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return p.trim()
}
