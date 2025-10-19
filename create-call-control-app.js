require('dotenv').config({ path: '.env.local' });

const fetch = require('node-fetch');

async function createCallControlApp() {
  console.log('🔍 Creating new Call Control App...');
  
  if (!process.env.TELNYX_API_KEY) {
    console.error('❌ TELNYX_API_KEY not found in environment');
    return;
  }

  const appPayload = {
    application_name: 'CloudGreet-Voice-New',
    webhook_event_url: 'https://cloudgreet.com/api/telnyx/voice-webhook',
    webhook_event_failover_url: 'https://cloudgreet.com/api/telnyx/voice-webhook',
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
    console.log('✅ Call Control App created successfully:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createCallControlApp();
