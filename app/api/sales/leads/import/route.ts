import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/import
 *
 * Body: { csv: string } — comma-separated, header row required.
 * Recognized columns (case-insensitive): business_name, contact_name,
 * phone, email, notes. business_name is required per row.
 *
 * Inserts rows into `leads` (deduped by phone within leads), then
 * auto-claims them for the calling rep so they appear in "Yours".
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch { body = {} }

  const csv = typeof body?.csv === 'string' ? body.csv : ''
  if (!csv.trim()) return NextResponse.json({ error: 'csv body required' }, { status: 400 })
  if (csv.length > 2_000_000) {
    return NextResponse.json({ error: 'CSV too large (max 2MB)' }, { status: 413 })
  }

  const rows = parseCsv(csv)
  if (rows.length < 2) {
    return NextResponse.json({ error: 'CSV must include a header row plus at least one data row' }, { status: 400 })
  }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const idxOf = (name: string) => header.indexOf(name)
  const iBiz = idxOf('business_name')
  const iContact = idxOf('contact_name')
  const iPhone = idxOf('phone')
  const iEmail = idxOf('email')
  const iNotes = idxOf('notes')

  if (iBiz === -1) {
    return NextResponse.json({ error: 'Missing required column: business_name' }, { status: 400 })
  }

  const dataRows = rows.slice(1).filter((r) => r.length > 0 && r.some((c) => c.trim()))
  if (dataRows.length === 0) {
    return NextResponse.json({ error: 'No data rows' }, { status: 400 })
  }
  if (dataRows.length > 2000) {
    return NextResponse.json({ error: 'Max 2000 rows per import' }, { status: 400 })
  }

  // Phone dedupe against existing leads.
  const phones = dataRows
    .map((r) => normalizePhone(iPhone >= 0 ? r[iPhone] : null))
    .filter((p): p is string => !!p)
  const existingPhones = new Set<string>()
  if (phones.length > 0) {
    const { data: existing } = await supabaseAdmin
      .from('leads')
      .select('id, phone')
      .in('phone', phones)
    for (const e of existing || []) {
      const p = normalizePhone(e.phone)
      if (p) existingPhones.add(p)
    }
  }

  let imported = 0
  let skipped = 0
  let invalid = 0
  const newLeadIds: string[] = []
  const existingLeadIds: string[] = []

  for (const row of dataRows) {
    const businessName = (iBiz >= 0 ? row[iBiz] : '').trim()
    if (!businessName) { invalid++; continue }
    const phone = normalizePhone(iPhone >= 0 ? row[iPhone] : null)

    if (phone && existingPhones.has(phone)) {
      // Find the existing lead and claim it for this rep.
      const { data: hit } = await supabaseAdmin
        .from('leads').select('id').eq('phone', phone).limit(1).maybeSingle()
      if (hit) existingLeadIds.push(hit.id)
      skipped++
      continue
    }

    const { data: lead, error: insertErr } = await supabaseAdmin
      .from('leads')
      .insert({
        name: businessName,
        business_name: businessName,
        contact_name: iContact >= 0 ? (row[iContact] || null) : null,
        phone: iPhone >= 0 ? (row[iPhone] || null) : null,
        email: iEmail >= 0 ? (row[iEmail] || null) : null,
        notes: iNotes >= 0 ? (row[iNotes] || null) : null,
        source: 'import',
        status: 'cold',
      })
      .select('id')
      .single()
    if (insertErr || !lead) {
      logger.warn('CSV import row failed', { error: insertErr?.message })
      invalid++
      continue
    }
    imported++
    newLeadIds.push(lead.id)
    if (phone) existingPhones.add(phone)
  }

  const claimRows = [...newLeadIds, ...existingLeadIds].map((id) => ({
    lead_id: id, rep_id: auth.userId, claimed: true,
  }))
  let claimed = 0
  if (claimRows.length > 0) {
    const { error: claimErr } = await supabaseAdmin
      .from('lead_assignments')
      .upsert(claimRows, { onConflict: 'lead_id,rep_id', ignoreDuplicates: true })
    if (!claimErr) claimed = claimRows.length
  }

  return NextResponse.json({
    success: true,
    imported,
    skipped_duplicate_phone: skipped,
    invalid,
    claimed,
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

/** Minimal RFC-4180-ish CSV parser: handles quoted fields with escaped quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let i = 0
  const len = text.length
  let row: string[] = []
  let field = ''
  let inQuotes = false

  while (i < len) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue }
      if (c === '"') { inQuotes = false; i++; continue }
      field += c; i++; continue
    }
    if (c === '"') { inQuotes = true; i++; continue }
    if (c === ',') { row.push(field); field = ''; i++; continue }
    if (c === '\r') { i++; continue }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
    field += c; i++
  }
  row.push(field)
  if (row.length > 1 || (row.length === 1 && row[0] !== '')) rows.push(row)
  return rows
}
