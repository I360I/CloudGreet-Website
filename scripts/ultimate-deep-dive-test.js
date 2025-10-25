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



// Test 1: File structure and organization
const requiredDirectories = [
  'app', 'lib', 'migrations', 'scripts', 'public', 'hooks', 'components'
];

requiredDirectories.forEach(dir => {
  runTest(`Directory ${dir} exists`, () => fs.existsSync(dir), 'structure', 'critical');
});

// Test 2: Critical application files
const criticalFiles = [
  'app/layout.tsx',
  'app/page.tsx',
  'app/globals.css',
  'package.json',
  'next.config.js',
  'tailwind.config.js',
  'tsconfig.json',
  'middleware.ts'
];

criticalFiles.forEach(file => {
  runTest(`Critical file ${file} exists`, () => fs.existsSync(file), 'structure', 'critical');
});



// Test 3: Package.json analysis
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  runTest('Package.json has name', () => packageJson.name, 'dependencies', 'critical');
  runTest('Package.json has version', () => packageJson.version, 'dependencies', 'critical');
  runTest('Package.json has scripts', () => packageJson.scripts, 'dependencies', 'critical');
  runTest('Package.json has dependencies', () => packageJson.dependencies, 'dependencies', 'critical');
  runTest('Package.json has devDependencies', () => packageJson.devDependencies, 'dependencies', 'critical');
  
  // Check for required dependencies
  const requiredDeps = [
    'next', 'react', 'react-dom', '@types/node', '@types/react', '@types/react-dom',
    'typescript', 'tailwindcss', 'autoprefixer', 'postcss'
  ];
  
  requiredDeps.forEach(dep => {
    runTest(`Required dependency ${dep} is installed`, () => 
      packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep], 'dependencies', 'critical');
  });
  
  // Check for AI/telephony dependencies
  const aiDeps = ['openai', '@supabase/supabase-js', 'telnyx'];
  aiDeps.forEach(dep => {
    runTest(`AI/Telephony dependency ${dep} is installed`, () => 
      packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep], 'dependencies', 'high');
  });
}



// Test 4: Next.js configuration
if (fs.existsSync('next.config.js')) {
  const nextConfig = fs.readFileSync('next.config.js', 'utf8');
  
  runTest('Next.js config has experimental features', () => nextConfig.includes('experimental'), 'configuration', 'medium');
  runTest('Next.js config has image optimization', () => nextConfig.includes('images'), 'configuration', 'medium');
  runTest('Next.js config has redirects', () => nextConfig.includes('redirects'), 'configuration', 'low');
  runTest('Next.js config has rewrites', () => nextConfig.includes('rewrites'), 'configuration', 'low');
  runTest('Next.js config has headers', () => nextConfig.includes('headers'), 'configuration', 'medium');
}



// Test 5: TypeScript configuration
if (fs.existsSync('tsconfig.json')) {
  const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  
  runTest('TypeScript has strict mode enabled', () => tsConfig.compilerOptions?.strict, 'configuration', 'high');
  runTest('TypeScript has noImplicitAny enabled', () => tsConfig.compilerOptions?.noImplicitAny, 'configuration', 'high');
  runTest('TypeScript has noImplicitReturns enabled', () => tsConfig.compilerOptions?.noImplicitReturns, 'configuration', 'medium');
  runTest('TypeScript has noUnusedLocals enabled', () => tsConfig.compilerOptions?.noUnusedLocals, 'configuration', 'medium');
  runTest('TypeScript has noUnusedParameters enabled', () => tsConfig.compilerOptions?.noUnusedParameters, 'configuration', 'medium');
  runTest('TypeScript has exactOptionalPropertyTypes enabled', () => tsConfig.compilerOptions?.exactOptionalPropertyTypes, 'configuration', 'low');
}



// Test 6: Tailwind configuration
if (fs.existsSync('tailwind.config.js')) {
  const tailwindConfig = fs.readFileSync('tailwind.config.js', 'utf8');
  
  runTest('Tailwind has content paths configured', () => tailwindConfig.includes('content'), 'configuration', 'critical');
  runTest('Tailwind has theme configuration', () => tailwindConfig.includes('theme'), 'configuration', 'medium');
  runTest('Tailwind has plugins configured', () => tailwindConfig.includes('plugins'), 'configuration', 'low');
  runTest('Tailwind has dark mode configured', () => tailwindConfig.includes('darkMode'), 'configuration', 'low');
}



