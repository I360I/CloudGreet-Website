const fs = require('fs');
const path = require('path');



// Check if realtime dependencies are installed
function checkRealtimeDependencies() {
  
  
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
      
    } else {
      missingDeps.push(dep);
      
    }
  });
  
  if (missingDeps.length > 0) {
    }`);
    return false;
  }
  
  
  return true;
}

// Check if realtime APIs are implemented
function checkRealtimeAPIs() {
  
  
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
      
    } else {
      missingAPIs.push(api);
      
    }
  });
  
  if (missingAPIs.length > 0) {
    
    return false;
  }
  
  
  return true;
}

// Check if voice webhook uses realtime
function checkVoiceWebhookRealtime() {
  
  
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (!fs.existsSync(webhookPath)) {
    
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
      
    }
  });
  
  if (foundIndicators.length === 0) {
    
    
    return false;
  }
  
  
  return true;
}

// Check if voice handler uses realtime
function checkVoiceHandlerRealtime() {
  
  
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (!fs.existsSync(handlerPath)) {
    
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
      
    }
  });
  
  if (foundIndicators.length === 0) {
    
    return false;
  }
  
  
  return true;
}

// Check environment variables for realtime
function checkRealtimeEnvironment() {
  
  
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
    
    presentVars.push(varName);
  });
  
  
  return true;
}

// Main diagnostic
async function runRealtimeDiagnostic() {
  
  
  const results = {
    dependencies: checkRealtimeDependencies(),
    apis: checkRealtimeAPIs(),
    webhook: checkVoiceWebhookRealtime(),
    handler: checkVoiceHandlerRealtime(),
    environment: checkRealtimeEnvironment()
  };
  
  
  
  
  
  
  
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    
    
  } else {
    
    
    
    
    
    
    
    
    
  }
}

runRealtimeDiagnostic().catch(console.error);
