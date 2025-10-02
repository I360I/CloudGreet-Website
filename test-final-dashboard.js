const fetch = require('node-fetch');

async function testFinalDashboard() {
  try {
    console.log('Testing final dashboard deployment...');
    
    // Test login first
    const loginResponse = await fetch('https://cloudgreet.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aedwards424242@gmail.com',
        password: 'Anthonyis42!'
      })
    });
    
    console.log('Login status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('Login successful:', loginData.success);
      
      // Test dashboard API
      const dashboardResponse = await fetch('https://cloudgreet.com/api/dashboard/data?timeframe=7d', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Dashboard API status:', dashboardResponse.status);
      const dashboardData = await dashboardResponse.text();
      console.log('Dashboard API response:', dashboardData.substring(0, 200) + '...');
      
      if (dashboardResponse.ok) {
        console.log('✅ SUCCESS: Dashboard API is working!');
        return true;
      } else {
        console.log('❌ FAILED: Dashboard API returned error');
        return false;
      }
    } else {
      console.log('❌ FAILED: Login failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return false;
  }
}

testFinalDashboard().then(success => {
  if (success) {
    console.log('\n🎉 DEPLOYMENT STATUS: SUCCESS - Dashboard is working!');
  } else {
    console.log('\n💥 DEPLOYMENT STATUS: FAILED - Still has issues');
  }
});
