/**
 * Lead-quality gates for licensing-database scrapers (TDLR / TDA / TSBPE).
 *
 * The licensing data is held by individuals, not businesses, so the raw
 * dump is full of noise: license-holders working as in-house HVAC techs
 * at Motorola, UT Austin, school districts, and so on - none of whom are
 * real contractors we'd cold-call. A second class of noise is the
 * "no company associated" entries where business_name === owner_name.
 *
 * We apply two filters:
 *   1) preFilterContractor()  - cheap, name-based, runs BEFORE the
 *      Google Places call so we don't burn $$ on garbage.
 *   2) googleConfirmsTrade()  - runs AFTER enrichment using Google's
 *      `types` array + name fuzzy-match to validate this is actually
 *      an HVAC / plumbing / pest-control / etc. contractor.
 *
 * Goal: bias hard toward precision (>8/10 are real cold-call targets)
 * even at the cost of recall.
 */

import type { ScrapeRecord } from './types'
import type { PlacesEnrichment } from './google-places'

export type Trade = 'HVAC' | 'Electrical' | 'Plumbing' | 'Pest Control'

/**
 * Patterns in business_name that indicate the entity is NOT a contractor
 * - usually the license holder works there as an employee. Word boundary
 * forced so "STARLIGHT POOL" doesn't get killed by " POOL".
 */
const ENTERPRISE_PATTERNS: RegExp[] = [
  // Government
  /\bCITY OF\b/,
  /\bCOUNTY OF\b/,
  /\bSTATE OF\b/,
  /\bUNITED STATES\b/,
  /\bU\.?S\.? GOVERNMENT\b/,
  /\bDEPARTMENT OF\b/,
  /\bGENERAL LAND OFFICE\b/,
  /\bTEXAS (?:DEPARTMENT|DIVISION|OFFICE|COMMISSION|BOARD|AUTHORITY)\b/,
  /\bFEDERAL\b/,
  /\bMUNICIPAL\b/,

  // Education
  /\bUNIVERSITY OF\b/,
  /\b(?:UT|TEXAS A&M|RICE|BAYLOR|TCU|SMU|TTU)\b/,
  /\bCOLLEGE\b/,
  /\bSCHOOL DISTRICT\b/,
  /\bINDEPENDENT SCHOOL\b/,
  /\bI\.?S\.?D\b/,
  /\bACADEMY\b/,

  // Hospitals / healthcare campuses
  /\bHOSPITAL\b/,
  /\bMEDICAL CENTER\b/,
  /\bHEALTH SYSTEM\b/,

  // Big-co campuses (limited list - the most common offenders)
  /\bMOTOROLA\b/,
  /\bDELL\b/,
  /\bIBM\b/,
  /\bAPPLE\b/,
  /\bMICROSOFT\b/,
  /\bGOOGLE\b/,
  /\bAMAZON\b/,
  /\bMETA\b/,
  /\bTESLA\b/,
  /\bSAMSUNG\b/,
  /\bORACLE\b/,
  /\bINTEL\b/,
  /\bBOEING\b/,
  /\bLOCKHEED\b/,
  /\bRAYTHEON\b/,
  /\bWALMART\b/,
  /\bTARGET CORP\b/,
  /\bCOSTCO\b/,
  /\bWHOLE FOODS\b/,
  /\bHEB\b/,

  // Property / facility management (own their HVAC techs)
  /\bAPARTMENT(?:S)?\b/,
  /\bPROPERTIES\b/,
  /\bMANAGEMENT (?:CO|INC|LLC|LP|GROUP)\b/,
  /\bREAL ESTATE\b/,
  /\bHOTEL\b/,
  /\bRESORT\b/,
  /\bCASINO\b/,

  // Religion
  /\bCHURCH\b/,
  /\bDIOCESE\b/,
  /\bMINISTRIES\b/,
]

const TRADE_KEYWORDS: Record<Trade, RegExp> = {
  HVAC: /\b(AIR|A\/?C|HVAC|HEATING|COOLING|REFRIGER|MECHANICAL|CLIMATE|FURNACE|CHILLER|DUCT)\b/,
  Electrical: /\b(ELECTRIC|ELECTRICAL|VOLTAGE|WIRE|WIRING|LIGHTING|POWER|GENERATOR|SOLAR)\b/,
  Plumbing: /\b(PLUMB|PIPE|DRAIN|SEWER|WATER|LEAK|HYDRO)\b/,
  'Pest Control': /\b(PEST|TERMITE|EXTERMIN|BUG|MOSQUITO|RODENT|WILDLIFE)\b/,
}

