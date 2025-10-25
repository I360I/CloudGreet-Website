#!/usr/bin/env node

const fs = require('fs');









const voiceWebhookFile = 'app/api/telnyx/voice-webhook/route.ts';
if (fs.existsSync(voiceWebhookFile)) {
  const content = fs.readFileSync(voiceWebhookFile, 'utf8');
  
  // Check for potential timeout causes
  const timeoutCauses = [
    { pattern: /await.*supabaseAdmin/g, issue: 'Database queries' },
    { pattern: /\.from\(.*businesses.*\)/g, issue: 'Business lookup' },
    { pattern: /\.from\(.*ai_agents.*\)/g, issue: 'AI agent lookup' },
    { pattern: /\.from\(.*calls.*\)/g, issue: 'Call storage' },
    { pattern: /\.single\(\)/g, issue: 'Single record queries' },
    { pattern: /\.insert\(/g, issue: 'Database inserts' }
  ];
  
  timeoutCauses.forEach(({ pattern, issue }) => {
    const matches = content.match(pattern);
    if (matches) {
      
    }
  });
  
  // Check for complex operations
  if (content.includes('businesses') && content.includes('ai_agents')) {
    
  }
  
  if (content.includes('await') && content.includes('supabaseAdmin')) {
    
  }
  
} else {
  
}

























































