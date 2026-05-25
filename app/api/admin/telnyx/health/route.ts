import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/telnyx/health
 *
 * Single-shot diagnostic that surfaces everything we'd need to confirm
 * Telnyx is wired correctly:
 *   - Are env vars present?
 *   - What inbound webhook URL should be configured in Telnyx?
 *   - Has anything ever hit our inbound webhook? (proxy: most recent
 *     opt-out events)
 *   - Recent review SMS send failures (cron-side)?
 *
 * Read-only, admin-only. Doesn't make any external API calls so it
 * stays cheap to refresh.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('host') || 'cloudgreet.com'
  const baseUrl = `${proto}://${host}`

  const env = {
    TELNYX_API_KEY: !!process.env.TELNYX_API_KEY,
    TELNYX_PUBLIC_KEY: !!process.env.TELNYX_PUBLIC_KEY,
    TELNYX_MESSAGING_PROFILE_ID: !!process.env.TELNYX_MESSAGING_PROFILE_ID,
    CLOUDGREET_NOTIFICATIONS_FROM: process.env.CLOUDGREET_NOTIFICATIONS_FROM || null,
  }

  // Recent inbound webhook activity (proxy = opt-outs registered).
  // If contractors texted STOP and rows showed up here, we know the
  // sms-webhook URL is reachable from Telnyx. Empty doesn't prove it's
  // broken - just means nobody opted out yet.
  let recentOptOuts: Array<{ phone: string; opted_out_at: string; source: string }> = []
  try {
    const { data } = await supabaseAdmin
      .from('review_opt_outs')
      .select('phone, opted_out_at, source')
      .order('opted_out_at', { ascending: false })
      .limit(10)
    recentOptOuts = (data || []) as any
  } catch { /* table may not exist on a fresh deploy */ }

  // Recent review SMS failures so we know if the cron is hitting Telnyx
  // and getting back errors (would indicate API key / from-number / 10DLC issues).
  let recentFailures: Array<{
    id: string
    business_id: string
    customer_phone: string
    failure_reason: string | null
    updated_at: string
  }> = []
  try {
    const { data } = await supabaseAdmin
      .from('review_requests')
      .select('id, business_id, customer_phone, failure_reason, updated_at')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(10)
    recentFailures = (data || []) as any
  } catch { /* table may not exist */ }

  // Recent successful sends so we can show "yes outbound is working".
  let recentSends: Array<{
    customer_phone: string
    sent_at: string
    telnyx_message_id: string | null
  }> = []
  try {
    const { data } = await supabaseAdmin
      .from('review_requests')
      .select('customer_phone, sent_at, telnyx_message_id')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(10)
    recentSends = (data || []) as any
  } catch { /* ok */ }

  // Pull the messaging profile from Telnyx and surface its currently-
  // configured inbound webhook URL. If this doesn't match
  // expected_webhooks.inbound_sms, STOP keywords will never reach us
  // and opt-outs silently break. Cheap one-shot API call.
  let messaging_profile_state: {
    configured_inbound_url: string | null
    matches_expected: boolean | null
    error: string | null
  } = { configured_inbound_url: null, matches_expected: null, error: null }
  if (process.env.TELNYX_API_KEY && process.env.TELNYX_MESSAGING_PROFILE_ID) {
    try {
      const res = await fetch(
        `https://api.telnyx.com/v2/messaging_profiles/${process.env.TELNYX_MESSAGING_PROFILE_ID}`,
        { headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}` } },
      )
      if (res.ok) {
        const j = await res.json() as any
        const url = j?.data?.webhook_url || null
        messaging_profile_state = {
          configured_inbound_url: url,
          matches_expected: typeof url === 'string'
            && url.replace(/\/$/, '') === `${baseUrl}/api/telnyx/sms-webhook`.replace(/\/$/, ''),
          error: null,
        }
      } else {
        messaging_profile_state.error = `Telnyx returned ${res.status}`
      }
    } catch (e) {
      messaging_profile_state.error = e instanceof Error ? e.message : 'unknown'
    }
  } else {
    messaging_profile_state.error = 'TELNYX_API_KEY or TELNYX_MESSAGING_PROFILE_ID not set'
  }

  return NextResponse.json({
    success: true,
    env,
    expected_webhooks: {
      inbound_sms: `${baseUrl}/api/telnyx/sms-webhook`,
      voice: `${baseUrl}/api/telnyx/voice-webhook`,
    },
    messaging_profile_state,
    activity: {
      recent_opt_outs: recentOptOuts,
      recent_send_failures: recentFailures,
      recent_sends: recentSends,
    },
  })
}
