#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 DEBUGGING AI SILENCE ISSUE...\n');

console.log('📋 CALL FLOW STATUS:');
console.log('✅ Click-to-call API working (call goes through)');
console.log('❌ AI not talking (voice webhook/handler issue)');
console.log('');

console.log('🚨 POSSIBLE CAUSES:');
console.log('');
console.log('1. VOICE WEBHOOK NOT BEING CALLED:');
console.log('   - Telnyx might not be calling the webhook');
console.log('   - Webhook URL might be wrong');
console.log('   - Webhook might be returning errors');
console.log('');
console.log('2. VOICE HANDLER ISSUES:');
console.log('   - Voice handler might be failing');
console.log('   - Database queries might be failing');
console.log('   - AI conversation might not be working');
console.log('');
console.log('3. DATABASE ISSUES:');
console.log('   - Call might not be stored properly');
console.log('   - Voice webhook can\'t find the call record');
console.log('   - Business/agent data might be missing');
console.log('');

console.log('🔍 CHECKING VOICE WEBHOOK CONFIGURATION:');

const voiceWebhookFile = 'app/api/telnyx/voice-webhook/route.ts';
if (fs.existsSync(voiceWebhookFile)) {
  const content = fs.readFileSync(voiceWebhookFile, 'utf8');
  
  console.log('✅ Voice webhook file exists');
  
  // Check for OpenAI configuration
  if (content.includes('OPENAI_API_KEY')) {
    console.log('✅ OpenAI API key check present');
  } else {
    console.log('❌ OpenAI API key check missing!');
  }
  
  // Check for business lookup
  if (content.includes('businesses')) {
    console.log('✅ Business lookup present');
  } else {
    console.log('❌ Business lookup missing!');
  }
  
  // Check for AI agent lookup
  if (content.includes('ai_agents')) {
    console.log('✅ AI agent lookup present');
  } else {
    console.log('❌ AI agent lookup missing!');
  }
  
  // Check for instructions generation
  if (content.includes('instructions')) {
    console.log('✅ Instructions generation present');
  } else {
    console.log('❌ Instructions generation missing!');
  }
  
} else {
  console.log('❌ Voice webhook file missing!');
}

console.log('\n🔍 CHECKING VOICE HANDLER:');

const voiceHandlerFile = 'app/api/telnyx/voice-handler/route.ts';
if (fs.existsSync(voiceHandlerFile)) {
  const content = fs.readFileSync(voiceHandlerFile, 'utf8');
  
  console.log('✅ Voice handler file exists');
  
  // Check for call lookup
  if (content.includes('supabaseAdmin.from(\'calls\')')) {
    console.log('✅ Call lookup present');
  } else {
    console.log('❌ Call lookup missing!');
  }
  
  // Check for AI conversation
  if (content.includes('openai.chat.completions.create')) {
    console.log('✅ AI conversation present');
  } else {
    console.log('❌ AI conversation missing!');
  }
  
} else {
  console.log('❌ Voice handler file missing!');
}

console.log('\n🚨 MOST LIKELY ISSUES:');
console.log('');
console.log('1. VOICE WEBHOOK NOT BEING CALLED:');
console.log('   - Check Vercel function logs for voice webhook');
console.log('   - Verify webhook URL in Telnyx dashboard');
console.log('   - Check if webhook is returning errors');
console.log('');
console.log('2. DATABASE QUERIES FAILING:');
console.log('   - Voice webhook can\'t find business/agent');
console.log('   - Call record not being stored properly');
console.log('   - Database column mismatches');
console.log('');
console.log('3. AI CONVERSATION FAILING:');
console.log('   - OpenAI API key not configured');
console.log('   - AI conversation API failing');
console.log('   - Voice handler not being called');
console.log('');

console.log('🔧 IMMEDIATE DEBUGGING STEPS:');
console.log('');
console.log('1. CHECK VERCEL LOGS:');
console.log('   - Go to Vercel dashboard → Functions');
console.log('   - Look for voice-webhook function logs');
console.log('   - Check for errors or timeouts');
console.log('');
console.log('2. CHECK DATABASE:');
console.log('   - Look at Supabase calls table');
console.log('   - See if new calls are being stored');
console.log('   - Check if business/agent data exists');
console.log('');
console.log('3. TEST WEBHOOK DIRECTLY:');
console.log('   - Try calling the webhook URL directly');
console.log('   - Check if it returns proper response');
console.log('');

console.log('💡 QUICK FIXES TO TRY:');
console.log('');
console.log('1. Add more logging to voice webhook');
console.log('2. Check if business/agent data exists in database');
console.log('3. Verify OpenAI API key is configured');
console.log('4. Test voice handler independently');
console.log('');

console.log('📞 NEXT STEPS:');
console.log('1. Check Vercel function logs for voice webhook');
console.log('2. Verify database has the required data');
console.log('3. Test each component separately');
console.log('4. Add debugging logs to identify the exact failure point');
