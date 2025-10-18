// Test script to verify Telnyx API call with correct parameters
const fetch = require('node-fetch');

async function testTelnyxCall() {
  const connectionId = '2786691125270807749';
  const fromNumber = '+18333956731';
  const toNumber = '+15551234567';
  const apiKey = process.env.TELNYX_API_KEY;

  if (!apiKey) {
    console.error('❌ TELNYX_API_KEY not found in environment variables');
    return;
  }

  console.log('📞 Testing Telnyx API call...');
  console.log('📞 Connection ID:', connectionId);
  console.log('📞 From:', fromNumber);
  console.log('📞 To:', toNumber);

  // Try with call_control_application_id
  const payload = {
    to: toNumber,
    from: fromNumber,
    call_control_application_id: connectionId,
    webhook_url: 'https://cloudgreet.com/api/telnyx/voice-webhook',
    webhook_failover_url: 'https://cloudgreet.com/api/telnyx/voice-webhook'
  };

  console.log('📞 Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('📞 Response status:', response.status);
    console.log('📞 Response body:', responseText);

    if (response.ok) {
      console.log('✅ SUCCESS! Call initiated successfully');
    } else {
      console.log('❌ FAILED:', response.status, responseText);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTelnyxCall();
