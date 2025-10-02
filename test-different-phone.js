// Test SMS to a different phone number to isolate the issue
const testDifferentPhone = async () => {
  console.log('📱 TESTING DIFFERENT PHONE NUMBER')
  console.log('========================================')
  
  // Test with a different number (replace with another number you have access to)
  const testNumbers = [
    '+17372960092', // Your current number
    // Add another number here if you have one
  ]
  
  for (const phoneNumber of testNumbers) {
    console.log(`\nTesting SMS to: ${phoneNumber}`)
    
    try {
      const response = await fetch('https://cloudgreet.com/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: phoneNumber,
          message: 'Test message to different number',
          type: 'test'
        })
      })
      
      const data = await response.json()
      
      if (data.telnyxResponse && data.telnyxResponse.data) {
        const msg = data.telnyxResponse.data
        console.log(`Status: ${msg.to[0].status}`)
        console.log(`Sent At: ${msg.sent_at}`)
        console.log(`Completed At: ${msg.completed_at}`)
        console.log(`Errors: ${msg.errors.length > 0 ? msg.errors : 'None'}`)
      }
      
    } catch (error) {
      console.log(`❌ Test failed for ${phoneNumber}:`, error.message)
    }
  }
}

testDifferentPhone()
