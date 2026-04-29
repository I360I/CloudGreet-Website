import 'dotenv/config'

if (!process.env.PROSPECT_SYNC_URL) {
  throw new Error('Missing PROSPECT_SYNC_URL')
}

if (!process.env.CRON_SECRET) {
  throw new Error('Missing CRON_SECRET')
}

async function run() {
  const response = await fetch(process.env.PROSPECT_SYNC_URL!, {
    method: 'POST',
    headers: {
      'x-cron-secret': process.env.CRON_SECRET!
    }
  })

  const data = await response.json()
  if (!response.ok || !data.success) {
    console.error('Prospect sync failed', data)
    process.exit(1)
  }

  console.log('Prospect sync complete', data.stats)
}

run().catch((error) => {
  console.error('Prospect sync failed', error)
  process.exit(1)
})


