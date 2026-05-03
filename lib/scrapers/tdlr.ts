import { logger } from '../monitoring'
import { enrichWithGooglePlaces, isGooglePlacesConfigured } from './google-places'
import type { ScrapeParams, ScrapeRecord, SourceDefinition } from './types'

/**
 * Texas Department of Licensing and Regulation public license search.
 *
 *   POST https://www.tdlr.texas.gov/LicenseSearch/SearchResultsListBrowse.asp?from=search
 *   form: tdlr_status=<code> (AIRREF for HVAC, ELCTRC for Electrical)
 *
 * Pagination is server-side and stateful (uses session cookies):
 *   GET  ...?pageNo=N&pageDir=N&k=1&j=<offset>
 *
 * The list view exposes: license #, owner + business name (parens),
 * city, zip, county. Phone is NOT exposed publicly anywhere on TDLR,
 * so we cross-reference with Google Places to fill in phone + website.
 */

const BASE = 'https://www.tdlr.texas.gov/LicenseSearch'
const SEARCH_URL = `${BASE}/SearchResultsListBrowse.asp?from=search`
const PAGE_SIZE = 25
const PAGE_DELAY_MS = 1500
const ENRICH_DELAY_MS = 200

type TdlrTrade = 'HVAC' | 'Electrical'

const STATUS_CODE: Record<TdlrTrade, string> = {
 HVAC: 'AIRREF',
 Electrical: 'ELCTRC',
}

async function* runTdlr(
 trade: TdlrTrade,
 params: ScrapeParams,
): AsyncGenerator<ScrapeRecord, void, void> {
 const sourceId = trade === 'HVAC' ? 'tdlr_hvac' : 'tdlr_electrical'
 const limit = Math.max(1, Math.min(2000, params.limit ?? 100))

 // Step 1: POST the initial search to establish a session and get page 1.
 const cookieJar: string[] = []
 let html: string

 try {
  const formBody = new URLSearchParams({
   tdlr_status: STATUS_CODE[trade],
   pht_lic: '',
   pht_oth_name: '',
   phy_city: params.location || '',
   phy_cnty: '',
   phy_zip: '',
   pht_sort_field: '',
   pht_search_type: 'ANY',
  })
  const res = await fetch(SEARCH_URL, {
   method: 'POST',
   headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'CloudGreetLeadScraper/1.0 (+https://cloudgreet.com)',
    Accept: 'text/html',
   },
   body: formBody.toString(),
   redirect: 'follow',
  })
  // Capture cookies for paginated GETs
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) cookieJar.push(...setCookie.split(/,(?=[^;]+=)/g).map((c) => c.split(';')[0].trim()))
  html = await res.text()
 } catch (e) {
  logger.error('TDLR initial search failed', {
   error: e instanceof Error ? e.message : 'Unknown', trade,
  })
  return
 }

 const enrichEnabled = params.extra?.enrich !== false && isGooglePlacesConfigured()
 let yielded = 0
 let pageNo = 1

 // Step 2: parse current page; iterate next pages until we run out or hit limit.
 while (yielded < limit) {
  const rows = parseTdlrListHtml(html)
  if (rows.length === 0) break

  for (const row of rows) {
   if (yielded >= limit) break

   let record: ScrapeRecord = {
    source: sourceId,
    business_name: row.business_name || row.owner_name || 'Unknown',
    owner_name: row.owner_name || null,
    business_type: trade,
    license_no: row.license_no || null,
    city: row.city || null,
    state: 'TX',
    zip: row.zip || null,
    address: row.county ? `${row.county} County` : null,
    raw: row,
   }

   if (enrichEnabled) {
    try {
     const attempt = await enrichWithGooglePlaces(
      record.business_name,
      record.city,
     )
     if (attempt.ok) {
      record = {
       ...record,
       phone: attempt.data.phone || null,
       website: attempt.data.website || null,
       address: attempt.data.matched_address || record.address,
       raw: { ...row, google_places: attempt.data },
      }
     } else {
      // Persist the error onto the row so the operator can see why a
      // record didn't get enriched, instead of guessing why phone is empty.
      record = {
       ...record,
       raw: { ...row, google_places_error: attempt.error },
      }
     }
     await sleep(ENRICH_DELAY_MS)
    } catch (e) {
     const msg = e instanceof Error ? e.message : 'Unknown'
     logger.warn('TDLR enrich failed for row', {
      error: msg, business: record.business_name,
     })
     record = { ...record, raw: { ...row, google_places_error: msg } }
    }
   }

   yield record
   yielded++
  }

  if (rows.length < PAGE_SIZE) break // last page

  // Fetch next page using cookies
  pageNo += 1
  const nextOffset = (pageNo - 1) * PAGE_SIZE + 1
  const url = `${BASE}/SearchResultsListBrowse.asp?pageNo=${pageNo}&pageDir=N&k=1&j=${nextOffset}`
  await sleep(PAGE_DELAY_MS)

  try {
   const res = await fetch(url, {
    method: 'GET',
    headers: {
     'User-Agent': 'CloudGreetLeadScraper/1.0 (+https://cloudgreet.com)',
     Accept: 'text/html',
     ...(cookieJar.length ? { Cookie: cookieJar.join('; ') } : {}),
    },
   })
   if (!res.ok) break
   const setCookie = res.headers.get('set-cookie')
   if (setCookie) cookieJar.push(...setCookie.split(/,(?=[^;]+=)/g).map((c) => c.split(';')[0].trim()))
   html = await res.text()
  } catch (e) {
   logger.warn('TDLR pagination failed', {
    error: e instanceof Error ? e.message : 'Unknown', pageNo,
   })
   break
  }
 }
}

