#!/usr/bin/env node

const fs = require('fs');



























const clickToCallFile = 'app/api/click-to-call/initiate/route.ts';
if (fs.existsSync(clickToCallFile)) {
  const content = fs.readFileSync(clickToCallFile, 'utf8');
  
  // Check for potential issues
  
  
  // Check if we're still using the right connection ID
  if (content.includes('2786691125270807749')) {
    
  } else {
    
  }
  
  // Check if we're still making the Telnyx API call
  if (content.includes('api.telnyx.com/v2/calls')) {
    
  } else {
    
  }
  
  // Check if we're storing calls in database
  if (content.includes('supabaseAdmin.from(\'calls\')')) {
    
  } else {
    
  }
  
  // Check for webhook URL
  if (content.includes('webhook_url')) {
    
  } else {
    
  }
  
} else {
  
}



const voiceWebhookFile = 'app/api/telnyx/voice-webhook/route.ts';
if (fs.existsSync(voiceWebhookFile)) {
  const content = fs.readFileSync(voiceWebhookFile, 'utf8');
  
  
  
  // Check if it's looking for calls properly
  if (content.includes('supabaseAdmin.from(\'calls\')')) {
    
  } else {
    
  }
  
  // Check for column name issues
  if (content.includes('customer_phone')) {
    
  } else if (content.includes('from_number') || content.includes('to_number')) {
    
  }
  
} else {
  
}




