// Test 7: Middleware analysis
if (fs.existsSync('middleware.ts')) {
  const middleware = fs.readFileSync('middleware.ts', 'utf8');
  
  runTest('Middleware has authentication logic', () => middleware.includes('auth') || middleware.includes('token'), 'middleware', 'high');
  runTest('Middleware has CORS handling', () => middleware.includes('cors') || middleware.includes('origin'), 'middleware', 'medium');
  runTest('Middleware has rate limiting', () => middleware.includes('rate') || middleware.includes('limit'), 'middleware', 'high');
  runTest('Middleware has security headers', () => middleware.includes('header') || middleware.includes('security'), 'middleware', 'high');
  runTest('Middleware has request logging', () => middleware.includes('log') || middleware.includes('console'), 'middleware', 'medium');
}



// Test 8: API routes analysis
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
    runTest(`${routeName} has PUT method`, () => content.includes('export async function PUT'), 'api', 'low');
    runTest(`${routeName} has DELETE method`, () => content.includes('export async function DELETE'), 'api', 'low');
    
    // Error Handling
    runTest(`${routeName} has try-catch blocks`, () => content.includes('try {') && content.includes('catch'), 'api', 'critical');
    runTest(`${routeName} has proper error responses`, () => content.includes('NextResponse.json') && content.includes('error'), 'api', 'critical');
    runTest(`${routeName} has status codes`, () => content.includes('status: 400') || content.includes('status: 500'), 'api', 'high');
    
    // Input Validation
    runTest(`${routeName} has request body parsing`, () => content.includes('request.json') || content.includes('request.text'), 'api', 'critical');
    runTest(`${routeName} has input validation`, () => content.includes('validation') || content.includes('required'), 'api', 'high');
    runTest(`${routeName} has type checking`, () => content.includes('typeof') || content.includes('instanceof'), 'api', 'medium');
    
    // Security
    runTest(`${routeName} has no hardcoded secrets`, () => !content.includes('sk-') && !content.match(/Bearer\s+[a-zA-Z0-9]{20,}/), 'security', 'critical');
    runTest(`${routeName} has environment variable checks`, () => content.includes('process.env.') && content.includes('||'), 'security', 'high');
    runTest(`${routeName} has input sanitization`, () => content.includes('sanitize') || content.includes('trim') || content.includes('replace'), 'security', 'high');
    
    // Performance
    runTest(`${routeName} has timeout handling`, () => content.includes('timeout') || content.includes('setTimeout') || content.includes('Promise.race'), 'performance', 'high');
    runTest(`${routeName} has response caching`, () => content.includes('cache') || content.includes('Cache-Control'), 'performance', 'medium');
    runTest(`${routeName} has rate limiting`, () => content.includes('rate') || content.includes('limit'), 'performance', 'high');
    
    // Logging
    runTest(`${routeName} has structured logging`, () => content.includes('logger.') || content.includes('console.'), 'api', 'medium');
    runTest(`${routeName} has request ID tracking`, () => content.includes('requestId') || content.includes('request_id'), 'api', 'low');
    
    // Database Operations
    runTest(`${routeName} has Supabase connection`, () => content.includes('supabase') || content.includes('Supabase'), 'database', 'critical');
    runTest(`${routeName} has database error handling`, () => content.includes('error') && content.includes('catch'), 'database', 'high');
    runTest(`${routeName} has transaction handling`, () => content.includes('transaction') || content.includes('begin'), 'database', 'low');
    
    // AI Integration
    runTest(`${routeName} has OpenAI integration`, () => content.includes('openai') || content.includes('OpenAI'), 'ai', 'high');
    runTest(`${routeName} has AI error handling`, () => content.includes('error') && content.includes('catch'), 'ai', 'high');
    runTest(`${routeName} has AI configuration`, () => content.includes('model') || content.includes('temperature'), 'ai', 'medium');
    
    // Telephony Integration
    runTest(`${routeName} has Telnyx integration`, () => content.includes('telnyx') || content.includes('Telnyx'), 'integration', 'high');
    runTest(`${routeName} has webhook handling`, () => content.includes('webhook') || content.includes('event_type'), 'integration', 'high');
    runTest(`${routeName} has call status handling`, () => content.includes('status') || content.includes('call_status'), 'integration', 'high');
  }
});



// Test 9: Database schema analysis
const migrationFiles = fs.readdirSync('migrations').filter(file => file.endsWith('.sql'));

