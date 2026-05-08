import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { logger } from '@/lib/monitoring'
import { getTelnyxBalance } from '@/lib/telnyx/balance'
import { postToSlack } from '@/lib/notifications/slack'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/cron/telnyx-balance
 *
 * Runs daily. If our Telnyx pre-paid balance is below the threshold,
 * pings Slack + emails FOUNDER_EMAIL so admin can top up before a
 * number-order or call fails.
 *
 * Optional query params (admin-friendly manual run):
 *   ?threshold=10        override the default $5 threshold
 *   ?force=1             notify even when balance is healthy
 *
 * Telnyx also has a built-in auto-recharge in their dashboard
 * (Settings → Billing → Auto-recharge). This cron is the backup in
 * case auto-recharge fails or wasn't enabled.
 *
 * Auth: Vercel sets `Authorization: Bearer ${CRON_SECRET}` when set.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const url = new URL(request.url)
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  // Manual triggers from a logged-in admin in the browser bypass the
  // bearer check; cron callers must pass it.
  if (cronSecret && !isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threshold = parseFloat(url.searchParams.get('threshold') || '5')
  const force = url.searchParams.get('force') === '1'

  const balance = await getTelnyxBalance()
  if (!balance) {
    return NextResponse.json({
      success: false,
      error: 'Could not read Telnyx balance (check TELNYX_API_KEY)',
    }, { status: 500 })
  }

  const isLow = balance.balance < threshold
  const shouldNotify = isLow || force

  let slackSent = false
  let emailSent = false

  if (shouldNotify) {
    const subject = isLow
      ? `Telnyx balance low: $${balance.balance.toFixed(2)}`
      : `Telnyx balance OK: $${balance.balance.toFixed(2)}`
    const body = [
      isLow
        ? `Telnyx pre-paid balance dropped to $${balance.balance.toFixed(2)} (threshold $${threshold.toFixed(2)}).`
        : `Telnyx balance check (forced).`,
      ``,
      `Balance:        $${balance.balance.toFixed(2)} ${balance.currency}`,
      `Credit limit:   $${balance.credit_limit.toFixed(2)}`,
      `Pending usage:  $${balance.pending_amount.toFixed(2)}`,
      ``,
      isLow
        ? `Top up at https://portal.telnyx.com/#/app/billing or enable auto-recharge in Settings → Billing.`
        : `No action needed.`,
    ].join('\n')

    const slack = await postToSlack({
      text: `:warning: ${subject}\n${body}`,
    })
    slackSent = slack.sent

    const resendKey = process.env.RESEND_API_KEY
    const founder = process.env.FOUNDER_EMAIL
    if (resendKey && founder) {
      try {
        const resend = new Resend(resendKey)
        await resend.emails.send({
          from: `CloudGreet ops <${process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'}>`,
          to: founder,
          subject,
          text: body,
        })
        emailSent = true
      } catch (e) {
        logger.warn('telnyx balance email failed', {
          error: e instanceof Error ? e.message : 'Unknown',
        })
      }
    }
  }

  return NextResponse.json({
    success: true,
    balance,
    threshold,
    notified: shouldNotify,
    slack_sent: slackSent,
    email_sent: emailSent,
  })
}
