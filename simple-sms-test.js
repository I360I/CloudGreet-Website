// Simple SMS test without any special formatting
const simpleSMSTest = async () => {
  console.log('📱 SIMPLE SMS TEST - No Emojis, No Special Characters')
  console.log('========================================')
  
  try {
    const response = await fetch('https://cloudgreet.com/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: '+17372960092',
        message: 'Simple test message',
        type: 'test'
      })
    })
    
    const data = await response.json()
    
    console.log('Response Status:', response.status)
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (data.telnyxResponse && data.telnyxResponse.data) {
      const msg = data.telnyxResponse.data
      console.log('\n📱 MESSAGE STATUS:')
      console.log('ID:', msg.id)
      console.log('Status:', msg.to[0].status)
      console.log('Sent At:', msg.sent_at)
      console.log('Completed At:', msg.completed_at)
      console.log('Errors:', msg.errors)
      
      if (msg.sent_at) {
        console.log('✅ Message was sent at:', msg.sent_at)
      } else {
        console.log('❌ Message was not sent (sent_at is null)')
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

simpleSMSTest()
