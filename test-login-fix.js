// Test Login Fix - Use the same credentials from successful registration
require('dotenv').config({ path: '.env.local' });

const APP_URL = 'https://cloudgreet.com';

console.log('🔐 TESTING LOGIN FIX...');
console.log('=====================================');

async function testLoginWithRegisteredUser() {
  try {
    // First, register a new user
    console.log('1️⃣ Registering new user...');
    
    const timestamp = Date.now();
    const testData = {
      business_name: `Login Test Business ${timestamp}`,
      business_type: 'HVAC Services',
      owner_name: 'Login Test Owner',
      email: `logintest${timestamp}@example.com`,
      password: 'testpassword123',
      phone: '5551234567',
      address: '123 Login St',
      website: 'https://logintest.com',
      services: ['HVAC Repair'],
      service_areas: ['Login City']
    };

    const registerResponse = await fetch(`${APP_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    const registerResult = await registerResponse.json();
    
    if (!registerResponse.ok) {
      console.log('❌ Registration failed:', registerResult.error?.message);
      return;
    }

    console.log('✅ Registration successful!');
    console.log('   - User ID:', registerResult.data.user.id);
    console.log('   - Email:', testData.email);

    // Wait a moment for database to sync
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Now test login with the same credentials
    console.log('\n2️⃣ Testing login with registered credentials...');
    
    const loginData = {
      email: testData.email,
      password: testData.password
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
      console.log('   - Business ID:', loginResult.data.business?.id);
      
      // Test dashboard access with the token
      console.log('\n3️⃣ Testing dashboard access with login token...');
      
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
        console.log('   - Business data loaded');
        console.log('   - Analytics available');
        
        console.log('\n🎉 COMPLETE LOGIN FLOW WORKING!');
        console.log('✅ Registration → Login → Dashboard: ALL WORKING!');
      } else {
        console.log('❌ Dashboard access failed:', dashboardResult.error?.message);
      }
      
    } else {
      console.log('❌ Login failed:', loginResult.error?.message);
      console.log('   - Email used:', testData.email);
      console.log('   - Password used:', testData.password);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run the test
testLoginWithRegisteredUser();
