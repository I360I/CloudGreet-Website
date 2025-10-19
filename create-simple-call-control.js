require('dotenv').config({ path: '.env.local' });

const fetch = require('node-fetch');

async function createSimpleCallControl() {
  console.log('🔍 Creating simple Call Control App...');
  
  if (!process.env.TELNYX_API_KEY) {
    console.error('❌ TELNYX_API_KEY not found in environment');
    return;
  }

  const appPayload = {
    application_name: 'CloudGreet-Simple-Test',
    webhook_event_url: 'https://cloudgreet.com/api/telnyx/webhook-test',
    webhook_event_failover_url: 'https://cloudgreet.com/api/telnyx/webhook-test',
    webhook_api_version: '2',
    active: true
  };

  console.log('📞 App payload:', JSON.stringify(appPayload, null, 2));

  try {
    const response = await fetch('https://api.telnyx.com/v2/call_control_applications', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appPayload)
    });

    console.log('📞 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Telnyx API error:', response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Simple Call Control App created successfully:');
    console.log('ID:', data.data.id);
    console.log('Name:', data.data.application_name);
    console.log('Webhook URL:', data.data.webhook_event_url);
    
    return data.data.id;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createSimpleCallControl();
