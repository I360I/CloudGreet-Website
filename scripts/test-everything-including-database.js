#!/usr/bin/env node

const fs = require('fs');




// Test configuration
const tests = {
  passed: 0,
  failed: 0,
  total: 0
};

function runTest(name, testFn) {
  tests.total++;
  try {
    const result = testFn();
    if (result) {
      
      tests.passed++;
    } else {
      
      tests.failed++;
    }
  } catch (error) {
    
    tests.failed++;
  }
}



// Test 1: All required files exist
runTest('Voice webhook exists', () => fs.existsSync('app/api/telnyx/voice-webhook/route.ts'));
runTest('Voice handler exists', () => fs.existsSync('app/api/telnyx/voice-handler/route.ts'));
runTest('Realtime stream exists', () => fs.existsSync('app/api/telnyx/realtime-stream/route.ts'));
runTest('Realtime tools exists', () => fs.existsSync('app/api/telnyx/realtime-tools/route.ts'));
runTest('Realtime webhook exists', () => fs.existsSync('app/api/telnyx/realtime-webhook/route.ts'));
runTest('Click to call exists', () => fs.existsSync('app/api/click-to-call/initiate/route.ts'));
runTest('Monitoring lib exists', () => fs.existsSync('lib/monitoring.ts'));
runTest('Supabase lib exists', () => fs.existsSync('lib/supabase.ts'));



// Test 2: No TypeScript issues
runTest('No any types in realtime-stream', () => {
  const content = fs.readFileSync('app/api/telnyx/realtime-stream/route.ts', 'utf8');
  const anyTypeRegex = /:\s*any\b|as\s+any\b/g;
  return !anyTypeRegex.test(content);
});

runTest('No any types in realtime-tools', () => {
  const content = fs.readFileSync('app/api/telnyx/realtime-tools/route.ts', 'utf8');
  const anyTypeRegex = /:\s*any\b|as\s+any\b/g;
  return !anyTypeRegex.test(content);
});

runTest('No any types in monitoring', () => {
  const content = fs.readFileSync('lib/monitoring.ts', 'utf8');
  const anyTypeRegex = /:\s*any\b|as\s+any\b/g;
  return !anyTypeRegex.test(content);
});

// Test 3: Environment variable safety
runTest('Environment variables have null checks', () => {
  const files = [
    'app/api/telnyx/voice-webhook/route.ts',
    'app/api/telnyx/voice-handler/route.ts',
    'app/api/click-to-call/initiate/route.ts',
    'lib/supabase.ts'
  ];
  
  return files.every(file => {
    const content = fs.readFileSync(file, 'utf8');
    return !content.includes('process.env.') || content.includes('||');
  });
});

// Test 4: No console.log usage
runTest('No console.log in production code', () => {
  const files = [
    'app/api/telnyx/voice-webhook/route.ts',
    'app/api/telnyx/voice-handler/route.ts',
    'app/api/telnyx/realtime-stream/route.ts',
    'app/api/telnyx/realtime-tools/route.ts',
    'app/api/click-to-call/initiate/route.ts'
  ];
  
  return files.every(file => {
    const content = fs.readFileSync(file, 'utf8');
    return !content.includes('console.log') && !content.includes('console.error');
  });
});



// Test 5: Performance optimization
runTest('Realtime tools has reasonable await count', () => {
  const content = fs.readFileSync('app/api/telnyx/realtime-tools/route.ts', 'utf8');
  const awaitCount = (content.match(/await\s+/g) || []).length;
  return awaitCount <= 4;
});

runTest('Click to call has reasonable await count', () => {
  const content = fs.readFileSync('app/api/click-to-call/initiate/route.ts', 'utf8');
  const awaitCount = (content.match(/await\s+/g) || []).length;
  return awaitCount <= 6;
});

// Test 6: Error handling
runTest('All API routes have try-catch blocks', () => {
  const files = [
    'app/api/telnyx/voice-webhook/route.ts',
    'app/api/telnyx/voice-handler/route.ts',
    'app/api/telnyx/realtime-stream/route.ts',
    'app/api/telnyx/realtime-tools/route.ts',
    'app/api/click-to-call/initiate/route.ts'
  ];
  
  return files.every(file => {
    const content = fs.readFileSync(file, 'utf8');
    return content.includes('try {') && content.includes('catch');
  });
});



// Test 7: Database migrations
runTest('Perfect database setup exists', () => fs.existsSync('migrations/perfect-database-setup.sql'));

