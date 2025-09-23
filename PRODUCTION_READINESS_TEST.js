// Production Readiness Test - Comprehensive verification
const fetch = require('node-fetch')

async function testEndpoint(endpoint, method = 'GET', body = null, expectedStatus = 200, description = '') {
  try {
    const options = { method, headers: { 'Content-Type': 'application/json' } }
    if (body) options.body = JSON.stringify(body)
    
    const response = await fetch(`http://localhost:3005${endpoint}`, options)
    const isSuccess = response.status === expectedStatus || (expectedStatus === 200 && response.ok)
    
    console.log(`${isSuccess ? '✅' : '❌'} ${description || `${method} ${endpoint}`} - Status: ${response.status}`)
    
    if (!isSuccess) {
      const text = await response.text()
      console.log(`   Error: ${text.substring(0, 200)}...`)
    }
    
    return { success: isSuccess, status: response.status, response: response }
  } catch (error) {
    console.log(`❌ ${description || `${method} ${endpoint}`} - Error: ${error.message}`)
    return { success: false, status: 'error', error: error.message }
  }
}

async function testProductionReadiness() {
  console.log('🏭 PRODUCTION READINESS TEST')
  console.log('============================\n')
  
  const results = {
    server: false,
    admin: false,
    contact: false,
    pricing: false,
    registration: false,
    stripe: false,
    business: false,
    health: false
  }
  
  // Test 1: Server Health
  console.log('1️⃣ Testing Server Health...')
  const healthResult = await testEndpoint('/api/health', 'GET', null, 200, 'Server Health Check')
  results.health = healthResult.success
  
  // Test 2: Admin System
  console.log('\n2️⃣ Testing Admin System...')
  const adminResult = await testEndpoint('/api/admin/auth', 'POST', { password: '1487' }, 200, 'Admin Authentication')
  results.admin = adminResult.success
  
  // Test 3: Contact Form
  console.log('\n3️⃣ Testing Contact Form...')
  const contactResult = await testEndpoint('/api/contact/submit', 'POST', {
    firstName: 'Production',
    lastName: 'Test',
    email: 'production@test.com',
    subject: 'Production Test',
    message: 'Testing production readiness'
  }, 200, 'Contact Form Submission')
  results.contact = contactResult.success
  
  // Test 4: Pricing Plans
  console.log('\n4️⃣ Testing Pricing System...')
  const pricingResult = await testEndpoint('/api/pricing/plans', 'GET', null, 200, 'Pricing Plans')
  results.pricing = pricingResult.success
  
  // Test 5: Registration (CRITICAL)
  console.log('\n5️⃣ Testing Registration System...')
  const registrationResult = await testEndpoint('/api/auth/register', 'POST', {
    businessName: 'Production Test Business',
    businessType: 'HVAC',
    firstName: 'Production',
    lastName: 'Test',
    email: `production_${Date.now()}@test.com`,
    password: 'productionpass123',
    phone: '5551234567',
    address: '123 Production St'
  }, 200, 'User Registration')
  results.registration = registrationResult.success
  
  // Test 6: Stripe Integration
  console.log('\n6️⃣ Testing Stripe Integration...')
  const stripeResult = await testEndpoint('/api/stripe/create-customer', 'POST', {
    email: 'stripe@test.com',
    name: 'Stripe Test Customer'
  }, 200, 'Stripe Customer Creation')
  results.stripe = stripeResult.success
  
  // Test 7: Business Profile
  console.log('\n7️⃣ Testing Business Setup...')
  const businessResult = await testEndpoint('/api/business/profile', 'GET', null, 401, 'Business Profile (Auth Required)')
  results.business = businessResult.success
  
  // Calculate readiness
  const workingCount = Object.values(results).filter(Boolean).length
  const totalCount = Object.keys(results).length
  const percentage = Math.round((workingCount / totalCount) * 100)
  
  console.log('\n📊 PRODUCTION READINESS RESULTS')
  console.log('================================')
  console.log(`Server Health: ${results.health ? '✅' : '❌'}`)
  console.log(`Admin System: ${results.admin ? '✅' : '❌'}`)
  console.log(`Contact Form: ${results.contact ? '✅' : '❌'}`)
  console.log(`Pricing Plans: ${results.pricing ? '✅' : '❌'}`)
  console.log(`Registration: ${results.registration ? '✅' : '❌'}`)
  console.log(`Stripe Integration: ${results.stripe ? '✅' : '❌'}`)
  console.log(`Business Setup: ${results.business ? '✅' : '❌'}`)
  
  console.log(`\n🎯 PRODUCTION READINESS: ${workingCount}/${totalCount} (${percentage}%)`)
  
  // Critical issues check
  const criticalIssues = []
  if (!results.registration) criticalIssues.push('Registration system not working')
  if (!results.stripe) criticalIssues.push('Stripe integration not working')
  if (!results.contact) criticalIssues.push('Contact form not working')
  if (!results.admin) criticalIssues.push('Admin system not working')
  
  if (criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES FOUND:')
    criticalIssues.forEach(issue => console.log(`   ❌ ${issue}`))
  }
  
  if (percentage === 100) {
    console.log('\n🎉 100% PRODUCTION READY!')
    console.log('✅ All systems operational')
    console.log('✅ Automated onboarding working')
    console.log('✅ Payment processing ready')
    console.log('✅ Admin controls functional')
    console.log('✅ Contact system operational')
    console.log('\n🚀 READY FOR CLIENT ACQUISITION!')
    return true
  } else if (percentage >= 85) {
    console.log('\n⚠️  NEARLY PRODUCTION READY')
    console.log('🔧 Minor fixes needed before launch')
    return false
  } else {
    console.log('\n❌ NOT PRODUCTION READY')
    console.log('🔧 Major issues need to be resolved')
    return false
  }
}

testProductionReadiness().then(isReady => {
  console.log(`\n🏁 FINAL VERDICT: ${isReady ? 'PRODUCTION READY' : 'NOT READY FOR PRODUCTION'}`)
  process.exit(isReady ? 0 : 1)
})

