import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/import
 *
 * Body: { csv: string, source?: string }
 *   - csv: comma-separated, header row required
 *   - source: optional tag to label where the leads came from
 *             (e.g. "Houston HVAC scrape May 21"). Stored on every
 *             imported row; falls back to "import".
 *
 * Column matching is FUZZY (case-insensitive, spaces / dashes /
 * underscores treated the same). Anything that looks like the
 * canonical field name maps. A business name is required per row
 * - either business_name, name, company, company_name, "business",
 * or "biz" all work.
 *
 * Recognized fields (and common variants):
 *   - business_name | name | company | company_name | business | biz
 *   - contact_name  | contact | owner | owner_name | first_name | full_name
 *   - phone         | phone_number | tel | telephone | mobile | cell | phone1
 *   - email         | email_address | e-mail | mail
 *   - website       | url | site | web | domain
 *   - address       | street | street_address | addr | address1
 *   - city          | town | locality
 *   - state         | st | region | province
 *   - zip           | zip_code | postal | postal_code
 *   - business_type | type | industry | category | biz_type
 *   - notes         | comment | comments | remarks | description
 *
 * Inserts rows into `leads` (deduped by phone within leads), then
 * auto-claims them for the calling rep so they appear in "Yours".
 * Returns { mapped_columns } so the UI can show the rep exactly
 * which CSV columns got picked up.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch { body = {} }

  const csv = typeof body?.csv === 'string' ? body.csv : ''
  const sourceTag = (typeof body?.source === 'string' && body.source.trim()) ? body.source.trim().slice(0, 80) : 'import'
  if (!csv.trim()) return NextResponse.json({ error: 'csv body required' }, { status: 400 })
  if (csv.length > 2_000_000) {
    return NextResponse.json({ error: 'CSV too large (max 2MB)' }, { status: 413 })
  }

  const rows = parseCsv(csv)
  if (rows.length < 2) {
    return NextResponse.json({ error: 'CSV must include a header row plus at least one data row' }, { status: 400 })
  }

  // Fuzzy column matching - normalise both the header cells and the
  // synonyms so "Business Name", "business-name", "BusinessName",
  // "business_name" all hit the same target.
  const normaliseHeader = (s: string) => s.trim().toLowerCase().replace(/[\s_\-.]+/g, '')
  const headerNorm = rows[0].map(normaliseHeader)
  const findCol = (...candidates: string[]): number => {
    for (const c of candidates) {
      const idx = headerNorm.indexOf(normaliseHeader(c))
      if (idx >= 0) return idx
    }
    return -1
  }
  const iBiz = findCol('business_name', 'businessname', 'name', 'company', 'company_name', 'business', 'biz')
  const iContact = findCol('contact_name', 'contactname', 'contact', 'owner', 'owner_name', 'ownername', 'first_name', 'firstname', 'full_name', 'fullname')
  const iPhone = findCol('phone', 'phone_number', 'phonenumber', 'tel', 'telephone', 'mobile', 'cell', 'phone1')
  const iEmail = findCol('email', 'email_address', 'emailaddress', 'e-mail', 'mail')
  const iWebsite = findCol('website', 'url', 'site', 'web', 'domain', 'homepage')
  const iAddress = findCol('address', 'street', 'street_address', 'streetaddress', 'addr', 'address1', 'address_line_1')
  const iCity = findCol('city', 'town', 'locality')
  const iState = findCol('state', 'st', 'region', 'province')
  const iZip = findCol('zip', 'zip_code', 'zipcode', 'postal', 'postal_code', 'postalcode')
  const iBizType = findCol('business_type', 'businesstype', 'type', 'industry', 'category', 'biz_type', 'biztype')
  const iNotes = findCol('notes', 'note', 'comment', 'comments', 'remarks', 'description', 'desc')

  if (iBiz === -1) {
    return NextResponse.json({
      error: 'Could not find a business-name column. Header should include one of: business_name, name, company.',
      detected_headers: rows[0],
    }, { status: 400 })
  }

  const dataRows = rows.slice(1).filter((r) => r.length > 0 && r.some((c) => c.trim()))
  if (dataRows.length === 0) {
    return NextResponse.json({ error: 'No data rows' }, { status: 400 })
  }
  if (dataRows.length > 2000) {
    return NextResponse.json({ error: 'Max 2000 rows per import' }, { status: 400 })
  }

  // Build a record of which CSV column got mapped to which canonical
  // field so the UI can show the rep what we picked up (and what we
  // ignored).
  const mappedColumns: Record<string, string | null> = {
    business_name: iBiz >= 0 ? rows[0][iBiz] : null,
    contact_name: iContact >= 0 ? rows[0][iContact] : null,
    phone: iPhone >= 0 ? rows[0][iPhone] : null,
    email: iEmail >= 0 ? rows[0][iEmail] : null,
    website: iWebsite >= 0 ? rows[0][iWebsite] : null,
    address: iAddress >= 0 ? rows[0][iAddress] : null,
    city: iCity >= 0 ? rows[0][iCity] : null,
    state: iState >= 0 ? rows[0][iState] : null,
    zip: iZip >= 0 ? rows[0][iZip] : null,
    business_type: iBizType >= 0 ? rows[0][iBizType] : null,
    notes: iNotes >= 0 ? rows[0][iNotes] : null,
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

    const cell = (idx: number): string | null => {
      if (idx < 0) return null
      const v = (row[idx] || '').trim()
      return v.length ? v : null
    }
    const { data: lead, error: insertErr } = await supabaseAdmin
      .from('leads')
      .insert({
        name: businessName,
        business_name: businessName,
        contact_name: cell(iContact),
        phone: cell(iPhone),
        email: cell(iEmail),
        website: cell(iWebsite),
        address: cell(iAddress),
        city: cell(iCity),
        state: cell(iState),
        zip: cell(iZip),
        business_type: cell(iBizType),
        notes: cell(iNotes),
        source: sourceTag,
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
    source: sourceTag,
    mapped_columns: mappedColumns,
    total_data_rows: dataRows.length,
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
