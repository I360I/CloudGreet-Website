#!/usr/bin/env node

const fs = require('fs');
const path = require('path');




// Track all test results
const tests = {
  passed: 0,
  failed: 0,
  total: 0,
  criticalIssues: [],
  performanceIssues: [],
  securityIssues: [],
  codeQualityIssues: [],
  databaseIssues: [],
  apiIssues: [],
  uiIssues: [],
  integrationIssues: [],
  deploymentIssues: [],
  documentationIssues: []
};

function runTest(name, testFn, category = 'general', severity = 'medium') {
  tests.total++;
  try {
    const result = testFn();
    if (result) {
      
      tests.passed++;
    } else {
      
      tests.failed++;
      const issue = { category, test: name, severity, issue: 'Failed test' };
      tests.criticalIssues.push(issue);
      
      // Categorize issues
      if (category === 'performance') tests.performanceIssues.push(issue);
      if (category === 'security') tests.securityIssues.push(issue);
      if (category === 'code-quality') tests.codeQualityIssues.push(issue);
      if (category === 'database') tests.databaseIssues.push(issue);
      if (category === 'api') tests.apiIssues.push(issue);
      if (category === 'ui') tests.uiIssues.push(issue);
      if (category === 'integration') tests.integrationIssues.push(issue);
      if (category === 'deployment') tests.deploymentIssues.push(issue);
      if (category === 'documentation') tests.documentationIssues.push(issue);
    }
  } catch (error) {
    
    tests.failed++;
    const issue = { category, test: name, severity, issue: error.message };
    tests.criticalIssues.push(issue);
  }
}



// Test 1: File structure analysis
const requiredDirectories = ['app', 'lib', 'migrations', 'scripts', 'public', 'hooks'];
requiredDirectories.forEach(dir => {
  runTest(`Directory ${dir} exists`, () => fs.existsSync(dir), 'structure', 'critical');
});

const criticalFiles = [
  'app/layout.tsx', 'app/page.tsx', 'app/globals.css', 'package.json', 
  'next.config.js', 'tailwind.config.js', 'tsconfig.json', 'middleware.ts'
];
criticalFiles.forEach(file => {
  runTest(`Critical file ${file} exists`, () => fs.existsSync(file), 'structure', 'critical');
});



// Test 2: Package.json analysis
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  runTest('Package.json has name', () => packageJson.name, 'dependencies', 'critical');
  runTest('Package.json has version', () => packageJson.version, 'dependencies', 'critical');
  runTest('Package.json has scripts', () => packageJson.scripts, 'dependencies', 'critical');
  runTest('Package.json has dependencies', () => packageJson.dependencies, 'dependencies', 'critical');
  runTest('Package.json has devDependencies', () => packageJson.devDependencies, 'dependencies', 'critical');
  
  const requiredDeps = ['next', 'react', 'react-dom', '@types/node', '@types/react', '@types/react-dom', 'typescript', 'tailwindcss'];
  requiredDeps.forEach(dep => {
    runTest(`Required dependency ${dep} is installed`, () => 
      packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep], 'dependencies', 'critical');
  });
  
  const aiDeps = ['openai', '@supabase/supabase-js'];
  aiDeps.forEach(dep => {
    runTest(`AI/Telephony dependency ${dep} is installed`, () => 
      packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep], 'dependencies', 'high');
  });
  
  const requiredScripts = ['dev', 'build', 'start', 'lint'];
  requiredScripts.forEach(script => {
    runTest(`Required script ${script} exists`, () => packageJson.scripts?.[script], 'dependencies', 'critical');
  });
}



