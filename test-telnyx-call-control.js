require('dotenv').config({ path: '.env.local' });

const fetch = require('node-fetch');

async function testTelnyxCallControl() {
  console.log('🔍 Testing Telnyx Call Control Apps...');
  console.log('TELNYX_API_KEY exists:', !!process.env.TELNYX_API_KEY);
  console.log('TELNYX_API_KEY length:', process.env.TELNYX_API_KEY?.length || 0);
  
  if (!process.env.TELNYX_API_KEY) {
    console.error('❌ TELNYX_API_KEY not found in environment');
    return;
  }

  try {
    const response = await fetch('https://api.telnyx.com/v2/call_control_applications', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Telnyx API error:', response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Available Call Control Apps:');
    console.log(JSON.stringify(data, null, 2));
    
    // Check if our specific Call Control App exists
    if (data.data && data.data.length > 0) {
      const ourApp = data.data.find(app => app.id === '2786688063168841616');
      if (ourApp) {
        console.log('✅ Found our Call Control App:', ourApp);
        console.log('Webhook URL:', ourApp.webhook_url);
        console.log('Webhook Failover URL:', ourApp.webhook_failover_url);
      } else {
        console.log('❌ Our Call Control App 2786688063168841616 not found');
        console.log('Available apps:', data.data.map(app => ({ id: app.id, name: app.name })));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTelnyxCallControl();
