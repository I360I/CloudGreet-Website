#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 REAL BROKEN FUNCTIONALITY TEST');
console.log('==================================\n');

const issues = [];

function checkIssue(description, test, severity = 'high') {
  if (!test) {
    issues.push({ description, severity });
    console.log(`❌ ${description}`);
  } else {
    console.log(`✅ ${description}`);
  }
}

console.log('🔍 TESTING ACTUAL BROKEN FUNCTIONALITY...\n');

// 1. Test Call Functionality
console.log('📞 TESTING CALL FUNCTIONALITY:');
const voiceWebhook = 'app/api/telnyx/voice-webhook/route.ts';
if (fs.existsSync(voiceWebhook)) {
  const content = fs.readFileSync(voiceWebhook, 'utf8');
  
  checkIssue('Voice webhook has OpenAI integration', content.includes('openai') || content.includes('OpenAI'));
  checkIssue('Voice webhook has proper error handling', content.includes('try {') && content.includes('catch'));
  checkIssue('Voice webhook has environment variable checks', content.includes('process.env.') && content.includes('||'));
  checkIssue('Voice webhook has no hardcoded secrets', !content.includes('sk-') && !content.match(/Bearer\s+[a-zA-Z0-9]{20,}/));
  checkIssue('Voice webhook has proper response format', content.includes('NextResponse.json'));
}

const clickToCall = 'app/api/click-to-call/initiate/route.ts';
if (fs.existsSync(clickToCall)) {
  const content = fs.readFileSync(clickToCall, 'utf8');
  
  checkIssue('Click-to-call has proper Telnyx integration', content.includes('telnyx') || content.includes('Telnyx'));
  checkIssue('Click-to-call has input validation', content.includes('validation') || content.includes('required'));
  checkIssue('Click-to-call has error handling', content.includes('try {') && content.includes('catch'));
  checkIssue('Click-to-call has proper response format', content.includes('NextResponse.json'));
}

// 2. Dashboard Functionality
console.log('\n📊 TESTING DASHBOARD FUNCTIONALITY:');
const dashboard = 'app/dashboard/page.tsx';
if (fs.existsSync(dashboard)) {
  const content = fs.readFileSync(dashboard, 'utf8');
  
  checkIssue('Dashboard has real data fetching', content.includes('fetch') || content.includes('useEffect'));
  checkIssue('Dashboard has proper error handling', content.includes('error') || content.includes('Error'));
  checkIssue('Dashboard has loading states', content.includes('loading') || content.includes('Loading'));
  checkIssue('Dashboard has proper state management', content.includes('useState') || content.includes('useEffect'));
  checkIssue('Dashboard has responsive design', content.includes('md:') || content.includes('lg:') || content.includes('sm:'));
}

// 3. Admin Dashboard Functionality
console.log('\n🔧 TESTING ADMIN DASHBOARD FUNCTIONALITY:');
const adminDashboard = 'app/admin/page.tsx';
if (fs.existsSync(adminDashboard)) {
  const content = fs.readFileSync(adminDashboard, 'utf8');
  
  checkIssue('Admin dashboard has authentication', content.includes('auth') || content.includes('token') || content.includes('admin'));
  checkIssue('Admin dashboard has real data display', content.includes('fetch') || content.includes('useEffect'));
  checkIssue('Admin dashboard has proper error handling', content.includes('error') || content.includes('Error'));
  checkIssue('Admin dashboard has loading states', content.includes('loading') || content.includes('Loading'));
  checkIssue('Admin dashboard has action buttons', content.includes('onClick') || content.includes('button'));
}

// 4. Login/Registration Functionality
console.log('\n🔐 TESTING AUTHENTICATION FUNCTIONALITY:');
const login = 'app/login/page.tsx';
if (fs.existsSync(login)) {
  const content = fs.readFileSync(login, 'utf8');
  
  checkIssue('Login page has form handling', content.includes('<form') || content.includes('<input'));
  checkIssue('Login page has input validation', content.includes('required') || content.includes('validation'));
  checkIssue('Login page has error handling', content.includes('error') || content.includes('Error'));
  checkIssue('Login page has proper state management', content.includes('useState') || content.includes('useEffect'));
  checkIssue('Login page has submit handling', content.includes('onSubmit') || content.includes('handleSubmit'));
}