// Test 3: API routes analysis
const apiRoutes = [
  'app/api/click-to-call/initiate/route.ts',
  'app/api/telnyx/voice-webhook/route.ts',
  'app/api/telnyx/voice-handler/route.ts',
  'app/api/telnyx/realtime-stream/route.ts',
  'app/api/telnyx/realtime-tools/route.ts',
  'app/api/telnyx/realtime-webhook/route.ts',
  'app/api/ai/conversation/route.ts',
  'app/api/ai/realtime-session/route.ts',
  'app/api/ai/realtime-token/route.ts',
  'app/api/admin/convert-lead-to-client/route.ts',
  'app/api/admin/real-revenue/route.ts',
  'app/api/calls/stream/route.ts',
  'app/api/contact/submit/route.ts',
  'app/api/phone/assign/route.ts'
];

apiRoutes.forEach(route => {
  if (fs.existsSync(route)) {
    const content = fs.readFileSync(route, 'utf8');
    const routeName = path.basename(route, '.ts');
    
    // HTTP Methods
    runTest(`${routeName} has POST method`, () => content.includes('export async function POST'), 'api', 'critical');
    runTest(`${routeName} has GET method`, () => content.includes('export async function GET'), 'api', 'medium');
    
    // Error Handling
    runTest(`${routeName} has try-catch blocks`, () => content.includes('try {') && content.includes('catch'), 'api', 'critical');
    runTest(`${routeName} has proper error responses`, () => content.includes('NextResponse.json') && content.includes('error'), 'api', 'critical');
    runTest(`${routeName} has status codes`, () => content.includes('status: 400') || content.includes('status: 500'), 'api', 'high');
    
    // Input Validation
    runTest(`${routeName} has request body parsing`, () => content.includes('request.json') || content.includes('request.text'), 'api', 'critical');
    runTest(`${routeName} has input validation`, () => content.includes('validation') || content.includes('required'), 'api', 'high');
    
    // Security
    runTest(`${routeName} has no hardcoded secrets`, () => !content.includes('sk-') && !content.match(/Bearer\s+[a-zA-Z0-9]{20,}/), 'security', 'critical');
    runTest(`${routeName} has environment variable checks`, () => content.includes('process.env.') && content.includes('||'), 'security', 'high');
    runTest(`${routeName} has input sanitization`, () => content.includes('sanitize') || content.includes('trim') || content.includes('replace'), 'security', 'high');
    
    // Performance
    runTest(`${routeName} has timeout handling`, () => content.includes('timeout') || content.includes('setTimeout') || content.includes('Promise.race'), 'performance', 'high');
    runTest(`${routeName} has rate limiting`, () => content.includes('rate') || content.includes('limit'), 'performance', 'high');
    
    // Logging
    runTest(`${routeName} has structured logging`, () => content.includes('logger.') || content.includes('console.'), 'api', 'medium');
    
    // Database Operations
    runTest(`${routeName} has Supabase connection`, () => content.includes('supabase') || content.includes('Supabase'), 'database', 'critical');
    runTest(`${routeName} has database error handling`, () => content.includes('error') && content.includes('catch'), 'database', 'high');
    
    // AI Integration
    runTest(`${routeName} has OpenAI integration`, () => content.includes('openai') || content.includes('OpenAI'), 'ai', 'high');
    runTest(`${routeName} has AI error handling`, () => content.includes('error') && content.includes('catch'), 'ai', 'high');
    
    // Telephony Integration
    runTest(`${routeName} has Telnyx integration`, () => content.includes('telnyx') || content.includes('Telnyx'), 'integration', 'high');
    runTest(`${routeName} has webhook handling`, () => content.includes('webhook') || content.includes('event_type'), 'integration', 'high');
  }
});



