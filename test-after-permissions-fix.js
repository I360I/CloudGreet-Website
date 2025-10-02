// Test database permissions after running the SQL fix
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing database permissions after SQL fix...');
console.log('Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET');
console.log('Service Key:', supabaseKey ? 'SET' : 'NOT SET');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPermissions() {
  const tables = ['businesses', 'users', 'contact_submissions', 'ai_agents', 'appointments'];
  let allWorking = true;
  
  for (const table of tables) {
    try {
      console.log(`\n🔍 Testing table: ${table}`);
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        allWorking = false;
      } else {
        console.log(`✅ ${table}: ACCESSIBLE`);
      }
    } catch (e) {
      console.log(`❌ ${table}: ${e.message}`);
      allWorking = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (allWorking) {
    console.log('🎉 ALL PERMISSIONS FIXED!');
    console.log('✅ Registration system should now work!');
    console.log('🚀 Ready to test with FINAL_PRODUCTION_READINESS_TEST.js');
  } else {
    console.log('⚠️ Some permissions still need fixing.');
    console.log('💡 Check the SQL script output for any errors.');
  }
  console.log('='.repeat(50));
}

testPermissions().catch(console.error);
