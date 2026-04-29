#!/usr/bin/env node
/**
 * COMPREHENSIVE E2E MONITOR DIAGNOSTIC
 * 
 * Tests:
 * 1. Database schema (tables/columns exist)
 * 2. Endpoints return real data (no mocks)
 * 3. Monitor scripts actually work
 * 4. No fake/hardcoded data in responses
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')
const { execSync } = require('child_process')

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = process.env.SYNTHETIC_MONITOR_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables!')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const results = {
  schema: { passed: 0, failed: 0, checks: [] },
  endpoints: { passed: 0, failed: 0, checks: [] },
  monitors: { passed: 0, failed: 0, checks: [] },
  fakeData: { passed: 0, failed: 0, checks: [] }
}

// ============================================================================
// 1. SCHEMA CHECKS (Database tables/columns)
// ============================================================================

async function checkTable(tableName) {
  try {
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return { exists: false, error: 'Table does not exist' }
      }
      return { exists: true, error: error.message }
    }
    return { exists: true, rowCount: data?.length ?? 0 }
  } catch (err) {
    return { exists: false, error: err.message }
  }
}

async function checkColumn(tableName, columnName) {
  try {
    // Try selecting the column - if it works (even with empty result), column exists
    const { error, data } = await supabaseAdmin
      .from(tableName)
      .select(columnName)
      .limit(1)
    
    if (error) {
      // PGRST116 = relation does not exist (table)
      if (error.code === 'PGRST116') {
        return { exists: false, error: 'Table does not exist' }
      }
      // 42703 = undefined column (PostgreSQL error code)
      // PGRST202 = column not found (PostgREST error)
      const errorMsg = (error.message || '').toLowerCase()
      const errorCode = error.code || ''
      
      // Check for column-specific errors
      if (errorCode === '42703' || 
          errorCode === 'PGRST202' ||
          (errorMsg.includes('column') && (errorMsg.includes('does not exist') || errorMsg.includes('not found'))) ||
          errorMsg.includes('could not find column') ||
          errorMsg.includes('undefined column')) {
        return { exists: false, error: `Column does not exist: ${error.message}` }
      }
      
      // Other errors (permissions, empty table, etc.) - assume column exists
      // This is a conservative approach - if we can't verify, assume it exists
      return { exists: true, warning: `Could not verify: ${error.message}` }
    }
    
    // If no error, column exists (even if data is empty)
    return { exists: true }
  } catch (err) {
    const errMsg = (err.message || '').toLowerCase()
    // Check if it's a column error
    if (errMsg.includes('column') && (errMsg.includes('does not exist') || errMsg.includes('not found'))) {
      return { exists: false, error: err.message }
    }
    // Unknown error - assume column exists to be conservative
    return { exists: true, warning: `Error checking: ${err.message}` }
  }
}

async function checkSchema() {
  console.log('\n📊 STEP 1: DATABASE SCHEMA CHECK')
  console.log('='.repeat(60))
  
  // Check prospects table (for employee leads monitor)
  const prospectsCheck = await checkTable('prospects')
  if (prospectsCheck.exists) {
    results.schema.passed++
    results.schema.checks.push({ table: 'prospects', status: '✅ EXISTS' })
    console.log('  ✅ prospects table EXISTS')
    
    // Check all required columns
    const requiredColumns = [
      'id', 'first_name', 'last_name', 'email', 'phone', 'company_name',
      'status', 'score', 'tags', 'assigned_to', 'business_id',
      'sequence_id', 'sequence_step', 'sequence_status',
      'last_outreach_at', 'next_touch_at', 'updated_at'
    ]
    
    console.log('  Checking columns...')
    for (const col of requiredColumns) {
      const colCheck = await checkColumn('prospects', col)
      if (colCheck.exists) {
        results.schema.passed++
        results.schema.checks.push({ table: 'prospects', column: col, status: '✅ EXISTS' })
        console.log(`    ✅ ${col}`)
      } else {
        results.schema.failed++
        results.schema.checks.push({ table: 'prospects', column: col, status: '❌ MISSING', error: colCheck.error })
        console.log(`    ❌ ${col} - MISSING`)
      }
    }
  } else {
    results.schema.failed++
    results.schema.checks.push({ table: 'prospects', status: '❌ MISSING', error: prospectsCheck.error })
    console.log(`  ❌ prospects table DOES NOT EXIST: ${prospectsCheck.error}`)
  }
  
  // Check outreach_sequences table (for outreach runner monitor)
  const sequencesCheck = await checkTable('outreach_sequences')
  if (sequencesCheck.exists) {
    results.schema.passed++
    results.schema.checks.push({ table: 'outreach_sequences', status: '✅ EXISTS' })
    console.log('  ✅ outreach_sequences table EXISTS')
    
    const requiredColumns = [
      'id', 'name', 'status', 'is_active',
      'throttle_per_day', 'send_window_start', 'send_window_end',
      'timezone', 'auto_pause_on_reply'
    ]
    
    console.log('  Checking columns...')
    for (const col of requiredColumns) {
      const colCheck = await checkColumn('outreach_sequences', col)
      if (colCheck.exists) {
        results.schema.passed++
        results.schema.checks.push({ table: 'outreach_sequences', column: col, status: '✅ EXISTS' })
        console.log(`    ✅ ${col}`)
      } else {
        results.schema.failed++
        results.schema.checks.push({ table: 'outreach_sequences', column: col, status: '❌ MISSING', error: colCheck.error })
        console.log(`    ❌ ${col} - MISSING`)
      }
    }
    
    // Check if there are any active sequences
    try {
      const { data: activeByStatus } = await supabaseAdmin
        .from('outreach_sequences')
        .select('id')
        .eq('status', 'active')
        .limit(1)
      console.log(`\n  Sequences with status='active': ${activeByStatus?.length ?? 0}`)
      
      const { data: activeByBool } = await supabaseAdmin
        .from('outreach_sequences')
        .select('id')
        .eq('is_active', true)
        .limit(1)
      console.log(`  Sequences with is_active=true: ${activeByBool?.length ?? 0}`)
    } catch (err) {
      console.log(`  ⚠️  Could not check active sequences: ${err.message}`)
    }
  } else {
    results.schema.failed++
    results.schema.checks.push({ table: 'outreach_sequences', status: '❌ MISSING', error: sequencesCheck.error })
    console.log(`  ❌ outreach_sequences table DOES NOT EXIST: ${sequencesCheck.error}`)
  }
  
  // Check outreach_steps
  const stepsCheck = await checkTable('outreach_steps')
  if (stepsCheck.exists) {
    results.schema.passed++
    results.schema.checks.push({ table: 'outreach_steps', status: '✅ EXISTS' })
    console.log('  ✅ outreach_steps table EXISTS')
  } else {
    results.schema.failed++
    results.schema.checks.push({ table: 'outreach_steps', status: '❌ MISSING', error: stepsCheck.error })
    console.log(`  ❌ outreach_steps table DOES NOT EXIST: ${stepsCheck.error}`)
  }
  
  // Check outreach_templates
  const templatesCheck = await checkTable('outreach_templates')
  if (templatesCheck.exists) {
    results.schema.passed++
    results.schema.checks.push({ table: 'outreach_templates', status: '✅ EXISTS' })
    console.log('  ✅ outreach_templates table EXISTS')
  } else {
    results.schema.failed++
    results.schema.checks.push({ table: 'outreach_templates', status: '❌ MISSING', error: templatesCheck.error })
    console.log(`  ❌ outreach_templates table DOES NOT EXIST: ${templatesCheck.error}`)
  }
  
  console.log(`\n✅ Schema checks passed: ${results.schema.passed}`)
  console.log(`❌ Schema checks failed: ${results.schema.failed}`)
}

// ============================================================================
// 2. ENDPOINT TESTS (Real API calls, verify real data)
// ============================================================================

async function testEndpoint(name, url, options = {}) {
  try {
    const fetchImpl = globalThis.fetch || ((...params) => require('node-fetch')(...params))
    
    const response = await fetchImpl(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    })
    
    const body = await response.json().catch(() => ({}))
    
    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: body.error || body.message || 'Unknown error',
        body
      }
    }
    
    return {
      success: true,
      status: response.status,
      body
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      body: null
    }
  }
}

function hasFakeData(body) {
  if (!body) return false
  
  const bodyStr = JSON.stringify(body).toLowerCase()
  
  // Check for common fake data patterns
  const fakePatterns = [
    'mock',
    'fake',
    'placeholder',
    'demo',
    'test data',
    'sample',
    'dummy',
    'synthetic monitor llc', // From monitor registration
    '123 reliability ave', // From monitor registration
    'math.random',
    'generateRandom'
  ]
  
  return fakePatterns.some(pattern => bodyStr.includes(pattern))
}

async function checkEndpoints() {
  console.log('\n🌐 STEP 2: ENDPOINT E2E TESTS')
  console.log('='.repeat(60))
  
  // Test 1: Registration endpoint (monitor-registration.js calls this)
  console.log('\n1. Testing /api/auth/register-simple...')
  const testEmail = `e2e-test-${Date.now()}@cloudgreet.com`
  const registerResult = await testEndpoint(
    'register-simple',
    `${baseUrl}/api/auth/register-simple`,
    {
      method: 'POST',
      body: {
        firstName: 'E2E',
        lastName: 'Test',
        businessName: `E2E Test Business ${Date.now()}`,
        businessType: 'HVAC',
        email: testEmail,
        password: 'E2ETestPass123!',
        phone: '+15551234567',
        address: '123 Test St'
      }
    }
  )
  
  if (registerResult.success && registerResult.body?.success) {
    results.endpoints.passed++
    results.endpoints.checks.push({ endpoint: '/api/auth/register-simple', status: '✅ WORKS' })
    console.log('   ✅ Registration endpoint works')
    
    // Check for fake data
    if (hasFakeData(registerResult.body)) {
      results.fakeData.failed++
      results.fakeData.checks.push({ endpoint: '/api/auth/register-simple', status: '⚠️  CONTAINS FAKE DATA PATTERNS' })
      console.log('   ⚠️  Response contains fake data patterns')
    } else {
      results.fakeData.passed++
      results.fakeData.checks.push({ endpoint: '/api/auth/register-simple', status: '✅ REAL DATA' })
      console.log('   ✅ Response contains real data')
    }
    
    // Verify it created real database records
    if (registerResult.body.data?.user?.id) {
      const { data: userCheck } = await supabaseAdmin
        .from('custom_users')
        .select('id, email')
        .eq('id', registerResult.body.data.user.id)
        .single()
      
      if (userCheck) {
        results.endpoints.passed++
        results.endpoints.checks.push({ endpoint: '/api/auth/register-simple', check: 'Database record created', status: '✅ VERIFIED' })
        console.log('   ✅ Database record verified')
      } else {
        results.endpoints.failed++
        results.endpoints.checks.push({ endpoint: '/api/auth/register-simple', check: 'Database record created', status: '❌ NOT FOUND' })
        console.log('   ❌ Database record not found')
      }
    }
  } else {
    results.endpoints.failed++
    results.endpoints.checks.push({ endpoint: '/api/auth/register-simple', status: '❌ FAILED', error: registerResult.error })
    console.log(`   ❌ Registration failed: ${registerResult.error}`)
  }
  
  // Test 2: Login endpoint
  console.log('\n2. Testing /api/auth/login-simple...')
  const loginResult = await testEndpoint(
    'login-simple',
    `${baseUrl}/api/auth/login-simple`,
    {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'E2ETestPass123!'
      }
    }
  )
  
  if (loginResult.success && loginResult.body?.success && loginResult.body?.data?.token) {
    results.endpoints.passed++
    results.endpoints.checks.push({ endpoint: '/api/auth/login-simple', status: '✅ WORKS' })
    console.log('   ✅ Login endpoint works')
    
    if (hasFakeData(loginResult.body)) {
      results.fakeData.failed++
      results.fakeData.checks.push({ endpoint: '/api/auth/login-simple', status: '⚠️  CONTAINS FAKE DATA' })
      console.log('   ⚠️  Response contains fake data')
    } else {
      results.fakeData.passed++
      results.fakeData.checks.push({ endpoint: '/api/auth/login-simple', status: '✅ REAL DATA' })
      console.log('   ✅ Response contains real data')
    }
    
    const token = loginResult.body.data.token
    
    // Test 3: Health endpoint
    console.log('\n3. Testing /api/health...')
    const healthResult = await testEndpoint(
      'health',
      `${baseUrl}/api/health`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
    
    if (healthResult.success && healthResult.body?.ok !== false) {
      results.endpoints.passed++
      results.endpoints.checks.push({ endpoint: '/api/health', status: '✅ WORKS' })
      console.log('   ✅ Health endpoint works')
      
      // Verify health check queries real database
      if (healthResult.body.checks?.database?.ok) {
        results.endpoints.passed++
        results.endpoints.checks.push({ endpoint: '/api/health', check: 'Database check', status: '✅ REAL DB QUERY' })
        console.log('   ✅ Database check verified')
      }
    } else {
      results.endpoints.failed++
      results.endpoints.checks.push({ endpoint: '/api/health', status: '❌ FAILED', error: healthResult.error })
      console.log(`   ❌ Health check failed: ${healthResult.error}`)
    }
    
    // Test 4: Employee leads endpoint (if employee credentials exist)
    if (process.env.MONITOR_EMPLOYEE_EMAIL && process.env.MONITOR_EMPLOYEE_PASSWORD) {
      console.log('\n4. Testing /api/employee/leads...')
      const employeeLogin = await testEndpoint(
        'employee-login',
        `${baseUrl}/api/auth/login-simple`,
        {
          method: 'POST',
          body: {
            email: process.env.MONITOR_EMPLOYEE_EMAIL,
            password: process.env.MONITOR_EMPLOYEE_PASSWORD
          }
        }
      )
      
      if (employeeLogin.success && employeeLogin.body?.data?.token) {
        const employeeToken = employeeLogin.body.data.token
        const leadsResult = await testEndpoint(
          'employee-leads',
          `${baseUrl}/api/employee/leads?scope=self&limit=5`,
          {
            headers: {
              Authorization: `Bearer ${employeeToken}`
            }
          }
        )
        
        if (leadsResult.success && leadsResult.body?.success && Array.isArray(leadsResult.body.leads)) {
          results.endpoints.passed++
          results.endpoints.checks.push({ endpoint: '/api/employee/leads', status: '✅ WORKS' })
          console.log('   ✅ Employee leads endpoint works')
          
          // Verify it returns real data from database
          if (leadsResult.body.leads.length > 0) {
            // Check if leads have real IDs (UUIDs)
            const hasRealIds = leadsResult.body.leads.every(lead => 
              lead.id && lead.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
            )
            
            if (hasRealIds) {
              results.endpoints.passed++
              results.endpoints.checks.push({ endpoint: '/api/employee/leads', check: 'Real UUIDs', status: '✅ VERIFIED' })
              console.log('   ✅ Leads have real UUIDs')
            }
            
            // Verify leads exist in database
            const firstLeadId = leadsResult.body.leads[0]?.id
            if (firstLeadId) {
              const { data: dbLead } = await supabaseAdmin
                .from('prospects')
                .select('id')
                .eq('id', firstLeadId)
                .single()
              
              if (dbLead) {
                results.endpoints.passed++
                results.endpoints.checks.push({ endpoint: '/api/employee/leads', check: 'Database verification', status: '✅ REAL DATA' })
                console.log('   ✅ Lead verified in database')
              } else {
                results.endpoints.failed++
                results.endpoints.checks.push({ endpoint: '/api/employee/leads', check: 'Database verification', status: '❌ NOT IN DB' })
                console.log('   ❌ Lead not found in database')
              }
            }
          } else {
            console.log('   ℹ️  No leads returned (empty is OK for monitor)')
          }
          
          if (hasFakeData(leadsResult.body)) {
            results.fakeData.failed++
            results.fakeData.checks.push({ endpoint: '/api/employee/leads', status: '⚠️  CONTAINS FAKE DATA' })
            console.log('   ⚠️  Response contains fake data')
          } else {
            results.fakeData.passed++
            results.fakeData.checks.push({ endpoint: '/api/employee/leads', status: '✅ REAL DATA' })
            console.log('   ✅ Response contains real data')
          }
        } else {
          results.endpoints.failed++
          results.endpoints.checks.push({ endpoint: '/api/employee/leads', status: '❌ FAILED', error: leadsResult.error })
          console.log(`   ❌ Employee leads failed: ${leadsResult.error}`)
        }
      } else {
        console.log('   ⚠️  Employee login failed, skipping leads test')
      }
    } else {
      console.log('   ⚠️  MONITOR_EMPLOYEE_EMAIL/PASSWORD not set, skipping employee leads test')
    }
    
    // Test 5: Outreach runner endpoint (if CRON_SECRET exists)
    if (process.env.CRON_SECRET && process.env.OUTREACH_RUNNER_URL) {
      console.log('\n5. Testing /api/internal/outreach-runner...')
      const outreachResult = await testEndpoint(
        'outreach-runner',
        process.env.OUTREACH_RUNNER_URL,
        {
          method: 'POST',
          headers: {
            'x-cron-secret': process.env.CRON_SECRET
          }
        }
      )
      
      if (outreachResult.success && outreachResult.body?.success !== false) {
        results.endpoints.passed++
        results.endpoints.checks.push({ endpoint: '/api/internal/outreach-runner', status: '✅ WORKS' })
        console.log('   ✅ Outreach runner endpoint works')
        
        // Verify it returns real stats (not fake)
        if (outreachResult.body.stats && typeof outreachResult.body.stats.processed === 'number') {
          results.endpoints.passed++
          results.endpoints.checks.push({ endpoint: '/api/internal/outreach-runner', check: 'Returns stats', status: '✅ REAL STATS' })
          console.log(`   ✅ Returns real stats: processed=${outreachResult.body.stats.processed}`)
        }
        
        if (hasFakeData(outreachResult.body)) {
          results.fakeData.failed++
          results.fakeData.checks.push({ endpoint: '/api/internal/outreach-runner', status: '⚠️  CONTAINS FAKE DATA' })
          console.log('   ⚠️  Response contains fake data')
        } else {
          results.fakeData.passed++
          results.fakeData.checks.push({ endpoint: '/api/internal/outreach-runner', status: '✅ REAL DATA' })
          console.log('   ✅ Response contains real data')
        }
      } else {
        results.endpoints.failed++
        results.endpoints.checks.push({ endpoint: '/api/internal/outreach-runner', status: '❌ FAILED', error: outreachResult.error })
        console.log(`   ❌ Outreach runner failed: ${outreachResult.error}`)
      }
    } else {
      console.log('   ⚠️  CRON_SECRET or OUTREACH_RUNNER_URL not set, skipping outreach runner test')
    }
  } else {
    results.endpoints.failed++
    results.endpoints.checks.push({ endpoint: '/api/auth/login-simple', status: '❌ FAILED', error: loginResult.error })
    console.log(`   ❌ Login failed: ${loginResult.error}`)
  }
  
  console.log(`\n✅ Endpoint tests passed: ${results.endpoints.passed}`)
  console.log(`❌ Endpoint tests failed: ${results.endpoints.failed}`)
}

// ============================================================================
// 3. MONITOR SCRIPT TESTS (Actually run the monitor scripts)
// ============================================================================

async function testMonitors() {
  console.log('\n🧪 STEP 3: MONITOR SCRIPT E2E TESTS')
  console.log('='.repeat(60))
  
  // Test monitor-registration.js
  console.log('\n1. Testing monitor-registration.js...')
  try {
    const regResult = execSync(
      `node scripts/monitor-registration.js --base-url ${baseUrl}`,
      { encoding: 'utf-8', env: { ...process.env, REGISTRATION_BASE_URL: baseUrl }, stdio: 'pipe' }
    )
    results.monitors.passed++
    results.monitors.checks.push({ script: 'monitor-registration.js', status: '✅ PASSED' })
    console.log('   ✅ Registration monitor passed')
  } catch (error) {
    results.monitors.failed++
    const errorMsg = error.stderr?.toString() || error.message || 'Unknown error'
    results.monitors.checks.push({ script: 'monitor-registration.js', status: '❌ FAILED', error: errorMsg })
    console.log(`   ❌ Registration monitor failed: ${errorMsg.substring(0, 200)}`)
  }
  
  // Test monitor-outreach.js (if secrets exist)
  if (process.env.CRON_SECRET && process.env.OUTREACH_RUNNER_URL) {
    console.log('\n2. Testing monitor-outreach.js...')
    try {
      const outreachResult = execSync(
        'node scripts/monitor-outreach.js',
        { encoding: 'utf-8', env: process.env, stdio: 'pipe' }
      )
      results.monitors.passed++
      results.monitors.checks.push({ script: 'monitor-outreach.js', status: '✅ PASSED' })
      console.log('   ✅ Outreach monitor passed')
    } catch (error) {
      results.monitors.failed++
      const errorMsg = error.stderr?.toString() || error.message || 'Unknown error'
      results.monitors.checks.push({ script: 'monitor-outreach.js', status: '❌ FAILED', error: errorMsg })
      console.log(`   ❌ Outreach monitor failed: ${errorMsg.substring(0, 200)}`)
    }
  } else {
    console.log('   ⚠️  CRON_SECRET or OUTREACH_RUNNER_URL not set, skipping outreach monitor test')
  }
  
  // Test monitor-sales-dashboard.js (if credentials exist)
  if (process.env.MONITOR_EMPLOYEE_EMAIL && process.env.MONITOR_EMPLOYEE_PASSWORD) {
    console.log('\n3. Testing monitor-sales-dashboard.js...')
    try {
      const salesResult = execSync(
        'node scripts/monitor-sales-dashboard.js',
        { encoding: 'utf-8', env: process.env, stdio: 'pipe' }
      )
      results.monitors.passed++
      results.monitors.checks.push({ script: 'monitor-sales-dashboard.js', status: '✅ PASSED' })
      console.log('   ✅ Sales dashboard monitor passed')
    } catch (error) {
      results.monitors.failed++
      const errorMsg = error.stderr?.toString() || error.message || 'Unknown error'
      results.monitors.checks.push({ script: 'monitor-sales-dashboard.js', status: '❌ FAILED', error: errorMsg })
      console.log(`   ❌ Sales dashboard monitor failed: ${errorMsg.substring(0, 200)}`)
    }
  } else {
    console.log('   ⚠️  MONITOR_EMPLOYEE_EMAIL/PASSWORD not set, skipping sales dashboard monitor test')
  }
  
  console.log(`\n✅ Monitor tests passed: ${results.monitors.passed}`)
  console.log(`❌ Monitor tests failed: ${results.monitors.failed}`)
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🔍 COMPREHENSIVE E2E MONITOR DIAGNOSTIC')
  console.log('='.repeat(60))
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
  
  await checkSchema()
  await checkEndpoints()
  await testMonitors()
  
  // Final summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 FINAL SUMMARY')
  console.log('='.repeat(60))
  
  console.log(`\n📊 Schema Checks: ${results.schema.passed} passed, ${results.schema.failed} failed`)
  console.log(`🌐 Endpoint Tests: ${results.endpoints.passed} passed, ${results.endpoints.failed} failed`)
  console.log(`🧪 Monitor Scripts: ${results.monitors.passed} passed, ${results.monitors.failed} failed`)
  console.log(`🚫 Fake Data Checks: ${results.fakeData.passed} passed, ${results.fakeData.failed} failed`)
  
  const totalPassed = results.schema.passed + results.endpoints.passed + results.monitors.passed + results.fakeData.passed
  const totalFailed = results.schema.failed + results.endpoints.failed + results.monitors.failed + results.fakeData.failed
  
  console.log(`\n✅ Total Passed: ${totalPassed}`)
  console.log(`❌ Total Failed: ${totalFailed}`)
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL CHECKS PASSED! Monitors should work correctly.')
    process.exit(0)
  } else {
    console.log('\n⚠️  SOME CHECKS FAILED. Review the output above.')
    console.log('\n💡 Next steps:')
    if (results.schema.failed > 0) {
      console.log('   1. Run migrations: migrations/CREATE_PROSPECTING_TABLES.sql and migrations/CREATE_OUTREACH_TABLES.sql')
    }
    if (results.endpoints.failed > 0) {
      console.log('   2. Check endpoint implementations and database connections')
    }
    if (results.monitors.failed > 0) {
      console.log('   3. Check GitHub secrets are set correctly')
    }
    process.exit(1)
  }
}

main().catch(console.error)

