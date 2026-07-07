/**
 * Tolerant normalizers used by every layer of the scraper pipeline.
 *
 * Why this lives in its own file: phone + website normalization was
 * previously copy-pasted across runner, promote, and each source with
 * subtly different fallbacks. The drift was the root cause of dupes
 * leaking through cross-run dedupe (e.g. a phone with an extension
 * normalized to null in the runner but kept its raw form in promote,
 * so leads.phone stored a value that never re-normalized into the
 * runner's seenPhones set).
 *
 * Single source of truth, generous fallbacks. Better to over-merge
 * borderline matches than under-merge and ship the same lead twice.
 */

/**
 * Phone → '+1XXXXXXXXXX' or null.
 *
 * Rules, in order:
 *   - Strip everything that isn't a digit.
 *   - 10 digits → +1XXXXXXXXXX.
 *   - 11 digits starting with 1 → +1XXXXXXXXXX.
 *   - 11+ digits not starting with 1 OR 12+ digits → take the LAST 10
 *     (covers extensions like "(214) 555-1234 ext 200" and "+44 ..."
 *     style inputs that we still want to fold into a US shape; the
 *     downside of mis-merging two real numbers that share the last 10
 *     digits is negligible for cold-call lead lists).
 *   - Anything else → null.
 */
export function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null
  const digits = String(p).replace(/[^0-9]/g, '')
  if (!digits) return null
  let ten: string | null = null
  if (digits.length === 10) ten = digits
  else if (digits.length === 11 && digits.startsWith('1')) ten = digits.slice(1)
  else if (digits.length >= 11) ten = digits.slice(-10)
  if (!ten) return null
  return isJunkUsNumber(ten) ? null : `+1${ten}`
}

/**
 * Junk-number gate on the bare 10 digits. Rejects shapes that are
 * never real dialable US business numbers, so they can't enter the
 * pipeline and waste a dial:
 *   - NANP violations: area code or exchange starting with 0/1
 *   - all ten digits identical (000..., 555-555-5555, etc.)
 *   - the reserved fictional range 555-01XX
 */
function isJunkUsNumber(ten: string): boolean {
  if (/^([0-9])\1{9}$/.test(ten)) return true
  if (ten[0] === '0' || ten[0] === '1') return true
  if (ten[3] === '0' || ten[3] === '1') return true
  if (ten.slice(3, 8) === '55501') return true
  return false
}

/**
 * Website → 'example.com' or null.
 *
 * Lowercases, drops protocol, drops 'www.', drops trailing slashes /
 * fragments / query strings. Two URLs that point at the same root
 * domain collapse to the same key. Subdomains are preserved (so
 * 'shop.foo.com' and 'foo.com' don't collide).
 */
export function normalizeWebsite(w: string | null | undefined): string | null {
  if (!w) return null
  let s = String(w).trim().toLowerCase()
  if (!s) return null
  s = s.replace(/^https?:\/\//, '')
  s = s.replace(/^www\./, '')
  // Strip path / query / fragment and trailing dots.
  s = s.split(/[/?#]/)[0]
  s = s.replace(/\.+$/, '')
  if (!s || !s.includes('.')) return null
  return s
}

const NAME_SUFFIXES = new Set(['JR', 'SR', 'II', 'III', 'IV', 'V'])

/**
 * Owner/contact name → "First Middle Last Suffix", Title Case.
 *
 * Texas license databases (TDLR HVAC/Electrical) publish names as
 * "LASTNAME, FIRST MIDDLE [SUFFIX]" - straight from a government
 * records list, all caps, last name first. Correct data, unreadable
 * shape: a rep glancing at "VAUGHN, WALTER C JR" sees a comma and 3+
 * tokens and (reasonably) wonders if that's multiple people. This
 * reorders to "Walter C Vaughn Jr" and title-cases everything,
 * including sources (TSBPE, TDA, cold-call entries) that are already
 * in first-name-first order - those just get re-cased, not reordered.
 */
export function normalizeContactName(raw: string | null | undefined): string | null {
  if (!raw) return null
  const t = String(raw).trim().replace(/\s+/g, ' ')
  if (!t) return null

  let nameWords: string[]
  let suffix: string | null = null
  if (t.includes(',')) {
    const [lastPart, restPart = ''] = t.split(',').map((s) => s.trim())
    const restWords = restPart.split(' ').filter(Boolean)
    if (restWords.length) {
      const last = restWords[restWords.length - 1].toUpperCase().replace(/\.$/, '')
      if (NAME_SUFFIXES.has(last)) suffix = last
      if (suffix) restWords.pop()
    }
    nameWords = [...restWords, lastPart]
  } else {
    nameWords = t.split(' ').filter(Boolean)
    if (nameWords.length > 1) {
      const last = nameWords[nameWords.length - 1].toUpperCase().replace(/\.$/, '')
      if (NAME_SUFFIXES.has(last)) { suffix = last; nameWords.pop() }
    }
  }

  const formatted = nameWords.map(titleCaseWord).join(' ').trim()
  if (!formatted) return null
  // Jr/Sr read as Title Case; roman numeral suffixes stay uppercase
  // (titleCaseWord would otherwise mangle "III" into "Iii").
  const suffixOut = suffix === null ? '' : (suffix === 'JR' || suffix === 'SR')
    ? ` ${suffix[0]}${suffix.slice(1).toLowerCase()}`
    : ` ${suffix}`
  return `${formatted}${suffixOut}`
}

/**
 * "MCCANN" -> "McCann", "O'BRIEN" -> "O'Brien", "SMITH-JONES" -> "Smith-Jones",
 * "NIKKI'S" -> "Nikki's" (possessive 's stays lowercase - only a
 * single-letter prefix before the apostrophe, like O'/D'/L', gets the
 * next letter capitalized; anything longer is presumed possessive).
 */
function titleCaseWord(w: string): string {
  let s = w.toLowerCase()
  if (!s) return s
  s = s.charAt(0).toUpperCase() + s.slice(1)
  s = s.replace(/-([a-z])/g, (_, ch) => '-' + ch.toUpperCase())
  if (s.length > 2 && s[1] === "'") {
    s = s[0] + "'" + s[2].toUpperCase() + s.slice(3)
  }
  // "Mc" is unambiguous enough as an Irish/Scottish surname prefix to
  // safely re-capitalize the next letter ("Mccann" -> "McCann").
  // "Mac" is NOT handled - too many ordinary names/words start with it
  // (Macy, Mack, Macon) to guess correctly without a name dictionary.
  s = s.replace(/^(Mc)([a-z])/, (_, p, ch) => p + ch.toUpperCase())
  return s
}

/**
 * Business-name + city composite key, used as a last-resort dedupe when
 * neither phone nor website matched. Lower-case, alphanumeric only.
 */
export function businessNameKey(name: string | null | undefined, city: string | null | undefined): string | null {
  if (!name) return null
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 40)
  if (!n) return null
  const c = (city || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24)
  return c ? `${n}|${c}` : n
}
