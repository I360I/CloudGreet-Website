#!/usr/bin/env node
/**
 * Supabase Connection and Database Health Check
 * Tests connection, verifies key tables, and reports status
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 CloudGreet Supabase Health Check\n')
console.log('=' .repeat(60))

// Check environment variables
console.log('\n📋 Environment Configuration:')
console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`)
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`)

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('\n❌ Missing required environment variables!')
  console.error('   Please check your .env.local file')
  process.exit(1)
}

// Create clients
const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test connection
async function testConnection() {
  console.log('\n🔌 Testing Connection...')
  console.log(`  URL: ${supabaseUrl}`)
  console.log(`  Service Key: ${supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'MISSING'}`)
  
  try {
    // First try a simple query
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .limit(1)
    
    if (error) {
      // Check if it's a table missing error (which means connection works)
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.log('  ✅ Connected! (but businesses table may not exist)')
        // Try RPC call instead
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('now')
        if (rpcError) {
          console.log(`  ⚠️  RPC test failed: ${rpcError.message}`)
        } else {
          console.log(`  ✅ RPC works! Server time: ${rpcData}`)
        }
        return true
      } else {
        console.error(`  ❌ Query failed: ${error.message}`)
        console.error(`     Code: ${error.code}`)
        console.error(`     Details: ${error.details || 'none'}`)
        return false
      }
    }
    console.log(`  ✅ Connected! Found ${data ? data.length : 0} business(es)`)
    return true
  } catch (error) {
    console.error(`  ❌ Connection error: ${error.message}`)
    if (error.cause) {
      console.error(`     Cause: ${error.cause.message || error.cause}`)
    }
    if (error.code) {
      console.error(`     Code: ${error.code}`)
    }
    return false
  }
}

// Check key tables
async function checkTables() {
  console.log('\n📊 Checking Key Tables...')
  
  const keyTables = [
    'businesses',
    'users',
    'ai_agents',
    'toll_free_numbers',
    'calls',
    'appointments',
    'leads',
    'messages',
    'stripe_customers',
    'billing_events'
  ]

  const results = {}
  
  for (const table of keyTables) {
    try {
      const { data, error, count } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        results[table] = { exists: false, error: error.message }
        console.log(`  ❌ ${table}: ${error.message}`)
      } else {
        results[table] = { exists: true, count: count || 0 }
        console.log(`  ✅ ${table}: exists (${count || 0} rows)`)
      }
    } catch (error) {
      results[table] = { exists: false, error: error.message }
      console.log(`  ❌ ${table}: ${error.message}`)
    }
  }
  
  return results
}

// Check for sample data
async function checkSampleData() {
  console.log('\n📦 Checking Sample Data...')
  
  try {
    const { data: businesses, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select('id, name, phone_number')
      .limit(5)
    
    if (bizError) {
      console.log(`  ⚠️  Could not fetch businesses: ${bizError.message}`)
      return
    }
    
    if (businesses && businesses.length > 0) {
      console.log(`  ✅ Found ${businesses.length} business(es):`)
      businesses.forEach((biz, idx) => {
        console.log(`     ${idx + 1}. ${biz.name || biz.id} (${biz.phone_number || 'no phone'})`)
      })
    } else {
      console.log('  ⚠️  No businesses found (database may be empty)')
    }
  } catch (error) {
    console.log(`  ⚠️  Error checking sample data: ${error.message}`)
  }
}

// Check phone number normalization
async function checkPhoneNormalization() {
  console.log('\n📞 Checking Phone Number Normalization...')
  
  try {
    const { data: businesses, error } = await supabaseAdmin
      .from('businesses')
      .select('phone_number')
      .not('phone_number', 'is', null)
      .limit(10)
    
    if (error) {
      console.log(`  ⚠️  Could not check phones: ${error.message}`)
      return
    }
    
    if (businesses && businesses.length > 0) {
      const normalized = businesses.filter(b => 
        b.phone_number && b.phone_number.startsWith('+')
      ).length
      const total = businesses.length
      
      console.log(`  📊 ${normalized}/${total} phone numbers are normalized (E.164 format)`)
      
      if (normalized < total) {
        console.log('  ⚠️  Some phone numbers need normalization!')
        console.log('     Run: migrations/NORMALIZE_EXISTING_PHONE_NUMBERS.sql')
      } else {
        console.log('  ✅ All phone numbers are normalized')
      }
    } else {
      console.log('  ℹ️  No phone numbers found to check')
    }
  } catch (error) {
    console.log(`  ⚠️  Error checking phone normalization: ${error.message}`)
  }
}

// Check Retell agent linking
async function checkRetellLinking() {
  console.log('\n🤖 Checking Retell Agent Linking...')
  
  try {
    const { data: agents, error } = await supabaseAdmin
      .from('ai_agents')
      .select('id, retell_agent_id, phone_number, business_id')
      .limit(10)
    
    if (error) {
      console.log(`  ⚠️  Could not check agents: ${error.message}`)
      return
    }
    
    if (agents && agents.length > 0) {
      const withRetellId = agents.filter(a => a.retell_agent_id).length
      const withPhone = agents.filter(a => a.phone_number).length
      
      console.log(`  📊 Found ${agents.length} agent(s):`)
      console.log(`     - ${withRetellId} have Retell Agent ID`)
      console.log(`     - ${withPhone} have phone numbers`)
      
      if (withRetellId < agents.length) {
        console.log('  ⚠️  Some agents are missing Retell Agent IDs')
      }
      if (withPhone < agents.length) {
        console.log('  ⚠️  Some agents are missing phone numbers')
      }
      if (withRetellId === agents.length && withPhone === agents.length) {
        console.log('  ✅ All agents are properly linked')
      }
    } else {
      console.log('  ℹ️  No agents found')
    }
  } catch (error) {
    console.log(`  ⚠️  Error checking Retell linking: ${error.message}`)
  }
}

// Main execution
async function main() {
  const connected = await testConnection()
  
  if (!connected) {
    console.error('\n❌ Cannot proceed - connection failed')
    process.exit(1)
  }
  
  await checkTables()
  await checkSampleData()
  await checkPhoneNormalization()
  await checkRetellLinking()
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Health check complete!')
  console.log('\n💡 Next steps:')
  console.log('   - If tables are missing, run migrations')
  console.log('   - If phone numbers need normalization, run NORMALIZE_EXISTING_PHONE_NUMBERS.sql')
  console.log('   - Check /api/health endpoint for runtime status')
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})




 * Supabase Connection and Database Health Check
 * Tests connection, verifies key tables, and reports status
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 CloudGreet Supabase Health Check\n')
console.log('=' .repeat(60))

// Check environment variables
console.log('\n📋 Environment Configuration:')
console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`)
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`)

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('\n❌ Missing required environment variables!')
  console.error('   Please check your .env.local file')
  process.exit(1)
}

// Create clients
const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test connection
async function testConnection() {
  console.log('\n🔌 Testing Connection...')
  console.log(`  URL: ${supabaseUrl}`)
  console.log(`  Service Key: ${supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'MISSING'}`)
  
  try {
    // First try a simple query
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .limit(1)
    
    if (error) {
      // Check if it's a table missing error (which means connection works)
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.log('  ✅ Connected! (but businesses table may not exist)')
        // Try RPC call instead
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('now')
        if (rpcError) {
          console.log(`  ⚠️  RPC test failed: ${rpcError.message}`)
        } else {
          console.log(`  ✅ RPC works! Server time: ${rpcData}`)
        }
        return true
      } else {
        console.error(`  ❌ Query failed: ${error.message}`)
        console.error(`     Code: ${error.code}`)
        console.error(`     Details: ${error.details || 'none'}`)
        return false
      }
    }
    console.log(`  ✅ Connected! Found ${data ? data.length : 0} business(es)`)
    return true
  } catch (error) {
    console.error(`  ❌ Connection error: ${error.message}`)
    if (error.cause) {
      console.error(`     Cause: ${error.cause.message || error.cause}`)
    }
    if (error.code) {
      console.error(`     Code: ${error.code}`)
    }
    return false
  }
}

// Check key tables
async function checkTables() {
  console.log('\n📊 Checking Key Tables...')
  
  const keyTables = [
    'businesses',
    'users',
    'ai_agents',
    'toll_free_numbers',
    'calls',
    'appointments',
    'leads',
    'messages',
    'stripe_customers',
    'billing_events'
  ]

  const results = {}
  
  for (const table of keyTables) {
    try {
      const { data, error, count } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        results[table] = { exists: false, error: error.message }
        console.log(`  ❌ ${table}: ${error.message}`)
      } else {
        results[table] = { exists: true, count: count || 0 }
        console.log(`  ✅ ${table}: exists (${count || 0} rows)`)
      }
    } catch (error) {
      results[table] = { exists: false, error: error.message }
      console.log(`  ❌ ${table}: ${error.message}`)
    }
  }
  
  return results
}

// Check for sample data
async function checkSampleData() {
  console.log('\n📦 Checking Sample Data...')
  
  try {
    const { data: businesses, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select('id, name, phone_number')
      .limit(5)
    
    if (bizError) {
      console.log(`  ⚠️  Could not fetch businesses: ${bizError.message}`)
      return
    }
    
    if (businesses && businesses.length > 0) {
      console.log(`  ✅ Found ${businesses.length} business(es):`)
      businesses.forEach((biz, idx) => {
        console.log(`     ${idx + 1}. ${biz.name || biz.id} (${biz.phone_number || 'no phone'})`)
      })
    } else {
      console.log('  ⚠️  No businesses found (database may be empty)')
    }
  } catch (error) {
    console.log(`  ⚠️  Error checking sample data: ${error.message}`)
  }
}

// Check phone number normalization
async function checkPhoneNormalization() {
  console.log('\n📞 Checking Phone Number Normalization...')
  
  try {
    const { data: businesses, error } = await supabaseAdmin
      .from('businesses')
      .select('phone_number')
      .not('phone_number', 'is', null)
      .limit(10)
    
    if (error) {
      console.log(`  ⚠️  Could not check phones: ${error.message}`)
      return
    }
    
    if (businesses && businesses.length > 0) {
      const normalized = businesses.filter(b => 
        b.phone_number && b.phone_number.startsWith('+')
      ).length
      const total = businesses.length
      
      console.log(`  📊 ${normalized}/${total} phone numbers are normalized (E.164 format)`)
      
      if (normalized < total) {
        console.log('  ⚠️  Some phone numbers need normalization!')
        console.log('     Run: migrations/NORMALIZE_EXISTING_PHONE_NUMBERS.sql')
      } else {
        console.log('  ✅ All phone numbers are normalized')
      }
    } else {
      console.log('  ℹ️  No phone numbers found to check')
    }
  } catch (error) {
    console.log(`  ⚠️  Error checking phone normalization: ${error.message}`)
  }
}

// Check Retell agent linking
async function checkRetellLinking() {
  console.log('\n🤖 Checking Retell Agent Linking...')
  
  try {
    const { data: agents, error } = await supabaseAdmin
      .from('ai_agents')
      .select('id, retell_agent_id, phone_number, business_id')
      .limit(10)
    
    if (error) {
      console.log(`  ⚠️  Could not check agents: ${error.message}`)
      return
    }
    
    if (agents && agents.length > 0) {
      const withRetellId = agents.filter(a => a.retell_agent_id).length
      const withPhone = agents.filter(a => a.phone_number).length
      
      console.log(`  📊 Found ${agents.length} agent(s):`)
      console.log(`     - ${withRetellId} have Retell Agent ID`)
      console.log(`     - ${withPhone} have phone numbers`)
      
      if (withRetellId < agents.length) {
        console.log('  ⚠️  Some agents are missing Retell Agent IDs')
      }
      if (withPhone < agents.length) {
        console.log('  ⚠️  Some agents are missing phone numbers')
      }
      if (withRetellId === agents.length && withPhone === agents.length) {
        console.log('  ✅ All agents are properly linked')
      }
    } else {
      console.log('  ℹ️  No agents found')
    }
  } catch (error) {
    console.log(`  ⚠️  Error checking Retell linking: ${error.message}`)
  }
}

// Main execution
async function main() {
  const connected = await testConnection()
  
  if (!connected) {
    console.error('\n❌ Cannot proceed - connection failed')
    process.exit(1)
  }
  
  await checkTables()
  await checkSampleData()
  await checkPhoneNormalization()
  await checkRetellLinking()
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Health check complete!')
  console.log('\n💡 Next steps:')
  console.log('   - If tables are missing, run migrations')
  console.log('   - If phone numbers need normalization, run NORMALIZE_EXISTING_PHONE_NUMBERS.sql')
  console.log('   - Check /api/health endpoint for runtime status')
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})



