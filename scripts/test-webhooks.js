#!/usr/bin/env node

/**
 * Webhook Connectivity Test Script
 * Tests if webhooks are reachable from external services
 */

const https = require('https')
const http = require('http')

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'

console.log('🔍 Testing Webhook Connectivity...\n')
console.log(`Base URL: ${BASE_URL}\n`)

async function testWebhook(name, path, method = 'POST', body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL)
    const client = url.protocol === 'https:' ? https : http
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CloudGreet-Webhook-Test/1.0'
      },
      timeout: 10000
    }

    const req = client.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        let parsedData
        try {
          parsedData = JSON.parse(data)
        } catch {
          parsedData = data
        }

        resolve({
          name,
          status: res.statusCode,
          reachable: true,
          response: parsedData,
          headers: res.headers
        })
      })
    })

    req.on('error', (error) => {
      resolve({
        name,
        status: null,
        reachable: false,
        error: error.message
      })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({
        name,
        status: null,
        reachable: false,
        error: 'Request timeout'
      })
    })

    if (body) {
      req.write(JSON.stringify(body))
    }
    
    req.end()
  })
}

async function runTests() {
  console.log('Testing Retell Webhook...')
  const retellTest = await testWebhook(
    'Retell Voice Webhook',
    '/api/retell/voice-webhook',
    'POST',
    { event: 'ping' }
  )

  console.log('Testing Telnyx Webhook...')
  const telnyxTest = await testWebhook(
    'Telnyx Voice Webhook',
    '/api/telnyx/voice-webhook',
    'POST',
    {
      data: {
        event_type: 'call.initiated',
        call_control_id: 'test',
        to: '+1234567890',
        from: '+0987654321'
      }
    }
  )

  console.log('\n' + '='.repeat(60))
  console.log('RESULTS')
  console.log('='.repeat(60) + '\n')

  // Retell Results
  console.log(`📞 Retell Webhook: ${retellTest.url || '/api/retell/voice-webhook'}`)
  if (retellTest.reachable) {
    if (retellTest.status === 200 && retellTest.response?.ok === true) {
      console.log('   ✅ Status: REACHABLE (ping successful)')
    } else if (retellTest.status === 401) {
      console.log('   ⚠️  Status: REACHABLE (signature verification failed - expected in test)')
    } else {
      console.log(`   ⚠️  Status: REACHABLE (HTTP ${retellTest.status})`)
      console.log(`   Response: ${JSON.stringify(retellTest.response)}`)
    }
  } else {
    console.log('   ❌ Status: UNREACHABLE')
    console.log(`   Error: ${retellTest.error}`)
  }

  console.log('')

  // Telnyx Results
  console.log(`📞 Telnyx Webhook: ${telnyxTest.url || '/api/telnyx/voice-webhook'}`)
  if (telnyxTest.reachable) {
    if (telnyxTest.status === 401 || telnyxTest.status === 400) {
      console.log('   ✅ Status: REACHABLE (signature verification failed - expected in test)')
    } else if (telnyxTest.status === 200) {
      console.log('   ✅ Status: REACHABLE')
    } else {
      console.log(`   ⚠️  Status: REACHABLE (HTTP ${telnyxTest.status})`)
    }
  } else {
    console.log('   ❌ Status: UNREACHABLE')
    console.log(`   Error: ${telnyxTest.error}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('RECOMMENDATIONS')
  console.log('='.repeat(60) + '\n')

  if (!retellTest.reachable) {
    console.log('❌ Retell webhook is not reachable.')
    console.log('   → Check that NEXT_PUBLIC_APP_URL is set correctly in Vercel')
    console.log('   → Verify the URL matches your deployed domain')
    console.log('   → Check Vercel deployment logs for errors\n')
  } else {
    console.log('✅ Retell webhook is reachable')
    console.log('   → Configure this URL in Retell dashboard:')
    console.log(`   → ${BASE_URL}/api/retell/voice-webhook\n`)
  }

  if (!telnyxTest.reachable) {
    console.log('❌ Telnyx webhook is not reachable.')
    console.log('   → Check that NEXT_PUBLIC_APP_URL is set correctly in Vercel')
    console.log('   → Verify the URL matches your deployed domain')
    console.log('   → Check Vercel deployment logs for errors\n')
  } else {
    console.log('✅ Telnyx webhook is reachable')
    console.log('   → Configure this URL in Telnyx Call Control App:')
    console.log(`   → ${BASE_URL}/api/telnyx/voice-webhook\n`)
  }

  // Environment check
  console.log('Environment Variables Check:')
  const envVars = {
    'RETELL_API_KEY': process.env.RETELL_API_KEY,
    'TELNYX_API_KEY': process.env.TELNYX_API_KEY,
    'TELNYX_CONNECTION_ID': process.env.TELNYX_CONNECTION_ID,
    'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
    'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL
  }

  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      console.log(`   ✅ ${key}: Set`)
    } else {
      console.log(`   ❌ ${key}: NOT SET`)
    }
  }

  console.log('\n' + '='.repeat(60))
  
  if (retellTest.reachable && telnyxTest.reachable) {
    console.log('✅ All webhooks are reachable! Ready for testing.')
    process.exit(0)
  } else {
    console.log('❌ Some webhooks are not reachable. Fix the issues above.')
    process.exit(1)
  }
}

runTests().catch((error) => {
  console.error('Test failed:', error)
  process.exit(1)
})


