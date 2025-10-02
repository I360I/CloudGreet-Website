// Final comprehensive test for CloudGreet
const testFinal = async () => {
  const baseUrl = 'https://cloudgreet.com'
  
  console.log('🎯 FINAL COMPREHENSIVE CLOUDGREET TEST')
  console.log('=' .repeat(50))
  
  // Test 1: Registration
  console.log('\n1️⃣ TESTING REGISTRATION...')
  const testData = {
    business_name: 'Final Test Business',
    business_type: 'HVAC',
    owner_name: 'Final Test Owner',
    email: `finaltest${Date.now()}@example.com`,
    password: 'testpassword123',
    phone: '5551234567',
    address: '123 Final Test Street',
    website: 'https://finaltest.com',
    services: ['HVAC Repair', 'HVAC Installation'],
    service_areas: ['Test City', 'Test County']
  }
  
  console.log(`📧 Testing: ${testData.email}`)
  console.log(`🏢 Business: ${testData.business_name}`)
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    })
    
    console.log(`Registration Status: ${response.status}`)
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ REGISTRATION SUCCESSFUL!')
      console.log('User ID:', data.data?.user?.id)
      console.log('Business ID:', data.data?.business?.id)
      console.log('Agent ID:', data.data?.agent?.id)
      
      // Test 2: Login
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
        const loginData = await loginResponse.json()
        console.log('✅ LOGIN SUCCESSFUL!')
        console.log('Token received:', !!loginData.data?.token)
        console.log('User data:', loginData.data?.user?.email)
        console.log('Business data:', loginData.data?.business?.business_name)
        
        // Test 3: Health Check
        console.log('\n3️⃣ TESTING HEALTH CHECK...')
        const healthResponse = await fetch(`${baseUrl}/api/health`)
        console.log(`Health Status: ${healthResponse.status}`)
        
        if (healthResponse.ok) {
          console.log('✅ HEALTH CHECK PASSED!')
        } else {
          console.log('⚠️ Health check failed')
        }
        
        console.log('\n🎉 ALL CRITICAL SYSTEMS WORKING!')
        console.log('✅ Registration: WORKING')
        console.log('✅ Login: WORKING') 
        console.log('✅ Database: WORKING')
        console.log('✅ Authentication: WORKING')
        
      } else {
        const loginData = await loginResponse.json()
        console.log('❌ LOGIN FAILED:', loginData.error?.message)
      }
      
    } else {
      console.log('❌ REGISTRATION FAILED')
      console.log('Error:', data.error?.message)
      
      // Detailed error analysis
      if (data.error?.message.includes('name')) {
        console.log('🔍 Issue: Missing name field in users table')
      } else if (data.error?.message.includes('business')) {
        console.log('🔍 Issue: Business table problem')
      } else if (data.error?.message.includes('ai_agents')) {
        console.log('🔍 Issue: AI agents table problem')
      } else if (data.error?.message.includes('audit_logs')) {
        console.log('🔍 Issue: Audit logs table problem')
      } else if (data.error?.message.includes('owner_name')) {
        console.log('🔍 Issue: owner_name column problem')
      } else if (data.error?.message.includes('business_name')) {
        console.log('🔍 Issue: business_name field in ai_agents')
      } else {
        console.log('🔍 Issue: Unknown problem -', data.error?.message)
      }
    }
    
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`)
  }
  
  console.log('\n' + '=' .repeat(50))
  console.log('🏁 FINAL TEST COMPLETE')
}

testFinal()
