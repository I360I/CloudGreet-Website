const fetch = require('node-fetch');

async function testProductionAPIs() {
  console.log('🧪 Testing Production APIs...\n');

  // Test 1: Health Check
  console.log('1️⃣ Testing Health Check...');
  try {
    const response = await fetch('https://cloudgreet.com/api/health');
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Health Check: SUCCESS');
      console.log(`   - Database: ${data.database}`);
      console.log(`   - Services: ${JSON.stringify(data.services)}`);
    } else {
      console.log('❌ Health Check: FAILED', data);
    }
  } catch (error) {
    console.log('❌ Health Check: ERROR', error.message);
  }

  // Test 2: Admin Login
  console.log('\n2️⃣ Testing Admin Login...');
  try {
    const response = await fetch('https://cloudgreet.com/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'Anthonyis42!' })
    });
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Admin Login: SUCCESS');
      console.log(`   - Token: ${data.token ? 'Generated' : 'Missing'}`);
    } else {
      console.log('❌ Admin Login: FAILED', response.status, data);
    }
  } catch (error) {
    console.log('❌ Admin Login: ERROR', error.message);
  }

  // Test 3: Client Registration
  console.log('\n3️⃣ Testing Client Registration...');
  try {
    const response = await fetch('https://cloudgreet.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Test Business',
        businessType: 'HVAC Services',
        website: 'https://test.com',
        email: `test-${Date.now()}@example.com`,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        phone: '+15551234567',
        address: '123 Test St'
      })
    });
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Client Registration: SUCCESS');
      console.log(`   - User ID: ${data.userId}`);
      console.log(`   - Business ID: ${data.businessId}`);
    } else {
      console.log('❌ Client Registration: FAILED', response.status, data);
    }
  } catch (error) {
    console.log('❌ Client Registration: ERROR', error.message);
  }

  // Test 4: Phone System
  console.log('\n4️⃣ Testing Phone System...');
  try {
    const response = await fetch('https://cloudgreet.com/api/click-to-call/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '5551234567',
        businessName: 'Test Business',
        businessType: 'HVAC',
        services: 'Heating and cooling',
        hours: '24/7'
      })
    });
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Phone System: SUCCESS');
      console.log(`   - Call ID: ${data.call_id}`);
    } else {
      console.log('❌ Phone System: FAILED', response.status, data);
    }
  } catch (error) {
    console.log('❌ Phone System: ERROR', error.message);
  }

  // Test 5: Webhook Test
  console.log('\n5️⃣ Testing Webhook Test Endpoint...');
  try {
    const response = await fetch('https://cloudgreet.com/api/telnyx/webhook-test');
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Webhook Test: SUCCESS');
      console.log(`   - Status: ${data.status}`);
    } else {
      console.log('❌ Webhook Test: FAILED', response.status, data);
    }
  } catch (error) {
    console.log('❌ Webhook Test: ERROR', error.message);
  }

  console.log('\n🎯 PRODUCTION TEST SUMMARY:');
  console.log('This will show the REAL status of the platform for clients.');
}

testProductionAPIs();