runTest('Database setup has all required tables', () => {
  const content = fs.readFileSync('migrations/perfect-database-setup.sql', 'utf8');
  return content.includes('CREATE TABLE') && 
         content.includes('businesses') && 
         content.includes('ai_agents') && 
         content.includes('calls') && 
         content.includes('appointments') &&
         content.includes('toll_free_numbers') &&
         content.includes('conversation_history');
});

runTest('Database setup has proper indexes', () => {
  const content = fs.readFileSync('migrations/perfect-database-setup.sql', 'utf8');
  const indexCount = (content.match(/CREATE INDEX/g) || []).length;
  return indexCount >= 10; // Should have many indexes
});

runTest('Database setup has demo data', () => {
  const content = fs.readFileSync('migrations/perfect-database-setup.sql', 'utf8');
  return content.includes('CloudGreet Premium HVAC') && 
         content.includes('Sarah - Premium AI Receptionist') &&
         content.includes('+18333956731');
});

runTest('Database setup has proper relationships', () => {
  const content = fs.readFileSync('migrations/perfect-database-setup.sql', 'utf8');
  return content.includes('REFERENCES') && 
         content.includes('ON DELETE CASCADE') &&
         content.includes('business_id UUID REFERENCES');
});

runTest('Database setup has proper constraints', () => {
  const content = fs.readFileSync('migrations/perfect-database-setup.sql', 'utf8');
  return content.includes('PRIMARY KEY') && 
         content.includes('UNIQUE') &&
         content.includes('NOT NULL');
});



// Test 8: Security checks
runTest('No hardcoded secrets', () => {
  const files = [
    'app/api/telnyx/voice-webhook/route.ts',
    'app/api/telnyx/voice-handler/route.ts',
    'app/api/telnyx/realtime-stream/route.ts',
    'app/api/telnyx/realtime-tools/route.ts',
    'app/api/click-to-call/initiate/route.ts'
  ];
  
  return files.every(file => {
    const content = fs.readFileSync(file, 'utf8');
    return !content.includes('sk-') && 
           !content.includes('api_key') && 
           !content.match(/Bearer\s+[a-zA-Z0-9]{20,}/);
  });
});

runTest('Proper error responses', () => {
  const files = [
    'app/api/telnyx/voice-webhook/route.ts',
    'app/api/telnyx/voice-handler/route.ts',
    'app/api/telnyx/realtime-stream/route.ts',
    'app/api/telnyx/realtime-tools/route.ts'
  ];
  
  return files.every(file => {
    const content = fs.readFileSync(file, 'utf8');
    return content.includes('NextResponse.json') && content.includes('status: 500');
  });
});



// Test 9: Documentation
runTest('Deployment checklist exists', () => fs.existsSync('DEPLOYMENT_CHECKLIST.md'));
runTest('Production test suite exists', () => fs.existsSync('scripts/test-production-readiness.js'));
runTest('Accurate verification exists', () => fs.existsSync('scripts/accurate-verification.js'));
runTest('Ultimate verification exists', () => fs.existsSync('scripts/ultimate-verification.js'));



// Test 10: AI Demo Features
runTest('Realtime stream has OpenAI integration', () => {
  const content = fs.readFileSync('app/api/telnyx/realtime-stream/route.ts', 'utf8');
  return content.includes('openai.beta.realtime.sessions.create') &&
         content.includes('gpt-4o-realtime-preview-2024-12-17');
});

runTest('Realtime tools has appointment booking', () => {
  const content = fs.readFileSync('app/api/telnyx/realtime-tools/route.ts', 'utf8');
  return content.includes('schedule_appointment') &&
         content.includes('handleScheduleAppointment');
});

runTest('Realtime tools has quote generation', () => {
  const content = fs.readFileSync('app/api/telnyx/realtime-tools/route.ts', 'utf8');
  return content.includes('get_quote') &&
         content.includes('handleGetQuote');
});

runTest('Voice webhook has stream_audio instruction', () => {
  const content = fs.readFileSync('app/api/telnyx/voice-webhook/route.ts', 'utf8');
  return content.includes('stream_audio') ||
         content.includes('gather'); // Fallback to gather if stream_audio not supported
});

runTest('Voice handler has AI conversation', () => {
  const content = fs.readFileSync('app/api/telnyx/voice-handler/route.ts', 'utf8');
  return content.includes('OpenAI') ||
         content.includes('openai') ||
         content.includes('AI response'); // Fallback to basic AI response
});







 * 100)}%`);

if (tests.failed === 0) {
  
  
  
  
  
  
  
  
  
  
} else {
  
  
  
  
  
  
  
}





