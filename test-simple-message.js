// Test with the simplest possible message
const testSimpleMessage = async () => {
  console.log('📱 TESTING SIMPLE MESSAGE')
  console.log('========================================')
  
  try {
    const response = await fetch('https://cloudgreet.com/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: '+17372960092',
        message: 'Test',
        type: 'test'
      })
    })
    
    const data = await response.json()
    
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (data.telnyxResponse && data.telnyxResponse.data) {
      const msg = data.telnyxResponse.data
      console.log('\n📱 MESSAGE DETAILS:')
      console.log('From:', msg.from.phone_number)
      console.log('To:', msg.to[0].phone_number)
      console.log('Status:', msg.to[0].status)
      console.log('Carrier:', msg.to[0].carrier)
      console.log('Message:', msg.text)
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

testSimpleMessage()
