#!/usr/bin/env node

/**
 * Synthetic monitor for SMS HELP/STOP compliance.
 *
 * Required env:
 *  - TELNYX_MONITOR_NUMBER (our sending number)
 *  - TELNYX_TEST_RECIPIENT (sandbox recipient number)
 *  - TELNYX_API_KEY
 */

const telnyxKey = process.env.TELNYX_API_KEY
const fromNumber = process.env.TELNYX_MONITOR_NUMBER
const toNumber = process.env.TELNYX_TEST_RECIPIENT

if (!telnyxKey || !fromNumber || !toNumber) {
  console.error('✖ Missing Telnyx monitor configuration.')
  process.exit(2)
}

async function sendSms(body) {
  const response = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${telnyxKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromNumber,
      to: toNumber,
      text: body
    })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Telnyx send failed: ${response.status} ${JSON.stringify(data)}`)
  }
  return data
}

async function main() {
  await sendSms('HELP')
  await new Promise((resolve) => setTimeout(resolve, 1500))
  await sendSms('STOP')

  console.log('✔ SMS compliance monitor sent HELP/STOP sequence', {
    timestamp: new Date().toISOString()
  })
}

main().catch((error) => {
  console.error('✖ SMS compliance monitor failed', {
    message: error instanceof Error ? error.message : String(error)
  })
  process.exit(1)
})


