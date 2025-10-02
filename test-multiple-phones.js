// Test SMS to multiple phone numbers to isolate the issue
const testMultiplePhones = async () => {
  console.log('📱 TESTING MULTIPLE PHONE NUMBERS')
  console.log('========================================')
  
  // Test with different numbers to see if it's phone-specific
  const testNumbers = [
    '+17372960092', // Your current number
    // Add other numbers you have access to test
  ]
  
  for (const phoneNumber of testNumbers) {
    console.log(`\n🔍 Testing SMS to: ${phoneNumber}`)
    
    try {
      const response = await fetch('https://cloudgreet.com/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: phoneNumber,
          message: 'Test message - please confirm if you receive this',
          type: 'test'
        })
      })
      
      const data = await response.json()
      
      console.log('Response:', JSON.stringify(data, null, 2))
      
      if (data.telnyxResponse && data.telnyxResponse.data) {
        const msg = data.telnyxResponse.data
        console.log(`\n📱 Message Details:`)
        console.log(`ID: ${msg.id}`)
        console.log(`Status: ${msg.to[0].status}`)
        console.log(`Carrier: ${msg.to[0].carrier}`)
        console.log(`Sent At: ${msg.sent_at}`)
        console.log(`Completed At: ${msg.completed_at}`)
        console.log(`Errors: ${msg.errors.length > 0 ? JSON.stringify(msg.errors) : 'None'}`)
        
        if (msg.sent_at && msg.completed_at) {
          console.log('✅ Message was sent and completed')
        } else if (msg.sent_at) {
          console.log('⏳ Message was sent but not completed yet')
        } else {
          console.log('❌ Message was never sent')
        }
      }
      
    } catch (error) {
      console.log(`❌ Test failed for ${phoneNumber}:`, error.message)
    }
  }
}

testMultiplePhones()
