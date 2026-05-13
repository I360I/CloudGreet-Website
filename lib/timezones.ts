/**
 * US state → IANA timezone mapping for autodetecting business TZ from
 * the scraped address. Covers all 50 states + DC. Multi-zone states
 * (TN, KY, FL, IN, ND, SD, NE, KS, TX, OR, ID) resolve to the dominant
 * zone for the largest metro - accurate for >90% of contractors and
 * always correctable via an explicit `businesses.timezone` override.
 */

const STATE_TZ: Record<string, string> = {
  AL: 'America/Chicago',
  AK: 'America/Anchorage',
  AZ: 'America/Phoenix',
  AR: 'America/Chicago',
  CA: 'America/Los_Angeles',
  CO: 'America/Denver',
  CT: 'America/New_York',
  DE: 'America/New_York',
  DC: 'America/New_York',
  FL: 'America/New_York', // most of FL; panhandle is Chicago
  GA: 'America/New_York',
  HI: 'Pacific/Honolulu',
  ID: 'America/Boise',
  IL: 'America/Chicago',
  IN: 'America/Indiana/Indianapolis',
  IA: 'America/Chicago',
  KS: 'America/Chicago',
  KY: 'America/New_York', // eastern KY; western is Chicago
  LA: 'America/Chicago',
  ME: 'America/New_York',
  MD: 'America/New_York',
  MA: 'America/New_York',
  MI: 'America/Detroit',
  MN: 'America/Chicago',
  MS: 'America/Chicago',
  MO: 'America/Chicago',
  MT: 'America/Denver',
  NE: 'America/Chicago',
  NV: 'America/Los_Angeles',
  NH: 'America/New_York',
  NJ: 'America/New_York',
  NM: 'America/Denver',
  NY: 'America/New_York',
  NC: 'America/New_York',
  ND: 'America/Chicago',
  OH: 'America/New_York',
  OK: 'America/Chicago',
  OR: 'America/Los_Angeles',
  PA: 'America/New_York',
  RI: 'America/New_York',
  SC: 'America/New_York',
  SD: 'America/Chicago',
  TN: 'America/Chicago', // dominant; eastern TN is New_York
  TX: 'America/Chicago', // dominant; El Paso is Denver
  UT: 'America/Denver',
  VT: 'America/New_York',
  VA: 'America/New_York',
  WA: 'America/Los_Angeles',
  WV: 'America/New_York',
  WI: 'America/Chicago',
  WY: 'America/Denver',
}

/**
 * Resolve a business's timezone from whatever signal is strongest:
 *  - explicit `businesses.timezone` (manual admin override)
 *  - state lookup (most common path - scrape gives us state)
 *  - last-resort default America/Chicago (broadly central-US)
 */
export function resolveBusinessTimezone(opts: {
  explicit?: string | null
  state?: string | null
}): string {
  if (opts.explicit && typeof opts.explicit === 'string') return opts.explicit
  if (opts.state) {
    const code = opts.state.trim().toUpperCase().slice(0, 2)
    const tz = STATE_TZ[code]
    if (tz) return tz
  }
  return 'America/Chicago'
}

export function timezoneForState(state: string | null | undefined): string | null {
  if (!state) return null
  const code = state.trim().toUpperCase().slice(0, 2)
  return STATE_TZ[code] || null
}

/**
 * Parse a US two-letter state code from a free-text address.
 * Recognises the standard "..., City, ST [ZIP]" tail. Returns the
 * uppercase code or null when nothing matches.
 *
 *   parseUsStateFromAddress('1234 Main St, Houston, TX 77001') => 'TX'
 *   parseUsStateFromAddress('5 Pine Rd, Brooklyn NY')           => 'NY'
 *   parseUsStateFromAddress('Mexico City, Mexico')              => null
 */
export function parseUsStateFromAddress(address: string | null | undefined): string | null {
  if (!address || typeof address !== 'string') return null
  // Match a 2-letter state followed by optional 5/9 digit ZIP at end-of-string.
  // Allow comma or whitespace separator. Anchored to the end so we don't pick
  // up letters in street/city names by accident.
  const m = address.match(/[,\s]([A-Z]{2})(?:[,\s]+\d{5}(?:-\d{4})?)?\s*$/i)
  if (!m) return null
  const code = m[1].toUpperCase()
  return STATE_TZ[code] ? code : null
}

