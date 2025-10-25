#!/usr/bin/env node

const fs = require('fs');
const path = require('path');




// Track all verification results
const verification = {
  critical: { passed: 0, failed: 0, total: 0 },
  important: { passed: 0, failed: 0, total: 0 },
  nice: { passed: 0, failed: 0, total: 0 }
};

function verify(name, testFn, category = 'important') {
  verification[category].total++;
  try {
    const result = testFn();
    if (result) {
      
      verification[category].passed++;
    } else {
      
      verification[category].failed++;
    }
  } catch (error) {
    
    verification[category].failed++;
  }
}

:\n');

// Critical: All core files exist
verify('Voice webhook exists', () => fs.existsSync('app/api/telnyx/voice-webhook/route.ts'), 'critical');
verify('Voice handler exists', () => fs.existsSync('app/api/telnyx/voice-handler/route.ts'), 'critical');
verify('Realtime stream exists', () => fs.existsSync('app/api/telnyx/realtime-stream/route.ts'), 'critical');
verify('Realtime tools exists', () => fs.existsSync('app/api/telnyx/realtime-tools/route.ts'), 'critical');
verify('Click to call exists', () => fs.existsSync('app/api/click-to-call/initiate/route.ts'), 'critical');
verify('Database migration exists', () => fs.existsSync('migrations/perfect-database-setup.sql'), 'critical');

// Critical: No build-breaking issues
verify('No any types in realtime-stream', () => {
  const content = fs.readFileSync('app/api/telnyx/realtime-stream/route.ts', 'utf8');
  return !content.includes('any') && !content.includes('@ts-ignore');
}, 'critical');

verify('No any types in realtime-tools', () => {
  const content = fs.readFileSync('app/api/telnyx/realtime-tools/route.ts', 'utf8');
  return !content.includes('any') && !content.includes('@ts-ignore');
}, 'critical');

verify('No any types in monitoring', () => {
  const content = fs.readFileSync('lib/monitoring.ts', 'utf8');
  return !content.includes('any') && !content.includes('@ts-ignore');
}, 'critical');

// Critical: Environment variables are safe
verify('Environment variables have null checks', () => {
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
}, 'critical');

// Critical: No hardcoded secrets
verify('No hardcoded secrets', () => {
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
}, 'critical');

:\n');

// Important: Performance optimization
verify('Realtime tools optimized', () => {
  const content = fs.readFileSync('app/api/telnyx/realtime-tools/route.ts', 'utf8');
  const awaitCount = (content.match(/await/g) || []).length;
  return awaitCount <= 3;
}, 'important');

verify('Click to call optimized', () => {
  const content = fs.readFileSync('app/api/click-to-call/initiate/route.ts', 'utf8');
  const awaitCount = (content.match(/await/g) || []).length;
  return awaitCount <= 4;
}, 'important');

// Important: Error handling
verify('All API routes have try-catch', () => {
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
}, 'important');

// Important: No console.log in production
verify('No console.log in production code', () => {
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
}, 'important');

// Important: Database schema
verify('Database schema has all tables', () => {
  const content = fs.readFileSync('migrations/perfect-database-setup.sql', 'utf8');
  return content.includes('CREATE TABLE') && 
         content.includes('businesses') && 
         content.includes('ai_agents') && 
         content.includes('calls') && 
         content.includes('appointments');
}, 'important');

verify('Database schema has indexes', () => {
  const content = fs.readFileSync('migrations/perfect-database-setup.sql', 'utf8');
  return content.includes('CREATE INDEX') && content.includes('idx_');
}, 'important');

verify('Database schema has demo data', () => {
  const content = fs.readFileSync('migrations/perfect-database-setup.sql', 'utf8');
  return content.includes('CloudGreet Premium HVAC') && 
         content.includes('Sarah - Premium AI Receptionist');
}, 'important');

:\n');

// Nice: Documentation
verify('Deployment checklist exists', () => fs.existsSync('DEPLOYMENT_CHECKLIST.md'), 'nice');
verify('Production test suite exists', () => fs.existsSync('scripts/test-production-readiness.js'), 'nice');

// Nice: Code organization
verify('All scripts are organized', () => {
  const scripts = fs.readdirSync('scripts').filter(f => f.endsWith('.js'));
  return scripts.length >= 5; // Should have multiple utility scripts
}, 'nice');

// Nice: Git status
verify('All changes committed', () => {
  try {
    const { execSync } = require('child_process');
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim() === '';
  } catch (error) {
    return false;
  }
}, 'nice');




// Critical results
const criticalPassRate = Math.round((verification.critical.passed / verification.critical.total) * 100);
`);

// Important results  
const importantPassRate = Math.round((verification.important.passed / verification.important.total) * 100);
`);

// Nice results
const nicePassRate = Math.round((verification.nice.passed / verification.nice.total) * 100);
`);

// Overall results
const totalPassed = verification.critical.passed + verification.important.passed + verification.nice.passed;
const totalTests = verification.critical.total + verification.important.total + verification.nice.total;
const overallPassRate = Math.round((totalPassed / totalTests) * 100);

`);

// Final verdict



if (verification.critical.failed === 0 && verification.important.failed <= 2) {
  
  
  
  
  
  
  
  
  
  
} else if (verification.critical.failed <= 2) {
  
  
  if (verification.critical.failed > 0) {
    
  }
  if (verification.important.failed > 0) {
    
  }
  
  
} else {
  
  
  
  
  
  
}


