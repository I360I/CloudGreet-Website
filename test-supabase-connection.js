// test-supabase-connection.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testing Supabase Connection...');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET');
console.log('Supabase Key:', supabaseAnonKey ? 'SET' : 'NOT SET');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('🔍 Testing basic connection...');
    
    // Test a simple query
    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Database query failed:', error.message);
      if (error.message.includes('relation "businesses" does not exist')) {
        console.log('💡 The businesses table does not exist. You need to run the database setup SQL.');
      }
      return false;
    }

    console.log('✅ Database connection successful!');
    console.log('✅ businesses table exists');
    return true;

  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('🎉 Supabase is working correctly!');
  } else {
    console.log('💥 Supabase connection failed!');
  }
});
