import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/scrape/[id]/promote
 * body: { result_ids?: string[] } — if omitted, promotes every not-yet-promoted result
 *
 * Inserts the selected scrape_results into public.leads, dedupes by phone
 * (within the leads table), and links the scrape_results row back to the
 * created lead via promoted_lead_id.
 */
export async function POST(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 try {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
   return NextResponse.json({ success: true, promoted: 0, skipped: 0 })
  }

  // Existing phone numbers in leads — used for cross-table dedupe.
  const phones = pending.map((r) => normalizePhone(r.phone)).filter(Boolean) as string[]
  const existingPhones = new Set<string>()
  if (phones.length > 0) {
   const { data: existing } = await supabaseAdmin
    .from('leads')
    .select('phone')
    .in('phone', phones)
   for (const e of existing || []) {
    if (e.phone) existingPhones.add(normalizePhone(e.phone) || '')
   }
  }

  let promoted = 0
  let skipped = 0
  let firstInsertError: string | null = null
  for (const r of pending) {
   const phone = normalizePhone(r.phone)
   if (phone && existingPhones.has(phone)) { skipped++; continue }

   const { data: lead, error: insertErr } = await supabaseAdmin
    .from('leads')
    .insert({
     business_name: r.business_name || 'Unknown',
     contact_name: r.owner_name || null,
     phone: r.phone || null,
     email: r.email || null,
     source: 'cold_call',
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
    logger.warn('Promote: lead insert failed', { error: insertErr?.message, scrapeResultId: r.id })
    skipped++
    continue
   }

   await supabaseAdmin
    .from('scrape_results')
    .update({ promoted_lead_id: lead.id })
    .eq('id', r.id)

   if (phone) existingPhones.add(phone)
   promoted++
  }

  // Bump the job's promoted_count for visibility.
  if (promoted > 0) {
   const { data: job } = await supabaseAdmin
    .from('scrape_jobs').select('promoted_count').eq('id', params.id).single()
   await supabaseAdmin
    .from('scrape_jobs')
    .update({
     promoted_count: (job?.promoted_count ?? 0) + promoted,
     updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
  }

  return NextResponse.json({
   success: true,
   promoted,
   skipped,
   ...(firstInsertError ? { error_sample: firstInsertError } : {}),
  })
 } catch (e) {
  logger.error('Promote failed', { error: e instanceof Error ? e.message : 'Unknown' })
  return NextResponse.json({ error: 'Failed to promote results' }, { status: 500 })
 }
}

function normalizePhone(p: string | null | undefined): string | null {
 if (!p) return null
 const digits = p.replace(/[^0-9]/g, '')
 if (!digits) return null
 // 10-digit US: store as +1XXXXXXXXXX so dedupe matches across formats.
 if (digits.length === 10) return `+1${digits}`
 if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
 return p.trim()
}
