#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 FIXING TELNYX CONNECTION ID ISSUE...\n');

console.log('🚨 PROBLEM IDENTIFIED:');
console.log('The connection_id "2786691125270807749" is invalid or not configured properly in Telnyx.');
console.log('');

console.log('📋 STEPS TO FIX:');
console.log('');
console.log('1. LOG INTO YOUR TELNYX DASHBOARD:');
console.log('   - Go to https://portal.telnyx.com/');
console.log('   - Navigate to "Call Control" → "Call Control Apps"');
console.log('');
console.log('2. CHECK YOUR CALL CONTROL APPS:');
console.log('   - Look for apps with webhook URLs configured');
console.log('   - Find the one that points to your domain');
console.log('   - Copy the "Call Control App ID" (this is your connection_id)');
console.log('');
console.log('3. UPDATE YOUR ENVIRONMENT VARIABLES:');
console.log('   - In Vercel: Go to your project → Settings → Environment Variables');
console.log('   - Add/update: TELYNX_CONNECTION_ID = [your actual connection ID]');
console.log('   - Make sure the webhook URL is: https://cloudgreet.com/api/telnyx/voice-webhook');
console.log('');
console.log('4. ALTERNATIVE - CREATE NEW CALL CONTROL APP:');
console.log('   - In Telnyx dashboard, create a new Call Control App');
console.log('   - Set webhook URL to: https://cloudgreet.com/api/telnyx/voice-webhook');
console.log('   - Set webhook method to: POST');
console.log('   - Copy the new Call Control App ID');
console.log('   - Update TELYNX_CONNECTION_ID in Vercel');
console.log('');

console.log('🔍 CURRENT CONFIGURATION:');
console.log('Connection ID: 2786691125270807749 (likely invalid)');
console.log('Webhook URL: https://cloudgreet.com/api/telnyx/voice-webhook');
console.log('From Number: +18333956731');
console.log('');

console.log('⚠️  COMMON ISSUES:');
console.log('1. Connection ID doesn\'t exist in your Telnyx account');
console.log('2. Connection ID exists but webhook URL is wrong/missing');
console.log('3. Connection ID is from a different Telnyx account');
console.log('4. Webhook URL is not accessible from Telnyx');
console.log('');

console.log('🚀 QUICK FIX OPTIONS:');
console.log('');
console.log('OPTION 1: Find existing connection ID');
console.log('   - Check your Telnyx dashboard for existing Call Control Apps');
console.log('   - Use the ID from an app that has the correct webhook URL');
console.log('');
console.log('OPTION 2: Create new connection ID');
console.log('   - Create new Call Control App in Telnyx');
console.log('   - Set webhook to: https://cloudgreet.com/api/telnyx/voice-webhook');
console.log('   - Use the new Call Control App ID');
console.log('');
console.log('OPTION 3: Test without connection_id (if supported)');
console.log('   - Some Telnyx accounts allow calls without connection_id');
console.log('   - This would be a temporary workaround');
console.log('');

console.log('📞 NEXT STEPS:');
console.log('1. Check your Telnyx dashboard for Call Control Apps');
console.log('2. Find the correct connection_id');
console.log('3. Update TELYNX_CONNECTION_ID in Vercel');
console.log('4. Test the call again');
console.log('');
console.log('💡 TIP: The connection_id is the "Call Control App ID" in your Telnyx dashboard,');
console.log('   not the phone number or any other ID.');
