require('dotenv').config({ path: '.env.local' });

const fetch = require('node-fetch');

async function testDifferentEndpoint() {
  console.log('🔍 Testing different Telnyx API approach...');
  
  if (!process.env.TELNYX_API_KEY) {
    console.error('❌ TELNYX_API_KEY not found in environment');
    return;
  }

  // Try using the outbound voice profile directly instead of Call Control App
  const callPayload = {
    to: '+15551234567',
    from: '+18333956731',
    outbound_voice_profile_id: '2785793184469353981', // This is from the original Call Control App
    webhook_url: 'https://cloudgreet.com/api/telnyx/voice-webhook',
    webhook_failover_url: 'https://cloudgreet.com/api/telnyx/voice-webhook'
  };

  console.log('📞 Call payload (using outbound_voice_profile_id):', JSON.stringify(callPayload, null, 2));

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

testDifferentEndpoint();