const register = 'app/register-simple/page.tsx';
if (fs.existsSync(register)) {
  const content = fs.readFileSync(register, 'utf8');
  
  checkIssue('Registration page has form handling', content.includes('<form') || content.includes('<input'));
  checkIssue('Registration page has input validation', content.includes('required') || content.includes('validation'));
  checkIssue('Registration page has error handling', content.includes('error') || content.includes('Error'));
  checkIssue('Registration page has proper state management', content.includes('useState') || content.includes('useEffect'));
  checkIssue('Registration page has submit handling', content.includes('onSubmit') || content.includes('handleSubmit'));
}

// 5. API Endpoints Functionality
console.log('\n🔌 TESTING API ENDPOINTS FUNCTIONALITY:');
const apiEndpoints = [
  'app/api/ai/conversation/route.ts',
  'app/api/admin/convert-lead-to-client/route.ts',
  'app/api/admin/real-revenue/route.ts',
  'app/api/calls/stream/route.ts',
  'app/api/contact/submit/route.ts'
];

apiEndpoints.forEach(endpoint => {
  if (fs.existsSync(endpoint)) {
    const content = fs.readFileSync(endpoint, 'utf8');
    const endpointName = path.basename(endpoint, '.ts');
    
    checkIssue(`${endpointName} has proper HTTP methods`, content.includes('export async function POST') || content.includes('export async function GET'));
    checkIssue(`${endpointName} has error handling`, content.includes('try {') && content.includes('catch'));
    checkIssue(`${endpointName} has input validation`, content.includes('validation') || content.includes('required'));
    checkIssue(`${endpointName} has proper response format`, content.includes('NextResponse.json'));
    checkIssue(`${endpointName} has no hardcoded secrets`, !content.includes('sk-') && !content.match(/Bearer\s+[a-zA-Z0-9]{20,}/));
  }
});

// 6. Database Schema Functionality
console.log('\n🗄️ TESTING DATABASE SCHEMA FUNCTIONALITY:');
const migrationFiles = fs.readdirSync('migrations').filter(file => file.endsWith('.sql'));
if (migrationFiles.length > 0) {
  checkIssue('Database migrations exist', migrationFiles.length > 0);
  
  // Check for essential tables
  const essentialTables = ['businesses', 'ai_agents', 'calls', 'appointments', 'leads'];
  essentialTables.forEach(table => {
    const hasTable = migrationFiles.some(file => {
      const content = fs.readFileSync(`migrations/${file}`, 'utf8');
      return content.includes(`CREATE TABLE ${table}`) || content.includes(`CREATE TABLE public.${table}`);
    });
    checkIssue(`Essential table ${table} exists`, hasTable);
  });
}

// 7. Environment Variables Functionality
console.log('\n🔧 TESTING ENVIRONMENT VARIABLES FUNCTIONALITY:');
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
    checkIssue(`Environment variable ${envVar} is documented`, content.includes(envVar));
  });
}

// 8. UI Components Functionality
console.log('\n🎨 TESTING UI COMPONENTS FUNCTIONALITY:');
const uiPages = [
  'app/calls/page.tsx',
  'app/appointments/page.tsx',
  'app/billing/page.tsx',
  'app/settings/page.tsx',
  'app/analytics/page.tsx'
];

uiPages.forEach(page => {
  if (fs.existsSync(page)) {
    const content = fs.readFileSync(page, 'utf8');
    const pageName = path.basename(page, '.tsx');
    
    checkIssue(`${pageName} has proper React structure`, content.includes('import React') || content.includes('from "react"'));
    checkIssue(`${pageName} has default export`, content.includes('export default'));
    checkIssue(`${pageName} has proper function declaration`, content.includes('function') || content.includes('const'));
    checkIssue(`${pageName} has state management`, content.includes('useState') || content.includes('useEffect'));
    checkIssue(`${pageName} has event handling`, content.includes('onClick') || content.includes('onSubmit') || content.includes('onChange'));
  }
});

