#!/usr/bin/env node

console.log('🔍 TESTING TELNYX CONNECTION ID...\n');

console.log('📋 CURRENT CONFIGURATION:');
console.log('Connection ID: 2786691125270807749');
console.log('Webhook URL: https://cloudgreet.com/api/telnyx/voice-webhook');
console.log('From Number: +18333956731');
console.log('');

console.log('🚨 THE ERROR MEANS:');
console.log('"Invalid value for connection_id (Call Control App ID)"');
console.log('This specifically means the connection_id is wrong or not configured properly.');
console.log('');

console.log('🔍 POSSIBLE CAUSES:');
console.log('');
console.log('1. CONNECTION ID DOESN\'T EXIST:');
console.log('   - The ID 2786691125270807749 might not exist in your Telnyx account');
console.log('   - It might be from a different account or environment');
console.log('');
console.log('2. WEBHOOK URL MISMATCH:');
console.log('   - The connection ID exists but has a different webhook URL');
console.log('   - Telnyx requires the webhook URL to match exactly');
console.log('');
console.log('3. CONNECTION ID DISABLED:');
console.log('   - The Call Control App might be disabled');
console.log('   - It might not have the right permissions');
console.log('');

console.log('🔧 IMMEDIATE FIXES:');
console.log('');
console.log('OPTION 1: Check your Telnyx dashboard');
console.log('   - Go to https://portal.telnyx.com/');
console.log('   - Navigate to "Call Control" → "Call Control Apps"');
console.log('   - Find the app with webhook: https://cloudgreet.com/api/telnyx/voice-webhook');
console.log('   - Copy the correct Call Control App ID');
console.log('');
console.log('OPTION 2: Create new Call Control App');
console.log('   - In Telnyx dashboard, create new Call Control App');
console.log('   - Set webhook URL: https://cloudgreet.com/api/telnyx/voice-webhook');
console.log('   - Set webhook method: POST');
console.log('   - Copy the new Call Control App ID');
console.log('   - Update TELYNX_CONNECTION_ID in Vercel');
console.log('');
console.log('OPTION 3: Test with different connection ID');
console.log('   - Try using a different connection ID from your Telnyx account');
console.log('   - Update TELYNX_CONNECTION_ID in Vercel');
console.log('');

console.log('💡 QUICK TEST:');
console.log('1. Check your Telnyx dashboard for existing Call Control Apps');
console.log('2. Find one with the correct webhook URL');
console.log('3. Use that connection ID instead');
console.log('4. Update in Vercel and test again');
console.log('');

console.log('🚨 IMPORTANT:');
console.log('The connection_id must be a valid Call Control App ID from YOUR Telnyx account');
console.log('that has the webhook URL: https://cloudgreet.com/api/telnyx/voice-webhook');
console.log('');
console.log('If you can\'t find one, you need to create a new Call Control App in Telnyx.');
