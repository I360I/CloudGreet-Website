import { logger } from '../monitoring'
import { enrichWithGooglePlaces, isGooglePlacesConfigured } from './google-places'
import type { ScrapeParams, ScrapeRecord, SourceDefinition } from './types'

/**
 * Texas State Board of Plumbing Examiners — Responsible Master Plumber CSV.
 *
 * TSBPE publishes a daily CSV of every active master plumber that includes
 * owner name, business (PLUMB_COMPANY), phone, full address, and county.
 * No HTML scraping needed — we just fetch and parse the CSV directly.
 *
 * Phone is already in the data, so Google Places enrichment is purely
 * for picking up the website.
 */

const RMP_CSV_URL = 'https://tsbpe.texas.gov/download-csv/RMP/'
const ENRICH_DELAY_MS = 200

const UA =
 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'

async function* runTsbpe(params: ScrapeParams): AsyncGenerator<ScrapeRecord, void, void> {
 const limit = Math.max(1, Math.min(2000, params.limit ?? 100))
 const locationFilter = (params.location || '').trim().toUpperCase()

 let csvText: string
 try {
  const res = await fetch(RMP_CSV_URL, {
   headers: { 'User-Agent': UA, Accept: 'text/csv,*/*' },
  })
  if (!res.ok) {
   logger.error('TSBPE CSV fetch failed', { status: res.status })
   return
  }
  csvText = await res.text()
 } catch (e) {
  logger.error('TSBPE CSV fetch threw', { error: e instanceof Error ? e.message : 'Unknown' })
  return
 }

 const rows = parseCsv(csvText)
 if (rows.length === 0) {
  logger.warn('TSBPE CSV had no rows')
  return
 }

 const enrichEnabled = params.extra?.enrich !== false && isGooglePlacesConfigured()
 let yielded = 0

 for (const r of rows) {
  if (yielded >= limit) break

  // Active licenses only — drop expired/inactive.
  const status = (r.LIC_STATUS || '').trim()
  if (status && !/current|active/i.test(status)) continue

  // Location filter — match either city or county (uppercase, in CSV).
  if (locationFilter) {
   const city = (r.CITY || '').toUpperCase()
   const county = (r.COUNTY || '').toUpperCase()
   if (!city.includes(locationFilter) && !county.includes(locationFilter)) continue
  }

  const ownerName = [r.FIRST_NAME, r.MIDDLE_NAME, r.LAST_NAME, r.SUFFIX]
   .filter((p) => p && p.trim().length > 0)
   .join(' ')
   .replace(/\s+/g, ' ')
   .trim()

  const businessName = (r.PLUMB_COMPANY || ownerName || 'Unknown').trim()
  const address = [r.ADDR1, r.ADDR2, r.ADDR3]
   .filter((p) => p && p.trim().length > 0)
   .join(', ') || null

  let record: ScrapeRecord = {
   source: 'tsbpe_plumbing',
   business_name: businessName,
   owner_name: ownerName || null,
   phone: formatPhone(r.PHONE),
   business_type: 'Plumbing',
   license_no: r.LICENSE_NBR || null,
   address,
   city: r.CITY ? toTitleCase(r.CITY) : null,
   state: r.STATE || 'TX',
   zip: r.ZIP || null,
   raw: r,
  }

  // Enrich for website only — phone is already in the CSV.
  if (enrichEnabled) {
   try {
    const attempt = await enrichWithGooglePlaces(record.business_name, record.city)
    if (attempt.ok) {
     record = {
      ...record,
      website: attempt.data.website || null,
      raw: { ...r, google_places: attempt.data },
     }
    } else {
     record = { ...record, raw: { ...r, google_places_error: attempt.error } }
    }
    await sleep(ENRICH_DELAY_MS)
   } catch (e) {
    record = {
     ...record,
     raw: { ...r, google_places_error: e instanceof Error ? e.message : 'Unknown' },
    }
   }
  }

  yield record
  yielded++
 }
}

/* ------------------------------ CSV parser ------------------------------ */

/** Tiny CSV parser — handles quoted cells with embedded commas + CRLF. */
function parseCsv(text: string): Record<string, string>[] {
 // Split on newlines that aren't inside quotes
 const rows: string[][] = []
 let cur = ''
 let inQuotes = false
 let row: string[] = []
 for (let i = 0; i < text.length; i++) {
  const c = text[i]
  if (c === '"') {
   if (inQuotes && text[i + 1] === '"') { cur += '"'; i++ }
   else inQuotes = !inQuotes
  } else if (c === ',' && !inQuotes) {
   row.push(cur); cur = ''
  } else if ((c === '\n' || c === '\r') && !inQuotes) {
   if (cur || row.length > 0) { row.push(cur); rows.push(row); row = []; cur = '' }
   if (c === '\r' && text[i + 1] === '\n') i++
  } else {
   cur += c
  }
 }
 if (cur || row.length > 0) { row.push(cur); rows.push(row) }

 if (rows.length < 2) return []
 const headers = rows[0].map((h) => h.trim())
 return rows.slice(1).map((cells) => {
  const obj: Record<string, string> = {}
  headers.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim() })
  return obj
 })
}

function formatPhone(raw: string | undefined | null): string | null {
 if (!raw) return null
 const digits = raw.replace(/[^0-9]/g, '')
 if (digits.length === 10) return `+1${digits}`
 if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
 return null
}

function toTitleCase(s: string): string {
 return s
  .toLowerCase()
  .split(/\s+/)
  .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
  .join(' ')
}

function sleep(ms: number) {
 return new Promise((r) => setTimeout(r, ms))
}

/* ----------------------------- Source ----------------------------- */

export const tsbpePlumbing: SourceDefinition = {
 id: 'tsbpe_plumbing',
 label: 'TSBPE · Plumbing contractors',
 description:
  'Texas State Board of Plumbing Examiners — Responsible Master Plumbers. Owner name, business, phone, and full address come straight from TSBPE\'s public CSV. Google Places fills in websites.',
 trade: 'Plumbing',
 run: (params, _opts) => runTsbpe(params),
}
