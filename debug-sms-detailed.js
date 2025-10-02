// Detailed SMS debug to see actual Telnyx API response
const debugSMSDetailed = async () => {
  console.log('🔍 DETAILED SMS DEBUG')
  console.log('========================================')
  
  try {
    const response = await fetch('https://cloudgreet.com/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: '+17372960092',
        message: 'Detailed debug test - checking actual Telnyx response',
        type: 'test',
        priority: 'high'
      })
    })
    
    const data = await response.json()
    
    console.log('API Response Status:', response.status)
    console.log('API Response Data:', JSON.stringify(data, null, 2))
    
    // Check if there are any hidden error details
    if (data.smsError) {
      console.log('\n❌ SMS ERROR DETAILS:')
      console.log('SMS Error:', data.smsError)
    }
    
    if (data.details) {
      console.log('\n📋 ADDITIONAL DETAILS:')
      console.log('Details:', data.details)
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

debugSMSDetailed()
