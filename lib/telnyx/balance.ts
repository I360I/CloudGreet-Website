/**
 * Telnyx account balance lookup.
 *
 * GET /v2/balance returns the current pre-paid credit balance and
 * pending charges. We use it to warn admin when running low on
 * credits so a number-order or call doesn't fail mid-flow.
 *
 * Note: Telnyx also supports auto-recharge in their dashboard
 * (Settings → Billing → Auto-recharge). That's the actual fix - this
 * cron is a backup notification in case the auto-recharge fails or
 * was never enabled.
 */

import { logger } from '@/lib/monitoring'

export type TelnyxBalance = {
  balance: number      // dollars (parsed from string)
  currency: string     // 'USD'
  credit_limit: number // dollars
  pending_amount: number // unbilled usage
}

export async function getTelnyxBalance(): Promise<TelnyxBalance | null> {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return null

  try {
    const r = await fetch('https://api.telnyx.com/v2/balance', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!r.ok) {
      logger.warn('telnyx balance lookup failed', { status: r.status })
      return null
    }
    const j = await r.json().catch(() => null) as any
    const d = j?.data
    if (!d) return null
    return {
      balance: parseFloat(d.balance || '0'),
      currency: d.currency || 'USD',
      credit_limit: parseFloat(d.credit_limit || '0'),
      pending_amount: parseFloat(d.pending_amount || '0'),
    }
  } catch (e) {
    logger.warn('telnyx balance lookup threw', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return null
  }
}
