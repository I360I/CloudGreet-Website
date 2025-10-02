// Check Telnyx configuration and message status
const checkTelnyxConfig = async () => {
  console.log('🔍 CHECKING TELYNX CONFIGURATION')
  console.log('========================================')
  
  try {
    // Test with a simple message to see what happens
    const response = await fetch('https://cloudgreet.com/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: '+17372960092',
        message: 'Simple test - no emojis or special chars',
        type: 'test',
        priority: 'high'
      })
    })
    
    const data = await response.json()
    
    console.log('Response Status:', response.status)
    console.log('Full Response:', JSON.stringify(data, null, 2))
    
    if (data.telnyxResponse && data.telnyxResponse.data) {
      const msg = data.telnyxResponse.data
      console.log('\n📱 MESSAGE DETAILS:')
      console.log('Message ID:', msg.id)
      console.log('Status:', msg.to[0].status)
      console.log('From:', msg.from.phone_number)
      console.log('To:', msg.to[0].phone_number)
      console.log('Carrier:', msg.to[0].carrier)
      console.log('Cost:', msg.cost.amount, msg.cost.currency)
      console.log('Errors:', msg.errors)
      console.log('Sent At:', msg.sent_at)
      console.log('Completed At:', msg.completed_at)
      
      if (msg.errors && msg.errors.length > 0) {
        console.log('\n❌ ERRORS FOUND:')
        msg.errors.forEach(error => {
          console.log('- Error:', error.detail)
          console.log('- Code:', error.code)
        })
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

checkTelnyxConfig()
