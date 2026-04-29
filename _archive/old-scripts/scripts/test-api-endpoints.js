/**
 * API Endpoint Testing Script
 * Tests all critical API endpoints for proper responses
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const API_URL = `${BASE_URL}/api`

const tests = []
let passed = 0
let failed = 0

function test(name, method, endpoint, body, expectedStatus, validator) {
  tests.push({ name, method, endpoint, body, expectedStatus, validator })
}

// Helper to run a test
async function runTest({ name, method, endpoint, body, expectedStatus, validator }) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${API_URL}${endpoint}`, options)
    const data = await response.json().catch(() => ({}))

    if (response.status !== expectedStatus) {
      console.error(`❌ ${name}: Expected ${expectedStatus}, got ${response.status}`)
      console.error(`   Response:`, data)
      failed++
      return false
    }

    if (validator && !validator(data)) {
      console.error(`❌ ${name}: Validation failed`)
      console.error(`   Data:`, data)
      failed++
      return false
    }

    console.log(`✅ ${name}: ${response.status}`)
    passed++
    return true
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`)
    failed++
    return false
  }
}

// Define tests
console.log('🧪 CloudGreet API Endpoint Tests\n')

// Public endpoints
test('Health Check', 'GET', '/health', null, 200, (data) => data.status === 'ok')
test('Landing Page Initiate Call', 'POST', '/telnyx/initiate-call', {
  phoneNumber: '+15551234567',
  businessId: 'test-business-id'
}, 200, (data) => data.success !== undefined)

// Auth endpoints (will fail without proper setup, but tests structure)
test('Login (Invalid)', 'POST', '/auth/login-simple', {
  email: 'invalid@test.com',
  password: 'wrong'
}, 401)

test('Register (Invalid)', 'POST', '/auth/register-simple', {
  email: 'invalid',
  password: '123'
}, 400)

// Admin endpoints (will fail without auth, but tests structure)
test('Admin Clients List', 'GET', '/admin/clients', null, 401)
test('Admin Analytics', 'GET', '/admin/analytics/usage', null, 401)
test('Admin Billing', 'GET', '/admin/billing/reconciliation', null, 401)

// Client endpoints
test('Client Dashboard Data', 'GET', '/dashboard/data', null, 401)
test('Client Billing', 'GET', '/client/billing', null, 401)

// Webhook endpoints (test structure)
test('Stripe Webhook (Invalid)', 'POST', '/stripe/webhook', {
  type: 'test'
}, 401)

test('Retell Webhook (Ping)', 'POST', '/retell/voice-webhook', {
  event: 'ping'
}, 200, (data) => data.ok === true)

// Run all tests
async function runAllTests() {
  console.log('Running tests...\n')
  
  for (const testCase of tests) {
    await runTest(testCase)
  }

  console.log('\n' + '='.repeat(50))
  console.log('Test Summary')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Total: ${tests.length}`)
  console.log('='.repeat(50))

  process.exit(failed > 0 ? 1 : 0)
}

runAllTests()



 * API Endpoint Testing Script
 * Tests all critical API endpoints for proper responses
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const API_URL = `${BASE_URL}/api`

const tests = []
let passed = 0
let failed = 0

function test(name, method, endpoint, body, expectedStatus, validator) {
  tests.push({ name, method, endpoint, body, expectedStatus, validator })
}

// Helper to run a test
async function runTest({ name, method, endpoint, body, expectedStatus, validator }) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${API_URL}${endpoint}`, options)
    const data = await response.json().catch(() => ({}))

    if (response.status !== expectedStatus) {
      console.error(`❌ ${name}: Expected ${expectedStatus}, got ${response.status}`)
      console.error(`   Response:`, data)
      failed++
      return false
    }

    if (validator && !validator(data)) {
      console.error(`❌ ${name}: Validation failed`)
      console.error(`   Data:`, data)
      failed++
      return false
    }

    console.log(`✅ ${name}: ${response.status}`)
    passed++
    return true
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`)
    failed++
    return false
  }
}

// Define tests
console.log('🧪 CloudGreet API Endpoint Tests\n')

// Public endpoints
test('Health Check', 'GET', '/health', null, 200, (data) => data.status === 'ok')
test('Landing Page Initiate Call', 'POST', '/telnyx/initiate-call', {
  phoneNumber: '+15551234567',
  businessId: 'test-business-id'
}, 200, (data) => data.success !== undefined)

// Auth endpoints (will fail without proper setup, but tests structure)
test('Login (Invalid)', 'POST', '/auth/login-simple', {
  email: 'invalid@test.com',
  password: 'wrong'
}, 401)

test('Register (Invalid)', 'POST', '/auth/register-simple', {
  email: 'invalid',
  password: '123'
}, 400)

// Admin endpoints (will fail without auth, but tests structure)
test('Admin Clients List', 'GET', '/admin/clients', null, 401)
test('Admin Analytics', 'GET', '/admin/analytics/usage', null, 401)
test('Admin Billing', 'GET', '/admin/billing/reconciliation', null, 401)

// Client endpoints
test('Client Dashboard Data', 'GET', '/dashboard/data', null, 401)
test('Client Billing', 'GET', '/client/billing', null, 401)

// Webhook endpoints (test structure)
test('Stripe Webhook (Invalid)', 'POST', '/stripe/webhook', {
  type: 'test'
}, 401)

test('Retell Webhook (Ping)', 'POST', '/retell/voice-webhook', {
  event: 'ping'
}, 200, (data) => data.ok === true)

// Run all tests
async function runAllTests() {
  console.log('Running tests...\n')
  
  for (const testCase of tests) {
    await runTest(testCase)
  }

  console.log('\n' + '='.repeat(50))
  console.log('Test Summary')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Total: ${tests.length}`)
  console.log('='.repeat(50))

  process.exit(failed > 0 ? 1 : 0)
}

runAllTests()


