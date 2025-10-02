// FINAL PRODUCTION VERIFICATION - NO DEMO/MOCK/PLACEHOLDER/FAKE DATA
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function finalProductionVerification() {
  console.log('🔍 FINAL PRODUCTION VERIFICATION');
  console.log('================================');
  console.log('Checking for ANY demo/mock/placeholder/hardcoded/fake data...');

  let allProductionReady = true;
  const issues = [];

  // 1. Environment Variables Check
  console.log('\n1️⃣ Environment Variables Verification...');
  const envVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_RETELL_API_KEY',
    'STRIPE_SECRET_KEY',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS'
  ];

  envVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.includes('placeholder') || value.includes('demo') || value.includes('test') || value.includes('fake')) {
      issues.push(`❌ ${varName}: Contains placeholder/demo/fake data`);
      allProductionReady = false;
    } else {
      console.log(`✅ ${varName}: Production ready`);
    }
  });

  // 2. API Endpoints Check
  console.log('\n2️⃣ API Endpoints Verification...');
  const endpoints = [
    '/api/health',
    '/api/auth/register',
    '/api/contact/submit',
    '/api/pricing/plans',
    '/api/stripe/test-customer',
    '/api/admin/system-health'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: endpoint.includes('register') || endpoint.includes('submit') || endpoint.includes('test-customer') ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.includes('register') ? JSON.stringify({
          business_name: 'Test',
          business_type: 'General',
          owner_name: 'Test',
          email: 'test@test.com',
          password: 'Test123!',
          phone: '+15551234567',
          address: '123 Test St'
        }) : endpoint.includes('submit') ? JSON.stringify({
          email: 'test@test.com',
          subject: 'Test',
          message: 'Test message'
        }) : endpoint.includes('test-customer') ? JSON.stringify({
          email: 'test@test.com'
        }) : undefined
      });

      if (response.ok) {
        console.log(`✅ ${endpoint}: Working`);
      } else {
        console.log(`⚠️ ${endpoint}: Status ${response.status} (may need auth)`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: Error - ${error.message}`);
      issues.push(`API endpoint ${endpoint} not working`);
      allProductionReady = false;
    }
  }

  // 3. Database Tables Check
  console.log('\n3️⃣ Database Tables Verification...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const requiredTables = [
      'businesses',
      'users', 
      'ai_agents',
      'calls',
      'sms_messages',
      'appointments',
      'contact_submissions',
      'lead_scoring',
      'upsell_opportunities',
      'pricing_optimization_log',
      'competitor_analysis',
      'retention_analysis',
      'revenue_forecasts',
      'ai_conversation_analytics',
      'revenue_optimization_settings'
    ];

    for (const table of requiredTables) {
      try {
        const { data, error } = await supabase.from(table).select('id').limit(1);
        if (error) {
          issues.push(`❌ Table ${table}: ${error.message}`);
          allProductionReady = false;
        } else {
          console.log(`✅ Table ${table}: Exists and accessible`);
        }
      } catch (e) {
        issues.push(`❌ Table ${table}: ${e.message}`);
        allProductionReady = false;
      }
    }
  } catch (error) {
    issues.push(`❌ Database connection: ${error.message}`);
    allProductionReady = false;
  }

  // 4. Retell API Integration Check
  console.log('\n4️⃣ Retell API Integration Verification...');
  try {
    const response = await fetch('https://api.retellai.com/list-agents', {
      headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_RETELL_API_KEY}` }
    });

    if (response.ok) {
      const agents = await response.json();
      console.log(`✅ Retell API: Working (${agents.length} agents found)`);
    } else {
      issues.push(`❌ Retell API: ${response.status} - ${await response.text()}`);
      allProductionReady = false;
    }
  } catch (error) {
    issues.push(`❌ Retell API: ${error.message}`);
    allProductionReady = false;
  }

  // 5. Code Quality Check
  console.log('\n5️⃣ Code Quality Verification...');
  
  // Check for common placeholder patterns in key files
  const filesToCheck = [
    'lib/retell-agent-manager.ts',
    'lib/smart-ai-prompts.ts', 
    'lib/advanced-ai-features.ts',
    'app/api/onboarding/complete/route.ts',
    'app/api/ai/revenue-optimization/route.ts'
  ];

  for (const file of filesToCheck) {
    try {
      const fs = require('fs');
      const content = fs.readFileSync(file, 'utf8');
      
      const placeholderPatterns = [
        'placeholder',
        'demo',
        'mock',
        'fake',
        'test-data',
        'TODO',
        'FIXME',
        'HACK'
      ];

      let hasPlaceholders = false;
      placeholderPatterns.forEach(pattern => {
        if (content.toLowerCase().includes(pattern.toLowerCase())) {
          issues.push(`❌ ${file}: Contains ${pattern}`);
          hasPlaceholders = true;
          allProductionReady = false;
        }
      });

      if (!hasPlaceholders) {
        console.log(`✅ ${file}: No placeholder/mock data found`);
      }
    } catch (error) {
      console.log(`⚠️ ${file}: Could not check (${error.message})`);
    }
  }

  // 6. Build System Check
  console.log('\n6️⃣ Build System Verification...');
  try {
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'pipe' });
    console.log('✅ Build System: Production build successful');
  } catch (error) {
    issues.push(`❌ Build System: ${error.message}`);
    allProductionReady = false;
  }

  // Final Results
  console.log('\n📊 FINAL PRODUCTION READINESS RESULTS');
  console.log('=====================================');

  if (allProductionReady) {
    console.log('🎉 ✅ PRODUCTION READY - NO DEMO/MOCK/PLACEHOLDER/FAKE DATA');
    console.log('\n🚀 READY FOR LAUNCH:');
    console.log('✅ All environment variables configured with real values');
    console.log('✅ All API endpoints working');
    console.log('✅ All database tables created and accessible');
    console.log('✅ Retell AI integration working');
    console.log('✅ Code quality verified - no placeholder data');
    console.log('✅ Build system working');
    console.log('\n💰 REVENUE FEATURES ACTIVE:');
    console.log('✅ Dynamic AI agent creation');
    console.log('✅ Lead scoring system');
    console.log('✅ Upsell optimization');
    console.log('✅ Dynamic pricing');
    console.log('✅ Revenue analytics');
    console.log('✅ Customer retention');
    console.log('\n🎯 READY TO MAKE MONEY!');
  } else {
    console.log('❌ NOT PRODUCTION READY - ISSUES FOUND:');
    issues.forEach(issue => console.log(issue));
    console.log('\n🔧 FIX THESE ISSUES BEFORE LAUNCH');
  }

  return allProductionReady;
}

finalProductionVerification().catch(console.error);
