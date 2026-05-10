import { NextRequest } from 'next/server'

/**
 * Cron auth check.
 *
 * Vercel sends `Authorization: Bearer ${CRON_SECRET}` when the env var
 * is configured. If CRON_SECRET is unset (early dev), every cron is
 * publicly callable - so we treat "unset" as deny in production. This
 * matches the policy on the rest of our crons (process-jobs,
 * sales-payouts, telnyx-balance, health-check).
 *
 * Returns null when authorized; otherwise the reason string for the
 * caller to log + 401 with.
 */
export function checkCronAuth(request: NextRequest): null | string {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      return 'CRON_SECRET not configured'
    }
    return null
  }
  if (authHeader !== `Bearer ${cronSecret}`) return 'bad_auth'
  return null
}
