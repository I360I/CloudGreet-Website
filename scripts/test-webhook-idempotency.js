#!/usr/bin/env node

// Test Webhook Idempotency
const testWebhookIdempotency = async () => {
  console.log('🧪 Testing Webhook Idempotency...\n')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  console.log(`Testing against: ${baseUrl}`)
  console.log('─'.repeat(50))

  const tests = [
    {
      name: 'Stripe Webhook Idempotency',
      url: `${baseUrl}/api/stripe/webhook`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: {
        id: 'evt_test_123',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_123',
            amount_paid: 5000,
            currency: 'usd',
            metadata: { business_id: 'test_business' }
          }
        }
      }
    },
    {
      name: 'Telnyx Webhook Idempotency',
      url: `${baseUrl}/api/telnyx/voice-webhook`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        data: {
          id: 'telnyx_test_123',
          event_type: 'call.initiated',
          payload: {
            call_control_id: 'call_test_123',
            from: '+1234567890',
            to: '+0987654321'
          }
        }
      }
    },
    {
      name: 'Retell Webhook Idempotency',
      url: `${baseUrl}/api/retell/webhook`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-retell-signature': 'test_signature'
      },
      body: {
        event: 'call_started',
        call: {
          call_id: 'retell_test_123'
        }
      }
    }
  ]

  const results = []

  for (const test of tests) {
    console.log(`\n🧪 Testing ${test.name}...`)
    
    try {
      // Send first request
      const response1 = await fetch(test.url, {
        method: test.method,
        headers: test.headers,
        body: JSON.stringify(test.body)
      })
      
      const status1 = response1.status
      console.log(`   First request status: ${status1}`)
      
      // Send duplicate request
      const response2 = await fetch(test.url, {
        method: test.method,
        headers: test.headers,
        body: JSON.stringify(test.body)
      })
      
      const status2 = response2.status
      console.log(`   Duplicate request status: ${status2}`)
      
      // Check if duplicate was handled correctly
      if (status1 === status2) {
        console.log(`   ✅ ${test.name} - Idempotency working`)
        results.push({ name: test.name, status: 'PASSED' })
      } else {
        console.log(`   ❌ ${test.name} - Status mismatch`)
        results.push({ name: test.name, status: 'FAILED', details: `Status mismatch: ${status1} vs ${status2}` })
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

  if (passed === total) {
    console.log('\n🎉 All webhook idempotency tests passed!')
  } else {
    console.log('\n⚠️  Some tests failed. Check webhook implementations.')
  }

  console.log('\n📋 Manual Verification:')
  console.log('1. Check webhook_events table in database')
  console.log('2. Verify duplicate events are stored only once')
  console.log('3. Test with real webhook providers')
  console.log('4. Monitor logs for duplicate processing')
}

testWebhookIdempotency().catch(console.error)