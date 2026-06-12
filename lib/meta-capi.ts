import { createHash } from 'crypto'
import { logger } from '@/lib/monitoring'

/**
 * Meta Conversions API - server-side mirror of pixel events so ad-blockers
 * and Safari ITP don't blind the account. No-op unless both
 * NEXT_PUBLIC_META_PIXEL_ID and META_CAPI_ACCESS_TOKEN are set.
 *
 * Pass the same eventId the browser used with fbq() and Meta dedupes the
 * pair into one conversion.
 */

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''
const TOKEN = process.env.META_CAPI_ACCESS_TOKEN || ''

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export async function metaServerEvent(opts: {
  eventName: string
  eventId?: string
  sourceUrl?: string
  phone?: string | null
  clientIp?: string | null
  userAgent?: string | null
  fbp?: string | null
  fbc?: string | null
  customData?: Record<string, any>
}) {
  if (!PIXEL_ID || !TOKEN) return
  try {
    const userData: Record<string, any> = {}
    const digits = (opts.phone || '').replace(/\D/g, '')
    if (digits.length >= 10) userData.ph = [sha256(digits.length === 10 ? `1${digits}` : digits)]
    if (opts.clientIp) userData.client_ip_address = opts.clientIp
    if (opts.userAgent) userData.client_user_agent = opts.userAgent
    if (opts.fbp) userData.fbp = opts.fbp
    if (opts.fbc) userData.fbc = opts.fbc

    const body = {
      data: [{
        event_name: opts.eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: opts.sourceUrl || 'https://cloudgreet.com',
        ...(opts.eventId ? { event_id: opts.eventId } : {}),
        user_data: userData,
        ...(opts.customData ? { custom_data: opts.customData } : {}),
      }],
    }
    const r = await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) logger.warn('meta capi: non-ok', { status: r.status, body: (await r.text()).slice(0, 300) })
  } catch (e) {
    logger.warn('meta capi: failed', { error: e instanceof Error ? e.message : 'unknown' })
  }
}
