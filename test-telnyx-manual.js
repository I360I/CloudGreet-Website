// Manual test for Telnyx API call
// Run this with: node test-telnyx-manual.js

const https = require('https');

// Replace with your actual API key
const API_KEY = 'YOUR_TELNYX_API_KEY_HERE';
const CONNECTION_ID = '2786691125270807749';
const FROM_NUMBER = '+18333956731';
const TO_NUMBER = '+15551234567'; // Replace with your test number

const payload = JSON.stringify({
  to: TO_NUMBER,
  from: FROM_NUMBER,
  call_control_application_id: CONNECTION_ID,
  webhook_url: 'https://cloudgreet.com/api/telnyx/voice-webhook',
  webhook_failover_url: 'https://cloudgreet.com/api/telnyx/voice-webhook'
});

const options = {
  hostname: 'api.telnyx.com',
  port: 443,
  path: '/v2/calls',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
};

console.log('📞 Testing Telnyx API call...');
console.log('📞 Payload:', payload);

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📞 Response Status:', res.statusCode);
    console.log('📞 Response Body:', data);
    
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ SUCCESS! The fix works!');
    } else {
      console.log('❌ Still getting an error. Check the response above.');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(payload);
req.end();
