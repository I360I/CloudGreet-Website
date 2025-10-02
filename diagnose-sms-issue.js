// Comprehensive SMS diagnostic
const diagnoseSMSIssue = async () => {
  console.log('🔍 COMPREHENSIVE SMS DIAGNOSTIC')
  console.log('========================================')
  
  try {
    // Test 1: Check environment variables
    console.log('1️⃣ Testing Environment Variables...')
    const envTestResponse = await fetch('https://cloudgreet.com/api/health')
    const envData = await envTestResponse.json()
    console.log('   Health check:', envTestResponse.ok ? '✅' : '❌')
    
    // Test 2: Test SMS with detailed logging
    console.log('2️⃣ Testing SMS API with detailed error...')
    const smsResponse = await fetch('https://cloudgreet.com/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: '+17372960092',
        message: 'Diagnostic test SMS',
        type: 'test'
      })
    })
    
    const smsData = await smsResponse.json()
    console.log('   SMS Status:', smsResponse.status)
    console.log('   SMS Response:', JSON.stringify(smsData, null, 2))
    
    // Test 3: Check if we can get more details about the error
    if (smsData.details) {
      try {
        const errorDetails = JSON.parse(smsData.details)
        console.log('   Parsed Error Details:', JSON.stringify(errorDetails, null, 2))
        
        if (errorDetails.errors && errorDetails.errors[0]) {
          const error = errorDetails.errors[0]
          console.log('   Error Code:', error.code)
          console.log('   Error Title:', error.title)
          console.log('   Error Detail:', error.detail)
          console.log('   Documentation URL:', error.meta?.url)
        }
      } catch (e) {
        console.log('   Could not parse error details')
      }
    }
    
    // Test 4: Check phone number format
    console.log('3️⃣ Checking phone number format...')
    const businessPhone = '+17372448305'
    const personalPhone = '+17372960092'
    
    console.log('   Business phone:', businessPhone)
    console.log('   Business phone (no +):', businessPhone.replace('+', ''))
    console.log('   Personal phone:', personalPhone)
    console.log('   Personal phone (no +):', personalPhone.replace('+', ''))
    
    // Test 5: Check if we can test with a different approach
    console.log('4️⃣ Testing alternative SMS approach...')
    const altResponse = await fetch('https://cloudgreet.com/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: '17372960092', // Without +
        message: 'Alternative format test',
        type: 'test'
      })
    })
    
    const altData = await altResponse.json()
    console.log('   Alternative Status:', altResponse.status)
    console.log('   Alternative Response:', JSON.stringify(altData, null, 2))
    
    console.log('')
    console.log('📊 DIAGNOSTIC SUMMARY:')
    console.log('========================================')
    console.log('SMS API Status:', smsResponse.ok ? '✅ Working' : '❌ Failed')
    console.log('Alternative Format:', altResponse.ok ? '✅ Working' : '❌ Failed')
    
  } catch (error) {
    console.log('❌ Diagnostic failed:', error.message)
  }
}

diagnoseSMSIssue()
