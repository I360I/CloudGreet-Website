// Final SMS test after Telnyx v1 configuration
const testSMSFinal = async () => {
  console.log('📱 FINAL SMS TEST - After Telnyx v1 Configuration')
  console.log('========================================')
  
  try {
    console.log('Sending test SMS to +17372960092...')
    
    const response = await fetch('https://cloudgreet.com/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: '+17372960092',
        message: '🎉 FINAL TEST: SMS should work now with Telnyx v1! Your CloudGreet platform is ready! 🚀',
        type: 'test',
        priority: 'high'
      })
    })
    
    console.log('Response status:', response.status)
    
    const data = await response.json()
    
    console.log('📱 SMS TEST RESULT:')
    console.log('Success:', data.success ? '✅ YES' : '❌ NO')
    console.log('Message:', data.message)
    
    if (data.error) {
      console.log('Error details:', data.error)
    }
    
    if (data.success) {
      console.log('\n🎉 SUCCESS! Check your phone at +17372960092')
      console.log('Your SMS integration is working perfectly!')
    } else {
      console.log('\n❌ Still having issues. Let me check the API response...')
      console.log('Full response:', JSON.stringify(data, null, 2))
    }
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message)
  }
}

testSMSFinal()
