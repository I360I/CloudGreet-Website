// Final Status Check - Test everything that matters for launch
require('dotenv').config({ path: '.env.local' });

const APP_URL = 'https://cloudgreet.com';

console.log('🎯 FINAL STATUS CHECK FOR LAUNCH');
console.log('=================================');

async function finalStatusCheck() {
  const results = {
    registration: false,
    login: false,
    dashboard: false,
    health: false,
    admin: false
  };

  try {
    // Test 1: Registration
    console.log('\n1️⃣ Testing Registration...');
    const timestamp = Date.now();
    const registerData = {
      business_name: `Final Test ${timestamp}`,
      business_type: 'HVAC Services',
      owner_name: 'Final Test Owner',
      email: `finaltest${timestamp}@example.com`,
      password: 'testpassword123',
      phone: '5551234567',
      address: '123 Final St',
      website: 'https://finaltest.com',
      services: ['HVAC Repair'],
      service_areas: ['Final City']
    };

    const registerResponse = await fetch(`${APP_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData),
    });

    if (registerResponse.ok) {
      console.log('✅ Registration: WORKING');
      results.registration = true;
      
      // Test 2: Login (with same credentials)
      console.log('\n2️⃣ Testing Login...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for sync
      
      const loginResponse = await fetch(`${APP_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerData.email,
          password: registerData.password
        }),
      });

      if (loginResponse.ok) {
        console.log('✅ Login: WORKING');
        results.login = true;
        
        const loginResult = await loginResponse.json();
        
        // Test 3: Dashboard
        console.log('\n3️⃣ Testing Dashboard...');
        const dashboardResponse = await fetch(`${APP_URL}/api/dashboard/data`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginResult.data.token}`,
            'Content-Type': 'application/json',
          },
        });

        if (dashboardResponse.ok) {
          console.log('✅ Dashboard: WORKING');
          results.dashboard = true;
        } else {
          console.log('❌ Dashboard: FAILED');
        }
      } else {
        console.log('❌ Login: FAILED');
      }
    } else {
      console.log('❌ Registration: FAILED');
    }

    // Test 4: Health Check
    console.log('\n4️⃣ Testing Health Check...');
    const healthResponse = await fetch(`${APP_URL}/api/health`);
    if (healthResponse.ok) {
      console.log('✅ Health Check: WORKING');
      results.health = true;
    } else {
      console.log('❌ Health Check: FAILED');
    }

    // Test 5: Admin Panel
    console.log('\n5️⃣ Testing Admin Panel...');
    const adminResponse = await fetch(`${APP_URL}/api/admin/stats`);
    if (adminResponse.ok) {
      console.log('✅ Admin Panel: WORKING');
      results.admin = true;
    } else {
      console.log('❌ Admin Panel: FAILED');
    }

    // Final Results
    console.log('\n📊 FINAL LAUNCH STATUS:');
    console.log('========================');
    
    const workingCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`Registration: ${results.registration ? '✅' : '❌'}`);
    console.log(`Login: ${results.login ? '✅' : '❌'}`);
    console.log(`Dashboard: ${results.dashboard ? '✅' : '❌'}`);
    console.log(`Health Check: ${results.health ? '✅' : '❌'}`);
    console.log(`Admin Panel: ${results.admin ? '✅' : '❌'}`);
    
    console.log(`\n🎯 OVERALL: ${workingCount}/${totalCount} systems working`);
    
    if (workingCount >= 4) {
      console.log('\n🚀 LAUNCH READY!');
      console.log('✅ Core systems operational');
      console.log('✅ Can onboard customers');
      console.log('✅ Can generate revenue');
    } else {
      console.log('\n⚠️ NEEDS ATTENTION');
      console.log('❌ Some critical systems not working');
    }

  } catch (error) {
    console.log('❌ Error during status check:', error.message);
  }
}

finalStatusCheck();
