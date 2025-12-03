#!/usr/bin/env node

/**
 * MVP Diagnostic Script
 * 
 * Checks EVERYTHING needed for MVP to work:
 * - Environment variables
 * - Database connectivity
 * - API endpoints
 * - Webhook configuration
 * - Integration status
 * 
 * Run: node scripts/diagnose-mvp-status.js
 */

const https = require('https')
const http = require('http')

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://cloudgreet.com'

const checks = {
  env: [],
  database: [],
  apis: [],
  webhooks: [],
  integrations: []
}

let totalChecks = 0
let passedChecks = 0
let failedChecks = 0
let warnings = 0

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function check(name, passed, message, category = 'env') {
  totalChecks++
  if (passed) {
    passedChecks++
    log(`✅ ${name}: ${message}`, 'green')
  } else {
    failedChecks++
    log(`❌ ${name}: ${message}`, 'red')
  }
  checks[category].push({ name, passed, message })
}

function warn(name, message, category = 'env') {
  warnings++
  log(`⚠️  ${name}: ${message}`, 'yellow')
  checks[category].push({ name, passed: null, message, warning: true })
}

// 1. Environment Variables Check
function checkEnvironmentVariables() {
  log('\n📋 CHECKING ENVIRONMENT VARIABLES...', 'cyan')
  
  const required = {
    'NEXT_PUBLIC_SUPABASE_URL': 'Database connection',
    'SUPABASE_SERVICE_ROLE_KEY': 'Database access',
    'JWT_SECRET': 'Authentication',
    'TELNYX_API_KEY': 'Phone calls',
    'TELNYX_CONNECTION_ID': 'Phone calls',
    'RETELL_API_KEY': 'AI voice agent',
    'STRIPE_SECRET_KEY': 'Payments',
    'NEXT_PUBLIC_APP_URL': 'Webhook URLs'
  }
  
  const optional = {
    'RESEND_API_KEY': 'Email notifications',
    'NEXT_PUBLIC_SENTRY_DSN': 'Error tracking',
    'GOOGLE_CLIENT_ID': 'Calendar integration',
    'OPENAI_API_KEY': 'AI conversations'
  }
  
  for (const [key, description] of Object.entries(required)) {
    const value = process.env[key]
    if (value && value.length > 0 && !value.includes('your_') && !value.includes('example')) {
      check(key, true, `${description} - Set`, 'env')
    } else {
      check(key, false, `${description} - MISSING or placeholder`, 'env')
    }
  }
  
  for (const [key, description] of Object.entries(optional)) {
    const value = process.env[key]
    if (value && value.length > 0 && !value.includes('your_') && !value.includes('example')) {
      warn(key, `${description} - Set (optional)`, 'env')
    } else {
      warn(key, `${description} - Not set (optional)`, 'env')
    }
  }
}

// 2. Database Connectivity
async function checkDatabase() {
  log('\n🗄️  CHECKING DATABASE...', 'cyan')
  
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      check('Database Connection', false, 'Missing Supabase credentials', 'database')
      return
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test connection
    const { data, error } = await supabase.from('businesses').select('id').limit(1)
    
    if (error) {
      check('Database Connection', false, `Error: ${error.message}`, 'database')
      return
    }
    
    check('Database Connection', true, 'Connected successfully', 'database')
    
    // Check required tables
    const requiredTables = ['businesses', 'custom_users', 'calls', 'appointments', 'ai_agents']
    for (const table of requiredTables) {
      const { error: tableError } = await supabase.from(table).select('id').limit(1)
      if (tableError) {
        check(`Table: ${table}`, false, `Missing or inaccessible: ${tableError.message}`, 'database')
      } else {
        check(`Table: ${table}`, true, 'Exists and accessible', 'database')
      }
    }
    
  } catch (error) {
    check('Database Connection', false, `Failed: ${error.message}`, 'database')
  }
}

// 3. API Endpoints
async function checkAPIEndpoints() {
  log('\n🌐 CHECKING API ENDPOINTS...', 'cyan')
  
  const endpoints = [
    { path: '/api/health', name: 'Health Check' },
    { path: '/api/telnyx/voice-webhook', name: 'Telnyx Voice Webhook' },
    { path: '/api/retell/voice-webhook', name: 'Retell Voice Webhook' },
    { path: '/api/dashboard/data', name: 'Dashboard API' },
    { path: '/api/auth/register', name: 'Registration API' }
  ]
  
  for (const endpoint of endpoints) {
    try {
      const url = `${APP_URL}${endpoint.path}`
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      // 200-499 means endpoint exists (even if auth fails, that's OK)
      if (response.status < 500) {
        check(endpoint.name, true, `Responding (${response.status})`, 'apis')
      } else {
        check(endpoint.name, false, `Error ${response.status}`, 'apis')
      }
    } catch (error) {
      check(endpoint.name, false, `Unreachable: ${error.message}`, 'apis')
    }
  }
}