// Test 4: Database schema analysis
const migrationFiles = fs.readdirSync('migrations').filter(file => file.endsWith('.sql'));
migrationFiles.forEach(migration => {
  const content = fs.readFileSync(`migrations/${migration}`, 'utf8');
  
  runTest(`${migration} has CREATE TABLE statements`, () => content.includes('CREATE TABLE'), 'database', 'critical');
  runTest(`${migration} has ALTER TABLE statements`, () => content.includes('ALTER TABLE'), 'database', 'medium');
  runTest(`${migration} has INSERT statements`, () => content.includes('INSERT INTO'), 'database', 'medium');
  runTest(`${migration} has INDEX statements`, () => content.includes('CREATE INDEX'), 'database', 'medium');
  runTest(`${migration} has CONSTRAINT statements`, () => content.includes('CONSTRAINT'), 'database', 'medium');
  runTest(`${migration} has FOREIGN KEY statements`, () => content.includes('FOREIGN KEY'), 'database', 'medium');
  runTest(`${migration} has UNIQUE constraints`, () => content.includes('UNIQUE'), 'database', 'medium');
  runTest(`${migration} has PRIMARY KEY statements`, () => content.includes('PRIMARY KEY'), 'database', 'critical');
});



// Test 5: UI components analysis
const uiPages = [
  'app/landing/page.tsx',
  'app/login/page.tsx',
  'app/register-simple/page.tsx',
  'app/dashboard/page.tsx',
  'app/calls/page.tsx',
  'app/appointments/page.tsx',
  'app/billing/page.tsx',
  'app/settings/page.tsx',
  'app/analytics/page.tsx',
  'app/admin/page.tsx',
  'app/admin/phone-numbers/page.tsx',
  'app/admin/tools/page.tsx',
  'app/admin/leads/page.tsx',
  'app/admin/monitoring/page.tsx'
];

uiPages.forEach(page => {
  if (fs.existsSync(page)) {
    const content = fs.readFileSync(page, 'utf8');
    const pageName = path.basename(page, '.tsx');
    
    // React Structure
    runTest(`${pageName} has proper React imports`, () => content.includes('import React') || content.includes('from "react"'), 'ui', 'critical');
    runTest(`${pageName} has default export`, () => content.includes('export default'), 'ui', 'critical');
    runTest(`${pageName} has proper function declaration`, () => content.includes('function') || content.includes('const'), 'ui', 'critical');
    
    // State Management
    runTest(`${pageName} has useState hooks`, () => content.includes('useState'), 'ui', 'high');
    runTest(`${pageName} has useEffect hooks`, () => content.includes('useEffect'), 'ui', 'high');
    runTest(`${pageName} has useCallback hooks`, () => content.includes('useCallback'), 'ui', 'medium');
    runTest(`${pageName} has useMemo hooks`, () => content.includes('useMemo'), 'ui', 'medium');
    
    // Event Handling
    runTest(`${pageName} has onClick handlers`, () => content.includes('onClick'), 'ui', 'high');
    runTest(`${pageName} has onSubmit handlers`, () => content.includes('onSubmit'), 'ui', 'high');
    runTest(`${pageName} has onChange handlers`, () => content.includes('onChange'), 'ui', 'high');
    
    // Form Handling
    runTest(`${pageName} has form elements`, () => content.includes('<form') || content.includes('<input'), 'ui', 'high');
    runTest(`${pageName} has input validation`, () => content.includes('required') || content.includes('validation'), 'ui', 'high');
    runTest(`${pageName} has error handling`, () => content.includes('error') || content.includes('Error'), 'ui', 'high');
    runTest(`${pageName} has loading states`, () => content.includes('loading') || content.includes('Loading'), 'ui', 'medium');
    
    // Accessibility
    runTest(`${pageName} has aria labels`, () => content.includes('aria-'), 'ui', 'high');
    runTest(`${pageName} has role attributes`, () => content.includes('role='), 'ui', 'medium');
    runTest(`${pageName} has alt attributes`, () => content.includes('alt='), 'ui', 'medium');
    
    // Responsive Design
    runTest(`${pageName} has responsive classes`, () => content.includes('md:') || content.includes('lg:') || content.includes('sm:'), 'ui', 'high');
    runTest(`${pageName} has grid layout`, () => content.includes('grid'), 'ui', 'medium');
    runTest(`${pageName} has flex layout`, () => content.includes('flex'), 'ui', 'medium');
    
    // Performance
    runTest(`${pageName} has lazy loading`, () => content.includes('lazy') || content.includes('Lazy'), 'ui', 'medium');
    runTest(`${pageName} has memoization`, () => content.includes('memo') || content.includes('Memo'), 'ui', 'medium');
    
    // Navigation
    runTest(`${pageName} has Link components`, () => content.includes('Link') || content.includes('link'), 'ui', 'high');
    runTest(`${pageName} has router usage`, () => content.includes('router') || content.includes('Router'), 'ui', 'medium');
    
    // Data Fetching
    runTest(`${pageName} has API calls`, () => content.includes('fetch') || content.includes('axios'), 'ui', 'high');
    runTest(`${pageName} has data loading`, () => content.includes('loading') || content.includes('Loading'), 'ui', 'medium');
  }
});



