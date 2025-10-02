// Test SMS with the new business number
const testNewNumber = async () => {
  console.log('📱 TESTING WITH NEW BUSINESS NUMBER')
  console.log('========================================')
  console.log('New Business Number: +1-512-910-2256')
  console.log('Testing to: +17372960092')
  
  try {
    const response = await fetch('https://cloudgreet.com/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: '+17372960092',
        message: 'Test from new business number - should work now!',
        type: 'test'
      })
    })
    
    const data = await response.json()
    
    console.log('Response Status:', response.status)
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (data.telnyxResponse && data.telnyxResponse.data) {
      const msg = data.telnyxResponse.data
      console.log('\n📱 MESSAGE DETAILS:')
      console.log('From:', msg.from.phone_number)
      console.log('To:', msg.to[0].phone_number)
      console.log('Status:', msg.to[0].status)
      console.log('Carrier:', msg.to[0].carrier)
      console.log('Sent At:', msg.sent_at)
      console.log('Completed At:', msg.completed_at)
      console.log('Cost:', msg.cost.amount, msg.cost.currency)
      
      if (msg.sent_at && msg.completed_at) {
        console.log('\n✅ SUCCESS: Message sent and completed!')
        console.log('Check your phone for the SMS message')
      } else if (msg.sent_at) {
        console.log('\n⏳ PARTIAL: Message sent but not completed yet')
      } else {
        console.log('\n❌ FAILED: Message was not sent')
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

testNewNumber()
