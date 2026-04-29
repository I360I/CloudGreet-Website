#!/usr/bin/env node

const fs = require('fs');




');
');






















const voiceWebhookFile = 'app/api/telnyx/voice-webhook/route.ts';
if (fs.existsSync(voiceWebhookFile)) {
  const content = fs.readFileSync(voiceWebhookFile, 'utf8');
  
  
  
  // Check for OpenAI configuration
  if (content.includes('OPENAI_API_KEY')) {
    
  } else {
    
  }
  
  // Check for business lookup
  if (content.includes('businesses')) {
    
  } else {
    
  }
  
  // Check for AI agent lookup
  if (content.includes('ai_agents')) {
    
  } else {
    
  }
  
  // Check for instructions generation
  if (content.includes('instructions')) {
    
  } else {
    
  }
  
} else {
  
}



const voiceHandlerFile = 'app/api/telnyx/voice-handler/route.ts';
if (fs.existsSync(voiceHandlerFile)) {
  const content = fs.readFileSync(voiceHandlerFile, 'utf8');
  
  
  
  // Check for call lookup
  if (content.includes('supabaseAdmin.from(\'calls\')')) {
    
  } else {
    
  }
  
  // Check for AI conversation
  if (content.includes('openai.chat.completions.create')) {
    
  } else {
    
  }
  
} else {
  
}

















































