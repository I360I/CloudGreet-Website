// Test for all potential issues
const testAllIssues = async () => {
  const baseUrl = 'https://cloudgreet.com'
  
  console.log('🔍 TESTING FOR ALL POTENTIAL ISSUES')
  console.log('=' .repeat(50))
  
  const testData = {
    business_name: 'All Issues Test Business',
    business_type: 'HVAC Services',
    owner_name: 'All Issues Test User',
    email: `allissuestest${Date.now()}@example.com`,
    password: 'testpassword123',
    phone: '5551234567',
    address: '123 Test Street, Test City, TS 12345',
    website: 'https://allissuestest.com'
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
    console.log('Full Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Registration successful!')
      console.log('User ID:', data.data?.user?.id)
      console.log('Business ID:', data.data?.business?.id)
      console.log('Agent ID:', data.data?.agent?.id)
      
      // Test login
      console.log('\n2️⃣ TESTING LOGIN...')
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testData.email,
          password: testData.password
        })
      })
      
      console.log(`Login Status: ${loginResponse.status}`)
      
      if (loginResponse.ok) {
        console.log('✅ Login successful!')
        console.log('🎉 AUTHENTICATION SYSTEM IS FULLY WORKING!')
      } else {
        const loginData = await loginResponse.json()
        console.log('❌ Login failed:', loginData.error?.message)
      }
      
    } else {
      console.log('❌ Registration failed')
      console.log('Error:', data.error?.message)
      
      // Check for specific error types
      if (data.error?.message.includes('name')) {
        console.log('🔍 Issue: Missing name field')
      } else if (data.error?.message.includes('business')) {
        console.log('🔍 Issue: Business table problem')
      } else if (data.error?.message.includes('ai_agents')) {
        console.log('🔍 Issue: AI agents table problem')
      } else if (data.error?.message.includes('audit_logs')) {
        console.log('🔍 Issue: Audit logs table problem')
      } else {
        console.log('🔍 Issue: Unknown problem')
      }
    }
    
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`)
  }
}

testAllIssues()
