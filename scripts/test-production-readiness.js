#!/usr/bin/env node

const fs = require('fs');
const path = require('path');




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
  return !content.includes('any') && !content.includes('@ts-ignore');
});

runTest('No any types in realtime-tools', () => {
  const content = fs.readFileSync('app/api/telnyx/realtime-tools/route.ts', 'utf8');
  return !content.includes('any') && !content.includes('@ts-ignore');
});

runTest('No any types in monitoring', () => {
  const content = fs.readFileSync('lib/monitoring.ts', 'utf8');
  return !content.includes('any') && !content.includes('@ts-ignore');
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
  const awaitCount = (content.match(/await/g) || []).length;
  return awaitCount <= 3; // Should be optimized
});

runTest('Click to call has reasonable await count', () => {
  const content = fs.readFileSync('app/api/click-to-call/initiate/route.ts', 'utf8');
  const awaitCount = (content.match(/await/g) || []).length;
  return awaitCount <= 4; // Should be optimized
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
runTest('Database setup has proper indexes', () => {
  const content = fs.readFileSync('migrations/perfect-database-setup.sql', 'utf8');
  return content.includes('CREATE INDEX') && content.includes('idx_');
});

runTest('Database setup has demo data', () => {
  const content = fs.readFileSync('migrations/perfect-database-setup.sql', 'utf8');
  return content.includes('CloudGreet Premium HVAC') && content.includes('Sarah - Premium AI Receptionist');
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
    return !content.includes('sk-') && !content.includes('Bearer ') && !content.includes('api_key');
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







 * 100)}%`);

if (tests.failed === 0) {
  
  
  
  
  
  
  
  
} else {
  
  
  
  
  
}