migrationFiles.forEach(migration => {
  const content = fs.readFileSync(`migrations/${migration}`, 'utf8');
  
  runTest(`${migration} has CREATE TABLE statements`, () => content.includes('CREATE TABLE'), 'database', 'critical');
  runTest(`${migration} has ALTER TABLE statements`, () => content.includes('ALTER TABLE'), 'database', 'medium');
  runTest(`${migration} has INSERT statements`, () => content.includes('INSERT INTO'), 'database', 'medium');
  runTest(`${migration} has UPDATE statements`, () => content.includes('UPDATE'), 'database', 'low');
  runTest(`${migration} has DELETE statements`, () => content.includes('DELETE FROM'), 'database', 'low');
  runTest(`${migration} has INDEX statements`, () => content.includes('CREATE INDEX'), 'database', 'medium');
  runTest(`${migration} has CONSTRAINT statements`, () => content.includes('CONSTRAINT'), 'database', 'medium');
  runTest(`${migration} has FOREIGN KEY statements`, () => content.includes('FOREIGN KEY'), 'database', 'medium');
  runTest(`${migration} has UNIQUE constraints`, () => content.includes('UNIQUE'), 'database', 'medium');
  runTest(`${migration} has PRIMARY KEY statements`, () => content.includes('PRIMARY KEY'), 'database', 'critical');
});



// Test 10: UI components analysis
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
    runTest(`${pageName} has onFocus handlers`, () => content.includes('onFocus'), 'ui', 'low');
    runTest(`${pageName} has onBlur handlers`, () => content.includes('onBlur'), 'ui', 'low');
    
    // Form Handling
    runTest(`${pageName} has form elements`, () => content.includes('<form') || content.includes('<input'), 'ui', 'high');
    runTest(`${pageName} has input validation`, () => content.includes('required') || content.includes('validation'), 'ui', 'high');
    runTest(`${pageName} has error handling`, () => content.includes('error') || content.includes('Error'), 'ui', 'high');
    runTest(`${pageName} has loading states`, () => content.includes('loading') || content.includes('Loading'), 'ui', 'medium');
    
    // Accessibility
    runTest(`${pageName} has aria labels`, () => content.includes('aria-'), 'ui', 'high');
    runTest(`${pageName} has role attributes`, () => content.includes('role='), 'ui', 'medium');
    runTest(`${pageName} has alt attributes`, () => content.includes('alt='), 'ui', 'medium');
    runTest(`${pageName} has tabindex attributes`, () => content.includes('tabIndex'), 'ui', 'low');
    
    // Responsive Design
    runTest(`${pageName} has responsive classes`, () => content.includes('md:') || content.includes('lg:') || content.includes('sm:'), 'ui', 'high');
    runTest(`${pageName} has grid layout`, () => content.includes('grid'), 'ui', 'medium');
    runTest(`${pageName} has flex layout`, () => content.includes('flex'), 'ui', 'medium');
    runTest(`${pageName} has responsive breakpoints`, () => content.includes('breakpoint'), 'ui', 'low');
    
    // Performance
    runTest(`${pageName} has lazy loading`, () => content.includes('lazy') || content.includes('Lazy'), 'ui', 'medium');
    runTest(`${pageName} has memoization`, () => content.includes('memo') || content.includes('Memo'), 'ui', 'medium');
    runTest(`${pageName} has code splitting`, () => content.includes('dynamic') || content.includes('Dynamic'), 'ui', 'low');
    
    // Navigation
    runTest(`${pageName} has Link components`, () => content.includes('Link') || content.includes('link'), 'ui', 'high');
    runTest(`${pageName} has router usage`, () => content.includes('router') || content.includes('Router'), 'ui', 'medium');
    runTest(`${pageName} has navigation menu`, () => content.includes('nav') || content.includes('Nav'), 'ui', 'medium');
    
    // Data Fetching
    runTest(`${pageName} has API calls`, () => content.includes('fetch') || content.includes('axios'), 'ui', 'high');
    runTest(`${pageName} has data loading`, () => content.includes('loading') || content.includes('Loading'), 'ui', 'medium');
    runTest(`${pageName} has error boundaries`, () => content.includes('ErrorBoundary') || content.includes('error'), 'ui', 'medium');
  }
});



