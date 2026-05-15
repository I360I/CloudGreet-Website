/**
 * Tiny TTL cache for Cal.com slot lookups.
 *
 * Goal: avoid the 1-2s "let me check… [silence] still there?" gap when
 * the agent calls lookup_availability mid-conversation. We prewarm
 * the cache at call_inbound (which fires *before* the agent greets,
 * so latency is hidden) and read from it during the call.
 *
 * Storage is the existing cloudgreet_system_config k/v table so we
 * don't add new infra. Each row is keyed by businessId; the value is
 * the slot bundle plus a fetched_at timestamp. TTL is 60s - short
 * enough that a slot booked elsewhere doesn't sit stale for long, long
 * enough to cover the typical "you mention a time -> agent checks"
 * window inside a single call.
 *
 * Cache misses just fall through to a live Cal.com fetch (the agent
 * pays the latency in that case). Failures here are non-fatal -
 * lookup_availability always has the live API as a fallback.
 */

import { supabaseAdmin } from './supabase'
import { logger } from './monitoring'

const TTL_MS = 60_000
const KEY_PREFIX = 'slot_cache:'

export type SlotCacheValue = {
  slots: string[]
  slots_display: string[]
  timezone: string
  fetched_at: number
  source: 'calcom' | 'local' | 'fallback'
  /** Cache scope - 'week' for the multi-day prewarm, or a YYYY-MM-DD date. */
  scope: string
  /**
   * UTC ISO range the cache actually covers. Without this the reader
   * has no way to tell "I have data and there's nothing on that day"
   * apart from "the date is outside what I fetched" - which was the
   * exact bug that made the agent confidently report "no slots" for
   * any date past the prewarm horizon.
   */
  coverage_start_iso?: string
  coverage_end_iso?: string
}

function key(businessId: string, scope: string): string {
  return `${KEY_PREFIX}${businessId}:${scope}`
}

export async function readSlotCache(
  businessId: string,
  scope: string,
): Promise<SlotCacheValue | null> {
  try {
    const { data } = await supabaseAdmin
      .from('cloudgreet_system_config')
      .select('value')
      .eq('key', key(businessId, scope))
      .maybeSingle()
    const v = (data as any)?.value as SlotCacheValue | null
    if (!v || typeof v.fetched_at !== 'number') return null
    if (Date.now() - v.fetched_at > TTL_MS) return null
    return v
  } catch (e) {
    logger.warn('readSlotCache failed', {
      businessId, error: e instanceof Error ? e.message : 'Unknown',
    })
    return null
  }
}

export async function writeSlotCache(
  businessId: string,
  scope: string,
  value: Omit<SlotCacheValue, 'fetched_at'>,
): Promise<void> {
  try {
    const fullValue: SlotCacheValue = { ...value, fetched_at: Date.now() }
    await supabaseAdmin
      .from('cloudgreet_system_config')
      .upsert({
        key: key(businessId, scope),
        value: fullValue,
        updated_at: new Date().toISOString(),
      })
  } catch (e) {
    logger.warn('writeSlotCache failed', {
      businessId, error: e instanceof Error ? e.message : 'Unknown',
    })
  }
}

/**
 * Invalidate after a successful booking - the slot we just took
 * shouldn't show as available on the next call's lookup. Best effort:
 * we just delete every cached scope for the business.
 */
export async function invalidateSlotCache(businessId: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('cloudgreet_system_config')
      .delete()
      .like('key', `${KEY_PREFIX}${businessId}:%`)
  } catch (e) {
    logger.warn('invalidateSlotCache failed', {
      businessId, error: e instanceof Error ? e.message : 'Unknown',
    })
  }
}
