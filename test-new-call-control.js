require('dotenv').config({ path: '.env.local' });

const fetch = require('node-fetch');

async function testNewCallControl() {
  console.log('🔍 Testing new Call Control App...');
  
  if (!process.env.TELNYX_API_KEY) {
    console.error('❌ TELNYX_API_KEY not found in environment');
    return;
  }

  const callPayload = {
    to: '+15551234567',
    from: '+18333956731',
    call_control_application_id: '2809320004305028164',
    webhook_url: 'https://cloudgreet.com/api/telnyx/voice-webhook',
    webhook_failover_url: 'https://cloudgreet.com/api/telnyx/voice-webhook',
    client_state: JSON.stringify({
      business_id: 'demo-business-id',
      agent_id: 'demo-agent-id',
      call_type: 'click_to_call',
      source: 'click_to_call'
    })
  };

  console.log('📞 Call payload:', JSON.stringify(callPayload, null, 2));

  try {
    const response = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callPayload)
    });

    console.log('📞 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Telnyx API error:', response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Call created successfully:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNewCallControl();
