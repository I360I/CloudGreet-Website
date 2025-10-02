// Debug SMS error to see what's actually failing
const debugSMSError = async () => {
  console.log('🔍 DEBUGGING SMS ERROR')
  console.log('========================================')
  
  try {
    const response = await fetch('https://cloudgreet.com/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: '+17372960092',
        message: 'Debug test to see actual error',
        type: 'test',
        priority: 'high'
      })
    })
    
    const data = await response.json()
    
    console.log('Full Response:', JSON.stringify(data, null, 2))
    
    if (data.error) {
      console.log('\n❌ ERROR DETAILS:')
      console.log('Error:', data.error)
      console.log('Details:', data.details)
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

debugSMSError()
