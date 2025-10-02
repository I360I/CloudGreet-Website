// Debug the Telnyx issue - check what's preventing delivery
const debugTelnyxIssue = async () => {
  console.log('🔍 DEBUGGING TELYNX DELIVERY ISSUE')
  console.log('========================================')
  
  try {
    // Test with a very simple message
    const response = await fetch('https://cloudgreet.com/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: '+17372960092',
        message: 'Simple test',
        type: 'test'
      })
    })
    
    const data = await response.json()
    
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (data.telnyxResponse && data.telnyxResponse.data) {
      const msg = data.telnyxResponse.data
      console.log('\n📱 MESSAGE ANALYSIS:')
      console.log('ID:', msg.id)
      console.log('Status:', msg.to[0].status)
      console.log('From:', msg.from.phone_number)
      console.log('To:', msg.to[0].phone_number)
      console.log('Carrier:', msg.to[0].carrier)
      console.log('Sent At:', msg.sent_at)
      console.log('Completed At:', msg.completed_at)
      console.log('Valid Until:', msg.valid_until)
      console.log('Errors:', msg.errors)
      
      // Check if message expired
      const now = new Date()
      const validUntil = new Date(msg.valid_until)
      console.log('\n⏰ TIMING ANALYSIS:')
      console.log('Current Time:', now.toISOString())
      console.log('Valid Until:', validUntil.toISOString())
      console.log('Time Remaining:', Math.round((validUntil - now) / 1000 / 60), 'minutes')
      
      if (validUntil < now) {
        console.log('❌ MESSAGE EXPIRED - Telnyx never sent it')
      } else {
        console.log('⏳ MESSAGE STILL VALID - Telnyx should send it soon')
      }
    }
    
  } catch (error) {
    console.log('❌ Debug failed:', error.message)
  }
}

debugTelnyxIssue()
