// Quick Status Check
console.log('🔍 CLOUDGREET STATUS CHECK');
console.log('==========================');

// Check environment
require('dotenv').config({ path: '.env.local' });
console.log('\n✅ Environment Variables:');
console.log('- Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
console.log('- JWT Secret:', process.env.JWT_SECRET ? 'SET' : 'MISSING');
console.log('- Telnyx API:', process.env.TELYNX_API_KEY ? 'SET' : 'MISSING');
console.log('- OpenAI API:', process.env.OPENAI_API_KEY ? 'SET' : 'MISSING');

// Test registration
console.log('\n🧪 Testing Registration...');
const APP_URL = 'https://cloudgreet.com';

const testData = {
  business_name: 'Quick Test Business',
  business_type: 'HVAC Services',
  owner_name: 'Test Owner',
  email: `test${Date.now()}@example.com`,
  password: 'testpassword123',
  phone: '5551234567',
  address: '123 Test St',
  website: 'https://test.com',
  services: ['HVAC Repair'],
  service_areas: ['Test City']
};

fetch(`${APP_URL}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testData),
})
.then(response => response.json())
.then(data => {
  console.log('Registration Status:', data.error ? '❌ FAILED' : '✅ SUCCESS');
  if (data.error) {
    console.log('Error:', data.error.message || data.error);
  } else {
    console.log('User ID:', data.data?.user?.id);
    console.log('Business ID:', data.data?.business?.id);
  }
})
.catch(error => {
  console.log('❌ Network Error:', error.message);
});

console.log('\n📋 NEXT STEPS:');
console.log('1. Run COMPLETE_DATABASE_FIX.sql in Supabase');
console.log('2. Test registration again');
console.log('3. If still broken, check specific error messages');
