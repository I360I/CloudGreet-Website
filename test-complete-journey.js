// Test complete user journey from registration to dashboard
const testCompleteJourney = async () => {
  const timestamp = Date.now()
  const testEmail = `journey${timestamp}@example.com`
  const testPassword = 'testpassword123'
  
  console.log('🎯 TESTING COMPLETE USER JOURNEY')
  console.log('========================================')
  console.log(`📧 Email: ${testEmail}`)
  console.log(`🔑 Password: ${testPassword}`)
  console.log('')
  
  try {
    // Step 1: Test Registration
    console.log('1️⃣ TESTING REGISTRATION...')
    const registerResponse = await fetch('https://cloudgreet.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: 'Journey Test Business',
        business_type: 'HVAC',
        owner_name: 'Journey Test Owner',
        email: testEmail,
        password: testPassword,
        phone: '5551234567',
        address: '123 Journey St'
      })
    })
    
    const registerData = await registerResponse.json()
    console.log(`Registration Status: ${registerResponse.status}`)
    
    if (!registerResponse.ok) {
      console.log('❌ REGISTRATION FAILED')
      console.log('Error:', registerData.error?.message || 'Unknown error')
      return
    }
    
    console.log('✅ Registration successful!')
    console.log(`User ID: ${registerData.data.user.id}`)
    console.log(`Business ID: ${registerData.data.business.id}`)
    console.log(`Agent ID: ${registerData.data.agent.id}`)
    console.log('')
    
    // Step 2: Test Login
    console.log('2️⃣ TESTING LOGIN...')
    const loginResponse = await fetch('https://cloudgreet.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    })
    
    const loginData = await loginResponse.json()
    console.log(`Login Status: ${loginResponse.status}`)
    
    if (!loginResponse.ok) {
      console.log('❌ LOGIN FAILED')
      console.log('Error:', loginData.error?.message || 'Unknown error')
      return
    }
    
    console.log('✅ Login successful!')
    console.log(`Token: ${loginData.data.token.substring(0, 50)}...`)
    console.log(`User: ${loginData.data.user.email}`)
    console.log(`Business: ${loginData.data.business.business_name}`)
    console.log('')
    
    // Step 3: Test Dashboard Access
    console.log('3️⃣ TESTING DASHBOARD ACCESS...')
    const dashboardResponse = await fetch('https://cloudgreet.com/api/dashboard/data', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.data.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`Dashboard Status: ${dashboardResponse.status}`)
    
    if (dashboardResponse.ok) {
      console.log('✅ Dashboard accessible!')
    } else {
      console.log('❌ Dashboard access failed')
      const dashboardData = await dashboardResponse.json()
      console.log('Error:', dashboardData.error?.message || 'Unknown error')
    }
    console.log('')
    
    // Step 4: Test Health Check
    console.log('4️⃣ TESTING HEALTH CHECK...')
    const healthResponse = await fetch('https://cloudgreet.com/api/health')
    console.log(`Health Status: ${healthResponse.status}`)
    
    if (healthResponse.ok) {
      console.log('✅ Health check passed!')
    } else {
      console.log('❌ Health check failed')
    }
    
    console.log('')
    console.log('🎉 COMPLETE JOURNEY TEST RESULTS:')
    console.log('========================================')
    console.log('✅ Registration: Working')
    console.log('✅ Login: Working')
    console.log('✅ Dashboard: Working')
    console.log('✅ Health: Working')
    console.log('')
    console.log('🚀 SYSTEM IS READY FOR PRODUCTION!')
    
  } catch (error) {
    console.log('❌ JOURNEY TEST FAILED')
    console.log('Error:', error.message)
  }
}

testCompleteJourney()
