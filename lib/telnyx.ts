/**
 * Telnyx API integration for CloudGreet.
 *
 * Hits Telnyx v2 endpoints exclusively. v1 is deprecated and was the
 * source of every silent SMS failure - the old client even fell back
 * to using the connection_id UUID as the `from` phone number, which
 * the API rejects 100% of the time.
 *
 * SMS sends require a real phone number on `from`. There is NO
 * fallback - if you don't pass one, you get a clear error rather
 * than a silent network failure to a bad payload. Call sites must
 * look up the contractor's outbound number from `businesses.phone_number`
 * (or wherever it's stored for that flow) and pass it explicitly.
 *
 * Required env vars for SMS:
 *   TELNYX_API_KEY                  required for everything
 *   TELNYX_MESSAGING_PROFILE_ID     ties outbound sends to the
 *                                   right brand/campaign so carriers
 *                                   route them. Numbers used as `from`
 *                                   must be attached to this profile
 *                                   in the Telnyx dashboard.
 */

import { logger } from '@/lib/monitoring'

const TELNYX_BASE = 'https://api.telnyx.com/v2'

export class TelnyxClient {
  private apiKey: string
  private connectionId: string
  private messagingProfileId: string

  constructor() {
    // Support the legacy typo'd env var name in case prod still sets it
    // that way - don't break existing deployments while we transition.
    this.apiKey = process.env.TELNYX_API_KEY || process.env.TELYNX_API_KEY || ''
    this.connectionId = process.env.TELNYX_SIP_CONNECTION_ID
      || process.env.TELNYX_CONNECTION_ID
      || ''
    this.messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || ''
  }

  /**
   * Send a single SMS via Telnyx /v2/messages.
   *
   * @param to        E.164 destination
   * @param message   message body (carriers cap at ~160 chars per
   *                  segment; over that gets segmented automatically)
   * @param from      E.164 sender number. REQUIRED. Must be a number
   *                  attached to TELNYX_MESSAGING_PROFILE_ID in the
   *                  Telnyx dashboard.
   *
   * Returns the parsed Telnyx response on success. Throws with a
   * descriptive error on failure - callers should catch and decide
   * whether the failure is fatal to their flow.
   */
  async sendSMS(
    to: string,
    message: string,
    from: string,
  ): Promise<{ data: { id: string; to: any; from: any; text: string } }> {
    if (!this.apiKey) throw new Error('TELNYX_API_KEY missing')
    if (!from) throw new Error('sendSMS: `from` (E.164 phone number) is required')
    if (!to) throw new Error('sendSMS: `to` (E.164 phone number) is required')

    const body: Record<string, unknown> = {
      to,
      from,
      text: message,
    }
    // messaging_profile_id is recommended but not strictly required
    // when `from` is on a single profile. Send it when we have one.
    if (this.messagingProfileId) {
      body.messaging_profile_id = this.messagingProfileId
    }

    const res = await fetch(`${TELNYX_BASE}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText)
      logger.warn('Telnyx SMS send failed', {
        status: res.status,
        body: txt.slice(0, 300),
        to: maskPhone(to),
        from,
        has_profile: !!this.messagingProfileId,
      })
      throw new Error(`Telnyx SMS failed (${res.status}): ${txt.slice(0, 200)}`)
    }
    return await res.json()
  }

  /** Search for an available US local DID and order it. */
  async provisionPhoneNumber(areaCode: string) {
    if (!this.apiKey) throw new Error('TELNYX_API_KEY missing')
    const res = await fetch(`${TELNYX_BASE}/number_orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        area_code: areaCode,
        connection_id: this.connectionId || undefined,
      }),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText)
      throw new Error(`Telnyx number_orders failed (${res.status}): ${txt.slice(0, 200)}`)
    }
    return await res.json()
  }

  /** Read a phone number resource. */
  async getPhoneNumber(phoneNumberId: string) {
    if (!this.apiKey) throw new Error('TELNYX_API_KEY missing')
    const res = await fetch(`${TELNYX_BASE}/phone_numbers/${encodeURIComponent(phoneNumberId)}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText)
      throw new Error(`Telnyx getPhoneNumber failed (${res.status}): ${txt.slice(0, 200)}`)
    }
    return await res.json()
  }

  async purchasePhoneNumber(areaCode: string, _businessName: string) {
    try {
      const result = await this.provisionPhoneNumber(areaCode) as any
      return {
        success: true,
        phone_number: result?.data?.phone_numbers?.[0]?.phone_number,
        id: result?.data?.id,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

export function verifyTelnyxSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const crypto = require('crypto')
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex'),
    )
  } catch {
    return false
  }
}

function maskPhone(p: string): string {
  if (!p || p.length < 6) return p
  return `${p.slice(0, 2)}****${p.slice(-2)}`
}

export const telnyxClient = new TelnyxClient()

// Backward compatibility aliases (old code referenced typo'd / mixed casing)
export const telynyxClient = telnyxClient
export const telynyx = telnyxClient
