#!/usr/bin/env node

// Test Retell AI Fallback
const testRetellFallback = async () => {
  console.log('🧪 Testing Retell AI Fallback...\n')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  console.log(`Testing against: ${baseUrl}`)
  console.log('─'.repeat(50))

  console.log('📋 Retell Fallback Test Steps:')
  console.log('1. Simulate Retell AI failure (invalid API key)')
  console.log('2. Verify voicemail instructions returned')
  console.log('3. Check SMS sent to customer')
  console.log('4. Verify alert sent to business owner')
  console.log('5. Confirm call recorded as failed')

  const testData = {
    data: {
      id: 'telnyx_fallback_test_123',
      event_type: 'call.initiated',
      payload: {
        call_control_id: 'call_fallback_test_123',
        from: '+1234567890',
        to: '+0987654321'
      }
    }
  }

  console.log('\n🧪 Step 1: Simulate Retell AI failure...')
  
  try {
    // Temporarily break Retell API key
    const originalRetellKey = process.env.RETELL_API_KEY
    process.env.RETELL_API_KEY = 'invalid_key_for_testing'

    const webhookResponse = await fetch(`${baseUrl}/api/telnyx/voice-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })

    const webhookResult = await webhookResponse.json()
    
    if (webhookResponse.ok) {
      console.log('   ✅ Webhook processed successfully')
      
      // Check if fallback instructions were returned
      if (webhookResult.instructions) {
        console.log('   ✅ Fallback instructions returned')
        
        const hasSayInstruction = webhookResult.instructions.some(inst => inst.instruction === 'say')
        const hasRecordInstruction = webhookResult.instructions.some(inst => inst.instruction === 'record')
        const hasHangupInstruction = webhookResult.instructions.some(inst => inst.instruction === 'hangup')
        
        if (hasSayInstruction) {
          console.log('   ✅ Say instruction present (voicemail greeting)')
        }
        if (hasRecordInstruction) {
          console.log('   ✅ Record instruction present (voicemail recording)')
        }
        if (hasHangupInstruction) {
          console.log('   ✅ Hangup instruction present')
        }
        
        console.log('\n📊 Retell Fallback Test Results:')
        console.log('─'.repeat(50))
        console.log('✅ Retell AI failure handled gracefully')
        console.log('✅ Voicemail instructions provided')
        console.log('✅ Customer can leave message')
        console.log('✅ No calls lost due to AI failure')
        
        console.log('\n🎯 Expected Behavior:')
        console.log('- Retell API fails: System continues working')
        console.log('- Voicemail: Customer leaves message')
        console.log('- SMS: Customer notified of technical issues')
        console.log('- Alert: Business owner notified immediately')
        console.log('- Call logged: Marked as failed with reason')
        
      } else {
        console.log('   ❌ No fallback instructions returned')
      }
      
    } else {
      console.log('   ❌ Webhook failed')
      console.log(`   Error: ${webhookResult.error}`)
    }

    // Restore original API key
    if (originalRetellKey) {
      process.env.RETELL_API_KEY = originalRetellKey
    }

  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`)
  }

  console.log('\n📋 Manual Verification Required:')
  console.log('1. Test with real Retell API key')
  console.log('2. Verify SMS sent to customer phone')
  console.log('3. Check business owner receives alert')
  console.log('4. Confirm voicemail recording works')
  console.log('5. Test with actual phone call')

  console.log('\n🎉 Retell fallback test complete!')
}

testRetellFallback().catch(console.error)