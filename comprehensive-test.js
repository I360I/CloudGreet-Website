// Comprehensive test for all potential issues
const testComprehensive = async () => {
  const baseUrl = 'https://cloudgreet.com'
  
  console.log('🔍 COMPREHENSIVE CLOUDGREET TEST')
  console.log('=' .repeat(50))
  
  // Test 1: Basic Registration
  console.log('\n1️⃣ TESTING REGISTRATION...')
  const testData = {
    business_name: 'Test Business 2024',
    business_type: 'HVAC', // Using exact value from your schema
    owner_name: 'Test Owner',
    email: `test${Date.now()}@example.com`,
    password: 'testpassword123',
    phone: '5551234567',
    address: '123 Test Street, Test City, TS 12345',
    website: 'https://testbusiness.com',
    services: ['HVAC Repair', 'HVAC Installation'],
    service_areas: ['Test City', 'Test County']
  }
  
  console.log(`📧 Testing: ${testData.email}`)
  console.log(`🏢 Business: ${testData.business_name}`)
  console.log(`🔧 Type: ${testData.business_type}`)
  
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
      
      // Test 2: Login with the same credentials
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
        console.log('✅ Login successful!')
        console.log('Token received:', !!loginData.data?.token)
        console.log('🎉 AUTHENTICATION SYSTEM IS FULLY WORKING!')
        
        // Test 3: Test other business types
        console.log('\n3️⃣ TESTING OTHER BUSINESS TYPES...')
        const businessTypes = ['Paint', 'Roofing', 'Plumbing', 'Electrical', 'Landscaping', 'Cleaning', 'General']
        
        for (const type of businessTypes) {
          const testData2 = {
            business_name: `Test ${type} Business`,
            business_type: type,
            owner_name: 'Test Owner',
            email: `test${type.toLowerCase()}${Date.now()}@example.com`,
            password: 'testpassword123',
            phone: '5551234567',
            address: '123 Test Street',
            website: 'https://test.com'
          }
          
          const testResponse = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData2)
          })
          
          if (testResponse.ok) {
            console.log(`✅ ${type} business type works`)
          } else {
            const errorData = await testResponse.json()
            console.log(`❌ ${type} business type failed:`, errorData.error?.message)
          }
        }
        
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
      } else if (data.error?.message.includes('business_type')) {
        console.log('🔍 Issue: Business type constraint problem')
      } else if (data.error?.message.includes('owner_name')) {
        console.log('🔍 Issue: Missing owner_name field')
      } else if (data.error?.message.includes('business_name')) {
        console.log('🔍 Issue: Missing business_name field in ai_agents')
      } else {
        console.log('🔍 Issue: Unknown problem')
      }
    }
    
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`)
  }
  
  console.log('\n' + '=' .repeat(50))
  console.log('🏁 COMPREHENSIVE TEST COMPLETE')
}

testComprehensive()
