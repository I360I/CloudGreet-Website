#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 DEBUGGING WHAT WE BROKE...\n');

console.log('📋 RECENT CHANGES THAT COULD BREAK TELNYX CALLS:');
console.log('');

console.log('1. SIMPLIFIED CLICK-TO-CALL ROUTE:');
console.log('   - Removed AI session creation');
console.log('   - Removed business/agent setup');
console.log('   - Changed database column names');
console.log('');

console.log('2. DATABASE COLUMN CHANGES:');
console.log('   - Changed from_number/to_number → customer_phone');
console.log('   - Changed status → call_status');
console.log('   - Changed ai_session_id → agent_id');
console.log('   - Changed ai_response → transcript');
console.log('');

console.log('3. POTENTIAL ISSUES:');
console.log('   - Voice webhook might be looking for old column names');
console.log('   - Database operations might be failing');
console.log('   - Call storage might be broken');
console.log('');

console.log('🔍 CHECKING CURRENT CLICK-TO-CALL ROUTE:');

const clickToCallFile = 'app/api/click-to-call/initiate/route.ts';
if (fs.existsSync(clickToCallFile)) {
  const content = fs.readFileSync(clickToCallFile, 'utf8');
  
  // Check for potential issues
  console.log('✅ File exists');
  
  // Check if we're still using the right connection ID
  if (content.includes('2786691125270807749')) {
    console.log('✅ Still using the same connection ID');
  } else {
    console.log('❌ Connection ID changed!');
  }
  
  // Check if we're still making the Telnyx API call
  if (content.includes('api.telnyx.com/v2/calls')) {
    console.log('✅ Still calling Telnyx API');
  } else {
    console.log('❌ Telnyx API call missing!');
  }
  
  // Check if we're storing calls in database
  if (content.includes('supabaseAdmin.from(\'calls\')')) {
    console.log('✅ Still storing calls in database');
  } else {
    console.log('❌ Database storage missing!');
  }
  
  // Check for webhook URL
  if (content.includes('webhook_url')) {
    console.log('✅ Webhook URL still configured');
  } else {
    console.log('❌ Webhook URL missing!');
  }
  
} else {
  console.log('❌ Click-to-call route file missing!');
}

console.log('\n🔍 CHECKING VOICE WEBHOOK:');

const voiceWebhookFile = 'app/api/telnyx/voice-webhook/route.ts';
if (fs.existsSync(voiceWebhookFile)) {
  const content = fs.readFileSync(voiceWebhookFile, 'utf8');
  
  console.log('✅ Voice webhook exists');
  
  // Check if it's looking for calls properly
  if (content.includes('supabaseAdmin.from(\'calls\')')) {
    console.log('✅ Voice webhook queries calls table');
  } else {
    console.log('❌ Voice webhook not querying calls!');
  }
  
  // Check for column name issues
  if (content.includes('customer_phone')) {
    console.log('✅ Using correct customer_phone column');
  } else if (content.includes('from_number') || content.includes('to_number')) {
    console.log('❌ Still using old column names!');
  }
  
} else {
  console.log('❌ Voice webhook file missing!');
}

console.log('\n🚨 MOST LIKELY ISSUES:');
console.log('');
console.log('1. DATABASE SCHEMA MISMATCH:');
console.log('   - Voice webhook might be looking for old column names');
console.log('   - Call storage might be failing due to column mismatch');
console.log('');
console.log('2. MISSING CALL RECORDS:');
console.log('   - Calls might not be stored properly');
console.log('   - Voice webhook can\'t find the call record');
console.log('');
console.log('3. WEBHOOK CONFIGURATION:');
console.log('   - Webhook URL might be wrong');
console.log('   - Voice webhook might be failing');
console.log('');

console.log('🔧 QUICK FIXES TO TRY:');
console.log('');
console.log('1. CHECK IF CALLS ARE BEING STORED:');
console.log('   - Look at your Supabase calls table');
console.log('   - See if new calls are being inserted');
console.log('');
console.log('2. CHECK VOICE WEBHOOK LOGS:');
console.log('   - Look at Vercel function logs');
console.log('   - See if voice webhook is being called');
console.log('');
console.log('3. REVERT TO WORKING VERSION:');
console.log('   - If calls were working before our changes');
console.log('   - We might need to revert some database changes');
console.log('');

console.log('💡 NEXT STEPS:');
console.log('1. Check if calls are being stored in Supabase');
console.log('2. Check Vercel logs for voice webhook errors');
console.log('3. Test with a simple call to see where it fails');
console.log('4. Consider reverting database column changes if needed');