/**
 * Map a trade to the Google Places types we'll accept as proof this
 * is the right kind of business. `general_contractor` and
 * `establishment` are very loose - we keep them because Google often
 * tags small contractors that way, but we require the trade keyword
 * in the matched name as the real signal.
 */
const TRADE_PLACES_TYPES: Record<Trade, string[]> = {
  HVAC: [
    'hvac_contractor',
    'air_conditioning_contractor',
    'heating_contractor',
    'general_contractor',
  ],
  Electrical: ['electrician', 'electrical_contractor', 'general_contractor'],
  Plumbing: ['plumber', 'plumbing_contractor', 'general_contractor'],
  'Pest Control': ['pest_control_service'],
}

export type PreFilterReason =
  | 'no_business' // business_name === owner_name
  | 'enterprise' // matches enterprise/gov/edu blocklist
  | null

/** Returns the reason to drop, or null to keep. */
export function preFilterContractor(record: ScrapeRecord): PreFilterReason {
  const biz = (record.business_name || '').trim().toUpperCase()
  const owner = (record.owner_name || '').trim().toUpperCase()
  if (!biz) return 'no_business'

  // Individual license holder, not a real business. The TDLR scraper
  // already maps "(no company associated)" to business_name = owner_name,
  // and many legitimate small businesses are named after the owner so we
  // need a stronger signal: drop only when the business name is just the
  // owner's name with no trade keyword anywhere.
  if (owner && biz === owner) return 'no_business'

  // "FREDY A RODRIGUEZ" - looks like a personal name, no LLC/INC/CO.
  // Person-name heuristic: 2-3 words, no entity suffix, no trade keyword.
  if (looksLikePersonalName(biz)) return 'no_business'

  for (const rx of ENTERPRISE_PATTERNS) {
    if (rx.test(biz)) return 'enterprise'
  }

  return null
}

/**
 * Post-enrichment validation: did Google find this business, and does
 * it look like the right trade? Drops false-positives like Motorola
 * employees whose enrichment matched the corporate office.
 */
export function googleConfirmsTrade(
  record: ScrapeRecord,
  trade: Trade,
  places: PlacesEnrichment | null,
): { ok: true } | { ok: false; reason: string } {
  if (!places) return { ok: false, reason: 'no_google_match' }

  const matched = (places.matched_name || '').toUpperCase()
  const expected = (record.business_name || '').toUpperCase()
  if (!matched) return { ok: false, reason: 'no_google_match' }

  // Fuzzy name match: at least one shared meaningful word (>= 4 chars,
  // ignoring "INC/LLC/CO/THE" boilerplate). Prevents Google from
  // matching "Motorola" → some random place named "Motor Repair".
  const meaningful = (s: string) =>
    s
      .split(/[\s,&\/.\-]+/)
      .map((t) => t.replace(/[^A-Z]/g, ''))
      .filter((t) => t.length >= 4 && !STOP_WORDS.has(t))
  const a = new Set(meaningful(matched))
  const b = meaningful(expected)
  const sharesWord = b.some((w) => a.has(w))
  if (!sharesWord) return { ok: false, reason: 'name_mismatch' }

  // Trade-keyword check: either the matched Google name should contain
  // a trade word, or one of the Place types should be in the allow list.
  const tradeRx = TRADE_KEYWORDS[trade]
  const nameImpliesTrade = tradeRx.test(matched) || tradeRx.test(expected)
  const allowedTypes = TRADE_PLACES_TYPES[trade]
  const typeMatch = (places.google_types || []).some((t) => allowedTypes.includes(t))

  if (!nameImpliesTrade && !typeMatch) {
    return { ok: false, reason: `no_trade_signal (types=${(places.google_types || []).join('|') || 'none'})` }
  }

  return { ok: true }
}

const STOP_WORDS = new Set([
  'INC', 'LLC', 'LTD', 'LP', 'LLP', 'CORP', 'COMPANY', 'CO', 'THE',
  'AND', 'SERVICES', 'SERVICE', 'GROUP', 'ENTERPRISES', 'INDUSTRIES',
  'SOLUTIONS',
])