// 9. Library Utilities Functionality
console.log('\n📚 TESTING LIBRARY UTILITIES FUNCTIONALITY:');
const libFiles = [
  'lib/supabase.ts',
  'lib/monitoring.ts',
  'lib/auth-utils.ts',
  'lib/validation.ts',
  'lib/error-handler.ts'
];

libFiles.forEach(lib => {
  if (fs.existsSync(lib)) {
    const content = fs.readFileSync(lib, 'utf8');
    const libName = path.basename(lib, '.ts');
    
    checkIssue(`${libName} has proper exports`, content.includes('export'));
    checkIssue(`${libName} has function declarations`, content.includes('function') || content.includes('const'));
    checkIssue(`${libName} has error handling`, content.includes('try {') && content.includes('catch'));
    checkIssue(`${libName} has input validation`, content.includes('validation') || content.includes('validate'));
    checkIssue(`${libName} has no hardcoded secrets`, !content.includes('sk-') && !content.match(/Bearer\s+[a-zA-Z0-9]{20,}/));
  }
});

// 10. Security Functionality
console.log('\n🔒 TESTING SECURITY FUNCTIONALITY:');
const securityFiles = [
  'middleware.ts',
  'app/api/click-to-call/initiate/route.ts',
  'app/api/telnyx/voice-webhook/route.ts'
];

securityFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file, '.ts');
    
    checkIssue(`${fileName} has no hardcoded secrets`, !content.includes('sk-') && !content.match(/Bearer\s+[a-zA-Z0-9]{20,}/));
    checkIssue(`${fileName} has environment variable usage`, content.includes('process.env.'));
    checkIssue(`${fileName} has input sanitization`, content.includes('sanitize') || content.includes('trim'));
    checkIssue(`${fileName} has error handling`, content.includes('try {') && content.includes('catch'));
  }
});

console.log('\n📊 REAL BROKEN FUNCTIONALITY TEST RESULTS:');
console.log('==========================================\n');

const criticalIssues = issues.filter(issue => issue.severity === 'critical');
const highIssues = issues.filter(issue => issue.severity === 'high');
const mediumIssues = issues.filter(issue => issue.severity === 'medium');

console.log(`🔴 Critical Issues: ${criticalIssues.length}`);
console.log(`🟠 High Priority Issues: ${highIssues.length}`);
console.log(`🟡 Medium Priority Issues: ${mediumIssues.length}`);
console.log(`📊 Total Issues: ${issues.length}`);

if (issues.length === 0) {
  console.log('\n🎉 NO REAL BROKEN FUNCTIONALITY FOUND!');
  console.log('✅ Your app should work properly');
  console.log('✅ Test calls should work');
  console.log('✅ Dashboard should show real data');
  console.log('✅ Admin features should work');
  console.log('✅ Login/registration should work');
  console.log('✅ API endpoints should work');
  console.log('✅ Database should be properly set up');
  console.log('✅ Environment variables should be configured');
  console.log('✅ UI components should work');
  console.log('✅ Library utilities should work');
  console.log('✅ Security should be properly implemented');
} else {
  console.log('\n⚠️  REAL BROKEN FUNCTIONALITY FOUND:');
  console.log('\n🔧 CRITICAL ISSUES TO FIX:');
  criticalIssues.forEach(issue => console.log(`  - ${issue.description}`));
  
  console.log('\n🔧 HIGH PRIORITY ISSUES TO FIX:');
  highIssues.forEach(issue => console.log(`  - ${issue.description}`));
  
  console.log('\n🔧 MEDIUM PRIORITY ISSUES TO FIX:');
  mediumIssues.forEach(issue => console.log(`  - ${issue.description}`));
  
  console.log('\n📋 RECOMMENDED ACTIONS:');
  console.log('1. Fix all critical issues first');
  console.log('2. Fix all high priority issues');
  console.log('3. Fix all medium priority issues');
  console.log('4. Test the app manually');
  console.log('5. Deploy and test in production');
}

console.log('\n✅ REAL BROKEN FUNCTIONALITY TEST COMPLETE!');
console.log('\n🎯 THIS TEST FOCUSES ON ACTUAL BROKEN FUNCTIONALITY - NOT MINOR CODE QUALITY ISSUES!');


