require('dotenv').config({ path: '.env.local' });

const fetch = require('node-fetch');

async function testTelnyxCallV2() {
  console.log('🔍 Testing Telnyx Call Creation (V2)...');
  
  if (!process.env.TELNYX_API_KEY) {
    console.error('❌ TELNYX_API_KEY not found in environment');
    return;
  }

  // Try without webhook_url parameters since the Call Control App already has them configured
  const callPayload = {
    to: '+15551234567',
    from: '+18333956731',
    call_control_application_id: '2786688063168841616',
    client_state: JSON.stringify({
      business_id: 'demo-business-id',
      agent_id: 'demo-agent-id',
      call_type: 'click_to_call',
      source: 'click_to_call'
    })
  };

  console.log('📞 Call payload (without webhook URLs):', JSON.stringify(callPayload, null, 2));

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

testTelnyxCallV2();