/**
 * Texas metros mapped to their NANP area codes. Used to drop results
 * whose phone number is in the wrong metro for the requested city -
 * the licensing databases don't enforce a tight city filter, so a
 * search for "Austin" returns Houston/Dallas/SA contractors mixed in.
 */
const METRO_AREA_CODES: Record<string, string[]> = {
  austin:           ['512', '737'],
  'round rock':     ['512', '737'],
  georgetown:       ['512', '737'],
  pflugerville:     ['512', '737'],
  'cedar park':     ['512', '737'],
  'san marcos':     ['512', '737', '830'],
  houston:          ['281', '713', '832', '346', '936'],
  'sugar land':     ['281', '713', '832', '346'],
  pearland:         ['281', '713', '832', '346'],
  conroe:           ['936', '281', '832', '346'],
  dallas:           ['214', '469', '972', '945'],
  plano:            ['214', '469', '972', '945'],
  frisco:           ['214', '469', '972', '945'],
  mckinney:         ['214', '469', '972', '945'],
  garland:          ['214', '469', '972', '945'],
  irving:           ['214', '469', '972', '945'],
  mesquite:         ['214', '469', '972', '945'],
  lewisville:       ['214', '469', '972', '945'],
  denton:           ['940', '214', '469', '972', '945'],
  'fort worth':     ['817', '682'],
  arlington:        ['817', '682', '972', '214'],
  'san antonio':    ['210', '726', '830'],
  'new braunfels':  ['830', '210', '726'],
  'el paso':        ['915'],
  amarillo:         ['806'],
  lubbock:          ['806'],
  midland:          ['432'],
  abilene:          ['325'],
  waco:             ['254'],
  killeen:          ['254'],
  'college station': ['979'],
  beaumont:         ['409'],
  'corpus christi': ['361'],
  laredo:           ['956'],
  tyler:            ['903', '430'],
  longview:         ['903', '430'],
}

/**
 * Returns true when `phone` is in one of the metro area codes for the
 * requested city, OR when we don't have a mapping for that city
 * (we don't want to wrongly drop results just because we're missing
 * coverage). Returns false when we have a mapping AND the phone is
 * clearly somewhere else.
 */
export function phoneMatchesMetro(
  phone: string | null | undefined,
  city: string | null | undefined,
): boolean {
  if (!phone || !city) return true
  const ac = extractAreaCode(phone)
  if (!ac) return true
  const codes = METRO_AREA_CODES[city.trim().toLowerCase()]
  if (!codes) return true
  return codes.includes(ac)
}

function extractAreaCode(phone: string): string | null {
  const digits = phone.replace(/[^0-9]/g, '')
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1, 4)
  if (digits.length === 10) return digits.slice(0, 3)
  return null
}

const PERSONAL_SUFFIX = /\b(JR|SR|II|III|IV)\b/
const ENTITY_SUFFIX = /\b(LLC|INC|LTD|LP|LLP|CORP|CO\.?|COMPANY|GROUP|SERVICES?|ENTERPRISES?|INDUSTRIES|SOLUTIONS|HOLDINGS|PARTNERS|PROPERTIES)\b/

function looksLikePersonalName(biz: string): boolean {
  const upper = biz.toUpperCase().trim()
  if (!upper) return false
  if (ENTITY_SUFFIX.test(upper)) return false
  // Comma form: "LASTNAME, FIRSTNAME" or "RODRIGUEZ, FREDY ANTONIO"
  if (/^[A-Z][A-Z\s\-']+,\s*[A-Z]/.test(upper)) return true
  // Strip personal suffix and check word count
  const cleaned = upper.replace(PERSONAL_SUFFIX, '').replace(/\s+/g, ' ').trim()
  const words = cleaned.split(/\s+/)
  if (words.length === 0 || words.length > 4) return false
  // All words alphabetic + no trade keyword anywhere → likely a person name
  if (!words.every((w) => /^[A-Z\-']+$/.test(w))) return false
  const allTrade = Object.values(TRADE_KEYWORDS)
  if (allTrade.some((rx) => rx.test(upper))) return false
  return words.length <= 3
}
