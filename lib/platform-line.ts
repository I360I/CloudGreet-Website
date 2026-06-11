import { supabaseAdmin } from './supabase'
import { logger } from './monitoring'

/**
 * CloudGreet's own AI receptionist line ("dogfood" tenant).
 *
 * The main CloudGreet number is answered by a Retell agent just like a
 * client's line, but CloudGreet itself never had a businesses row, so
 * every calendar tool resolved to agent_not_linked_to_business and the
 * agent told callers the calendar wasn't loading.
 *
 * ensurePlatformBusiness() self-provisions (and self-heals) that row at
 * call time, copying the demo-calendar credentials from env on the
 * server. Demo bookings land on the same Cal.com event type the website
 * chat uses (CALCOM_DEMO_API_KEY / CALCOM_DEMO_EVENT_TYPE_ID). The row
 * is flagged is_platform so the admin overview/map/finance ignore it,
 * while its calls still show up in the calls feed.
 */

export const PLATFORM_LINE_NUMBER = '+17379370084'
export const PLATFORM_AGENT_ID = 'agent_56d7fa8635fdd5313c99729233'

// Throttle: at most one ensure pass per instance per 10 minutes.
let lastEnsure = 0
const ENSURE_INTERVAL_MS = 10 * 60 * 1000

export function isPlatformLine(agentId?: string | null, toNumber?: string | null): boolean {
  return agentId === PLATFORM_AGENT_ID || toNumber === PLATFORM_LINE_NUMBER
}

export async function ensurePlatformBusiness(): Promise<string | null> {
  try {
    const now = Date.now()
    const skipPatch = now - lastEnsure < ENSURE_INTERVAL_MS

    const { data: existing } = await supabaseAdmin
      .from('businesses')
      .select('id, retell_agent_id, cal_com_api_key, cal_com_event_type_id, calcom_connected')
      .eq('phone_number', PLATFORM_LINE_NUMBER)
      .maybeSingle()

    const demoKey = process.env.CALCOM_DEMO_API_KEY || null
    let demoEventType = Number(process.env.CALCOM_DEMO_EVENT_TYPE_ID) || null
    // Same fallback the website chat uses: no env id -> the 15-minute
    // event type on the demo calendar (or the first one).
    if (!demoEventType && demoKey && !skipPatch && !existing?.cal_com_event_type_id) {
      try {
        const { listEventTypes } = await import('./calcom')
        const types: any[] = await listEventTypes(demoKey)
        const demo = types.find((t) => (t?.lengthInMinutes ?? t?.length) === 15) || types[0]
        if (demo?.id) demoEventType = Number(demo.id)
      } catch (e) {
        logger.warn('platform line: event-type discovery failed', { error: e instanceof Error ? e.message : 'unknown' })
      }
    }

    if (existing?.id) {
      if (!skipPatch) {
        lastEnsure = now
        // Self-heal drift: agent re-link + demo calendar creds from env.
        const patch: Record<string, unknown> = {}
        if (existing.retell_agent_id !== PLATFORM_AGENT_ID) patch.retell_agent_id = PLATFORM_AGENT_ID
        if (demoKey && existing.cal_com_api_key !== demoKey) patch.cal_com_api_key = demoKey
        if (demoEventType && existing.cal_com_event_type_id !== demoEventType) patch.cal_com_event_type_id = demoEventType
        if ((demoKey && demoEventType) && !existing.calcom_connected) patch.calcom_connected = true
        if (Object.keys(patch).length) {
          await supabaseAdmin.from('businesses').update(patch).eq('id', existing.id)
          logger.info('platform line self-healed', { patched: Object.keys(patch).join(',') })
        }
      }
      return existing.id
    }

    lastEnsure = now
    // businesses.owner_id is NOT NULL - own the dogfood row with the
    // first (founding) admin account.
    const { data: adminUser } = await supabaseAdmin
      .from('custom_users')
      .select('id')
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!adminUser?.id) {
      logger.error('platform line provision failed: no admin user to own the row')
      return null
    }
    const { data: created, error } = await supabaseAdmin
      .from('businesses')
      .insert({
        owner_id: adminUser.id,
        business_name: 'CloudGreet',
        business_type: 'SaaS',
        email: 'aedwards4242@gmail.com',
        phone_number: PLATFORM_LINE_NUMBER,
        retell_agent_id: PLATFORM_AGENT_ID,
        city: 'Austin',
        state: 'TX',
        timezone: 'America/Chicago',
        subscription_status: 'active',
        monthly_price_cents: 0,
        onboarding_completed: true,
        is_platform: true,
        calcom_connected: !!(demoKey && demoEventType),
        cal_com_api_key: demoKey,
        cal_com_event_type_id: demoEventType,
      })
      .select('id')
      .single()

    if (error) {
      logger.error('platform line provision failed', { error: error.message })
      return null
    }
    logger.info('platform line provisioned', { businessId: created.id, calcom: !!(demoKey && demoEventType) })
    return created.id
  } catch (e) {
    logger.error('ensurePlatformBusiness threw', { error: e instanceof Error ? e.message : 'unknown' })
    return null
  }
}
