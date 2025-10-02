// Test if database tables exist
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTables() {
  console.log('🔍 Testing database tables...');
  
  const tables = [
    'businesses',
    'users', 
    'contact_submissions',
    'ai_agents',
    'appointments',
    'calls',
    'sms_messages'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ Table '${table}' does not exist`);
        } else if (error.message.includes('permission denied')) {
          console.log(`❌ Table '${table}' exists but permission denied`);
        } else {
          console.log(`❌ Table '${table}' error:`, error.message);
        }
      } else {
        console.log(`✅ Table '${table}' exists and accessible`);
      }
    } catch (e) {
      console.log(`❌ Table '${table}' failed:`, e.message);
    }
  }
}

testTables().catch(console.error);
