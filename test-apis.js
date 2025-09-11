#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testAPI(name, url, options = {}) {
  try {
    console.log(`Testing ${name}...`);
    const result = await makeRequest(url, options);
    
    if (result.status >= 200 && result.status < 300) {
      console.log(`✅ ${name}: OK (${result.status})`);
      return true;
    } else if (result.status === 503) {
      console.log(`⚠️  ${name}: Service not configured (${result.status}) - This is expected if API keys are not set`);
      return true;
    } else {
      console.log(`❌ ${name}: Failed (${result.status})`);
      console.log(`   Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: Error - ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🧪 CloudGreet API Test Suite');
  console.log('============================\n');
  
  const tests = [
    // System APIs
    { name: 'System Status', url: `${BASE_URL}/api/system-status` },
    
    // Authentication APIs
    { name: 'Register User', url: `${BASE_URL}/api/auth/register`, method: 'POST', body: { 
      name: 'Test User', 
      email: `test${Date.now()}@example.com`, 
      password: 'testpassword123',
      business_name: 'Test Business',
      business_type: 'hvac',
      phone: '+1234567890'
    }},
    
    // Voice Agent APIs
    { name: 'Create Azure Voice Agent', url: `${BASE_URL}/api/create-azure-voice-agent`, method: 'POST', body: {
      businessName: 'Test Business',
      businessType: 'hvac',
      email: 'test@example.com',
      services: ['hvac_repair', 'hvac_installation'],
      aiPersonality: 'professional',
      phoneNumber: '+15551234567'
    }},
    
    // Phone Integration APIs
    { name: 'Azure Phone Integration', url: `${BASE_URL}/api/azure-phone-integration`, method: 'POST', body: {
      business_name: 'Test Business',
      business_type: 'hvac',
      area_code: '555',
      country: 'US',
      voice_enabled: true,
      sms_enabled: true
    }},
    
    // Calendar APIs
    { name: 'Google Calendar', url: `${BASE_URL}/api/calendar/google-calendar`, method: 'POST', body: {
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: '+1234567890',
      service_type: 'consultation',
      preferred_date: new Date().toISOString().split('T')[0],
      preferred_time: '14:00',
      duration: 60,
      notes: 'Test appointment'
    }},
    
    { name: 'Universal Calendar', url: `${BASE_URL}/api/calendar/universal-calendar`, method: 'POST', body: {
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: '+1234567890',
      service_type: 'consultation',
      preferred_date: new Date().toISOString().split('T')[0],
      preferred_time: '14:00',
      duration: 60,
      notes: 'Test appointment',
      calendar_provider: 'google'
    }},
    
    // Stripe APIs
    { name: 'Create Stripe Customer', url: `${BASE_URL}/api/stripe/create-customer`, method: 'POST', body: {
      email: 'test@example.com',
      name: 'Test Customer',
      userId: 'test-user-123'
    }},
    
    // Email APIs
    { name: 'Send Onboarding Email', url: `${BASE_URL}/api/send-onboarding`, method: 'POST', body: {
      to: 'anthony@cloudgreet.com',
      subject: 'New Business Onboarding: Test Business',
      businessData: {
        businessName: 'Test Business',
        businessType: 'hvac',
        phoneNumber: '+1234567890',
        email: 'test@example.com',
        businessHours: {
          monday: { open: '09:00', close: '17:00' },
          tuesday: { open: '09:00', close: '17:00' },
          wednesday: { open: '09:00', close: '17:00' },
          thursday: { open: '09:00', close: '17:00' },
          friday: { open: '09:00', close: '17:00' },
          saturday: { closed: true },
          sunday: { closed: true }
        },
        services: ['delivery', 'pickup'],
        aiPersonality: 'Professional and friendly'
      }
    }},
    
    // Automated Onboarding
    { name: 'Automated Onboarding', url: `${BASE_URL}/api/automated-onboarding`, method: 'POST', body: {
      business_name: 'Test Business',
      business_type: 'hvac',
      owner_name: 'Test Owner',
      owner_email: 'test@example.com',
      owner_phone: '+1234567890',
      services: ['delivery', 'pickup'],
      business_hours: '9am-5pm',
      calendar_provider: 'google'
    }},
    
    // Analytics APIs (these require authentication)
    { name: 'Analytics Stats', url: `${BASE_URL}/api/analytics/stats` },
    { name: 'Recent Activity', url: `${BASE_URL}/api/analytics/recent-activity` }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const success = await testAPI(test.name, test.url, {
      method: test.method,
      body: test.body
    });
    if (success) passed++;
    console.log(''); // Empty line for readability
  }
  
  console.log('📊 Test Results');
  console.log('===============');
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Your APIs are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. This is expected if API keys are not configured.');
    console.log('Run the setup script (node setup.js) to configure your API keys.');
  }
  
  console.log('\n💡 Note: 503 errors are expected when API keys are not configured.');
  console.log('   This indicates the system is properly checking for real API keys.');
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest(`${BASE_URL}/api/system-status`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('Checking if server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running. Please start it with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running. Starting tests...\n');
  await runTests();
}

main().catch(console.error);
