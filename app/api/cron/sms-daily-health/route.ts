import { NextRequest, NextResponse } from 'next/server'
import { runSmsHealthCheck } from '@/lib/sms-health'
import { pingSmsPipeline } from '@/lib/sms-agent'
import { postToSlack } from '@/lib/notifications/slack'
import { notifyAdmin } from '@/lib/notifications/notify'
import { telnyxClient } from '@/lib/telnyx'
import { logger } from '@/lib/monitoring'
import { checkCronAuth } from '@/lib/cron-auth'

const STEVE_ID = '650406c3-5585-446e-958d-0fbcccf54795'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET /api/cron/sms-daily-health
 *
 * Runs daily at 7pm ET (23:00 UTC during EDT, adjust to 00:00 in winter).
 * Reviews all SMS conversations from the past 24 hours, flags issues,
 * and sends a Claude-generated summary to Anthony via SMS + Slack +
 * in-app notification.
 */
export async function GET(request: NextRequest) {
  const denial = checkCronAuth(request)
  if (denial) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [report, pingResult] = await Promise.all([
      runSmsHealthCheck({ windowHours: 24 }),
      pingSmsPipeline(STEVE_ID),
    ])

    const criticalCount = report.issues.filter((i) => i.severity === 'critical').length
    const status = report.healthy ? 'HEALTHY' : `${criticalCount} CRITICAL ISSUE${criticalCount !== 1 ? 'S' : ''}`

    const pingLine = pingResult.ok
      ? `Agent ping: live (${pingResult.ms}ms)`
      : `Agent ping: FAILED -- ${pingResult.error}`

    // Build a concise text for SMS / Slack
    const lines: string[] = [
      `CloudGreet SMS Daily (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}) -- ${status}`,
      pingLine,
      '',
      report.aiSummary,
    ]

    if (report.issues.length > 0) {
      lines.push('')
      lines.push('Issues:')
      for (const issue of report.issues.slice(0, 5)) {
        lines.push(`  [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.detail}`)
      }
      if (report.issues.length > 5) lines.push(`  ...and ${report.issues.length - 5} more`)
    }

    const text = lines.join('\n')

    // SMS to Anthony
    const fromNumber = process.env.CLOUDGREET_NOTIFICATIONS_FROM
    const toNumber = process.env.CLOUDGREET_ADMIN_NOTIFY_PHONE || '+17372960092'
    if (fromNumber) {
      try {
        await telnyxClient.sendSMS(toNumber, text, fromNumber)
      } catch (e) {
        logger.warn('sms daily health: SMS notify failed', { error: e instanceof Error ? e.message : 'Unknown' })
      }
    }

    // Slack
    await postToSlack({
      text: report.healthy ? `:white_check_mark: ${text}` : `:rotating_light: ${text}`,
    })

    // In-app admin notification
    await notifyAdmin({
      type: 'sms_daily_health',
      title: `SMS Daily: ${status}`,
      body: report.aiSummary,
      severity: report.healthy ? 'info' : criticalCount > 0 ? 'critical' : 'warning',
      link: '/admin/conversations',
      metadata: {
        totalConversations: report.totalConversations,
        bookings: report.bookings,
        dispatches: report.dispatches,
        issueCount: report.issues.length,
      },
    })

    logger.info('sms daily health complete', {
      healthy: report.healthy,
      conversations: report.totalConversations,
      issues: report.issues.length,
    })

    return NextResponse.json({ ok: true, report })
  } catch (e) {
    logger.error('sms daily health cron threw', { error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ ok: false, error: 'cron_failed' }, { status: 500 })
  }
}
