// Quick test to see if we can connect to Supabase and create a simple table
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key (first 20 chars):', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT SET');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickTest() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Try to query a system table that should always exist
    const { data, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .limit(5);
    
    if (error) {
      console.log('❌ Supabase query failed:', error.message);
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('Existing tables:', data?.map(t => t.tablename) || 'none');
    }
    
    // Try to create a simple test table
    console.log('🔍 Testing table creation...');
    const { data: createData, error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS test_table (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `
    });
    
    if (createError) {
      console.log('❌ Table creation failed:', createError.message);
      console.log('💡 You need to run the COMPLETE_DATABASE_SETUP.sql script in your Supabase dashboard');
    } else {
      console.log('✅ Table creation successful!');
    }
    
  } catch (e) {
    console.error('❌ Unexpected error:', e.message);
  }
}

quickTest();
