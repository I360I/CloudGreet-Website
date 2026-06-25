import { NextRequest, NextResponse } from 'next/server'
import { telnyxClient } from '@/lib/telnyx'
import { logger } from '@/lib/monitoring'
import { checkCronAuth } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const STEVE_AGENT_ID = 'agent_97e040eff72c6f2567605c8cc2'
const STEVE_PHONE = '+19129158809'

/**
 * GET /api/cron/voice-daily-health
 *
 * Runs daily at 13:00 UTC (9am ET). Checks Steve's Retell voice agent:
 * - Agent is reachable and configured
 * - Call volume + completion stats for the last 24h
 * - Any error-ended calls
 * Sends a plain SMS summary to Anthony.
 */
export async function GET(request: NextRequest) {
  const denial = checkCronAuth(request)
  if (denial) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.RETELL_API_KEY
  const fromNumber = process.env.CLOUDGREET_NOTIFICATIONS_FROM
  const toNumber = process.env.CLOUDGREET_ADMIN_NOTIFY_PHONE || '+17372960092'

  if (!apiKey) {
    logger.error('voice-daily-health: RETELL_API_KEY not set')
    return NextResponse.json({ ok: false, error: 'no_retell_key' }, { status: 500 })
  }

  const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })
  const since24h = Date.now() - 24 * 60 * 60 * 1000

  // 1. Verify the agent is accessible
  let agentOk = false
  let agentError = ''
  try {
    const res = await fetch(`https://api.retellai.com/get-agent/${STEVE_AGENT_ID}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.ok) {
      agentOk = true
    } else {
      agentError = `HTTP ${res.status}`
    }
  } catch (e) {
    agentError = e instanceof Error ? e.message : 'fetch failed'
  }

  // 2. Pull last 24h of calls for Steve's agent
  let totalCalls = 0
  let completedCalls = 0
  let errorCalls = 0
  let totalDurationSec = 0
  const errorReasons: string[] = []

  try {
    const resp = await fetch('https://api.retellai.com/v2/list-calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter_criteria: {
          agent_id: [STEVE_AGENT_ID],
          start_timestamp: { lower_threshold: since24h },
        },
        sort_order: 'descending',
        limit: 100,
      }),
    })

    if (resp.ok) {
      const json = await resp.json().catch(() => ({}))
      const calls: any[] = Array.isArray(json) ? json : (json.calls || json.data || [])
      totalCalls = calls.length

      for (const c of calls) {
        const reason: string = c.end_reason || c.ended_reason || c.disconnection_reason || ''
        const dur: number = typeof c.duration_ms === 'number' ? c.duration_ms / 1000
          : typeof c.call_length === 'number' ? c.call_length
          : 0

        totalDurationSec += dur

        const isError = reason && !['user_hangup', 'agent_hangup', 'call_transfer', 'inactivity', 'voicemail'].includes(reason)
        if (isError) {
          errorCalls++
          if (!errorReasons.includes(reason)) errorReasons.push(reason)
        } else {
          completedCalls++
        }
      }
    } else {
      logger.warn('voice-daily-health: list-calls failed', { status: resp.status })
    }
  } catch (e) {
    logger.warn('voice-daily-health: list-calls threw', { error: e instanceof Error ? e.message : 'unknown' })
  }

  // 3. Build SMS report
  const avgMin = totalCalls > 0 ? Math.round(totalDurationSec / totalCalls / 60 * 10) / 10 : 0
  const healthy = agentOk && errorCalls === 0
  const status = healthy ? 'OK' : !agentOk ? 'AGENT DOWN' : `${errorCalls} ERROR${errorCalls !== 1 ? 'S' : ''}`

  const lines = [
    `SmartRide Voice (${dateLabel}) - ${status}`,
    `Agent: ${agentOk ? 'active' : `ERROR - ${agentError}`}`,
    `Calls 24h: ${totalCalls}`,
  ]
  if (totalCalls > 0) {
    lines.push(`Completed: ${completedCalls}, Avg: ${avgMin}min`)
  }
  if (errorCalls > 0) {
    lines.push(`Failed: ${errorCalls} (${errorReasons.join(', ')})`)
  }
  if (totalCalls === 0) {
    lines.push(`Phone: ${STEVE_PHONE}`)
  }

  const smsBody = lines.join('\n')

  if (fromNumber) {
    try {
      await telnyxClient.sendSMS(toNumber, smsBody, fromNumber)
    } catch (e) {
      logger.warn('voice-daily-health: SMS notify failed', { error: e instanceof Error ? e.message : 'unknown' })
    }
  }

  logger.info('voice-daily-health complete', { agentOk, totalCalls, errorCalls, healthy })

  return NextResponse.json({
    ok: true,
    healthy,
    agentOk,
    totalCalls,
    completedCalls,
    errorCalls,
    avgMinutes: avgMin,
    report: smsBody,
  })
}
