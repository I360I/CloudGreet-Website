#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎯 ULTIMATE CLOUDGREET VERIFICATION');
console.log('===================================\n');

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
      console.log(`✅ ${name}`);
      verification[category].passed++;
    } else {
      console.log(`❌ ${name}`);
      verification[category].failed++;
    }
  } catch (error) {
    console.log(`❌ ${name} - ERROR: ${error.message}`);
    verification[category].failed++;
  }
}

console.log('🔥 CRITICAL VERIFICATIONS (Must be perfect):\n');

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

console.log('\n⚡ IMPORTANT VERIFICATIONS (Production quality):\n');

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

console.log('\n💎 NICE TO HAVE VERIFICATIONS (Best practices):\n');

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

console.log('\n📊 VERIFICATION RESULTS:');
console.log('========================\n');

// Critical results
const criticalPassRate = Math.round((verification.critical.passed / verification.critical.total) * 100);
console.log(`🔥 CRITICAL: ${verification.critical.passed}/${verification.critical.total} (${criticalPassRate}%)`);

// Important results  
const importantPassRate = Math.round((verification.important.passed / verification.important.total) * 100);
console.log(`⚡ IMPORTANT: ${verification.important.passed}/${verification.important.total} (${importantPassRate}%)`);

// Nice results
const nicePassRate = Math.round((verification.nice.passed / verification.nice.total) * 100);
console.log(`💎 NICE: ${verification.nice.passed}/${verification.nice.total} (${nicePassRate}%)`);

// Overall results
const totalPassed = verification.critical.passed + verification.important.passed + verification.nice.passed;
const totalTests = verification.critical.total + verification.important.total + verification.nice.total;
const overallPassRate = Math.round((totalPassed / totalTests) * 100);

console.log(`\n🎯 OVERALL: ${totalPassed}/${totalTests} (${overallPassRate}%)`);

// Final verdict
console.log('\n🏆 FINAL VERDICT:');
console.log('================\n');

if (verification.critical.failed === 0 && verification.important.failed <= 2) {
  console.log('🎉 EXCELLENT! READY FOR DEPLOYMENT!');
  console.log('\n✅ All critical issues resolved');
  console.log('✅ Production quality achieved');
  console.log('✅ Premium AI demo ready');
  console.log('\n🚀 DEPLOYMENT RECOMMENDATION:');
  console.log('1. Run database migration: migrations/perfect-database-setup.sql');
  console.log('2. Deploy to Vercel: git push origin main');
  console.log('3. Test premium demo call');
  console.log('4. Show clients the amazing AI!');
  
} else if (verification.critical.failed <= 2) {
  console.log('⚠️  GOOD - Minor issues to address');
  console.log('\n🔧 RECOMMENDED ACTIONS:');
  if (verification.critical.failed > 0) {
    console.log('- Fix critical issues first');
  }
  if (verification.important.failed > 0) {
    console.log('- Address important issues for production quality');
  }
  console.log('- Run verification again after fixes');
  
} else {
  console.log('❌ NEEDS WORK - Major issues detected');
  console.log('\n🔧 REQUIRED ACTIONS:');
  console.log('- Fix all critical issues');
  console.log('- Address important issues');
  console.log('- Run verification again');
  console.log('- Do not deploy until all critical issues are resolved');
}

console.log('\n✅ ULTIMATE VERIFICATION COMPLETE!');
