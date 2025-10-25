#!/usr/bin/env node

const fs = require('fs');























const voiceWebhookFile = 'app/api/telnyx/voice-webhook/route.ts';
if (fs.existsSync(voiceWebhookFile)) {
  const content = fs.readFileSync(voiceWebhookFile, 'utf8');
  
  // Check for potential timeout issues
  const timeoutIssues = [
    { pattern: /await.*supabaseAdmin/g, issue: 'Multiple database queries' },
    { pattern: /\.from\(.*businesses.*\)/g, issue: 'Business lookup' },
    { pattern: /\.from\(.*ai_agents.*\)/g, issue: 'AI agent lookup' },
    { pattern: /\.from\(.*calls.*\)/g, issue: 'Call lookup' },
    { pattern: /fetch\(/g, issue: 'External API calls' }
  ];
  
  timeoutIssues.forEach(({ pattern, issue }) => {
    const matches = content.match(pattern);
    if (matches) {
      
    }
  });
  
  // Check for complex operations
  if (content.includes('businesses') && content.includes('ai_agents')) {
    
  }
  
  if (content.includes('fetch(')) {
    
  }
  
} else {
  
}




















































