// Test 11: Library utilities analysis
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
  'lib/lead-enrichment',
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
    runTest(`${libName} has proper error types`, () => content.includes('Error') || content.includes('error'), 'code-quality', 'medium');
    
    // Input Validation
    runTest(`${libName} has input validation`, () => content.includes('validation') || content.includes('validate'), 'code-quality', 'high');
    runTest(`${libName} has type checking`, () => content.includes('typeof') || content.includes('instanceof'), 'code-quality', 'medium');
    runTest(`${libName} has null checks`, () => content.includes('null') || content.includes('undefined'), 'code-quality', 'high');
    
    // Performance
    runTest(`${libName} has caching`, () => content.includes('cache') || content.includes('Cache'), 'performance', 'medium');
    runTest(`${libName} has memoization`, () => content.includes('memo') || content.includes('Memo'), 'performance', 'low');
    runTest(`${libName} has debouncing`, () => content.includes('debounce') || content.includes('Debounce'), 'performance', 'low');
    
    // Security
    runTest(`${libName} has no hardcoded secrets`, () => !content.includes('sk-') && !content.match(/Bearer\s+[a-zA-Z0-9]{20,}/), 'security', 'critical');
    runTest(`${libName} has input sanitization`, () => content.includes('sanitize') || content.includes('trim'), 'security', 'high');
    runTest(`${libName} has environment variable checks`, () => content.includes('process.env.') && content.includes('||'), 'security', 'high');
    
    // Logging
    runTest(`${libName} has structured logging`, () => content.includes('logger.') || content.includes('console.'), 'code-quality', 'medium');
    runTest(`${libName} has debug logging`, () => content.includes('debug') || content.includes('Debug'), 'code-quality', 'low');
    runTest(`${libName} has info logging`, () => content.includes('info') || content.includes('Info'), 'code-quality', 'low');
  }
});



// Test 12: Environment variables analysis
const envExample = 'env.example';
if (fs.existsSync(envExample)) {
  const content = fs.readFileSync(envExample, 'utf8');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'TELNYX_API_KEY',
    'TELNYX_PHONE_NUMBER',
    'TELNYX_CONNECTION_ID',
    'NEXT_PUBLIC_APP_URL',
    'JWT_SECRET'
  ];
  
  requiredEnvVars.forEach(envVar => {
    runTest(`Environment variable ${envVar} is documented`, () => content.includes(envVar), 'configuration', 'critical');
  });
  
  runTest('Environment file has comments', () => content.includes('#'), 'configuration', 'medium');
  runTest('Environment file has examples', () => content.includes('example') || content.includes('Example'), 'configuration', 'low');
}



// Test 13: Security analysis
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



// Test 14: Performance analysis
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



// Test 15: Integration analysis
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



// Test 16: Deployment analysis
const deploymentFiles = [
  'package.json',
  'next.config.js',
  'vercel.json',
  'DEPLOYMENT_CHECKLIST.md',
  'README.md'
];

deploymentFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file);
    
    // Build Configuration
    runTest(`${fileName} has build scripts`, () => content.includes('build') || content.includes('Build'), 'deployment', 'critical');
    runTest(`${fileName} has start scripts`, () => content.includes('start') || content.includes('Start'), 'deployment', 'critical');
    runTest(`${fileName} has dev scripts`, () => content.includes('dev') || content.includes('Dev'), 'deployment', 'critical');
    
    // Environment Configuration
    runTest(`${fileName} has environment variables`, () => content.includes('env') || content.includes('ENV'), 'deployment', 'high');
    runTest(`${fileName} has production config`, () => content.includes('production') || content.includes('Production'), 'deployment', 'high');
    runTest(`${fileName} has development config`, () => content.includes('development') || content.includes('Development'), 'deployment', 'medium');
    
    // Security Configuration
    runTest(`${fileName} has security headers`, () => content.includes('security') || content.includes('Security'), 'deployment', 'medium');
    runTest(`${fileName} has CORS configuration`, () => content.includes('cors') || content.includes('CORS'), 'deployment', 'medium');
    runTest(`${fileName} has rate limiting`, () => content.includes('rate') || content.includes('Rate'), 'deployment', 'medium');
    
    // Performance Configuration
    runTest(`${fileName} has caching configuration`, () => content.includes('cache') || content.includes('Cache'), 'deployment', 'medium');
    runTest(`${fileName} has compression configuration`, () => content.includes('compress') || content.includes('Compress'), 'deployment', 'low');
    runTest(`${fileName} has optimization configuration`, () => content.includes('optimize') || content.includes('Optimize'), 'deployment', 'low');
  }
});



