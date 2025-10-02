// Test JWT secret consistency between APIs
const testJWTSecretConsistency = async () => {
  console.log('🔍 TESTING JWT SECRET CONSISTENCY')
  console.log('========================================')
  
  try {
    // Step 1: Create a new user and get a token
    console.log('1️⃣ Creating new user...')
    const registerResponse = await fetch('https://cloudgreet.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: 'JWT Test Business',
        business_type: 'HVAC',
        owner_name: 'JWT Test Owner',
        email: `jwttest${Date.now()}@example.com`,
        password: 'testpassword123',
        phone: '5551234567',
        address: '123 JWT Test St'
      })
    })
    
    const registerData = await registerResponse.json()
    console.log('Registration Status:', registerResponse.status)
    
    if (!registerResponse.ok) {
      console.log('❌ Registration failed:', registerData.error?.message)
      return
    }
    
    const token = registerData.data.token
    console.log('✅ Token created successfully')
    console.log('Token length:', token.length)
    
    // Step 2: Test the token with dashboard API
    console.log('')
    console.log('2️⃣ Testing token with dashboard API...')
    const dashboardResponse = await fetch('https://cloudgreet.com/api/dashboard/data', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    const dashboardData = await dashboardResponse.json()
    console.log('Dashboard Status:', dashboardResponse.status)
    console.log('Dashboard Response:', dashboardData)
    
    if (dashboardResponse.ok) {
      console.log('✅ JWT Secret consistency: WORKING!')
    } else {
      console.log('❌ JWT Secret consistency: BROKEN!')
      console.log('Issue:', dashboardData.details || 'Unknown')
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

testJWTSecretConsistency()
