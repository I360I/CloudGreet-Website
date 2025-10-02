// Direct Telnyx API test to see what's actually happening
const testTelnyxDirect = async () => {
  console.log('📱 DIRECT TELYNX API TEST')
  console.log('========================================')
  
  // You'll need to replace this with your actual API key
  const apiKey = 'your_telnyx_api_key_here'
  const fromPhone = '+17372448305'  // Your business phone
  const toPhone = '+17372960092'    // Your personal phone
  
  console.log('Testing with:')
  console.log('- From:', fromPhone)
  console.log('- To:', toPhone)
  console.log('- API Key:', apiKey ? 'Present' : 'Missing')
  
  if (apiKey === 'your_telnyx_api_key_here') {
    console.log('❌ Please update the API key in this script with your actual Telnyx API key')
    return
  }
  
  try {
    const response = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromPhone,
        to: toPhone,
        text: 'Direct Telnyx API test - should work!',
        type: 'SMS'
      })
    })
    
    const data = await response.json()
    
    console.log('Telnyx Response Status:', response.status)
    console.log('Telnyx Response Data:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Telnyx API call successful!')
      console.log('Check your phone for the SMS message')
    } else {
      console.log('❌ Telnyx API call failed')
      if (data.errors && data.errors[0]) {
        console.log('Error:', data.errors[0].detail)
        console.log('Error Code:', data.errors[0].code)
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

testTelnyxDirect()
