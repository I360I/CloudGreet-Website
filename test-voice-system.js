// Test the voice system to see if it's actually working
const testVoiceSystem = async () => {
  console.log('🧪 Testing Voice System...')
  
  try {
    // Test 1: Check if realtime-stream endpoint exists
    const response = await fetch('https://cloudgreet.com/api/telnyx/realtime-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        call_id: 'test-call-123',
        business_id: 'test-business',
        audio_data: null
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Realtime-stream endpoint working:', data.message)
    } else {
      console.log('❌ Realtime-stream endpoint failed:', response.status)
    }
    
    // Test 2: Check if voice-webhook endpoint exists
    const webhookResponse = await fetch('https://cloudgreet.com/api/telnyx/voice-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'call.initiated',
        call_control_id: 'test-call-123',
        from: '+1234567890',
        to: '+1987654321'
      })
    })
    
    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json()
      console.log('✅ Voice-webhook endpoint working:', webhookData.status)
    } else {
      console.log('❌ Voice-webhook endpoint failed:', webhookResponse.status)
    }
    
    // Test 3: Check if missed-recovery endpoint exists
    const smsResponse = await fetch('https://cloudgreet.com/api/calls/missed-recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: 'test-call-123',
        businessId: 'test-business',
        callerPhone: '+1234567890',
        reason: 'missed'
      })
    })
    
    if (smsResponse.ok) {
      const smsData = await smsResponse.json()
      console.log('✅ Missed-recovery endpoint working:', smsData.message)
    } else {
      console.log('❌ Missed-recovery endpoint failed:', smsResponse.status)
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

testVoiceSystem()
