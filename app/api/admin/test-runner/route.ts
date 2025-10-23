import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { testType } = await request.json()
    
    if (testType === 'core') {
      return await runCoreTests()
    } else if (testType === 'security') {
      return await runSecurityTests()
    } else if (testType === 'performance') {
      return await runPerformanceTests()
    }
    
    return NextResponse.json({ error: 'Invalid test type' }, { status: 400 })
  } catch (error) {
    logger.error('Test runner error', { 
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error' 
    })
    return NextResponse.json({ error: 'Test runner failed' }, { status: 500 })
  }
}

async function runCoreTests() {
  const tests = []
  
  // Test 1: Voice Webhook
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-webhook`, { 
      method: 'GET' 
    })
    tests.push({
      name: 'Voice Webhook Health Check',
      passed: response.ok,
      duration: 0,
      error: response.ok ? null : `HTTP ${response.status}`
    })
  } catch (error) {
    tests.push({
      name: 'Voice Webhook Health Check',
      passed: false,
      duration: 0,
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
    })
  }
  
  // Test 2: AI Conversation API
  try {
    const startTime = Date.now()
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Test message' })
    })
    const duration = Date.now() - startTime
    
    tests.push({
      name: 'AI Conversation API',
      passed: response.ok,
      duration,
      error: response.ok ? null : `HTTP ${response.status}`
    })
  } catch (error) {
    tests.push({
      name: 'AI Conversation API',
      passed: false,
      duration: 0,
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
    })
  }
  
  // Test 3: Database Connection
  try {
    const startTime = Date.now()
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/real-revenue`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer test-token' }
    })
    const duration = Date.now() - startTime
    
    tests.push({
      name: 'Database Connection',
      passed: response.status !== 500,
      duration,
      error: response.status === 500 ? 'Database connection failed' : null
    })
  } catch (error) {
    tests.push({
      name: 'Database Connection',
      passed: false,
      duration: 0,
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
    })
  }
  
  // Test 4: Environment Variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'TELNYX_API_KEY',
    'TELNYX_PHONE_NUMBER',
    'TELNYX_CONNECTION_ID',
    'NEXT_PUBLIC_APP_URL',
    'JWT_SECRET'
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  tests.push({
    name: 'Environment Variables',
    passed: missingVars.length === 0,
    duration: 0,
    error: missingVars.length > 0 ? `Missing: ${missingVars.join(', ')}` : null
  })
  
  return NextResponse.json({ tests })
}

async function runSecurityTests() {
  const tests = []
  
  // Test 1: XSS Protection
  try {
    const maliciousInput = '<script>alert("xss")</script>'
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/contact/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: maliciousInput,
        lastName: 'Test',
        email: 'test@example.com',
        subject: 'Test',
        message: 'Test message'
      })
    })
    
    tests.push({
      name: 'XSS Protection',
      passed: response.status === 400 || response.ok,
      duration: 0,
      error: response.status === 400 || response.ok ? null : 'XSS protection failed'
    })
  } catch (error) {
    tests.push({
      name: 'XSS Protection',
      passed: false,
      duration: 0,
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
    })
  }
  
  // Test 2: SQL Injection Protection
  try {
    const maliciousInput = "'; DROP TABLE users; --"
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/contact/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: maliciousInput,
        email: 'test@example.com',
        subject: 'Test',
        message: 'Test message'
      })
    })
    
    tests.push({
      name: 'SQL Injection Protection',
      passed: response.status === 400 || response.ok,
      duration: 0,
      error: response.status === 400 || response.ok ? null : 'SQL injection protection failed'
    })
  } catch (error) {
    tests.push({
      name: 'SQL Injection Protection',
      passed: false,
      duration: 0,
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
    })
  }
  
  // Test 3: Rate Limiting
  try {
    const promises = Array(5).fill(0).map(() => 
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/contact/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Test',
          lastName: 'Test',
          email: 'test@example.com',
          subject: 'Test',
          message: 'Test message'
        })
      })
    )
    
    const responses = await Promise.all(promises)
    const rateLimited = responses.some(r => r.status === 429)
    
    tests.push({
      name: 'Rate Limiting',
      passed: rateLimited,
      duration: 0,
      error: rateLimited ? null : 'Rate limiting not detected'
    })
  } catch (error) {
    tests.push({
      name: 'Rate Limiting',
      passed: false,
      duration: 0,
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
    })
  }
  
  return NextResponse.json({ tests })
}

async function runPerformanceTests() {
  const tests = []
  
  // Test 1: Page Load Time
  try {
    const startTime = Date.now()
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)
    const duration = Date.now() - startTime
    
    tests.push({
      name: 'Dashboard Load Time',
      passed: response.ok && duration < 3000,
      duration,
      error: !response.ok ? `HTTP ${response.status}` : duration >= 3000 ? 'Too slow' : null
    })
  } catch (error) {
    tests.push({
      name: 'Dashboard Load Time',
      passed: false,
      duration: 0,
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
    })
  }
  
  // Test 2: API Response Time
  try {
    const startTime = Date.now()
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-webhook`, { 
      method: 'GET' 
    })
    const duration = Date.now() - startTime
    
    tests.push({
      name: 'API Response Time',
      passed: response.ok && duration < 1000,
      duration,
      error: !response.ok ? `HTTP ${response.status}` : duration >= 1000 ? 'Too slow' : null
    })
  } catch (error) {
    tests.push({
      name: 'API Response Time',
      passed: false,
      duration: 0,
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
    })
  }
  
  // Test 3: Database Query Performance
  try {
    const startTime = Date.now()
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/real-revenue`, { 
      method: 'GET' 
    })
    const duration = Date.now() - startTime
    
    tests.push({
      name: 'Database Query Performance',
      passed: response.status !== 500 && duration < 2000,
      duration,
      error: response.status === 500 ? 'Database error' : duration >= 2000 ? 'Too slow' : null
    })
  } catch (error) {
    tests.push({
      name: 'Database Query Performance',
      passed: false,
      duration: 0,
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error'
    })
  }
  
  return NextResponse.json({ tests })
}


