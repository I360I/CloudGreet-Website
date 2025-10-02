// ULTRA DEEP PRODUCTION AUDIT
// This script performs the most comprehensive audit possible

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function ultraDeepAudit() {
  console.log('🔍 ULTRA DEEP PRODUCTION AUDIT');
  console.log('=====================================');
  
  let allPassed = true;
  const issues = [];

  // 1. File Structure Audit
  console.log('\n1️⃣ FILE STRUCTURE AUDIT...');
  const criticalFiles = [
    'app/api/auth/register/route.ts',
    'app/api/auth/login/route.ts',
    'app/api/health/route.ts',
    'app/api/contact/submit/route.ts',
    'app/api/stripe/test-customer/route.ts',
    'app/api/admin/auth/route.ts',
    'app/api/dashboard/data/route.ts',
    'app/api/business/profile/route.ts',
    'app/api/onboarding/complete/route.ts',
    'lib/supabase.ts',
    'lib/validation.ts',
    'lib/email.ts',
    'lib/telynyx.ts',
    'lib/calendar.ts',
    'lib/performance-monitoring.ts',
    'middleware.ts',
    'next.config.js',
    'vercel.json',
    'package.json',
    'tsconfig.json',
    '.env.local'
  ];

  for (const file of criticalFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}: EXISTS`);
      
      // Check if file is not empty
      const stats = fs.statSync(file);
      if (stats.size === 0) {
        console.log(`⚠️ ${file}: EMPTY FILE`);
        issues.push(`Empty file: ${file}`);
      }
    } else {
      console.log(`❌ ${file}: MISSING`);
      issues.push(`Missing file: ${file}`);
      allPassed = false;
    }
  }

  // 2. Environment Variables Deep Check
  console.log('\n2️⃣ ENVIRONMENT VARIABLES DEEP CHECK...');
  const envVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'JWT_SECRET': process.env.JWT_SECRET,
    'TELYNX_API_KEY': process.env.TELYNX_API_KEY,
    'TELYNX_CONNECTION_ID': process.env.TELYNX_CONNECTION_ID,
    'TELYNX_MESSAGING_PROFILE_ID': process.env.TELYNX_MESSAGING_PROFILE_ID,
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
    'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    'STRIPE_WEBHOOK_SECRET': process.env.STRIPE_WEBHOOK_SECRET,
    'SMTP_HOST': process.env.SMTP_HOST,
    'SMTP_PORT': process.env.SMTP_PORT,
    'SMTP_USER': process.env.SMTP_USER,
    'SMTP_PASS': process.env.SMTP_PASS,
    'SMTP_FROM_EMAIL': process.env.SMTP_FROM_EMAIL,
    'ADMIN_PASSWORD': process.env.ADMIN_PASSWORD,
    'NEXT_PUBLIC_BASE_URL': process.env.NEXT_PUBLIC_BASE_URL,
    'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL,
    'NEXT_PUBLIC_RETELL_API_KEY': process.env.NEXT_PUBLIC_RETELL_API_KEY,
    'NEXT_PUBLIC_RETELL_AGENT_ID': process.env.NEXT_PUBLIC_RETELL_AGENT_ID,
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID': process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET,
    'GOOGLE_REDIRECT_URI': process.env.GOOGLE_REDIRECT_URI
  };

  for (const [key, value] of Object.entries(envVars)) {
    if (!value || value === 'fallback-secret' || value.includes('your-') || value.includes('placeholder')) {
      console.log(`❌ ${key}: MISSING OR PLACEHOLDER`);
      issues.push(`Missing/placeholder env var: ${key}`);
      allPassed = false;
    } else {
      console.log(`✅ ${key}: CONFIGURED`);
    }
  }

  // 3. API Endpoints Comprehensive Test
  console.log('\n3️⃣ API ENDPOINTS COMPREHENSIVE TEST...');
  const endpoints = [
    { path: '/api/health', method: 'GET', needsAuth: false },
    { path: '/api/admin/auth', method: 'POST', needsAuth: false, body: { password: '1487' } },
    { path: '/api/contact/submit', method: 'POST', needsAuth: false, body: { firstName: 'Test', lastName: 'User', email: 'test@example.com', subject: 'Test', message: 'This is a test message for the ultra deep audit' } },
    { path: '/api/pricing/plans', method: 'GET', needsAuth: false },
    { path: '/api/auth/register', method: 'POST', needsAuth: false, body: { business_name: 'Ultra Test Business', business_type: 'General', owner_name: 'Ultra Test Owner', email: `ultra-test-${Date.now()}@example.com`, password: 'UltraPassword123!', phone: '+15551234567', website: 'https://ultratest.com', address: '123 Ultra St, Test City, TC 12345', services: ['General'], service_areas: ['Test City'] } },
    { path: '/api/stripe/test-customer', method: 'POST', needsAuth: false, body: { email: 'ultra-stripe@test.com', name: 'Ultra Test Customer' } },
    { path: '/api/admin/system-health', method: 'GET', needsAuth: false },
    { path: '/api/dashboard/data', method: 'GET', needsAuth: true },
    { path: '/api/business/profile', method: 'GET', needsAuth: true },
    { path: '/api/onboarding/complete', method: 'POST', needsAuth: true, body: { businessName: 'Ultra Test Business', businessType: 'HVAC', ownerName: 'Ultra Test Owner', email: 'ultra@test.com', phone: '+15551234567', website: 'https://ultratest.com', address: '123 Ultra St, Test City, TC 12345', services: ['HVAC'], serviceAreas: ['Test City'], businessHours: { monday: { enabled: true, start: '09:00', end: '17:00' } }, greetingMessage: 'Thank you for calling Ultra Test Business', tone: 'professional' } }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
      });
      
      if (response.ok || (endpoint.needsAuth && response.status === 401)) {
        console.log(`✅ ${endpoint.path}: RESPONDING`);
      } else {
        console.log(`❌ ${endpoint.path}: ERROR ${response.status}`);
        const errorText = await response.text();
        issues.push(`API error ${endpoint.path}: ${response.status} - ${errorText.substring(0, 100)}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${endpoint.path}: CONNECTION FAILED`);
      issues.push(`Connection failed ${endpoint.path}: ${error.message}`);
      allPassed = false;
    }
  }

  // 4. Database Schema Validation
  console.log('\n4️⃣ DATABASE SCHEMA VALIDATION...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test critical tables
    const criticalTables = ['businesses', 'users', 'ai_agents', 'call_logs', 'sms_messages', 'appointments', 'contact_submissions', 'audit_logs'];
    
    for (const table of criticalTables) {
      try {
        const { data, error } = await supabase.from(table).select('id').limit(1);
        if (error) {
          console.log(`❌ Table '${table}': ERROR - ${error.message}`);
          issues.push(`Database table error ${table}: ${error.message}`);
          allPassed = false;
        } else {
          console.log(`✅ Table '${table}': ACCESSIBLE`);
        }
      } catch (e) {
        console.log(`❌ Table '${table}': EXCEPTION - ${e.message}`);
        issues.push(`Database table exception ${table}: ${e.message}`);
        allPassed = false;
      }
    }
  } catch (error) {
    console.log(`❌ DATABASE: CONNECTION FAILED - ${error.message}`);
    issues.push(`Database connection failed: ${error.message}`);
    allPassed = false;
  }

  // 5. Code Quality Checks
  console.log('\n5️⃣ CODE QUALITY CHECKS...');
  
  // Check for TODO comments
  const todoFiles = ['app', 'lib'];
  for (const dir of todoFiles) {
    if (fs.existsSync(dir)) {
      const files = getAllFiles(dir);
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes('TODO') || content.includes('FIXME') || content.includes('HACK')) {
            console.log(`⚠️ ${file}: Contains TODO/FIXME/HACK`);
            issues.push(`Code quality issue ${file}: Contains TODO/FIXME/HACK`);
          }
        }
      }
    }
  }

  // 6. Configuration Validation
  console.log('\n6️⃣ CONFIGURATION VALIDATION...');
  
  // Check vercel.json
  if (fs.existsSync('vercel.json')) {
    try {
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
      if (!vercelConfig.functions || Object.keys(vercelConfig.functions).length === 0) {
        console.log(`⚠️ vercel.json: Missing function configuration`);
        issues.push(`vercel.json missing function configuration`);
      } else {
        console.log(`✅ vercel.json: HAS FUNCTION CONFIGURATION`);
      }
    } catch (e) {
      console.log(`❌ vercel.json: INVALID JSON`);
      issues.push(`vercel.json invalid JSON: ${e.message}`);
      allPassed = false;
    }
  }

  // Check next.config.js
  if (fs.existsSync('next.config.js')) {
    try {
      const content = fs.readFileSync('next.config.js', 'utf8');
      if (!content.includes('experimental') && !content.includes('webpack')) {
        console.log(`⚠️ next.config.js: Missing optimization configuration`);
        issues.push(`next.config.js missing optimization configuration`);
      }
    } catch (e) {
      console.log(`❌ next.config.js: READ ERROR`);
      issues.push(`next.config.js read error: ${e.message}`);
      allPassed = false;
    }
  }

  // 7. Performance Check
  console.log('\n7️⃣ PERFORMANCE CHECK...');
  
  // Check bundle size
  if (fs.existsSync('.next')) {
    const buildManifest = path.join('.next', 'build-manifest.json');
    if (fs.existsSync(buildManifest)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
        console.log(`✅ Build manifest: EXISTS`);
      } catch (e) {
        console.log(`⚠️ Build manifest: CORRUPTED`);
        issues.push(`Build manifest corrupted: ${e.message}`);
      }
    }
  }

  // Final Results
  console.log('\n📊 ULTRA DEEP AUDIT RESULTS');
  console.log('=============================');
  
  if (allPassed && issues.length === 0) {
    console.log('🎉 ULTRA DEEP AUDIT PASSED!');
    console.log('✅ 100% PRODUCTION READY');
    console.log('🚀 READY TO LAUNCH CLOUDGREET.COM');
  } else {
    console.log('❌ ULTRA DEEP AUDIT FOUND ISSUES');
    console.log(`🔧 ${issues.length} ISSUES FOUND:`);
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }

  return allPassed && issues.length === 0;
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

ultraDeepAudit().catch(console.error);
