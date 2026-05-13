import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { parseUsStateFromAddress, timezoneForState } from '@/lib/timezones'

/**
 * Self-heal a business's state + timezone from its address.
 *
 * Rules:
 *  - If state is missing but address can be parsed, fill state.
 *  - If state is now known and timezone is null, fill timezone.
 *  - Never overwrite an existing non-null state or timezone.
 *
 * Safe to call on every read path - no-op when nothing needs fixing.
 * Returns the field(s) that were updated (for logging) or null.
 */
export async function healBusinessTimezone(
 businessId: string,
): Promise<{ state?: string; timezone?: string } | null> {
 const { data: biz } = await supabaseAdmin
  .from('businesses')
  .select('id, state, timezone, address')
  .eq('id', businessId)
  .maybeSingle()
 if (!biz) return null

 const update: Record<string, any> = {}

 let state: string | null = (biz as any).state || null
 if (!state) {
  const parsed = parseUsStateFromAddress((biz as any).address)
  if (parsed) {
   state = parsed
   update.state = parsed
  }
 }

 if (!((biz as any).timezone) && state) {
  const tz = timezoneForState(state)
  if (tz) update.timezone = tz
 }

 if (Object.keys(update).length === 0) return null

 const { error } = await supabaseAdmin
  .from('businesses')
  .update({ ...update, updated_at: new Date().toISOString() })
  .eq('id', businessId)
 if (error) {
  logger.warn('healBusinessTimezone update failed', {
   businessId, error: error.message,
  })
  return null
 }
 return update
}
