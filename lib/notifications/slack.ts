/**
 * Slack notifications - thin wrapper around an Incoming Webhook URL.
 *
 * Set SLACK_WEBHOOK_URL in env to enable. If unset, every call is a
 * no-op (so dev environments and missing-config don't crash production
 * paths). All sends are best-effort - we swallow errors and log.
 *
 * Use for low-volume operational alerts only - new customer events,
 * agent build queue changes, etc. Don't spam this channel.
 */

import { logger } from '@/lib/monitoring'

export type SlackBlock = Record<string, any>

export async function postToSlack(opts: {
  text: string
  blocks?: SlackBlock[]
  /** Override the default webhook (e.g. a different channel for a specific alert). */
  webhookUrl?: string
}): Promise<{ sent: boolean; error?: string }> {
  const url = opts.webhookUrl || process.env.SLACK_WEBHOOK_URL
  if (!url) return { sent: false, error: 'SLACK_WEBHOOK_URL not configured' }
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: opts.text,
        ...(opts.blocks ? { blocks: opts.blocks } : {}),
      }),
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      logger.warn('Slack webhook non-2xx', { status: r.status, body: body.slice(0, 200) })
      return { sent: false, error: `Slack returned ${r.status}` }
    }
    return { sent: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown'
    logger.warn('Slack webhook error', { error })
    return { sent: false, error }
  }
}

/**
 * Helper to render a small "section + fields" block. Slack ignores
 * undefined / null fields so callers can pass them freely.
 */
export function fieldsBlock(rows: Array<{ label: string; value?: string | null }>): SlackBlock {
  return {
    type: 'section',
    fields: rows
      .filter((r) => r.value !== null && r.value !== undefined && r.value !== '')
      .map((r) => ({
        type: 'mrkdwn',
        text: `*${r.label}*\n${r.value}`,
      })),
  }
}
