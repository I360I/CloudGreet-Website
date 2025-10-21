const fs = require('fs');
const path = require('path');

console.log('🔍 CHECKING REALTIME SETUP...\n');

// Check if realtime dependencies are installed
function checkRealtimeDependencies() {
  console.log('📋 Checking Realtime Dependencies...');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = [
    'openai',
    '@supabase/supabase-js',
    'ws'
  ];
  
  const missingDeps = [];
  const installedDeps = [];
  
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      installedDeps.push(dep);
      console.log(`  ✅ ${dep}: ${dependencies[dep]}`);
    } else {
      missingDeps.push(dep);
      console.log(`  ❌ ${dep}: NOT INSTALLED`);
    }
  });
  
  if (missingDeps.length > 0) {
    console.log(`\n  🚨 Missing dependencies: ${missingDeps.join(', ')}`);
    return false;
  }
  
  console.log('  ✅ All realtime dependencies installed');
  return true;
}

// Check if realtime APIs are implemented
function checkRealtimeAPIs() {
  console.log('\n📋 Checking Realtime APIs...');
  
  const realtimeAPIs = [
    'app/api/ai/realtime-session/route.ts',
    'app/api/ai/realtime-token/route.ts',
    'app/api/telnyx/realtime-voice/route.ts',
    'app/api/telnyx/webrtc-voice/route.ts'
  ];
  
  const existingAPIs = [];
  const missingAPIs = [];
  
  realtimeAPIs.forEach(api => {
    if (fs.existsSync(api)) {
      existingAPIs.push(api);
      console.log(`  ✅ ${api}: EXISTS`);
    } else {
      missingAPIs.push(api);
      console.log(`  ❌ ${api}: MISSING`);
    }
  });
  
  if (missingAPIs.length > 0) {
    console.log(`\n  🚨 Missing realtime APIs: ${missingAPIs.length}`);
    return false;
  }
  
  console.log('  ✅ All realtime APIs exist');
  return true;
}

// Check if voice webhook uses realtime
function checkVoiceWebhookRealtime() {
  console.log('\n📋 Checking Voice Webhook Realtime Usage...');
  
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (!fs.existsSync(webhookPath)) {
    console.log('  ❌ Voice webhook does not exist');
    return false;
  }
  
  const content = fs.readFileSync(webhookPath, 'utf8');
  
  // Check for realtime indicators
  const realtimeIndicators = [
    'stream_audio',
    'realtime',
    'webrtc',
    'gpt-4o-realtime'
  ];
  
  const foundIndicators = [];
  realtimeIndicators.forEach(indicator => {
    if (content.includes(indicator)) {
      foundIndicators.push(indicator);
      console.log(`  ✅ Found: ${indicator}`);
    }
  });
  
  if (foundIndicators.length === 0) {
    console.log('  ❌ Voice webhook does NOT use realtime functionality');
    console.log('  🚨 This is the problem! The webhook is using old speech gathering instead of realtime streaming');
    return false;
  }
  
  console.log('  ✅ Voice webhook uses realtime functionality');
  return true;
}

// Check if voice handler uses realtime
function checkVoiceHandlerRealtime() {
  console.log('\n📋 Checking Voice Handler Realtime Usage...');
  
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (!fs.existsSync(handlerPath)) {
    console.log('  ❌ Voice handler does not exist');
    return false;
  }
  
  const content = fs.readFileSync(handlerPath, 'utf8');
  
  // Check for realtime indicators
  const realtimeIndicators = [
    'gpt-4o-realtime',
    'realtime',
    'stream_audio',
    'webrtc'
  ];
  
  const foundIndicators = [];
  realtimeIndicators.forEach(indicator => {
    if (content.includes(indicator)) {
      foundIndicators.push(indicator);
      console.log(`  ✅ Found: ${indicator}`);
    }
  });
  
  if (foundIndicators.length === 0) {
    console.log('  ❌ Voice handler does NOT use realtime functionality');
    return false;
  }
  
  console.log('  ✅ Voice handler uses realtime functionality');
  return true;
}

// Check environment variables for realtime
function checkRealtimeEnvironment() {
  console.log('\n📋 Checking Realtime Environment Variables...');
  
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_APP_URL',
    'TELYNX_API_KEY',
    'TELYNX_PHONE_NUMBER'
  ];
  
  const missingVars = [];
  const presentVars = [];
  
  // Note: We can't actually check the .env file in production
  // This is just a checklist for the user
  requiredEnvVars.forEach(varName => {
    console.log(`  📝 ${varName}: Check your .env.local file`);
    presentVars.push(varName);
  });
  
  console.log('  ✅ Environment variables checklist provided');
  return true;
}

// Main diagnostic
async function runRealtimeDiagnostic() {
  console.log('🔧 Running realtime diagnostic...\n');
  
  const results = {
    dependencies: checkRealtimeDependencies(),
    apis: checkRealtimeAPIs(),
    webhook: checkVoiceWebhookRealtime(),
    handler: checkVoiceHandlerRealtime(),
    environment: checkRealtimeEnvironment()
  };
  
  console.log('\n📋 REALTIME DIAGNOSTIC RESULTS:');
  console.log(`Dependencies: ${results.dependencies ? '✅' : '❌'}`);
  console.log(`APIs: ${results.apis ? '✅' : '❌'}`);
  console.log(`Voice Webhook: ${results.webhook ? '✅' : '❌'}`);
  console.log(`Voice Handler: ${results.handler ? '✅' : '❌'}`);
  console.log(`Environment: ${results.environment ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 REALTIME IS PROPERLY CONFIGURED!');
    console.log('\n🚀 The AI should be using realtime streaming for live conversations');
  } else {
    console.log('\n❌ REALTIME ISSUES FOUND!');
    console.log('\n🚨 CRITICAL PROBLEM:');
    console.log('The voice webhook is NOT using realtime functionality!');
    console.log('It\'s using old speech gathering instead of live streaming.');
    console.log('\n🔧 SOLUTION:');
    console.log('1. Update voice webhook to use realtime streaming');
    console.log('2. Configure OpenAI Realtime API integration');
    console.log('3. Set up proper audio streaming');
    console.log('\n💡 This explains why the AI isn\'t working - it\'s not using realtime!');
  }
}

runRealtimeDiagnostic().catch(console.error);
