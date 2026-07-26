/**
 * Rep MRR decay model. LIVE - applied to real payouts (owner-approved
 * 2026-07-25; wired in the Stripe webhook's creditRepCommission).
 *
 * The multiplier is a FRACTION OF THE REP'S BASE RATE (50% self-sourced
 * / 25% setter-fed), so decay scales both classes fairly:
 *
 *   0  - 89  days since last NEW close paid → 'full'        (x1.0 of base)
 *   90 - 179 days                           → 'reduced'     (x0.5 - 50%->25%, 25%->12.5%)
 *   180+ days                               → 'transferred' (x0  - clients revert to CG)
 *
 * The clock resets on a close's FIRST payment (a new client's money
 * landing), never on recurring invoices from the existing book -
 * otherwise an old book would keep the clock at 'full' forever. See
 * getRepDecayAnchor(), the single source of truth used by BOTH the
 * dashboard banner and the payout wiring so they can never disagree.
 */

export type DecayTier = 'full' | 'reduced' | 'transferred'

export const DECAY_THRESHOLDS = {
  reducedAfterDays: 90,
  transferAfterDays: 180,
} as const

/** Fraction of the rep's BASE rate earned at each tier. */
export const TIER_MULTIPLIER: Record<DecayTier, number> = {
  full: 1.0,
  reduced: 0.5,
  transferred: 0,
}

export type DecayState = {
  tier: DecayTier
  multiplier: number
  daysSinceLastClose: number
  /** Anchor used for the count - either lastCloseAt or repStartedAt. */
  anchorAt: string
  /** Whether the anchor is the rep's start date (no closes yet) vs a real close. */
  anchorIsStartDate: boolean
  /** ISO date when the next tier change happens, or null if already at floor. */
  nextDropAt: string | null
  /** Days until the next tier change, or null. */
  daysUntilNextDrop: number | null
  /** What the tier becomes at nextDropAt. */
  nextTier: DecayTier | null
}

const DAY_MS = 86_400_000

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function computeDecayState(input: {
  /** ISO of rep's most recent non-cancelled close. Null if never closed. */
  lastCloseAt: string | null
  /** ISO of rep's account creation - used as anchor pre-first-close. */
  repStartedAt: string
  /** Defaults to now - injectable for tests. */
  now?: Date
}): DecayState {
  const now = input.now ?? new Date()
  const anchorIsStartDate = !input.lastCloseAt
  const anchorIso = input.lastCloseAt ?? input.repStartedAt
  const anchor = new Date(anchorIso)

  const daysSince = Math.floor(
    (startOfDay(now).getTime() - startOfDay(anchor).getTime()) / DAY_MS,
  )

  let tier: DecayTier
  let nextTier: DecayTier | null
  let nextDropAt: string | null
  if (daysSince < DECAY_THRESHOLDS.reducedAfterDays) {
    tier = 'full'
    nextTier = 'reduced'
    nextDropAt = addDays(anchorIso, DECAY_THRESHOLDS.reducedAfterDays)
  } else if (daysSince < DECAY_THRESHOLDS.transferAfterDays) {
    tier = 'reduced'
    nextTier = 'transferred'
    nextDropAt = addDays(anchorIso, DECAY_THRESHOLDS.transferAfterDays)
  } else {
    tier = 'transferred'
    nextTier = null
    nextDropAt = null
  }

  const daysUntilNextDrop = nextDropAt
    ? Math.max(
        0,
        Math.ceil((new Date(nextDropAt).getTime() - now.getTime()) / DAY_MS),
      )
    : null

  return {
    tier,
    multiplier: TIER_MULTIPLIER[tier],
    daysSinceLastClose: daysSince,
    anchorAt: anchorIso,
    anchorIsStartDate,
    nextDropAt,
    daysUntilNextDrop,
    nextTier,
  }
}

export function tierLabel(tier: DecayTier): string {
  switch (tier) {
    case 'full':
      return 'Full commission'
    case 'reduced':
      return 'Reduced (half rate)'
    case 'transferred':
      return 'Transferred to CloudGreet'
  }
}

/**
 * The decay clock's single source of truth: the most recent FIRST
 * payment across the rep's closes. Recurring invoices from an existing
 * client do not reset the clock; a new close's first money does.
 * Legacy ledger rows without close_id count via their own earned_at
 * (they were first-invoice rows in practice).
 *
 * Used by /api/sales/decay-status (banner) AND the Stripe webhook's
 * creditRepCommission (real payouts) so the two can never disagree.
 */
export async function getRepDecayAnchor(
  supabase: { from: (t: string) => any },
  repId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('commission_ledger')
    .select('close_id, earned_at')
    .eq('rep_id', repId)
    .order('earned_at', { ascending: true })
  const rows = (data || []) as Array<{ close_id: string | null; earned_at: string }>
  if (rows.length === 0) return null
  const firstPerClose = new Map<string, string>()
  let latest: string | null = null
  for (const r of rows) {
    if (!r.earned_at) continue
    if (r.close_id) {
      if (!firstPerClose.has(r.close_id)) {
        firstPerClose.set(r.close_id, r.earned_at) // rows are ASC: first = first payment
        if (!latest || r.earned_at > latest) latest = r.earned_at
      }
    } else {
      // Legacy row without close attribution - treat as its own event.
      if (!latest || r.earned_at > latest) latest = r.earned_at
    }
  }
  return latest
}
