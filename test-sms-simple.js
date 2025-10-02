// Simple SMS test
const testSMS = async () => {
  console.log('📱 Testing SMS API...')
  
  try {
    const response = await fetch('https://cloudgreet.com/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: '+17372960092',
        message: 'Test SMS from CloudGreet',
        type: 'test'
      })
    })
    
    const data = await response.json()
    console.log('Status:', response.status)
    console.log('Response:', data)
    
    if (response.ok) {
      console.log('✅ SMS API working!')
    } else {
      console.log('❌ SMS API failed:', data.error)
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

testSMS()
