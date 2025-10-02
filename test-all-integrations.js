// Test all CloudGreet integrations
const testAllIntegrations = async () => {
  console.log('🚀 TESTING ALL CLOUDGREET INTEGRATIONS')
  console.log('========================================')
  
  const results = {
    health: false,
    registration: false,
    login: false,
    dashboard: false,
    sms: false,
    admin: false
  }
  
  try {
    // 1. Test Health Check
    console.log('1️⃣ Testing Health Check...')
    const healthResponse = await fetch('https://cloudgreet.com/api/health')
    const healthData = await healthResponse.json()
    results.health = healthResponse.ok
    console.log(`   Status: ${healthResponse.ok ? '✅ Working' : '❌ Failed'}`)
    
    // 2. Test Registration
    console.log('2️⃣ Testing Registration...')
    const registerResponse = await fetch('https://cloudgreet.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: 'Integration Test Business',
        business_type: 'HVAC',
        owner_name: 'Integration Test Owner',
        email: `integration${Date.now()}@example.com`,
        password: 'testpassword123',
        phone: '5551234567',
        address: '123 Integration St'
      })
    })
    const registerData = await registerResponse.json()
    results.registration = registerResponse.ok
    console.log(`   Status: ${registerResponse.ok ? '✅ Working' : '❌ Failed'}`)
    
    if (!registerResponse.ok) {
      console.log(`   Error: ${registerData.error?.message || 'Unknown'}`)
    }
    
    // 3. Test Login
    console.log('3️⃣ Testing Login...')
    const loginResponse = await fetch('https://cloudgreet.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'integration@example.com',
        password: 'testpassword123'
      })
    })
    const loginData = await loginResponse.json()
    results.login = loginResponse.status === 401 // Expected for non-existent user
    console.log(`   Status: ${results.login ? '✅ Working' : '❌ Failed'}`)
    
    // 4. Test Dashboard (with demo data)
    console.log('4️⃣ Testing Dashboard...')
    const dashboardResponse = await fetch('https://cloudgreet.com/api/dashboard/data')
    const dashboardData = await dashboardResponse.json()
    results.dashboard = dashboardResponse.status === 401 // Expected without auth
    console.log(`   Status: ${results.dashboard ? '✅ Working' : '❌ Failed'}`)
    
    // 5. Test SMS Notifications
    console.log('5️⃣ Testing SMS Notifications...')
    const smsResponse = await fetch('https://cloudgreet.com/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: '+17372960092',
        message: 'Integration test from CloudGreet',
        type: 'test'
      })
    })
    const smsData = await smsResponse.json()
    results.sms = smsResponse.ok
    console.log(`   Status: ${smsResponse.ok ? '✅ Working' : '❌ Failed'}`)
    
    // 6. Test Admin Dashboard
    console.log('6️⃣ Testing Admin Dashboard...')
    const adminResponse = await fetch('https://cloudgreet.com/api/admin/stats')
    const adminData = await adminResponse.json()
    results.admin = adminResponse.ok
    console.log(`   Status: ${adminResponse.ok ? '✅ Working' : '❌ Failed'}`)
    
    // Summary
    console.log('')
    console.log('📊 INTEGRATION TEST RESULTS:')
    console.log('========================================')
    console.log(`Health Check: ${results.health ? '✅' : '❌'}`)
    console.log(`Registration: ${results.registration ? '✅' : '❌'}`)
    console.log(`Login: ${results.login ? '✅' : '❌'}`)
    console.log(`Dashboard: ${results.dashboard ? '✅' : '❌'}`)
    console.log(`SMS: ${results.sms ? '✅' : '❌'}`)
    console.log(`Admin: ${results.admin ? '✅' : '❌'}`)
    
    const totalWorking = Object.values(results).filter(Boolean).length
    const totalTests = Object.keys(results).length
    const percentage = Math.round((totalWorking / totalTests) * 100)
    
    console.log('')
    console.log(`🎯 OVERALL SCORE: ${totalWorking}/${totalTests} (${percentage}%)`)
    
    if (percentage >= 90) {
      console.log('🚀 EXCELLENT! System is production ready!')
    } else if (percentage >= 70) {
      console.log('⚠️  GOOD! Minor issues to address.')
    } else {
      console.log('❌ NEEDS WORK! Several issues to fix.')
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

testAllIntegrations()
