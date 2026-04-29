#!/usr/bin/env node

const fs = require('fs');










// Create a simple test script
const testScript = `
const https = require('https');



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
  
  
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
`;

fs.writeFileSync('test-webhook.js', testScript);






























































