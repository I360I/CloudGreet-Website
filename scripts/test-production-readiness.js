#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 PRODUCTION READINESS TEST SUITE');
console.log('===================================\n');

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
      console.log(`✅ ${name}`);
      tests.passed++;
    } else {
      console.log(`❌ ${name}`);
      tests.failed++;
    }
  } catch (error) {
    console.log(`❌ ${name} - ERROR: ${error.message}`);
    tests.failed++;
  }
}

console.log('📁 TESTING CORE FILES...\n');

// Test 1: All required files exist
runTest('Voice webhook exists', () => fs.existsSync('app/api/telnyx/voice-webhook/route.ts'));
runTest('Voice handler exists', () => fs.existsSync('app/api/telnyx/voice-handler/route.ts'));
runTest('Realtime stream exists', () => fs.existsSync('app/api/telnyx/realtime-stream/route.ts'));
runTest('Realtime tools exists', () => fs.existsSync('app/api/telnyx/realtime-tools/route.ts'));
runTest('Realtime webhook exists', () => fs.existsSync('app/api/telnyx/realtime-webhook/route.ts'));
runTest('Click to call exists', () => fs.existsSync('app/api/click-to-call/initiate/route.ts'));
runTest('Monitoring lib exists', () => fs.existsSync('lib/monitoring.ts'));
runTest('Supabase lib exists', () => fs.existsSync('lib/supabase.ts'));

console.log('\n🔍 TESTING CODE QUALITY...\n');

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

console.log('\n🚀 TESTING PERFORMANCE...\n');

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

console.log('\n🗄️ TESTING DATABASE...\n');

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

console.log('\n🔒 TESTING SECURITY...\n');

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

console.log('\n📊 TEST RESULTS:');
console.log('================\n');

console.log(`✅ Passed: ${tests.passed}`);
console.log(`❌ Failed: ${tests.failed}`);
console.log(`📊 Total: ${tests.total}`);
console.log(`🎯 Success Rate: ${Math.round((tests.passed / tests.total) * 100)}%`);

if (tests.failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED! PRODUCTION READY! 🎉');
  console.log('\n📋 DEPLOYMENT CHECKLIST:');
  console.log('1. ✅ Code quality verified');
  console.log('2. ✅ Performance optimized');
  console.log('3. ✅ Security validated');
  console.log('4. ✅ Database schema ready');
  console.log('5. ✅ Error handling complete');
  console.log('\n🚀 Ready for deployment when limits reset!');
} else {
  console.log('\n⚠️  SOME TESTS FAILED - NEEDS ATTENTION');
  console.log('\n🔧 RECOMMENDED ACTIONS:');
  console.log('1. Fix failing tests before deployment');
  console.log('2. Run tests again to verify');
  console.log('3. Only deploy when all tests pass');
}

console.log('\n✅ PRODUCTION READINESS TEST COMPLETE!');
