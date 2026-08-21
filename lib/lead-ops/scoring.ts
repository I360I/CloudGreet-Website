/**
 * Lead Quality System - the single source of truth for lead tiers & scores.
 *
 * Doctrine (owner-ratified 2026-08-20): we sell to businesses that are BUSY
 * BUT LEAKING calls, not businesses winning at phones. Every lead gets a tier
 * (who should dial it and when) and a score (ordering within tier). Queues are
 * built ONLY from tiered leads, best-first. 'excluded' never reaches a rep.
 *
 * Tiers, best to worst:
 *  platinum  - a Google review literally complains about unanswered phones
 *              (mined via Places Details; the opener is in the notes)
 *  cell      - verified, DNC-clean owner mobile/direct line in hand
 *  prime     - the pain band: 3.3-4.4 stars with real review volume (5-300)
 *  standard  - real trades business, but no strain signal (unknown rating, or
 *              low-rated-but-alive)
 *  low       - polished 4.5+ shops (they answer their phones) and <5-review
 *              hobbyists; dial only when everything else is exhausted
 *  excluded  - franchises, closed businesses, invalid phones, QA-demoted
 *              numbers, DNC'd - NEVER assigned
 *
 * Recompute: scripts/rescore-leads.mts (nightly via GitHub Actions + after
 * any enrichment batch). Changing weights here re-tiers the whole pool.
 */

export const FRANCHISE_RX = /roto.?rooter|mr\.?\s?(rooter|electric|handyman|appliance)|mister sparky|benjamin franklin|one hour (heating|air)|ars[\s-]|rescue rooter|aire serv|service experts|horizon services|john moore|abacus|milestone (electric|plumb|hvac)|radiant plumbing|jon wayne|goettl|parker (&|and) sons|orkin|terminix|aptive|rentokil|ehrlich|trugreen|moxie pest|hawx|servicemaster|servpro|stanley steemer|neighborly|baker brothers|berkeys|any hour|1.?800|precision (door|garage)|lowe'?s|home depot/i

export const TRADES_RX = /hvac|heating|plumb|electric|roof|paint|remodel|landscap|garage|pest|clean|locksmith|septic|tow|restoration/i

export type LeadTier = 'platinum' | 'cell' | 'prime' | 'standard' | 'low' | 'excluded'

export type ScorableLead = {
  business_name?: string | null
  business_type?: string | null
  phone?: string | null
  state?: string | null
  contact_name?: string | null
  email?: string | null
  notes?: string | null
  google_rating?: number | null
  google_review_count?: number | null
  google_business_status?: string | null
}

const digits = (p: unknown) => String(p ?? '').replace(/\D/g, '')

export function scoreLead(l: ScorableLead): { tier: LeadTier; score: number } {
  const notes = l.notes || ''
  const rating = l.google_rating ?? null
  const reviews = l.google_review_count ?? 0
  const phoneLen = digits(l.phone).length

  // ---- hard exclusions ----
  if (
    FRANCHISE_RX.test(l.business_name || '') ||
    l.google_business_status === 'CLOSED_PERMANENTLY' ||
    (phoneLen !== 10 && phoneLen !== 11) ||
    /DO NOT DIAL/.test(notes)
  ) {
    return { tier: 'excluded', score: 0 }
  }

  // ---- score: ordering within tier ----
  let score = 0
  if (l.contact_name) score += 30           // we know who to ask for
  if (l.email) score += 15
  if (/OWNER \(TDLR license\)|TDLR-name/.test(notes)) score += 15 // LEGAL owner name (best trace input)
  if (l.state === 'TX' || l.state === 'OH' || l.state === 'MI') score += 10 // active dial territories
  if (TRADES_RX.test(l.business_type || '')) score += 10
  score += Math.min(25, Math.round(reviews / 8)) // volume proxy (capped)
  if (rating !== null && rating >= 3.3 && rating <= 4.4) score += 40 // the pain band
  if (rating !== null && rating >= 4.5) score -= 40                  // polished = low pain

  // ---- tiers (first match wins) ----
  const hasCleanNumber =
    /TRACED OWNER CELL|TDLR OWNER PHONE/.test(notes) &&
    !/DISCONNECTED per verify|QA demoted/.test(notes)

  if (/PHONE-PAIN REVIEW/.test(notes)) return { tier: 'platinum', score: score + 200 }
  if (hasCleanNumber) return { tier: 'cell', score: score + 100 }
  if (rating !== null && rating >= 3.3 && rating <= 4.4 && reviews >= 5 && reviews <= 300)
    return { tier: 'prime', score }
  if (reviews < 5) return { tier: 'low', score: score - 20 } // hobbyist
  if (rating !== null && rating >= 4.5) return { tier: 'low', score }
  return { tier: 'standard', score }
}

/** Numeric rank for queue ordering (higher dials first). */
export const TIER_RANK: Record<LeadTier, number> = {
  platinum: 5, cell: 4, prime: 3, standard: 2, low: 1, excluded: 0,
}
