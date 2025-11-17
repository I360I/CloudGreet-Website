/**
 * MVP Status Verification Script
 * Run this to check if your MVP is actually ready
 * 
 * Usage: node scripts/verify-mvp-status.js
 */

const { createClient } = require('@supabase/supabase-js')

async function verifyMVPStatus() {
  console.log('🔍 Verifying MVP Status...\n')

  // Check environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'TELNYX_API_KEY',
    'RETELL_API_KEY',
    'JWT_SECRET',
    'DATABASE_URL'
  ]

  console.log('📋 Checking Environment Variables...')
  const missingEnvVars = []
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`  ✅ ${envVar}`)
    } else {
      console.log(`  ❌ ${envVar} - MISSING`)
      missingEnvVars.push(envVar)
    }
  })

  if (missingEnvVars.length > 0) {
    console.log(`\n⚠️  Missing ${missingEnvVars.length} environment variable(s)`)
    return false
  }

  // Check database tables
  console.log('\n📊 Checking Database Tables...')
  
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.log('  ❌ Cannot check database - missing Supabase credentials')
    return false
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const criticalTables = [
    'businesses',
    'appointments',
    'calls',
    'ai_agents',
    'sms_messages',
    'background_jobs'
  ]

  const missingTables = []
  
  for (const table of criticalTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1)

      if (error && error.code === '42P01') {
        // Table doesn't exist
        console.log(`  ❌ ${table} - TABLE MISSING`)
        missingTables.push(table)
      } else if (error) {
        console.log(`  ⚠️  ${table} - Error: ${error.message}`)
      } else {
        console.log(`  ✅ ${table}`)
      }
    } catch (err) {
      console.log(`  ❌ ${table} - Error: ${err.message}`)
      missingTables.push(table)
    }
  }

  // Check database functions
  console.log('\n⚙️  Checking Database Functions...')
  
  const criticalFunctions = [
    'create_appointment_safe',
    'complete_onboarding_safe'
  ]

  const missingFunctions = []

  for (const funcName of criticalFunctions) {
    try {
      const { data, error } = await supabase.rpc('pg_get_function_identity_arguments', {
        funcname: funcName
      })

      if (error || !data) {
        console.log(`  ❌ ${funcName} - FUNCTION MISSING`)
        missingFunctions.push(funcName)
      } else {
        console.log(`  ✅ ${funcName}`)
      }
    } catch (err) {
      // Try alternative check
      const { error } = await supabase.rpc(funcName, {})
      if (error && error.message.includes('does not exist')) {
        console.log(`  ❌ ${funcName} - FUNCTION MISSING`)
        missingFunctions.push(funcName)
      } else {
        console.log(`  ✅ ${funcName}`)
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 MVP STATUS SUMMARY')
  console.log('='.repeat(50))

  if (missingEnvVars.length === 0 && missingTables.length === 0 && missingFunctions.length === 0) {
    console.log('\n✅ MVP IS READY!')
    console.log('   All critical components are in place.')
    console.log('   Your platform should be fully functional.\n')
    return true
  } else {
    console.log('\n⚠️  MVP NEEDS SETUP:')
    
    if (missingEnvVars.length > 0) {
      console.log(`   - ${missingEnvVars.length} missing environment variable(s)`)
    }
    
    if (missingTables.length > 0) {
      console.log(`   - ${missingTables.length} missing database table(s)`)
      console.log(`     Run migrations for: ${missingTables.join(', ')}`)
    }
    
    if (missingFunctions.length > 0) {
      console.log(`   - ${missingFunctions.length} missing database function(s)`)
      console.log(`     Run migrations for: ${missingFunctions.join(', ')}`)
    }
    
    console.log('\n')
    return false
  }
}

// Run verification
verifyMVPStatus()
  .then(isReady => {
    process.exit(isReady ? 0 : 1)
  })
  .catch(err => {
    console.error('❌ Verification failed:', err)
    process.exit(1)
  })