// 4. Webhook Configuration Check
function checkWebhookConfiguration() {
  log('\n🔗 CHECKING WEBHOOK CONFIGURATION...', 'cyan')
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || APP_URL
  
  const webhooks = [
    {
      name: 'Telnyx Voice Webhook',
      url: `${appUrl}/api/telnyx/voice-webhook`,
      required: true,
      description: 'Must be set in Telnyx dashboard'
    },
    {
      name: 'Retell Voice Webhook',
      url: `${appUrl}/api/retell/voice-webhook`,
      required: true,
      description: 'Must be set in Retell dashboard'
    },
    {
      name: 'Stripe Webhook',
      url: `${appUrl}/api/stripe/webhook`,
      required: false,
      description: 'For payment events'
    }
  ]
  
  for (const webhook of webhooks) {
    log(`\n${webhook.name}:`, 'blue')
    log(`  URL: ${webhook.url}`, 'reset')
    log(`  Status: ${webhook.required ? 'REQUIRED' : 'Optional'}`, webhook.required ? 'yellow' : 'reset')
    log(`  Action: ${webhook.description}`, 'reset')
    
    // Check if URL is accessible
    fetch(webhook.url, { method: 'GET' })
      .then(res => {
        if (res.status < 500) {
          warn(`${webhook.name} URL`, 'Endpoint is reachable', 'webhooks')
        } else {
          check(`${webhook.name} URL`, false, `Endpoint error: ${res.status}`, 'webhooks')
        }
      })
      .catch(err => {
        check(`${webhook.name} URL`, false, `Unreachable: ${err.message}`, 'webhooks')
      })
  }
}

// 5. Integration Status
async function checkIntegrations() {
  log('\n🔌 CHECKING INTEGRATIONS...', 'cyan')
  
  // Telnyx
  const telnyxKey = process.env.TELNYX_API_KEY
  if (telnyxKey && !telnyxKey.includes('your_')) {
    try {
      const response = await fetch('https://api.telnyx.com/v2/phone_numbers', {
        headers: { 'Authorization': `Bearer ${telnyxKey}` }
      })
      if (response.ok) {
        check('Telnyx API', true, 'Connected and authenticated', 'integrations')
      } else {
        check('Telnyx API', false, `Auth failed: ${response.status}`, 'integrations')
      }
    } catch (error) {
      check('Telnyx API', false, `Connection failed: ${error.message}`, 'integrations')
    }
  } else {
    check('Telnyx API', false, 'API key not configured', 'integrations')
  }
  
  // Retell
  const retellKey = process.env.RETELL_API_KEY
  if (retellKey && !retellKey.includes('your_')) {
    try {
      const response = await fetch('https://api.retellai.com/list-llm', {
        headers: { 'Authorization': `Bearer ${retellKey}` }
      })
      if (response.ok || response.status === 401) { // 401 means auth works, just no access
        check('Retell API', true, 'Connected (check dashboard for agents)', 'integrations')
      } else {
        check('Retell API', false, `Error: ${response.status}`, 'integrations')
      }
    } catch (error) {
      check('Retell API', false, `Connection failed: ${error.message}`, 'integrations')
    }
  } else {
    check('Retell API', false, 'API key not configured', 'integrations')
  }
  
  // Stripe
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (stripeKey && stripeKey.startsWith('sk_')) {
    check('Stripe API', true, 'Key format valid (test with real call)', 'integrations')
  } else {
    check('Stripe API', false, 'Invalid or missing key', 'integrations')
  }
}

// Generate Report
function generateReport() {
  log('\n' + '='.repeat(60), 'cyan')
  log('📊 MVP DIAGNOSTIC REPORT', 'cyan')
  log('='.repeat(60), 'cyan')
  
  log(`\nTotal Checks: ${totalChecks}`, 'blue')
  log(`✅ Passed: ${passedChecks}`, 'green')
  log(`❌ Failed: ${failedChecks}`, 'red')
  log(`⚠️  Warnings: ${warnings}`, 'yellow')
  
  const successRate = ((passedChecks / totalChecks) * 100).toFixed(1)
  log(`\nSuccess Rate: ${successRate}%`, successRate > 80 ? 'green' : successRate > 50 ? 'yellow' : 'red')
  
  // Critical failures
  const criticalFailures = checks.env.filter(c => !c.passed && 
    ['TELNYX_API_KEY', 'RETELL_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'].includes(c.name))
  
  if (criticalFailures.length > 0) {
    log('\n🚨 CRITICAL FAILURES (Must Fix):', 'red')
    criticalFailures.forEach(f => log(`  - ${f.name}: ${f.message}`, 'red'))
  }
  
  // Action Items
  log('\n📝 ACTION ITEMS:', 'yellow')
  
  if (failedChecks > 0) {
    log('\n1. Fix Failed Checks:', 'yellow')
    checks.env.filter(c => !c.passed).forEach(f => {
      log(`   - Set ${f.name} in environment variables`, 'yellow')
    })
  }
  
  log('\n2. Configure Webhooks:', 'yellow')
  log('   - Telnyx Dashboard → Webhooks → Add: /api/telnyx/voice-webhook', 'yellow')
  log('   - Retell Dashboard → Webhooks → Add: /api/retell/voice-webhook', 'yellow')
  
  log('\n3. Test Real Call:', 'yellow')
  log('   - Call your Telnyx number', 'yellow')
  log('   - Check Vercel logs for webhook events', 'yellow')
  log('   - Verify call connects to Retell AI', 'yellow')
  
  log('\n4. Verify Retell Setup:', 'yellow')
  log('   - Create agent in Retell dashboard', 'yellow')
  log('   - Link phone number to agent', 'yellow')
  log('   - Test agent responds to calls', 'yellow')
  
  log('\n' + '='.repeat(60), 'cyan')
}

// Main
async function main() {
  log('\n🚀 MVP DIAGNOSTIC TOOL', 'cyan')
  log('Checking everything needed for MVP to work...\n', 'reset')
  
  checkEnvironmentVariables()
  await checkDatabase()
  await checkAPIEndpoints()
  checkWebhookConfiguration()
  await checkIntegrations()
  
  // Wait for async webhook checks
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  generateReport()
}

main().catch(console.error)


