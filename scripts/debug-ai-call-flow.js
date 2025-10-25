const fs = require('fs');
const path = require('path');



// 1. Check the voice webhook flow
function checkVoiceWebhookFlow() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    
    
    // Check if it's properly routing to voice handler
    if (content.includes('voice-handler')) {
      
    } else {
      
    }
    
    // Check if it's using the correct phone number
    if (content.includes('TELYNX_PHONE_NUMBER')) {
      
    } else {
      
    }
    
    // Check if it's checking for OpenAI
    if (content.includes('OPENAI_API_KEY')) {
      
    } else {
      
    }
    
    // Check if it's using the demo business
    if (content.includes('00000000-0000-0000-0000-000000000001')) {
      
    } else {
      
    }
  } else {
    
  }
}

// 2. Check the voice handler flow
function checkVoiceHandlerFlow() {
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    
    
    // Check if it's using OpenAI
    if (content.includes('openai.chat.completions.create')) {
      
    } else {
      
    }
    
    // Check if it's checking for API key
    if (content.includes('OPENAI_API_KEY')) {
      
    } else {
      
    }
    
    // Check if it's using the correct model
    if (content.includes('gpt-4')) {
      
    } else {
      
    }
    
    // Check if it's generating proper responses
    if (content.includes('aiResponse')) {
      
    } else {
      
    }
  } else {
    
  }
}

// 3. Check the click-to-call flow
function checkClickToCallFlow() {
  const clickToCallPath = 'app/api/click-to-call/initiate/route.ts';
  
  if (fs.existsSync(clickToCallPath)) {
    const content = fs.readFileSync(clickToCallPath, 'utf8');
    
    
    
    // Check if it's creating Telnyx calls
    if (content.includes('api.telnyx.com/v2/calls')) {
      
    } else {
      
    }
    
    // Check if it's using the correct webhook URL
    if (content.includes('voice-webhook')) {
      
    } else {
      
    }
    
    // Check if it's using the correct phone number
    if (content.includes('TELYNX_PHONE_NUMBER')) {
      
    } else {
      
    }
  } else {
    
  }
}

// 4. Check for potential issues
function checkPotentialIssues() {
  
  
  // Check if the demo conversation API exists
  const demoApiPath = 'app/api/ai/conversation-demo/route.ts';
  if (fs.existsSync(demoApiPath)) {
    
  } else {
    
  }
  
  // Check if the voice webhook is properly configured
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    if (content.includes('gather') && content.includes('speech')) {
      
    } else {
      
    }
  }
  
  // Check if the voice handler is properly configured
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    if (content.includes('gather') && content.includes('speech')) {
      
    } else {
      
    }
  }
}

// 5. Create a test script to verify the AI connection
function createAITestScript() {
  const testScript = `
// Test script to verify AI is working


// Test OpenAI API key
if (process.env.OPENAI_API_KEY) {
  
} else {
  
}

// Test Telnyx API key
if (process.env.TELYNX_API_KEY) {
  
} else {
  
}

// Test phone number
if (process.env.TELYNX_PHONE_NUMBER) {
  
} else {
  
}

// Test app URL
if (process.env.NEXT_PUBLIC_APP_URL) {
  
} else {
  
}







`;

  fs.writeFileSync('scripts/test-ai-connection.js', testScript);
  
}

// Run all checks


checkVoiceWebhookFlow();
checkVoiceHandlerFlow();
checkClickToCallFlow();
checkPotentialIssues();
createAITestScript();












