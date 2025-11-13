#!/usr/bin/env node

/**
 * Synthetic monitor for outreach runner health.
 *
 * Uses the internal cron endpoint to execute a dry-run cycle and verifies
 * the response shape. Intended to run in GitHub Actions with:
 *  - OUTREACH_RUNNER_URL (e.g. https://app.cloudgreet.com/api/internal/outreach-runner)
 *  - CRON_SECRET (shared with the deployment)
 */

const url = process.env.OUTREACH_RUNNER_URL
const secret = process.env.CRON_SECRET

if (!url) {
  console.error('✖ OUTREACH_RUNNER_URL not provided; cannot monitor outreach.')
  process.exit(2)
}

if (!secret) {
  console.error('✖ CRON_SECRET not provided; cannot authorize outreach monitor.')
  process.exit(2)
}

async function main() {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-cron-secret': secret
    }
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok || body?.success !== true) {
    console.error('✖ Outreach runner monitor failed', {
      status: response.status,
      body
    })
    process.exit(1)
  }

  const stats = body.stats || {}
  console.log('✔ Outreach runner healthy', {
    processed: stats.processed ?? 0,
    timestamp: new Date().toISOString()
  })
}

main().catch((error) => {
  console.error('✖ Outreach monitor encountered an error', {
    message: error instanceof Error ? error.message : String(error)
  })
  process.exit(1)
})