/* --------------------------- HTML parsing --------------------------- */

type TdlrRow = {
 license_no: string | null
 expiration_date: string | null
 owner_name: string | null
 business_name: string | null
 city: string | null
 zip: string | null
 county: string | null
 phone: string | null
}

/**
 * TDLR's result page is malformed: each result row opens with <tr> but
 * never closes one before the next row's <tr>. So we split on <tr>,
 * keep chunks that contain a SearchResultDetail link (the per-row anchor),
 * and pull cells from each chunk.
 *
 * Each row exposes 7 cells in order:
 *   [0] license #
 *   [1] expiration date (sometimes followed by "Expired" or "Ren process")
 *   [2] name — "LASTNAME, FIRST (BUSINESS NAME)" or "(no company associated)"
 *   [3] city  (often blank)
 *   [4] zip   (often blank)
 *   [5] county
 *   [6] phone (often blank — not exposed publicly by TDLR)
 */
function parseTdlrListHtml(html: string): TdlrRow[] {
 const out: TdlrRow[] = []

 const chunks = html.split(/<tr\b[^>]*>/i)
 for (const chunk of chunks) {
  // Only rows that link to a license-detail page are real result rows.
  const linkMatch = chunk.match(/<A[^>]*href="SearchResultDetail\.asp\?[^"]*"[^>]*>([^<]+)<\/A>/i)
  if (!linkMatch) continue

  const cells: string[] = []
  const cellRx = /<td\b[^>]*>([\s\S]*?)<\/td>/gi
  let c: RegExpExecArray | null
  while ((c = cellRx.exec(chunk)) !== null) {
   cells.push(textFromHtml(c[1]))
  }
  if (cells.length < 3) continue // header/spacer row

  const licenseNo = stripWhitespace(linkMatch[1]) || cells[0] || null
  const expRaw = cells[1] || ''
  const expDate =
   expRaw
    .replace(/Expired/gi, '')
    .replace(/Ren process/gi, '')
    .trim() || null
  const { owner_name, business_name } = splitNameAndBusiness(cells[2] || '')

  out.push({
   license_no: licenseNo,
   expiration_date: expDate,
   owner_name,
   business_name,
   city: cells[3]?.trim() || null,
   zip: cells[4]?.trim() || null,
   county: cells[5]?.trim() || null,
   phone: cells[6]?.trim() || null,
  })
 }
 return out
}

/** "ANDERSON, ORIN RAE (MLN COMPANY)" → owner / business split. */
function splitNameAndBusiness(raw: string): { owner_name: string | null; business_name: string | null } {
 const t = raw.trim()
 if (!t) return { owner_name: null, business_name: null }
 const m = t.match(/^([^()]+)\s*\(([^)]*)\)\s*$/)
 if (m) {
  const owner = m[1].trim()
  const biz = m[2].trim()
  if (/no company associated/i.test(biz)) {
   return { owner_name: owner, business_name: owner }
  }
  return { owner_name: owner, business_name: biz || owner }
 }
 // No parens — treat whole thing as owner.
 return { owner_name: t, business_name: t }
}

function textFromHtml(html: string): string {
 return decodeEntities(
  html
   .replace(/<\/?[^>]+>/g, ' ')
   .replace(/&nbsp;/g, ' ')
   .replace(/\s+/g, ' ')
   .trim(),
 )
}

function decodeEntities(s: string): string {
 return s
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(parseInt(d, 10)))
}

function stripWhitespace(s: string): string {
 return s.replace(/\s+/g, ' ').trim()
}

function sleep(ms: number) {
 return new Promise((r) => setTimeout(r, ms))
}

/* ------------------------ Source definitions ------------------------ */

export const tdlrHvac: SourceDefinition = {
 id: 'tdlr_hvac',
 label: 'TDLR · HVAC contractors',
 description:
  'Texas Department of Licensing and Regulation — Air Conditioning Contractors. Owner name + business + license + city. Phone & website filled in via Google Places enrichment.',
 trade: 'HVAC',
 run: (params, _opts) => runTdlr('HVAC', params),
}

export const tdlrElectrical: SourceDefinition = {
 id: 'tdlr_electrical',
 label: 'TDLR · Electrical contractors',
 description:
  'Texas Department of Licensing and Regulation — Electricians. Owner name + business + license + city. Phone & website filled in via Google Places enrichment.',
 trade: 'Electrical',
 run: (params, _opts) => runTdlr('Electrical', params),
}
