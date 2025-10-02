// test-database.js
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabase() {
  console.log('🔍 Testing database connection and tables...')
  
  const tables = [
    'users',
    'businesses', 
    'ai_agents',
    'call_logs',
    'sms_logs',
    'appointments',
    'audit_logs'
  ]
  
  for (const table of tables) {
    try {
      console.log(`\n🔍 Testing table: ${table}`)
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
      
      if (error) {
        console.log(`❌ Table ${table}: ERROR - ${error.message}`)
      } else {
        console.log(`✅ Table ${table}: EXISTS`)
      }
    } catch (err) {
      console.log(`❌ Table ${table}: EXCEPTION - ${err.message}`)
    }
  }
  
  // Test creating a simple record
  console.log('\n🔍 Testing record creation...')
  try {
    const { data, error } = await supabase
      .from('businesses')
      .insert({
        business_name: 'Test Business',
        business_type: 'Test',
        owner_name: 'Test Owner',
        email: 'test@example.com',
        phone: '1234567890',
        address: '123 Test St',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.log(`❌ Record creation: ERROR - ${error.message}`)
    } else {
      console.log(`✅ Record creation: SUCCESS - ID: ${data.id}`)
      
      // Clean up test record
      await supabase
        .from('businesses')
        .delete()
        .eq('id', data.id)
      console.log('🧹 Test record cleaned up')
    }
  } catch (err) {
    console.log(`❌ Record creation: EXCEPTION - ${err.message}`)
  }
  
  console.log('\n🏁 Database test complete')
}

testDatabase().catch(console.error)
