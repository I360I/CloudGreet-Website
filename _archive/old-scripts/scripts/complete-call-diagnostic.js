const fs = require('fs');
const path = require('path');



// 1. Test the demo conversation API
async function testDemoConversationAPI() {
  
  
  const apiPath = 'app/api/ai/conversation-demo/route.ts';
  if (!fs.existsSync(apiPath)) {
    
    return false;
  }
  
  const content = fs.readFileSync(apiPath, 'utf8');
  
  // Check if it has proper OpenAI integration
  if (!content.includes('openai.chat.completions.create') && !content.includes('OpenAI')) {
    
    return false;
  }
  
  if (!content.includes('OPENAI_API_KEY')) {
    
    return false;
  }
  
  if (!content.includes('sessionId')) {
    
    return false;
  }
  
  
  return true;
}

// 2. Test the click-to-call API
async function testClickToCallAPI() {
  
  
  const apiPath = 'app/api/click-to-call/initiate/route.ts';
  if (!fs.existsSync(apiPath)) {
    
    return false;
  }
  
  const content = fs.readFileSync(apiPath, 'utf8');
  
  // Check if it calls the demo conversation API
  if (!content.includes('conversation-demo')) {
    
    return false;
  }
  
  // Check if it creates Telnyx calls
  if (!content.includes('api.telnyx.com/v2/calls')) {
    
    return false;
  }
  
  // Check if it uses the correct webhook URL
  if (!content.includes('voice-webhook')) {
    
    return false;
  }
  
  // Check if it uses the correct environment variable
  if (!content.includes('NEXT_PUBLIC_APP_URL')) {
    
    return false;
  }
  
  
  return true;
}

// 3. Test the voice webhook
async function testVoiceWebhook() {
  
  
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (!fs.existsSync(webhookPath)) {
    
    return false;
  }
  
  const content = fs.readFileSync(webhookPath, 'utf8');
  
  // Check if it routes to voice-handler
  if (!content.includes('voice-handler')) {
    
    return false;
  }
  
  // Check if it uses the correct environment variable
  if (!content.includes('NEXT_PUBLIC_APP_URL')) {
    
    return false;
  }
  
  // Check if it's configured for speech gathering
  if (!content.includes('gather') || !content.includes('speech')) {
    
    return false;
  }
  
  // Check if it checks for the Telnyx phone number
  if (!content.includes('TELYNX_PHONE_NUMBER')) {
    
    return false;
  }
  
  
  return true;
}

// 4. Test the voice handler
async function testVoiceHandler() {
  
  
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (!fs.existsSync(handlerPath)) {
    
    return false;
  }
  
  const content = fs.readFileSync(handlerPath, 'utf8');
  
  // Check if it uses OpenAI
  if (!content.includes('openai.chat.completions.create')) {
    
    return false;
  }
  
  // Check if it generates AI responses
  if (!content.includes('aiResponse')) {
    
    return false;
  }
  
  // Check if it's configured for speech gathering
  if (!content.includes('gather') || !content.includes('speech')) {
    
    return false;
  }
  
  // Check if it uses the correct model
  if (!content.includes('gpt-4')) {
    
    return false;
  }
  
  
  return true;
}

// 5. Check for critical issues
async function checkCriticalIssues() {
  
  
  const issues = [];
  
  // Check if the demo conversation API is properly implemented
  const demoApiPath = 'app/api/ai/conversation-demo/route.ts';
  if (fs.existsSync(demoApiPath)) {
    const content = fs.readFileSync(demoApiPath, 'utf8');
    
    if (!content.includes('OPENAI_API_KEY') || !content.includes('OpenAI')) {
      issues.push('Demo conversation API not properly implemented');
    }
  } else {
    issues.push('Demo conversation API missing');
  }
  
  // Check if the voice webhook is properly configured
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    if (!content.includes('TELYNX_PHONE_NUMBER') || !content.includes('telnyxPhoneNumber')) {
      issues.push('Voice webhook not properly configured for phone number matching');
    }
    
    if (!content.includes('NEXT_PUBLIC_APP_URL')) {
      issues.push('Voice webhook not using NEXT_PUBLIC_APP_URL');
    }
  } else {
    issues.push('Voice webhook missing');
  }
  
  // Check if the voice handler is properly configured
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    if (!content.includes('openai.chat.completions.create') || !content.includes('aiResponse')) {
      issues.push('Voice handler not properly configured for AI responses');
    }
  } else {
    issues.push('Voice handler missing');
  }
  
  if (issues.length > 0) {
    
    issues.forEach(issue => );
    return false;
  } else {
    
    return true;
  }
}

// 6. Check the actual call flow
async function checkCallFlow() {
  
  
  // Check if the click-to-call is properly configured
  const clickToCallPath = 'app/api/click-to-call/initiate/route.ts';
  if (fs.existsSync(clickToCallPath)) {
    const content = fs.readFileSync(clickToCallPath, 'utf8');
    
    // Check if it's using the correct webhook URL
    if (!content.includes('voice-webhook')) {
      
      return false;
    }
    
    // Check if it's using the correct environment variable
    if (!content.includes('NEXT_PUBLIC_APP_URL')) {
      
      return false;
    }
    
    // Check if it's creating Telnyx calls
    if (!content.includes('api.telnyx.com/v2/calls')) {
      
      return false;
    }
  }
  
  // Check if the voice webhook is properly configured
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    // Check if it's using the correct environment variable
    if (!content.includes('NEXT_PUBLIC_APP_URL')) {
      
      return false;
    }
    
    // Check if it's routing to voice-handler
    if (!content.includes('voice-handler')) {
      
      return false;
    }
  }
  
  
  return true;
}

// 7. Create a test script to verify the AI connection
async function createAITestScript() {
  const testScript = `
// Test script to verify AI connection


// Test environment variables
const requiredVars = [
  'OPENAI_API_KEY',
  'TELYNX_API_KEY',
  'TELYNX_PHONE_NUMBER',
  'TELYNX_CONNECTION_ID',
  'NEXT_PUBLIC_APP_URL'
];


requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    }...\`);
  } else {
    
  }
});









`;

  fs.writeFileSync('scripts/ai-connection-test.js', testScript);
  
}

// Run all tests
async function runDiagnostic() {
  
  
  const results = {
    demoConversationAPI: await testDemoConversationAPI(),
    clickToCallAPI: await testClickToCallAPI(),
    voiceWebhook: await testVoiceWebhook(),
    voiceHandler: await testVoiceHandler(),
    criticalIssues: await checkCriticalIssues(),
    callFlow: await checkCallFlow()
  };
  
  
  
  
  
  
  
  
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    
    
    
    
    
  } else {
    
    
    
    
    
    
    
  }
  
  await createAITestScript();
}

runDiagnostic().catch(console.error);