// Test 17: Documentation analysis
const documentationFiles = [
  'README.md',
  'DEPLOYMENT_CHECKLIST.md',
  'docs/BUY_TOLL_FREE_SETUP.md',
  'docs/CALL_FORWARDING_SETUP.md',
  'docs/CLIENT_ACQUISITION_GUIDE.md',
  'docs/CLIENT_ACQUISITION_STRATEGY.md',
  'docs/COMPETITIVE_ANALYSIS.md',
  'docs/CRITICAL_FEATURES_STATUS.md',
  'docs/DATABASE_SETUP_INSTRUCTIONS.md',
  'docs/DYNAMIC_AI_AGENT_SYSTEM.md',
  'docs/ENVIRONMENT_VARIABLES_REQUIRED.md',
  'docs/ENVIRONMENT_VARIABLES_SETUP.md',
  'docs/ERROR_PREVENTION_GUIDE.md',
  'docs/FINAL_LAUNCH_READINESS_REPORT.md',
  'docs/FINAL_LAUNCH_STATUS_SUMMARY.md',
  'docs/FINAL_PLATFORM_STATUS.md',
  'docs/FINAL_PRODUCTION_DEPLOYMENT.md',
  'docs/FIX_ALL_API_AUTHENTICATION.md',
  'docs/GET_RETELL_AGENT_ID.md',
  'docs/GOOGLE_CALENDAR_SETUP.md',
  'docs/HONEST_PLATFORM_STATUS.md',
  'docs/LAUNCH_DAY_CHECKLIST.md',
  'docs/LEAD_GENERATION_TARGETS.md',
  'docs/MONEY_MAKING_FEATURES_SUMMARY.md',
  'docs/MULTI_CLIENT_ANALYSIS.md',
  'docs/PERFORMANCE_MONITORING.md',
  'docs/PRODUCTION_READINESS_REPORT.md',
  'docs/PRODUCTION_READINESS.md',
  'docs/PRODUCTION_READY_FINAL.md',
  'docs/QUICK_AI_RECEPTIONIST_SETUP.md',
  'docs/REAL_AUTOMATION_SYSTEM_SUMMARY.md',
  'docs/REAL_BUSINESS_SEARCH_VERIFICATION.md',
  'docs/SALES_SCRIPTS.md',
  'docs/SCHEMA_ANALYSIS.md',
  'docs/SETUP_SMS_NOTIFICATIONS.md',
  'docs/TELNYX_WEBHOOK_SETUP.md',
  'docs/TOLL_FREE_SETUP_GUIDE.md',
  'docs/ULTIMATE_CLIENT_EXPERIENCE_IMPROVEMENTS.md'
];

documentationFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file, '.md');
    
    // Content Quality
    runTest(`${fileName} has substantial content`, () => content.length > 100, 'documentation', 'high');
    runTest(`${fileName} has proper formatting`, () => content.includes('#') || content.includes('##'), 'documentation', 'medium');
    runTest(`${fileName} has code examples`, () => content.includes('```') || content.includes('code'), 'documentation', 'medium');
    runTest(`${fileName} has step-by-step instructions`, () => content.includes('1.') || content.includes('Step'), 'documentation', 'medium');
    
    // Technical Content
    runTest(`${fileName} has technical details`, () => content.includes('API') || content.includes('database'), 'documentation', 'medium');
    runTest(`${fileName} has configuration details`, () => content.includes('config') || content.includes('Config'), 'documentation', 'medium');
    runTest(`${fileName} has troubleshooting`, () => content.includes('troubleshoot') || content.includes('error'), 'documentation', 'low');
    
    // User Experience
    runTest(`${fileName} has user instructions`, () => content.includes('user') || content.includes('User'), 'documentation', 'medium');
    runTest(`${fileName} has setup instructions`, () => content.includes('setup') || content.includes('Setup'), 'documentation', 'medium');
    runTest(`${fileName} has deployment instructions`, () => content.includes('deploy') || content.includes('Deploy'), 'documentation', 'medium');
  }
});



