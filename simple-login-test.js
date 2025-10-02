// Simple Login Test - Register then immediately login
require('dotenv').config({ path: '.env.local' });

const APP_URL = 'https://cloudgreet.com';

async function simpleLoginTest() {
  console.log('🔐 SIMPLE LOGIN TEST');
  console.log('===================');
  
  const timestamp = Date.now();
  const testEmail = `simpletest${timestamp}@example.com`;
  const testPassword = 'testpassword123';
  
  try {
    // Step 1: Register
    console.log('1️⃣ Registering user...');
    const registerData = {
      business_name: `Simple Test ${timestamp}`,
      business_type: 'HVAC Services',
      owner_name: 'Simple Test Owner',
      email: testEmail,
      password: testPassword,
      phone: '5551234567',
      address: '123 Simple St',
      website: 'https://simpletest.com',
      services: ['HVAC Repair'],
      service_areas: ['Simple City']
    };

    const registerResponse = await fetch(`${APP_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData),
    });

    const registerResult = await registerResponse.json();
    
    if (!registerResponse.ok) {
      console.log('❌ Registration failed:', registerResult.error?.message);
      return;
    }

    console.log('✅ Registration successful');
    console.log('   - User ID:', registerResult.data.user.id);
    console.log('   - Email:', testEmail);

    // Wait 3 seconds for database sync
    console.log('⏳ Waiting 3 seconds for database sync...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Login
    console.log('\n2️⃣ Testing login...');
    const loginData = {
      email: testEmail,
      password: testPassword
    };

    const loginResponse = await fetch(`${APP_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData),
    });

    const loginResult = await loginResponse.json();
    
    if (loginResponse.ok) {
      console.log('✅ Login successful!');
      console.log('   - Token generated:', !!loginResult.data.token);
      console.log('   - User authenticated:', loginResult.data.user.email);
      
      // Step 3: Test dashboard
      console.log('\n3️⃣ Testing dashboard...');
      const dashboardResponse = await fetch(`${APP_URL}/api/dashboard/data`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginResult.data.token}`,
          'Content-Type': 'application/json',
        },
      });

      const dashboardResult = await dashboardResponse.json();
      
      if (dashboardResponse.ok) {
        console.log('✅ Dashboard access successful!');
        console.log('\n🎉 COMPLETE AUTH FLOW WORKING!');
        console.log('✅ Registration → Login → Dashboard: ALL SUCCESSFUL!');
      } else {
        console.log('❌ Dashboard failed:', dashboardResult.error?.message);
      }
      
    } else {
      console.log('❌ Login failed:', loginResult.error?.message);
      console.log('   - Status:', loginResponse.status);
      console.log('   - Response:', JSON.stringify(loginResult, null, 2));
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

simpleLoginTest();
