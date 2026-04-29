/**
 * Performance Testing Script
 * Tests API endpoint response times and identifies slow queries
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const API_URL = `${BASE_URL}/api`

const results = []

async function measureTime(name, fn) {
  const start = Date.now()
  try {
    await fn()
    const duration = Date.now() - start
    results.push({ name, duration, success: true })
    return duration
  } catch (error) {
    const duration = Date.now() - start
    results.push({ name, duration, success: false, error: error.message })
    return duration
  }
}

async function testEndpoint(name, endpoint, method = 'GET', body = null) {
  return measureTime(name, async () => {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${API_URL}${endpoint}`, options)
    if (!response.ok && response.status !== 401 && response.status !== 403) {
      throw new Error(`HTTP ${response.status}`)
    }
  })
}

async function runPerformanceTests() {
  console.log('🚀 CloudGreet Performance Tests\n')
  console.log('Testing endpoint response times...\n')

  // Public endpoints
  await testEndpoint('Health Check', '/health')
  await testEndpoint('Landing Page', '/landing')

  // Auth endpoints
  await testEndpoint('Login (Invalid)', '/auth/login-simple', 'POST', {
    email: 'test@test.com',
    password: 'wrong'
  })

  // Admin endpoints (will fail auth, but measures response time)
  await testEndpoint('Admin Clients', '/admin/clients')
  await testEndpoint('Admin Analytics', '/admin/analytics/usage')
  await testEndpoint('Admin Billing', '/admin/billing/reconciliation')

  // Client endpoints
  await testEndpoint('Dashboard Data', '/dashboard/data')
  await testEndpoint('Client Billing', '/client/billing')

  // Webhook endpoints
  await testEndpoint('Retell Webhook (Ping)', '/retell/voice-webhook', 'POST', {
    event: 'ping'
  })

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('Performance Results')
  console.log('='.repeat(60))
  
  const thresholds = {
    excellent: 200,
    good: 500,
    acceptable: 1000,
    slow: 2000
  }

  results.forEach(({ name, duration, success, error }) => {
    let status = '❌'
    let color = ''
    
    if (!success) {
      status = 'ERROR'
      color = '\x1b[31m' // Red
    } else if (duration < thresholds.excellent) {
      status = '⚡ EXCELLENT'
      color = '\x1b[32m' // Green
    } else if (duration < thresholds.good) {
      status = '✓ GOOD'
      color = '\x1b[33m' // Yellow
    } else if (duration < thresholds.acceptable) {
      status = '⚠ ACCEPTABLE'
      color = '\x1b[33m' // Yellow
    } else {
      status = '🐌 SLOW'
      color = '\x1b[31m' // Red
    }

    const reset = '\x1b[0m'
    console.log(`${color}${status}${reset} ${name.padEnd(40)} ${duration}ms`)
    
    if (error) {
      console.log(`   Error: ${error}`)
    }
  })

  console.log('='.repeat(60))
  
  const avgTime = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.success).length

  const slowEndpoints = results.filter(r => r.success && r.duration > thresholds.acceptable)
  
  console.log(`\nAverage Response Time: ${Math.round(avgTime)}ms`)
  console.log(`Slow Endpoints (>${thresholds.acceptable}ms): ${slowEndpoints.length}`)
  
  if (slowEndpoints.length > 0) {
    console.log('\n⚠️  Slow endpoints detected:')
    slowEndpoints.forEach(({ name, duration }) => {
      console.log(`   - ${name}: ${duration}ms`)
    })
  }

  console.log('\nPerformance Targets:')
  console.log(`   ⚡ Excellent: < ${thresholds.excellent}ms`)
  console.log(`   ✓ Good: < ${thresholds.good}ms`)
  console.log(`   ⚠ Acceptable: < ${thresholds.acceptable}ms`)
  console.log(`   🐌 Slow: > ${thresholds.acceptable}ms`)
}

runPerformanceTests().catch(console.error)



 * Performance Testing Script
 * Tests API endpoint response times and identifies slow queries
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const API_URL = `${BASE_URL}/api`

const results = []

async function measureTime(name, fn) {
  const start = Date.now()
  try {
    await fn()
    const duration = Date.now() - start
    results.push({ name, duration, success: true })
    return duration
  } catch (error) {
    const duration = Date.now() - start
    results.push({ name, duration, success: false, error: error.message })
    return duration
  }
}

async function testEndpoint(name, endpoint, method = 'GET', body = null) {
  return measureTime(name, async () => {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${API_URL}${endpoint}`, options)
    if (!response.ok && response.status !== 401 && response.status !== 403) {
      throw new Error(`HTTP ${response.status}`)
    }
  })
}

async function runPerformanceTests() {
  console.log('🚀 CloudGreet Performance Tests\n')
  console.log('Testing endpoint response times...\n')

  // Public endpoints
  await testEndpoint('Health Check', '/health')
  await testEndpoint('Landing Page', '/landing')

  // Auth endpoints
  await testEndpoint('Login (Invalid)', '/auth/login-simple', 'POST', {
    email: 'test@test.com',
    password: 'wrong'
  })

  // Admin endpoints (will fail auth, but measures response time)
  await testEndpoint('Admin Clients', '/admin/clients')
  await testEndpoint('Admin Analytics', '/admin/analytics/usage')
  await testEndpoint('Admin Billing', '/admin/billing/reconciliation')

  // Client endpoints
  await testEndpoint('Dashboard Data', '/dashboard/data')
  await testEndpoint('Client Billing', '/client/billing')

  // Webhook endpoints
  await testEndpoint('Retell Webhook (Ping)', '/retell/voice-webhook', 'POST', {
    event: 'ping'
  })

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('Performance Results')
  console.log('='.repeat(60))
  
  const thresholds = {
    excellent: 200,
    good: 500,
    acceptable: 1000,
    slow: 2000
  }

  results.forEach(({ name, duration, success, error }) => {
    let status = '❌'
    let color = ''
    
    if (!success) {
      status = 'ERROR'
      color = '\x1b[31m' // Red
    } else if (duration < thresholds.excellent) {
      status = '⚡ EXCELLENT'
      color = '\x1b[32m' // Green
    } else if (duration < thresholds.good) {
      status = '✓ GOOD'
      color = '\x1b[33m' // Yellow
    } else if (duration < thresholds.acceptable) {
      status = '⚠ ACCEPTABLE'
      color = '\x1b[33m' // Yellow
    } else {
      status = '🐌 SLOW'
      color = '\x1b[31m' // Red
    }

    const reset = '\x1b[0m'
    console.log(`${color}${status}${reset} ${name.padEnd(40)} ${duration}ms`)
    
    if (error) {
      console.log(`   Error: ${error}`)
    }
  })

  console.log('='.repeat(60))
  
  const avgTime = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.success).length

  const slowEndpoints = results.filter(r => r.success && r.duration > thresholds.acceptable)
  
  console.log(`\nAverage Response Time: ${Math.round(avgTime)}ms`)
  console.log(`Slow Endpoints (>${thresholds.acceptable}ms): ${slowEndpoints.length}`)
  
  if (slowEndpoints.length > 0) {
    console.log('\n⚠️  Slow endpoints detected:')
    slowEndpoints.forEach(({ name, duration }) => {
      console.log(`   - ${name}: ${duration}ms`)
    })
  }

  console.log('\nPerformance Targets:')
  console.log(`   ⚡ Excellent: < ${thresholds.excellent}ms`)
  console.log(`   ✓ Good: < ${thresholds.good}ms`)
  console.log(`   ⚠ Acceptable: < ${thresholds.acceptable}ms`)
  console.log(`   🐌 Slow: > ${thresholds.acceptable}ms`)
}

runPerformanceTests().catch(console.error)