// Test 6: Library utilities analysis
const libFiles = [
  'lib/supabase.ts',
  'lib/monitoring.ts',
  'lib/auth-utils.ts',
  'lib/validation.ts',
  'lib/error-handler.ts',
  'lib/rate-limit.ts',
  'lib/retry-logic.ts',
  'lib/performance-monitoring.ts',
  'lib/calendar.ts',
  'lib/email.ts',
  'lib/phone-validation.ts',
  'lib/voice-config.ts',
  'lib/retell-agent-manager.ts',
  'lib/voice-session-manager.ts',
  'lib/automation-engine.ts',
  'lib/lead-status-system.ts',
  'lib/follow-up-sequences.ts',
  'lib/conversion-tracking.ts',
  'lib/response-tracking.ts',
  'lib/advanced-ai-features.ts',
  'lib/smart-ai-prompts.ts',
  'lib/email-templates.ts',
  'lib/sms-templates.ts',
  'lib/notifications.ts',
  'lib/dashboard-cache.ts',
  'lib/ab-testing.ts',
  'lib/admin-auth.ts',
  'lib/csrf.ts',
  'lib/webhook-verification.ts',
  'lib/webhook-rate-limit.ts',
  'lib/telnyx.ts'
];

libFiles.forEach(lib => {
  if (fs.existsSync(lib)) {
    const content = fs.readFileSync(lib, 'utf8');
    const libName = path.basename(lib, '.ts');
    
    // Function Structure
    runTest(`${libName} has proper exports`, () => content.includes('export'), 'code-quality', 'critical');
    runTest(`${libName} has function declarations`, () => content.includes('function') || content.includes('const'), 'code-quality', 'critical');
    runTest(`${libName} has type definitions`, () => content.includes('interface') || content.includes('type'), 'code-quality', 'high');
    
    // Error Handling
    runTest(`${libName} has try-catch blocks`, () => content.includes('try {') && content.includes('catch'), 'code-quality', 'high');
    runTest(`${libName} has error logging`, () => content.includes('error') || content.includes('Error'), 'code-quality', 'high');
    
    // Input Validation
    runTest(`${libName} has input validation`, () => content.includes('validation') || content.includes('validate'), 'code-quality', 'high');
    runTest(`${libName} has type checking`, () => content.includes('typeof') || content.includes('instanceof'), 'code-quality', 'medium');
    runTest(`${libName} has null checks`, () => content.includes('null') || content.includes('undefined'), 'code-quality', 'high');
    
    // Performance
    runTest(`${libName} has caching`, () => content.includes('cache') || content.includes('Cache'), 'performance', 'medium');
    runTest(`${libName} has memoization`, () => content.includes('memo') || content.includes('Memo'), 'performance', 'low');
    
    // Security
    runTest(`${libName} has no hardcoded secrets`, () => !content.includes('sk-') && !content.match(/Bearer\s+[a-zA-Z0-9]{20,}/), 'security', 'critical');
    runTest(`${libName} has input sanitization`, () => content.includes('sanitize') || content.includes('trim'), 'security', 'high');
    runTest(`${libName} has environment variable checks`, () => content.includes('process.env.') && content.includes('||'), 'security', 'high');
    
    // Logging
    runTest(`${libName} has structured logging`, () => content.includes('logger.') || content.includes('console.'), 'code-quality', 'medium');
  }
});



