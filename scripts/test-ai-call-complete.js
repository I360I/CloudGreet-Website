const fs = require('fs');
const path = require('path');



// 1. Test the demo conversation API
function testDemoConversationAPI() {
  const apiPath = 'app/api/ai/conversation-demo/route.ts';
  
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    
    
    if (content.includes('OPENAI_API_KEY')) {
      
    } else {
      
    }
    
    if (content.includes('chat/completions')) {
      
    } else {
      
    }
    
    if (content.includes('gpt-4')) {
      
    } else {
      
    }
    
    if (content.includes('sessionId')) {
      
    } else {
      
    }
  } else {
    
  }
}

// 2. Test the click-to-call flow
function testClickToCallFlow() {
  const apiPath = 'app/api/click-to-call/initiate/route.ts';
  
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    
    
    // Check if it calls the demo conversation API
    if (content.includes('conversation-demo')) {
      
    } else {
      
    }
    
    // Check if it uses the AI session
    if (content.includes('aiSession')) {
      
    } else {
      
    }
    
    // Check if it creates Telnyx calls
    if (content.includes('api.telnyx.com/v2/calls')) {
      
    } else {
      
    }
    
    // Check if it uses the correct webhook
    if (content.includes('voice-webhook')) {
      
    } else {
      
    }
    
    // Check if it uses the connection ID
    if (content.includes('connection_id: connectionId')) {
      
    } else {
      
    }
  } else {
    
  }
}

// 3. Test the voice webhook flow
function testVoiceWebhookFlow() {
  const apiPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    
    
    // Check if it checks for the Telnyx phone number
    if (content.includes('TELYNX_PHONE_NUMBER')) {
      
    } else {
      
    }
    
    // Check if it uses demo business for Telnyx calls
    if (content.includes('telnyxPhoneNumber')) {
      
    } else {
      
    }
    
    // Check if it routes to voice-handler
    if (content.includes('voice-handler')) {
      
    } else {
      
    }
    
    // Check if it uses speech gathering
    if (content.includes('gather') && content.includes('speech')) {
      
    } else {
      
    }
  } else {
    
  }
}

// 4. Test the voice handler flow
function testVoiceHandlerFlow() {
  const apiPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    
    
    // Check if it uses OpenAI
    if (content.includes('openai.chat.completions.create')) {
      
    } else {
      
    }
    
    // Check if it generates AI responses
    if (content.includes('aiResponse')) {
      
    } else {
      
    }
    
    // Check if it uses speech gathering
    if (content.includes('gather') && content.includes('speech')) {
      
    } else {
      
    }
    
    // Check if it uses the correct model
    if (content.includes('gpt-4')) {
      
    } else {
      
    }
  } else {
    
  }
}

// 5. Check for potential issues
function checkPotentialIssues() {
  
  
  // Check if the demo conversation API is properly implemented
  const demoApiPath = 'app/api/ai/conversation-demo/route.ts';
  if (fs.existsSync(demoApiPath)) {
    const content = fs.readFileSync(demoApiPath, 'utf8');
    
    if (content.includes('OPENAI_API_KEY') && content.includes('chat/completions')) {
      
    } else {
      
    }
  } else {
    
  }
  
  // Check if the voice webhook is properly configured
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    if (content.includes('TELYNX_PHONE_NUMBER') && content.includes('telnyxPhoneNumber')) {
      
    } else {
      
    }
  }
  
  // Check if the voice handler is properly configured
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    if (content.includes('openai.chat.completions.create') && content.includes('aiResponse')) {
      
    } else {
      
    }
  }
}

// 6. Create a simple test to verify the AI connection
function createSimpleAITest() {
  const testScript = `
// Simple AI connection test


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

  fs.writeFileSync('scripts/simple-ai-test.js', testScript);
  
}

// Run all tests


testDemoConversationAPI();
testClickToCallFlow();
testVoiceWebhookFlow();
testVoiceHandlerFlow();
checkPotentialIssues();
createSimpleAITest();













