/**
 * Rep MRR decay model.
 *
 * Reps earn 50% of MRR on every active client by default. If a rep goes
 * too long without landing a new close, that share decays:
 *
 *   0  - 89  days since last close → 'full'        (50% MRR - the standard share)
 *   90 - 179 days                  → 'reduced'     (25%)
 *   180+ days                      → 'transferred' (0%; clients revert to CG)
 *
 * Any close (status != 'cancelled' / 'rejected') resets the clock.
 *
 * This module is pure: it reads `lastCloseAt` (or null if the rep has
 * never closed) and returns a snapshot. It does NOT mutate the DB or
 * apply the multiplier to commission_ledger - that wiring is intentionally
 * separate so we can ship the visibility UI first and review the
 * commission math before flipping it on.
 */

export type DecayTier = 'full' | 'reduced' | 'transferred'

export const DECAY_THRESHOLDS = {
  reducedAfterDays: 90,
  transferAfterDays: 180,
} as const

/** Absolute share of MRR earned by the rep at each tier. */
export const TIER_MULTIPLIER: Record<DecayTier, number> = {
  full: 0.5,
  reduced: 0.25,
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
      return 'Full commission (50%)'
    case 'reduced':
      return 'Reduced (25%)'
    case 'transferred':
      return 'Transferred to CloudGreet'
  }
}