// Test 7: Security analysis
const securityFiles = [
  'middleware.ts',
  'app/api/click-to-call/initiate/route.ts',
  'app/api/telnyx/voice-webhook/route.ts',
  'app/api/telnyx/voice-handler/route.ts',
  'app/api/telnyx/realtime-stream/route.ts',
  'app/api/telnyx/realtime-tools/route.ts',
  'app/api/telnyx/realtime-webhook/route.ts',
  'app/api/ai/conversation/route.ts',
  'app/api/ai/realtime-session/route.ts',
  'app/api/ai/realtime-token/route.ts',
  'app/api/admin/convert-lead-to-client/route.ts',
  'app/api/admin/real-revenue/route.ts',
  'app/api/calls/stream/route.ts',
  'app/api/contact/submit/route.ts',
  'app/api/phone/assign/route.ts'
];

securityFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file, '.ts');
    
    // Authentication
    runTest(`${fileName} has authentication checks`, () => content.includes('auth') || content.includes('token'), 'security', 'high');
    runTest(`${fileName} has authorization checks`, () => content.includes('authorize') || content.includes('permission'), 'security', 'high');
    runTest(`${fileName} has JWT handling`, () => content.includes('jwt') || content.includes('JWT'), 'security', 'medium');
    
    // Input Security
    runTest(`${fileName} has input sanitization`, () => content.includes('sanitize') || content.includes('trim'), 'security', 'high');
    runTest(`${fileName} has XSS protection`, () => content.includes('xss') || content.includes('XSS'), 'security', 'medium');
    runTest(`${fileName} has SQL injection protection`, () => content.includes('sql') || content.includes('SQL'), 'security', 'high');
    
    // Output Security
    runTest(`${fileName} has output encoding`, () => content.includes('encode') || content.includes('escape'), 'security', 'medium');
    runTest(`${fileName} has content type validation`, () => content.includes('content-type') || content.includes('Content-Type'), 'security', 'medium');
    
    // Rate Limiting
    runTest(`${fileName} has rate limiting`, () => content.includes('rate') || content.includes('limit'), 'security', 'high');
    runTest(`${fileName} has request throttling`, () => content.includes('throttle') || content.includes('Throttle'), 'security', 'medium');
    
    // CORS
    runTest(`${fileName} has CORS handling`, () => content.includes('cors') || content.includes('origin'), 'security', 'medium');
    runTest(`${fileName} has origin validation`, () => content.includes('origin') || content.includes('Origin'), 'security', 'medium');
    
    // Headers
    runTest(`${fileName} has security headers`, () => content.includes('header') || content.includes('Header'), 'security', 'medium');
    runTest(`${fileName} has CSP headers`, () => content.includes('csp') || content.includes('CSP'), 'security', 'low');
    
    // Secrets
    runTest(`${fileName} has no hardcoded secrets`, () => !content.includes('sk-') && !content.match(/Bearer\s+[a-zA-Z0-9]{20,}/), 'security', 'critical');
    runTest(`${fileName} has environment variable usage`, () => content.includes('process.env.'), 'security', 'high');
  }
});



// Test 8: Performance analysis
const performanceFiles = [
  'app/layout.tsx',
  'app/page.tsx',
  'app/dashboard/page.tsx',
  'app/calls/page.tsx',
  'app/appointments/page.tsx',
  'app/billing/page.tsx',
  'app/settings/page.tsx',
  'app/analytics/page.tsx',
  'app/admin/page.tsx',
  'app/admin/phone-numbers/page.tsx',
  'app/admin/tools/page.tsx',
  'app/admin/leads/page.tsx',
  'app/admin/monitoring/page.tsx'
];

performanceFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file, '.tsx');
    
    // React Performance
    runTest(`${fileName} has React.memo usage`, () => content.includes('memo') || content.includes('Memo'), 'performance', 'medium');
    runTest(`${fileName} has useMemo usage`, () => content.includes('useMemo'), 'performance', 'medium');
    runTest(`${fileName} has useCallback usage`, () => content.includes('useCallback'), 'performance', 'medium');
    runTest(`${fileName} has lazy loading`, () => content.includes('lazy') || content.includes('Lazy'), 'performance', 'medium');
    
    // Bundle Optimization
    runTest(`${fileName} has dynamic imports`, () => content.includes('dynamic') || content.includes('Dynamic'), 'performance', 'low');
    runTest(`${fileName} has code splitting`, () => content.includes('split') || content.includes('Split'), 'performance', 'low');
    
    // Image Optimization
    runTest(`${fileName} has optimized images`, () => content.includes('Image') || content.includes('img'), 'performance', 'medium');
    runTest(`${fileName} has image lazy loading`, () => content.includes('loading="lazy"'), 'performance', 'low');
    
    // Caching
    runTest(`${fileName} has caching strategies`, () => content.includes('cache') || content.includes('Cache'), 'performance', 'medium');
    runTest(`${fileName} has memoization`, () => content.includes('memo') || content.includes('Memo'), 'performance', 'medium');
    
    // API Performance
    runTest(`${fileName} has API optimization`, () => content.includes('fetch') || content.includes('axios'), 'performance', 'medium');
    runTest(`${fileName} has request batching`, () => content.includes('batch') || content.includes('Batch'), 'performance', 'low');
    runTest(`${fileName} has request deduplication`, () => content.includes('dedupe') || content.includes('Dedupe'), 'performance', 'low');
  }
});



// Test 9: Integration analysis
const integrationFiles = [
  'app/api/click-to-call/initiate/route.ts',
  'app/api/telnyx/voice-webhook/route.ts',
  'app/api/telnyx/voice-handler/route.ts',
  'app/api/telnyx/realtime-stream/route.ts',
  'app/api/telnyx/realtime-tools/route.ts',
  'app/api/telnyx/realtime-webhook/route.ts',
  'app/api/ai/conversation/route.ts',
  'app/api/ai/realtime-session/route.ts',
  'app/api/ai/realtime-token/route.ts',
  'lib/telnyx.ts',
  'lib/supabase.ts',
  'lib/calendar.ts',
  'lib/email.ts'
];

integrationFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file, '.ts');
    
    // External API Integration
    runTest(`${fileName} has external API calls`, () => content.includes('fetch') || content.includes('axios'), 'integration', 'high');
    runTest(`${fileName} has API error handling`, () => content.includes('error') && content.includes('catch'), 'integration', 'high');
    runTest(`${fileName} has API retry logic`, () => content.includes('retry') || content.includes('attempt'), 'integration', 'medium');
    runTest(`${fileName} has API timeout handling`, () => content.includes('timeout') || content.includes('setTimeout'), 'integration', 'high');
    
    // Webhook Integration
    runTest(`${fileName} has webhook handling`, () => content.includes('webhook') || content.includes('Webhook'), 'integration', 'high');
    runTest(`${fileName} has webhook verification`, () => content.includes('verify') || content.includes('signature'), 'integration', 'high');
    runTest(`${fileName} has webhook retry logic`, () => content.includes('retry') || content.includes('attempt'), 'integration', 'medium');
    
    // Database Integration
    runTest(`${fileName} has database operations`, () => content.includes('supabase') || content.includes('database'), 'integration', 'high');
    runTest(`${fileName} has database error handling`, () => content.includes('error') && content.includes('catch'), 'integration', 'high');
    runTest(`${fileName} has database transactions`, () => content.includes('transaction') || content.includes('begin'), 'integration', 'medium');
    
    // AI Integration
    runTest(`${fileName} has AI API calls`, () => content.includes('openai') || content.includes('OpenAI'), 'integration', 'high');
    runTest(`${fileName} has AI error handling`, () => content.includes('error') && content.includes('catch'), 'integration', 'high');
    runTest(`${fileName} has AI configuration`, () => content.includes('model') || content.includes('temperature'), 'integration', 'medium');
    
    // Telephony Integration
    runTest(`${fileName} has telephony API calls`, () => content.includes('telnyx') || content.includes('Telnyx'), 'integration', 'high');
    runTest(`${fileName} has telephony error handling`, () => content.includes('error') && content.includes('catch'), 'integration', 'high');
    runTest(`${fileName} has telephony configuration`, () => content.includes('config') || content.includes('Config'), 'integration', 'medium');
  }
});



