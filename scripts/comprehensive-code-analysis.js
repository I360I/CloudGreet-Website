#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE CODEBASE ANALYSIS');
console.log('=====================================\n');

// Track all issues found
const issues = {
  typescript: [],
  build: [],
  runtime: [],
  performance: [],
  security: [],
  bestPractices: [],
  deployment: []
};

// Files to analyze
const filesToCheck = [
  'app/api/telnyx/voice-webhook/route.ts',
  'app/api/telnyx/voice-handler/route.ts', 
  'app/api/telnyx/realtime-stream/route.ts',
  'app/api/telnyx/realtime-tools/route.ts',
  'app/api/telnyx/realtime-webhook/route.ts',
  'app/api/click-to-call/initiate/route.ts',
  'lib/monitoring.ts',
  'lib/supabase.ts'
];

console.log('📁 ANALYZING CORE FILES...\n');

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - EXISTS`);
    
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for TypeScript issues
    if (content.includes('any')) {
      issues.typescript.push(`${file}: Uses 'any' type`);
    }
    
    if (content.includes('@ts-ignore')) {
      issues.typescript.push(`${file}: Uses @ts-ignore`);
    }
    
    // Check for potential runtime issues
    if (content.includes('console.log') || content.includes('console.error')) {
      issues.runtime.push(`${file}: Uses console.log instead of logger`);
    }
    
    // Check for performance issues
    if (content.includes('await') && content.includes('supabaseAdmin')) {
      const awaitCount = (content.match(/await/g) || []).length;
      if (awaitCount > 3) {
        issues.performance.push(`${file}: ${awaitCount} await operations - potential timeout risk`);
      }
    }
    
    // Check for security issues
    if (content.includes('process.env.') && !content.includes('process.env.NODE_ENV')) {
      const envVars = content.match(/process\.env\.\w+/g) || [];
      envVars.forEach(env => {
        if (!content.includes(`if (!${env})`)) {
          issues.security.push(`${file}: ${env} used without null check`);
        }
      });
    }
    
    // Check for best practices
    if (content.includes('try {') && !content.includes('catch')) {
      issues.bestPractices.push(`${file}: Try block without catch`);
    }
    
  } else {
    console.log(`❌ ${file} - MISSING`);
    issues.build.push(`${file}: File missing`);
  }
});

console.log('\n🔍 CHECKING DATABASE SCHEMA...\n');

// Check database migrations
const migrationFiles = fs.readdirSync('migrations').filter(f => f.endsWith('.sql'));
console.log(`Found ${migrationFiles.length} migration files`);

migrationFiles.forEach(file => {
  const content = fs.readFileSync(`migrations/${file}`, 'utf8');
  
  if (content.includes('ON CONFLICT') && !content.includes('UNIQUE')) {
    issues.deployment.push(`migrations/${file}: ON CONFLICT without UNIQUE constraint`);
  }
  
  if (content.includes('INSERT INTO') && !content.includes('WHERE NOT EXISTS')) {
    issues.deployment.push(`migrations/${file}: INSERT without existence check`);
  }
});

console.log('\n📊 ISSUES SUMMARY:');
console.log('==================\n');

Object.entries(issues).forEach(([category, issueList]) => {
  if (issueList.length > 0) {
    console.log(`🚨 ${category.toUpperCase()}: ${issueList.length} issues`);
    issueList.forEach(issue => console.log(`   - ${issue}`));
    console.log('');
  }
});

console.log('\n🎯 PRIORITY FIXES NEEDED:');
console.log('========================\n');

// High priority issues
const highPriority = [
  ...issues.build,
  ...issues.typescript.filter(i => i.includes('any') || i.includes('@ts-ignore')),
  ...issues.security.filter(i => i.includes('process.env'))
];

if (highPriority.length > 0) {
  console.log('🔥 HIGH PRIORITY (Must fix before deployment):');
  highPriority.forEach(issue => console.log(`   - ${issue}`));
  console.log('');
}

// Medium priority issues  
const mediumPriority = [
  ...issues.performance,
  ...issues.runtime.filter(i => i.includes('console.log'))
];

if (mediumPriority.length > 0) {
  console.log('⚠️  MEDIUM PRIORITY (Should fix for production):');
  mediumPriority.forEach(issue => console.log(`   - ${issue}`));
  console.log('');
}

// Low priority issues
const lowPriority = [
  ...issues.bestPractices,
  ...issues.deployment
];

if (lowPriority.length > 0) {
  console.log('📝 LOW PRIORITY (Nice to have):');
  lowPriority.forEach(issue => console.log(`   - ${issue}`));
  console.log('');
}

console.log('\n📋 NEXT STEPS:');
console.log('==============\n');
console.log('1. Fix all HIGH PRIORITY issues first');
console.log('2. Address MEDIUM PRIORITY issues for production quality');
console.log('3. Consider LOW PRIORITY issues for best practices');
console.log('4. Test everything locally before deployment');
console.log('5. Create comprehensive test suite');
console.log('6. Document deployment process');

console.log('\n✅ ANALYSIS COMPLETE!');