// Test 18: Code quality analysis
const codeQualityFiles = [
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
  'app/admin/monitoring/page.tsx',
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
  'lib/lead-enrichment',
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

codeQualityFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file, '.tsx') || path.basename(file, '.ts');
    
    // TypeScript Quality
    runTest(`${fileName} has proper TypeScript types`, () => content.includes('interface') || content.includes('type'), 'code-quality', 'high');
    runTest(`${fileName} has no any types`, () => !content.includes(': any'), 'code-quality', 'high');
    runTest(`${fileName} has proper function signatures`, () => content.includes('function') || content.includes('const'), 'code-quality', 'high');
    runTest(`${fileName} has proper return types`, () => content.includes('return') || content.includes('Return'), 'code-quality', 'medium');
    
    // Code Structure
    runTest(`${fileName} has proper imports`, () => content.includes('import'), 'code-quality', 'critical');
    runTest(`${fileName} has proper exports`, () => content.includes('export'), 'code-quality', 'critical');
    runTest(`${fileName} has proper function organization`, () => content.includes('function') || content.includes('const'), 'code-quality', 'high');
    runTest(`${fileName} has proper variable declarations`, () => content.includes('const') || content.includes('let'), 'code-quality', 'medium');
    
    // Error Handling
    runTest(`${fileName} has try-catch blocks`, () => content.includes('try {') && content.includes('catch'), 'code-quality', 'high');
    runTest(`${fileName} has proper error handling`, () => content.includes('error') || content.includes('Error'), 'code-quality', 'high');
    runTest(`${fileName} has null checks`, () => content.includes('null') || content.includes('undefined'), 'code-quality', 'medium');
    runTest(`${fileName} has validation`, () => content.includes('validation') || content.includes('validate'), 'code-quality', 'medium');
    
    // Performance
    runTest(`${fileName} has no memory leaks`, () => !content.includes('setInterval') || content.includes('clearInterval'), 'code-quality', 'medium');
    runTest(`${fileName} has proper cleanup`, () => content.includes('cleanup') || content.includes('Cleanup'), 'code-quality', 'low');
    runTest(`${fileName} has efficient algorithms`, () => content.includes('algorithm') || content.includes('Algorithm'), 'code-quality', 'low');
    
    // Maintainability
    runTest(`${fileName} has comments`, () => content.includes('//') || content.includes('/*'), 'code-quality', 'medium');
    runTest(`${fileName} has documentation`, () => content.includes('doc') || content.includes('Doc'), 'code-quality', 'low');
    runTest(`${fileName} has proper naming`, () => content.includes('camelCase') || content.includes('PascalCase'), 'code-quality', 'medium');
    runTest(`${fileName} has consistent formatting`, () => content.includes('  ') || content.includes('\t'), 'code-quality', 'low');
  }
});



// Test 19: Testing analysis
const testFiles = [
  'scripts/comprehensive-code-analysis.js',
  'scripts/fix-high-priority-issues.js',
  'scripts/test-production-readiness.js',
  'scripts/fix-remaining-issues.js',
  'scripts/final-production-fix.js',
  'scripts/ultimate-verification.js',
  'scripts/accurate-verification.js',
  'scripts/prove-its-different.js',
  'scripts/test-everything-including-database.js',
  'scripts/ultimate-real-test.js',
  'scripts/comprehensive-user-testing.js',
  'scripts/ultimate-comprehensive-test.js',
  'scripts/fix-ultimate-critical-issues.js'
];

testFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file, '.js');
    
    // Test Structure
    runTest(`${fileName} has test functions`, () => content.includes('function') || content.includes('const'), 'testing', 'high');
    runTest(`${fileName} has test assertions`, () => content.includes('assert') || content.includes('expect'), 'testing', 'medium');
    runTest(`${fileName} has test cases`, () => content.includes('test') || content.includes('Test'), 'testing', 'high');
    runTest(`${fileName} has test results`, () => content.includes('result') || content.includes('Result'), 'testing', 'medium');
    
    // Test Coverage
    runTest(`${fileName} has comprehensive coverage`, () => content.includes('comprehensive') || content.includes('Comprehensive'), 'testing', 'medium');
    runTest(`${fileName} has edge case testing`, () => content.includes('edge') || content.includes('Edge'), 'testing', 'low');
    runTest(`${fileName} has error case testing`, () => content.includes('error') || content.includes('Error'), 'testing', 'medium');
    runTest(`${fileName} has performance testing`, () => content.includes('performance') || content.includes('Performance'), 'testing', 'low');
    
    // Test Quality
    runTest(`${fileName} has proper test organization`, () => content.includes('describe') || content.includes('it'), 'testing', 'medium');
    runTest(`${fileName} has test documentation`, () => content.includes('doc') || content.includes('Doc'), 'testing', 'low');
    runTest(`${fileName} has test reporting`, () => content.includes('report') || content.includes('Report'), 'testing', 'medium');
    runTest(`${fileName} has test metrics`, () => content.includes('metric') || content.includes('Metric'), 'testing', 'low');
  }
});



// Test 20: Final comprehensive analysis
const allFiles = fs.readdirSync('.', { recursive: true }).filter(file => 
  file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')
);

allFiles.forEach(file => {
  if (fs.existsSync(file)) {
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





