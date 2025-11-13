import 'dotenv/config'

if (!process.env.OUTREACH_RUNNER_URL) {
  throw new Error('Missing OUTREACH_RUNNER_URL')
}

if (!process.env.CRON_SECRET) {
  throw new Error('Missing CRON_SECRET')
}

async function run() {
  const response = await fetch(process.env.OUTREACH_RUNNER_URL, {
    method: 'POST',
    headers: {
      'x-cron-secret': process.env.CRON_SECRET
    }
  })

  const data = await response.json()
  if (!response.ok || !data.success) {
    console.error('Outreach runner failed', data)
    process.exit(1)
  }

  console.log('Outreach runner success', data.stats)
}

run().catch((error) => {
  console.error('Outreach runner failed', error)
  process.exit(1)
})


