import { logger } from '../monitoring'
import { enrichWithGooglePlaces, isGooglePlacesConfigured } from './google-places'
import { preFilterContractor, googleConfirmsTrade, phoneMatchesMetro } from './quality'
import { normalizePhone, normalizeWebsite, businessNameKey } from './normalize'
import type { ScrapeParams, ScrapeRecord, SourceDefinition, SourceRunOpts } from './types'

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
 opts: SourceRunOpts,
): AsyncGenerator<ScrapeRecord, void, void> {
 // Honor the runner's cross-run seen-set so we (a) don't burn Google
 // enrichment budget on contractors that already exist in `leads` and
 // (b) keep paging until we hand the runner `limit` fresh records.
 // Without this, sources that look at TDLR's raw list yielded
 // everything, the runner silently dropped dupes downstream, and the
 // rep got fewer rows than they asked for - a spot wasted.
 const seen = opts.seen
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
 // `strict` (default) drops any row that doesn't survive the quality
 // gates - name-based pre-filter + Google Places trade confirmation.
 // Set extra.quality = 'permissive' to opt out and dump everything.
 const strict = params.extra?.quality !== 'permissive'
 let yielded = 0
 let pageNo = 1
 let droppedPre = 0
 let droppedPost = 0

 // Step 2: parse current page; iterate next pages until we run out or hit limit.
 while (yielded < limit) {
  const rows = parseTdlrListHtml(html)
  if (rows.length === 0) break

  for (const row of rows) {
   if (yielded >= limit) break

   // Some TDLR list pages (electrical) include phone + city + zip directly;
   // others (HVAC) leave them blank. Use whatever the list gave us and
   // fall through to Google Places only for the missing pieces.
   const cityClean = stripTrailingState(row.city)

   let record: ScrapeRecord = {
    source: sourceId,
    business_name: row.business_name || row.owner_name || 'Unknown',
    owner_name: row.owner_name || null,
    business_type: trade,
    license_no: row.license_no || null,
    phone: normalizePhone(row.phone),
    city: cityClean,
    state: 'TX',
    zip: row.zip || null,
    address: row.county ? `${row.county} County` : null,
    raw: row,
   }

   // Pre-filter: drop individual license-holders (no real business) and
   // employees of universities / gov / big-co before we burn $$ on enrichment.
   if (strict) {
    const drop = preFilterContractor(record)
    if (drop) { droppedPre++; continue }
   }

   // Cheap pre-enrichment dedupe: if name+city already matches an
   // existing lead, skip without ever calling Google. Saves API budget
   // when the same TDLR row resurfaces under a slightly different phone.
   if (seen) {
    const nameKey = businessNameKey(record.business_name, record.city)
    if (nameKey && seen.nameKeys.has(nameKey)) { droppedPre++; continue }
   }

   // Always enrich when configured. Even if TDLR already gave us a phone,
   // we want Google's rating + review count so reps can see at a glance
   // whether a lead is worth calling. Cost is ~$0.035/call - bounded by
   // the rep's `limit`.
   let placesData: import('./google-places').PlacesEnrichment | null = null
   let placesError: string | null = null
   if (enrichEnabled) {
    try {
     const attempt = await enrichWithGooglePlaces(
      record.business_name,
      record.city,
     )
     if (attempt.ok) {
      placesData = attempt.data
      // Fill-in-only for phone/website/address. Promote rating + reviews
      // + place_id under the canonical `google_*` keys promote.ts reads
      // so the leads table gets populated for every TDLR-sourced lead.
      record = {
       ...record,
       phone: record.phone || attempt.data.phone || null,
       website: record.website || attempt.data.website || null,
       address: record.address && !record.address.endsWith(' County')
        ? record.address
        : (attempt.data.matched_address || record.address),
       raw: {
        ...row,
        google_places: attempt.data,
        google_rating: attempt.data.rating,
        google_review_count: attempt.data.review_count,
        google_place_id: attempt.data.place_id,
        google_business_status: attempt.data.business_status,
        google_types: attempt.data.google_types,
       },
      }
     } else {
      placesError = attempt.error
      record = {
       ...record,
       raw: { ...row, google_places_error: attempt.error },
      }
     }
     await sleep(ENRICH_DELAY_MS)
    } catch (e) {
     const msg = e instanceof Error ? e.message : 'Unknown'
     placesError = msg
     logger.warn('TDLR enrich failed for row', {
      error: msg, business: record.business_name,
     })
     record = { ...record, raw: { ...row, google_places_error: msg } }
    }
   }

   // Post-filter: trade match via Google. If enrichment hit a hard error
   // (rate limit, etc.) we keep the row rather than wholesale dropping
   // the page. The license database already vouches for the trade, so
   // Google is a second-opinion check.
   if (strict && enrichEnabled && placesData && !placesError) {
    const verdict = googleConfirmsTrade(record, trade, placesData)
    if (!verdict.ok) { droppedPost++; continue }

    // Quality gate: drop dud listings when Google has rated them. We
    // accept anything with no rating yet (legitimately new businesses)
    // but drop sub-3 stars - reps shouldn't waste calls on contractors
    // with documented bad reviews.
    if (placesData.rating !== null && placesData.rating < 3.0) {
     droppedPost++; continue
    }
   }

   // Metro filter - drops Houston/Dallas results when the rep
   // searched "Austin". Only applies if the rep specified a location.
   if (strict && params.location && !phoneMatchesMetro(record.phone, params.location)) {
    droppedPost++
    continue
   }

   // Post-enrichment dedupe: phone/website may have been filled in by
   // Google Places after the pre-check. If any matches the seen set,
   // drop here so the runner's downstream filter doesn't have to (and
   // so our `yielded` count stays honest - we keep paging if needed).
   if (seen) {
    const p = normalizePhone(record.phone)
    if (p && seen.phones.has(p)) { droppedPost++; continue }
    const w = normalizeWebsite(record.website)
    if (w && seen.websites.has(w)) { droppedPost++; continue }
    // Track yielded keys so the in-loop dedupe within this run also
    // catches mid-page collisions.
    if (p) seen.phones.add(p)
    if (w) seen.websites.add(w)
    const nk = businessNameKey(record.business_name, record.city)
    if (nk) seen.nameKeys.add(nk)
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

 if (strict && (droppedPre > 0 || droppedPost > 0)) {
  logger.info('TDLR scrape quality filter', {
   trade, yielded, droppedPre, droppedPost,
   keepRate: yielded / Math.max(1, yielded + droppedPre + droppedPost),
  })
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
 *   [2] name - "LASTNAME, FIRST (BUSINESS NAME)" or "(no company associated)"
 *   [3] city  (often blank)
 *   [4] zip   (often blank)
 *   [5] county
 *   [6] phone (often blank - not exposed publicly by TDLR)
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

/**
 * HVAC list rows show "LASTNAME, FIRST (BUSINESS NAME)" - owner outside,
 * business in parens.
 *
 * Electrical list rows show only the business name with no parens. There's
 * no owner exposed publicly for electrical contractors, so owner_name is
 * left null and the operator can decide whether to enrich another way.
 */
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
 // No parens - TDLR didn't expose an owner name for this row.
 return { owner_name: null, business_name: t }
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

/** TDLR's electrical list cells append the state, e.g. "AUSTIN TX". */
function stripTrailingState(city: string | null): string | null {
 if (!city) return null
 const t = city.trim()
 if (!t) return null
 return t.replace(/\s+TX$/i, '').trim() || null
}

/* ------------------------ Source definitions ------------------------ */

export const tdlrHvac: SourceDefinition = {
 id: 'tdlr_hvac',
 label: 'TDLR · HVAC contractors',
 description:
  'Licensed Texas HVAC contractors with owner name and license number from TDLR, cross-referenced with Google for current phone, website, star rating, and review count. Sub-3-star shops dropped automatically.',
 trade: 'HVAC',
 run: (params, opts) => runTdlr('HVAC', params, opts),
}

export const tdlrElectrical: SourceDefinition = {
 id: 'tdlr_electrical',
 label: 'TDLR · Electrical contractors',
 description:
  'Licensed Texas electricians from TDLR (license + business + city), enriched with Google phone, website, star rating, and review count. Sub-3-star shops dropped automatically.',
 trade: 'Electrical',
 run: (params, opts) => runTdlr('Electrical', params, opts),
}
