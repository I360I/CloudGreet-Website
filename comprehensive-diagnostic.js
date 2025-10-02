// Comprehensive Diagnostic Script
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const APP_URL = 'https://cloudgreet.com';

console.log('🔍 COMPREHENSIVE CLOUDGREET DIAGNOSTIC');
console.log('==========================================');

// Test 1: Environment Variables
console.log('\n1️⃣ ENVIRONMENT VARIABLES:');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ MISSING');
console.log('SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ SET' : '❌ MISSING');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ MISSING');
console.log('TELYNX_API_KEY:', process.env.TELYNX_API_KEY ? '✅ SET' : '❌ MISSING');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ SET' : '❌ MISSING');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ SET' : '❌ MISSING');

// Test 2: Database Connection
console.log('\n2️⃣ DATABASE CONNECTION:');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabase() {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Database Error:', error.message);
      return false;
    }
    console.log('✅ Database connected successfully');
    return true;
  } catch (err) {
    console.log('❌ Database Connection Failed:', err.message);
    return false;
  }
}

// Test 3: Registration API
async function testRegistration() {
  console.log('\n3️⃣ REGISTRATION API:');
  
  const testData = {
    business_name: 'Test Business ' + Date.now(),
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

  try {
    const response = await fetch(`${APP_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ Registration working!');
      return true;
    } else {
      console.log('❌ Registration failed:', result.error?.message || result.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Registration Network Error:', error.message);
    return false;
  }
}

// Test 4: Health Check
async function testHealth() {
  console.log('\n4️⃣ HEALTH CHECK:');
  
  try {
    const response = await fetch(`${APP_URL}/api/health`);
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ Health check passed');
      return true;
    } else {
      console.log('❌ Health check failed:', result.error || result.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

// Test 5: Dashboard Access
async function testDashboard() {
  console.log('\n5️⃣ DASHBOARD ACCESS:');
  
  try {
    const response = await fetch(`${APP_URL}/api/dashboard/data`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    console.log(`Status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('✅ Dashboard properly secured (401 expected)');
      return true;
    } else if (response.ok) {
      console.log('✅ Dashboard accessible');
      return true;
    } else {
      const result = await response.json();
      console.log('❌ Dashboard error:', result.error || result.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Dashboard error:', error.message);
    return false;
  }
}

// Run all tests
async function runDiagnostics() {
  const results = {
    database: await testDatabase(),
    registration: await testRegistration(),
    health: await testHealth(),
    dashboard: await testDashboard()
  };

  console.log('\n📊 DIAGNOSTIC SUMMARY:');
  console.log('==========================================');
  console.log('Database:', results.database ? '✅' : '❌');
  console.log('Registration:', results.registration ? '✅' : '❌');
  console.log('Health Check:', results.health ? '✅' : '❌');
  console.log('Dashboard:', results.dashboard ? '✅' : '❌');

  const workingCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\nOverall Status: ${workingCount}/${totalCount} systems working`);
  
  if (workingCount === totalCount) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL!');
  } else {
    console.log('⚠️ Some systems need attention');
  }
}

runDiagnostics().catch(console.error);
