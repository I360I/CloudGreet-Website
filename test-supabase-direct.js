// test-supabase-direct.js
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Supabase Connection with Node.js fetch...');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function testDirectConnection() {
  try {
    console.log('🔍 Testing direct fetch to Supabase...');
    
    // Test direct fetch to Supabase REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/businesses?select=id&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Direct fetch successful!');
      console.log('Data:', data);
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Response not ok:', response.status, errorText);
      return false;
    }

  } catch (err) {
    console.error('❌ Direct fetch failed:', err.message);
    console.error('Error details:', err);
    return false;
  }
}

testDirectConnection().then(success => {
  if (success) {
    console.log('🎉 Supabase direct connection works!');
  } else {
    console.log('💥 Supabase direct connection failed!');
  }
});
