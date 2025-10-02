// Debug registration to see the exact error
const debugRegistration = async () => {
  const baseUrl = 'https://cloudgreet.com'
  
  console.log('🔍 DEBUGGING REGISTRATION')
  console.log('=' .repeat(40))
  
  const testData = {
    business_name: 'Debug Test Business',
    business_type: 'HVAC Services',
    owner_name: 'Debug Test User',
    email: `debugtest${Date.now()}@example.com`,
    password: 'testpassword123',
    phone: '5551234567',
    address: '123 Test Street, Test City, TS 12345',
    website: 'https://debugtest.com'
  }
  
  console.log(`📧 Testing: ${testData.email}`)
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    })
    
    console.log(`Status: ${response.status}`)
    
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Registration successful!')
    } else {
      console.log('❌ Registration failed')
      console.log('Error details:', data)
    }
    
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`)
  }
}

debugRegistration()