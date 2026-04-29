#!/usr/bin/env node

// Production Testing Script
const testProduction = async () => {
  console.log('🧪 Testing Production Deployment...\n')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
  
  console.log(`Testing against: ${baseUrl}`)
  console.log('─'.repeat(50))

  const tests = [
    {
      name: 'Health Check',
      url: `${baseUrl}/api/health`,
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'Environment Validation',
      url: `${baseUrl}/api/health/detailed`,
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'Webhook Idempotency (Stripe)',
      url: `${baseUrl}/api/stripe/webhook`,
      method: 'POST',
      expectedStatus: 400, // Should fail without proper signature
      body: { id: 'test', type: 'test' }
    },
    {
      name: 'Webhook Idempotency (Telnyx)',
      url: `${baseUrl}/api/telnyx/voice-webhook`,
      method: 'POST',
      expectedStatus: 200,
      body: { data: { id: 'test', event_type: 'test' } }
    },
    {
      name: 'Webhook Idempotency (Retell)',
      url: `${baseUrl}/api/retell/webhook`,
      method: 'POST',
      expectedStatus: 401, // Should fail without signature
      body: { event: 'test', call: { call_id: 'test' } }
    }
  ]

  const results = []

  for (const test of tests) {
    console.log(`\n🧪 Testing ${test.name}...`)
    
    try {
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      }

      if (test.body) {
        options.body = JSON.stringify(test.body)
      }

      const response = await fetch(test.url, options)
      const status = response.status
      
      console.log(`   Status: ${status}`)
      
      if (status === test.expectedStatus) {
        console.log(`   ✅ ${test.name} - Status correct`)
        results.push({ name: test.name, status: 'PASSED' })
      } else {
        console.log(`   ❌ ${test.name} - Expected ${test.expectedStatus}, got ${status}`)
        results.push({ name: test.name, status: 'FAILED', details: `Expected ${test.expectedStatus}, got ${status}` })
      }

      // Try to get response body for debugging
      try {
        const body = await response.text()
        if (body && body.length < 200) {
          console.log(`   Response: ${body}`)
        }
      } catch (e) {
        // Ignore body parsing errors
      }

    } catch (error) {
      console.log(`   ❌ ${test.name} - Error: ${error.message}`)
      results.push({ name: test.name, status: 'ERROR', details: error.message })
    }
  }

  console.log('\n📊 Test Results Summary:')
  console.log('─'.repeat(50))
  
  results.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌'
    console.log(`${status} ${result.name}: ${result.status}`)
    if (result.details) {
      console.log(`   Details: ${result.details}`)
    }
  })
  
  const passed = results.filter(r => r.status === 'PASSED').length
  const total = results.length
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`)

  console.log('\n📋 Manual Testing Required:')
  console.log('─'.repeat(50))
  console.log('1. Test webhook idempotency with duplicate events')
  console.log('2. Test Retell AI integration with real call')
  console.log('3. Test appointment booking flow')
  console.log('4. Test billing: book → complete → charge $50')
  console.log('5. Test Retell fallback with invalid API key')
  console.log('6. Monitor Stripe dashboard for charges')
  console.log('7. Monitor Retell AI dashboard for calls')
  console.log('8. Monitor Telnyx dashboard for calls')

  console.log('\n🎉 Production testing complete!')
}

testProduction().catch(console.error)

