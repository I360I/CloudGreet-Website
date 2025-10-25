const fs = require('fs');
const path = require('path');



// 1. Check if the voice webhook is actually being called
function checkVoiceWebhookCall() {
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    
    
    // Check if it's actually routing to voice-handler
    if (content.includes('voice-handler')) {
      
    } else {
      
    }
    
    // Check if it's using the correct webhook URL
    if (content.includes('NEXT_PUBLIC_APP_URL')) {
      
    } else {
      
    }
    
    // Check if it's properly configured for speech
    if (content.includes('gather') && content.includes('speech')) {
      
    } else {
      
    }
  }
}

// 2. Check if the voice handler is actually working
function checkVoiceHandlerWorking() {
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    
    
    // Check if it's actually using OpenAI
    if (content.includes('openai.chat.completions.create')) {
      
    } else {
      
    }
    
    // Check if it's generating responses
    if (content.includes('aiResponse')) {
      
    } else {
      
    }
    
    // Check if it's using the correct model
    if (content.includes('gpt-4')) {
      
    } else {
      
    }
  }
}

// 3. Check the exact issue
function findExactIssue() {
  
  
  // Check if the voice webhook is properly configured
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    // Check if it's using the correct webhook URL
    if (content.includes('NEXT_PUBLIC_APP_URL')) {
      
    } else {
      
    }
    
    // Check if it's properly configured for speech
    if (content.includes('gather') && content.includes('speech')) {
      
    } else {
      
    }
  }
  
  // Check if the voice handler is properly configured
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    // Check if it's using OpenAI
    if (content.includes('openai.chat.completions.create')) {
      
    } else {
      
    }
    
    // Check if it's generating responses
    if (content.includes('aiResponse')) {
      
    } else {
      
    }
  }
}

// 4. Check if there's a missing piece
function checkMissingPiece() {
  
  
  // Check if the voice webhook is actually being called
  const webhookPath = 'app/api/telnyx/voice-webhook/route.ts';
  if (fs.existsSync(webhookPath)) {
    const content = fs.readFileSync(webhookPath, 'utf8');
    
    // Check if it's using the correct webhook URL
    if (content.includes('NEXT_PUBLIC_APP_URL')) {
      
    } else {
      
    }
    
    // Check if it's properly configured for speech
    if (content.includes('gather') && content.includes('speech')) {
      
    } else {
      
    }
  }
  
  // Check if the voice handler is properly configured
  const handlerPath = 'app/api/telnyx/voice-handler/route.ts';
  if (fs.existsSync(handlerPath)) {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    // Check if it's using OpenAI
    if (content.includes('openai.chat.completions.create')) {
      
    } else {
      
    }
    
    // Check if it's generating responses
    if (content.includes('aiResponse')) {
      
    } else {
      
    }
  }
}

// Run all checks


checkVoiceWebhookCall();
checkVoiceHandlerWorking();
findExactIssue();
checkMissingPiece();