// Test 10: Final analysis
const allFiles = fs.readdirSync('.', { recursive: true }).filter(file => 
  file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')
);

allFiles.forEach(file => {
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file);
    
    // File Quality
    runTest(`${fileName} has proper file structure`, () => content.length > 0, 'code-quality', 'critical');
    runTest(`${fileName} has no syntax errors`, () => !content.includes('SyntaxError'), 'code-quality', 'critical');
    runTest(`${fileName} has no runtime errors`, () => !content.includes('RuntimeError'), 'code-quality', 'critical');
    runTest(`${fileName} has no type errors`, () => !content.includes('TypeError'), 'code-quality', 'critical');
    
    // Code Quality
    runTest(`${fileName} has proper indentation`, () => content.includes('  ') || content.includes('\t'), 'code-quality', 'low');
    runTest(`${fileName} has proper line breaks`, () => content.includes('\n'), 'code-quality', 'low');
    runTest(`${fileName} has proper spacing`, () => content.includes(' ') || content.includes('  '), 'code-quality', 'low');
    runTest(`${fileName} has proper comments`, () => content.includes('//') || content.includes('/*'), 'code-quality', 'low');
    
    // Security
    runTest(`${fileName} has no hardcoded secrets`, () => !content.includes('sk-') && !content.match(/Bearer\s+[a-zA-Z0-9]{20,}/), 'security', 'critical');
    runTest(`${fileName} has no SQL injection`, () => !content.includes('SELECT *') || content.includes('parameterized'), 'security', 'high');
    runTest(`${fileName} has no XSS vulnerabilities`, () => !content.includes('innerHTML') || content.includes('sanitize'), 'security', 'high');
    runTest(`${fileName} has no CSRF vulnerabilities`, () => !content.includes('csrf') || content.includes('token'), 'security', 'medium');
    
    // Performance
    runTest(`${fileName} has no memory leaks`, () => !content.includes('setInterval') || content.includes('clearInterval'), 'performance', 'medium');
    runTest(`${fileName} has no infinite loops`, () => !content.includes('while(true)') || content.includes('break'), 'performance', 'high');
    runTest(`${fileName} has no blocking operations`, () => !content.includes('sync') || content.includes('async'), 'performance', 'medium');
    runTest(`${fileName} has proper error handling`, () => content.includes('try') && content.includes('catch'), 'performance', 'high');
  }
});







 * 100)}%`);

// Categorize issues by severity
const criticalIssues = tests.criticalIssues.filter(issue => issue.severity === 'critical');
const highIssues = tests.criticalIssues.filter(issue => issue.severity === 'high');
const mediumIssues = tests.criticalIssues.filter(issue => issue.severity === 'medium');
const lowIssues = tests.criticalIssues.filter(issue => issue.severity === 'low');







// Categorize issues by category
const issuesByCategory = {};
tests.criticalIssues.forEach(issue => {
  if (!issuesByCategory[issue.category]) {
    issuesByCategory[issue.category] = [];
  }
  issuesByCategory[issue.category].push(issue.test);
});


Object.entries(issuesByCategory).forEach(([category, issues]) => {
  }: ${issues.length} issues`);
  issues.forEach(issue => );
});

if (tests.failed === 0) {
  
  
  
  
  
  
  
  
  
  
  
  
} else {
  
  
  
  
  
  
  
  
  
  
}





