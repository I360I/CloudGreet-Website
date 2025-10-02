// Test SMS to your personal number
const testSMS = async () => {
  console.log('📱 SENDING TEST SMS TO YOUR PERSONAL NUMBER')
  console.log('========================================')
  
  try {
    const response = await fetch('https://cloudgreet.com/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: '+17372960092',
        message: '🎉 TEST MESSAGE: SMS is now working perfectly with the v1 API fix! Your CloudGreet platform is ready to launch! 🚀',
        type: 'test',
        priority: 'high'
      })
    })
    
    const data = await response.json()
    
    console.log('📱 SMS TEST RESULT:')
    console.log('Status:', data.success ? '✅ SUCCESS' : '❌ FAILED')
    console.log('Message:', data.message)
    
    if (data.error) {
      console.log('Error:', data.error)
    }
    
    if (data.success) {
      console.log('\n🎉 SUCCESS! Check your phone at +17372960092')
      console.log('Your SMS integration is working perfectly!')
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

testSMS()
