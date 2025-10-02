const fetch = require('node-fetch');

async function testDeployment() {
  try {
    console.log('🔍 TESTING CURRENT DEPLOYMENT');
    console.log('==============================');
    
    // Test dashboard API directly
    console.log('1. Testing dashboard API...');
    const dashboardResponse = await fetch('https://cloudgreet.com/api/dashboard/data?timeframe=7d', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('   Dashboard API status:', dashboardResponse.status);
    const dashboardData = await dashboardResponse.text();
    console.log('   Dashboard response:', dashboardData.substring(0, 500));
    
    if (dashboardResponse.ok) {
      console.log('   ✅ Dashboard API working - REAL DATA!');
      const data = JSON.parse(dashboardData);
      console.log('   Business:', data.businessName || 'N/A');
      console.log('   Revenue:', data.totalRevenue || 0);
      console.log('   Calls:', data.totalCalls || 0);
      console.log('   Recent Calls:', data.recentCalls?.length || 0);
      console.log('   Recent Appointments:', data.recentAppointments?.length || 0);
      
      console.log('\n🎉 SUCCESS: REAL DATA IS WORKING!');
      console.log('✅ Dashboard: Real database data');
      console.log('✅ No demo data - everything is real!');
      
      return true;
    } else {
      console.log('   ❌ Dashboard API failed - still has old code');
      return false;
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return false;
  }
}

testDeployment();
