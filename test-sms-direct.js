// Direct SMS test to isolate the issue
const testSMSDirect = async () => {
  console.log('📱 DIRECT SMS TEST')
  console.log('========================================')
  
  const businessPhone = '17372448305' // Without + for Telnyx
  const personalPhone = '17372960092' // Without + for Telnyx
  const apiKey = process.env.TELYNX_API_KEY || 'your_telnyx_api_key'
  
  console.log('Testing with:')
  console.log('- From:', businessPhone)
  console.log('- To:', personalPhone)
  console.log('- API Key:', apiKey ? 'Present' : 'Missing')
  
  try {
    const response = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: businessPhone,
        to: personalPhone,
        text: 'Direct test SMS from CloudGreet - should work!',
        type: 'SMS'
      })
    })
    
    const data = await response.json()
    console.log('Status:', response.status)
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ SMS WORKS! The issue is in our API')
    } else {
      console.log('❌ SMS fails even with direct API call')
      if (data.errors && data.errors[0]) {
        console.log('Error:', data.errors[0].detail)
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

testSMSDirect()
