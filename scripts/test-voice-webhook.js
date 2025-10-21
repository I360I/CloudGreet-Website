#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 TESTING VOICE WEBHOOK ACCESSIBILITY...\n');

console.log('📋 VOICE WEBHOOK URL:');
console.log('https://cloudgreet.com/api/telnyx/voice-webhook');
console.log('');

console.log('🔧 TESTING WEBHOOK ACCESSIBILITY:');
console.log('');

// Create a simple test script
const testScript = `
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
`;

fs.writeFileSync('test-webhook.js', testScript);

console.log('✅ Created test-webhook.js');
console.log('');
console.log('🚀 TO TEST THE WEBHOOK:');
console.log('1. Run: node test-webhook.js');
console.log('2. Check if it returns a 200 status');
console.log('3. If it fails, the webhook might not be accessible');
console.log('');

console.log('🔍 OTHER DEBUGGING STEPS:');
console.log('');
console.log('1. CHECK VERCEL FUNCTION LOGS:');
console.log('   - Go to Vercel dashboard');
console.log('   - Click on your project');
console.log('   - Go to Functions tab');
console.log('   - Look for voice-webhook function');
console.log('   - Check for recent invocations and errors');
console.log('');
console.log('2. CHECK SUPABASE CALLS TABLE:');
console.log('   - Go to your Supabase dashboard');
console.log('   - Check the calls table');
console.log('   - See if new calls are being inserted');
console.log('   - Check if the call_id matches what Telnyx sends');
console.log('');
console.log('3. CHECK TELNYX WEBHOOK CONFIGURATION:');
console.log('   - Go to Telnyx dashboard');
console.log('   - Check your Call Control App');
console.log('   - Verify webhook URL is: https://cloudgreet.com/api/telnyx/voice-webhook');
console.log('   - Check if webhook method is POST');
console.log('');

console.log('🚨 MOST LIKELY ISSUES:');
console.log('');
console.log('1. VOICE WEBHOOK NOT BEING CALLED:');
console.log('   - Telnyx might not be calling the webhook');
console.log('   - Webhook URL might be wrong in Telnyx');
console.log('   - Webhook might be returning errors');
console.log('');
console.log('2. CALL NOT BEING STORED:');
console.log('   - Click-to-call might not be storing the call');
console.log('   - Database insert might be failing');
console.log('   - Voice webhook can\'t find the call record');
console.log('');
console.log('3. VOICE HANDLER NOT BEING CALLED:');
console.log('   - Voice webhook might not be calling the handler');
console.log('   - Handler might be failing silently');
console.log('   - AI conversation might not be working');
console.log('');

console.log('💡 QUICK FIXES:');
console.log('');
console.log('1. Add more logging to voice webhook');
console.log('2. Check if calls are being stored in database');
console.log('3. Verify webhook URL in Telnyx dashboard');
console.log('4. Test each component separately');
console.log('');

console.log('📞 IMMEDIATE ACTIONS:');
console.log('1. Run the webhook test: node test-webhook.js');
console.log('2. Check Vercel function logs');
console.log('3. Check Supabase calls table');
console.log('4. Verify Telnyx webhook configuration');
