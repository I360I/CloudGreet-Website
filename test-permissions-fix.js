// Test if database permissions are fixed
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPermissions() {
  console.log('🔍 Testing database permissions after fix...');
  
  const tables = [
    'businesses',
    'users', 
    'contact_submissions',
    'ai_agents',
    'appointments'
  ];
  
  let allWorking = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        console.log(`❌ Table '${table}' still has issues:`, error.message);
        allWorking = false;
      } else {
        console.log(`✅ Table '${table}' is now accessible`);
      }
    } catch (e) {
      console.log(`❌ Table '${table}' failed:`, e.message);
      allWorking = false;
    }
  }
  
  if (allWorking) {
    console.log('\n🎉 ALL PERMISSIONS FIXED! Registration should now work!');
  } else {
    console.log('\n⚠️ Some permissions still need fixing. Run the FIX_ALL_DATABASE_PERMISSIONS.sql script.');
  }
}

testPermissions().catch(console.error);
