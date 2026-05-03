import { logger } from '../monitoring'
import { enrichWithGooglePlaces, isGooglePlacesConfigured } from './google-places'
import type { ScrapeParams, ScrapeRecord, SourceDefinition } from './types'

/**
 * Texas Department of Agriculture — Structural Pest Control Service.
 *
 * TDA publishes a CSV of every active commercial pest control business
 * with license #, legal business name, DBA, county, operator (owner),
 * and the responsible applicator. There's no phone or address in the
 * source, so Google Places enrichment is required for those.
 */

const COMMERCIAL_BUSINESS_CSV =
 'https://texasagriculture.gov/LinkClick.aspx?fileticket=N-bMaW8S-EM%3d&tabid=1143&portalid=0&mid=5439'

const ENRICH_DELAY_MS = 200

const UA =
 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'

/** TDA category codes → human-readable. Best-guess mapping; "Pest Control"
 *  covers all of them at the lead-source level. */
const CATEGORY_LABELS: Record<string, string> = {
 L: 'Lawn & ornamental',
 W: 'Wood-destroying',
 P: 'Pest general',
 T: 'Termite',
 R: 'Rodent',
 F: 'Fumigation',
 S: 'Structural',
}

async function* runTda(params: ScrapeParams): AsyncGenerator<ScrapeRecord, void, void> {
 const limit = Math.max(1, Math.min(2000, params.limit ?? 100))
 const locationFilter = (params.location || '').trim().toUpperCase()

 let csvText: string
 try {
  const res = await fetch(COMMERCIAL_BUSINESS_CSV, {
   headers: { 'User-Agent': UA, Accept: 'text/csv,*/*' },
  })
  if (!res.ok) {
   logger.error('TDA CSV fetch failed', { status: res.status })
   return
  }
  csvText = await res.text()
 } catch (e) {
  logger.error('TDA CSV fetch threw', { error: e instanceof Error ? e.message : 'Unknown' })
  return
 }

 const rows = parseCsv(csvText)
 if (rows.length === 0) {
  logger.warn('TDA CSV had no rows')
  return
 }

 const enrichEnabled = params.extra?.enrich !== false && isGooglePlacesConfigured()
 let yielded = 0

 for (const r of rows) {
  if (yielded >= limit) break

  // Skip licenses where the expiration date is in the past — we only want
  // active businesses to call.
  const licenseExpired = parseDate(r.LICENSE_EXPIRED)
  if (licenseExpired && licenseExpired.getTime() < Date.now()) continue

  // Location filter — TDA only gives us county, not city.
  if (locationFilter) {
   const county = (r.COUNTY || '').toUpperCase()
   if (!county.includes(locationFilter)) continue
  }

  // Prefer DBA when present (that's the brand they cold-call as);
  // fall back to LEGAL_BUSINESS_NAME.
  const dba = clean(r.DBA)
  const legal = clean(r.LEGAL_BUSINESS_NAME)
  const businessName = dba || legal || 'Unknown'

  const owner = clean(r.OPERATOR)
  const responsible = clean(r.RESPONSIBLE_APPLICATOR)
  // Owner = OPERATOR (running the company); fall back to RESPONSIBLE_APPLICATOR.
  const ownerName = owner || responsible || null

  const categories = (r.CATEGORIES || '')
   .split('')
   .map((c) => CATEGORY_LABELS[c] || c)
   .filter(Boolean)
   .join(', ')

  let record: ScrapeRecord = {
   source: 'tda_pest',
   business_name: businessName,
   owner_name: ownerName,
   business_type: categories ? `Pest Control (${categories})` : 'Pest Control',
   license_no: clean(r.TPCL) || null,
   address: r.COUNTY ? `${r.COUNTY} County` : null,
   state: 'TX',
   raw: r,
  }

  // Google Places fills in phone, website, address, city.
  if (enrichEnabled) {
   try {
    const attempt = await enrichWithGooglePlaces(record.business_name, r.COUNTY)
    if (attempt.ok) {
     record = {
      ...record,
      phone: attempt.data.phone || null,
      website: attempt.data.website || null,
      address: attempt.data.matched_address || record.address,
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

/* ------------------------------ Helpers ------------------------------ */

function clean(s: string | undefined | null): string {
 if (!s) return ''
 return s.trim().replace(/\s+/g, ' ')
}

function parseDate(s: string | undefined | null): Date | null {
 if (!s) return null
 const t = s.trim()
 if (!t) return null
 // CSV uses MM/DD/YYYY
 const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
 if (!m) return null
 const [_, mo, d, y] = m
 const dt = new Date(parseInt(y, 10), parseInt(mo, 10) - 1, parseInt(d, 10))
 return isNaN(dt.getTime()) ? null : dt
}

function parseCsv(text: string): Record<string, string>[] {
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
 // TDA's header has stray spaces around comma separators, e.g. "TPCL, ACCOUNT_TYPE";
 // trim each cell.
 const headers = rows[0].map((h) => h.trim())
 return rows.slice(1).map((cells) => {
  const obj: Record<string, string> = {}
  headers.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim() })
  return obj
 })
}

function sleep(ms: number) {
 return new Promise((r) => setTimeout(r, ms))
}

/* ----------------------------- Source ----------------------------- */

export const tdaPestControl: SourceDefinition = {
 id: 'tda_pest',
 label: 'TDA · Pest control',
 description:
  'Texas Department of Agriculture — Commercial Structural Pest Control Businesses. Owner / business / category come from TDA\'s public CSV. Google Places fills in phone, website, and full address.',
 trade: 'Pest Control',
 run: (params, _opts) => runTda(params),
}
