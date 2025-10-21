
const https = require('https');

console.log('Testing voice webhook accessibility...');

const options = {
  hostname: 'cloudgreet.com',
  port: 443,
  path: '/api/telnyx/voice-webhook',
  method: 'GET',
  headers: {
    'User-Agent': 'Webhook-Test'
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
