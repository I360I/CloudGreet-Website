// COMPREHENSIVE FINAL PRODUCTION AUDIT
// This script checks for any remaining issues before production launch

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function comprehensiveAudit() {
  console.log('🔍 COMPREHENSIVE FINAL PRODUCTION AUDIT');
  console.log('==========================================');
  
  let allPassed = true;
  const results = {};

  // 1. Environment Variables Audit
  console.log('\n1️⃣ ENVIRONMENT VARIABLES AUDIT...');
  const envVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'JWT_SECRET': process.env.JWT_SECRET,
    'TELYNX_API_KEY': process.env.TELYNX_API_KEY,
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
    'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  };

  for (const [key, value] of Object.entries(envVars)) {
    if (!value || value === 'fallback-secret' || value.includes('your-')) {
      console.log(`❌ ${key}: MISSING OR PLACEHOLDER`);
      allPassed = false;
    } else {
      console.log(`✅ ${key}: CONFIGURED`);
    }
  }
  results.envVars = allPassed;

  // 2. API Endpoints Audit
  console.log('\n2️⃣ API ENDPOINTS AUDIT...');
  const endpoints = [
    '/api/health',
    '/api/admin/auth',
    '/api/contact/submit',
    '/api/pricing/plans',
    '/api/auth/register',
    '/api/stripe/test-customer',
    '/api/admin/system-health',
    '/api/dashboard/data',
    '/api/business/profile',
    '/api/onboarding/complete'
  ];

  for (const endpoint of endpoints) {
    try {
      // Determine correct HTTP method and body for each endpoint
      let method = 'GET';
      let body = undefined;
      
      if (endpoint === '/api/auth/register') {
        method = 'POST';
        body = JSON.stringify({
          business_name: 'Audit Test Business',
          business_type: 'General',
          owner_name: 'Audit Test Owner',
          email: `audit-test-${Date.now()}@example.com`,
          password: 'AuditPassword123!',
          phone: '+15551234567',
          website: 'https://audittest.com',
          address: '123 Audit St, Test City, TC 12345',
          services: ['General'],
          service_areas: ['Test City']
        });
      } else if (endpoint === '/api/admin/auth') {
        method = 'POST';
        body = JSON.stringify({
          username: 'admin',
          password: 'adminpassword'
        });
      } else if (endpoint === '/api/contact/submit') {
        method = 'POST';
        body = JSON.stringify({
          firstName: 'Audit',
          lastName: 'Test',
          email: 'audit@test.com',
          subject: 'Audit Test',
          message: 'This is an audit test message that meets the minimum length requirement'
        });
      } else if (endpoint === '/api/stripe/test-customer') {
        method = 'POST';
        body = JSON.stringify({
          email: 'audit-stripe@test.com',
          name: 'Audit Test Customer'
        });
      } else if (endpoint === '/api/onboarding/complete') {
        method = 'POST';
        body = JSON.stringify({
          businessName: 'Audit Test Business',
          businessType: 'HVAC',
          ownerName: 'Audit Test Owner',
          email: 'audit@test.com',
          phone: '+15551234567',
          website: 'https://audittest.com',
          address: '123 Audit St, Test City, TC 12345',
          services: ['HVAC'],
          serviceAreas: ['Test City'],
          businessHours: {
            monday: { enabled: true, start: '09:00', end: '17:00' },
            tuesday: { enabled: true, start: '09:00', end: '17:00' },
            wednesday: { enabled: true, start: '09:00', end: '17:00' },
            thursday: { enabled: true, start: '09:00', end: '17:00' },
            friday: { enabled: true, start: '09:00', end: '17:00' },
            saturday: { enabled: false, start: '09:00', end: '17:00' },
            sunday: { enabled: false, start: '09:00', end: '17:00' }
          },
          greetingMessage: 'Thank you for calling Audit Test Business',
          tone: 'professional'
        });
      }
      
      const response = await fetch(`http://localhost:3002${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });
      
      if (response.ok || response.status === 401) { // 401 is expected for auth-required endpoints
        console.log(`✅ ${endpoint}: RESPONDING`);
      } else {
        console.log(`❌ ${endpoint}: ERROR ${response.status}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: CONNECTION FAILED`);
      allPassed = false;
    }
  }
  results.endpoints = allPassed;

  // 3. Database Connection Audit
  console.log('\n3️⃣ DATABASE CONNECTION AUDIT...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase.from('businesses').select('id').limit(1);
    if (error) {
      console.log(`❌ DATABASE: ${error.message}`);
      allPassed = false;
    } else {
      console.log(`✅ DATABASE: CONNECTED`);
    }
  } catch (error) {
    console.log(`❌ DATABASE: CONNECTION FAILED`);
    allPassed = false;
  }
  results.database = allPassed;

  // 4. Critical Files Audit
  console.log('\n4️⃣ CRITICAL FILES AUDIT...');
  const fs = require('fs');
  const criticalFiles = [
    'app/api/auth/register/route.ts',
    'app/dashboard/page.tsx',
    'lib/supabase.ts',
    'lib/validation.ts',
    'middleware.ts',
    'next.config.js',
    'vercel.json',
    '.env.local'
  ];

  for (const file of criticalFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}: EXISTS`);
    } else {
      console.log(`❌ ${file}: MISSING`);
      allPassed = false;
    }
  }
  results.files = allPassed;

  // 5. Build System Audit
  console.log('\n5️⃣ BUILD SYSTEM AUDIT...');
  try {
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'pipe', timeout: 60000 });
    console.log(`✅ BUILD: SUCCESSFUL`);
  } catch (error) {
    console.log(`❌ BUILD: FAILED`);
    console.log(`   Error: ${error.message}`);
    allPassed = false;
  }
  results.build = allPassed;

  // 6. Security Audit
  console.log('\n6️⃣ SECURITY AUDIT...');
  const securityChecks = {
    'JWT Secret Not Default': process.env.JWT_SECRET !== 'fallback-secret',
    'Supabase URL HTTPS': process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://'),
    'Stripe Keys Live': process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_'),
    'No Placeholder Values': !Object.values(envVars).some(v => v?.includes('your-') || v?.includes('placeholder'))
  };

  for (const [check, passed] of Object.entries(securityChecks)) {
    if (passed) {
      console.log(`✅ ${check}`);
    } else {
      console.log(`❌ ${check}`);
      allPassed = false;
    }
  }
  results.security = allPassed;

  // Final Results
  console.log('\n📊 COMPREHENSIVE AUDIT RESULTS');
  console.log('================================');
  console.log(`Environment Variables: ${results.envVars ? '✅' : '❌'}`);
  console.log(`API Endpoints: ${results.endpoints ? '✅' : '❌'}`);
  console.log(`Database Connection: ${results.database ? '✅' : '❌'}`);
  console.log(`Critical Files: ${results.files ? '✅' : '❌'}`);
  console.log(`Build System: ${results.build ? '✅' : '❌'}`);
  console.log(`Security: ${results.security ? '✅' : '❌'}`);

  if (allPassed) {
    console.log('\n🎉 COMPREHENSIVE AUDIT PASSED!');
    console.log('✅ 100% PRODUCTION READY');
    console.log('🚀 READY TO LAUNCH CLOUDGREET.COM');
  } else {
    console.log('\n❌ COMPREHENSIVE AUDIT FAILED');
    console.log('🔧 ISSUES FOUND - FIX BEFORE LAUNCH');
  }

  return allPassed;
}

comprehensiveAudit().catch(console.error);
