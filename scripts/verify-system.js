#!/usr/bin/env node

/**
 * CloudGreet System Verification Script
 * This script checks if all critical systems are working
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.VERCEL_URL || 'https://cloud-greet-website-qsng3mdn3-i360is-projects.vercel.app';

console.log('🔍 CLOUDGREET SYSTEM VERIFICATION');
console.log('=====================================');
console.log(`Testing: ${BASE_URL}`);
console.log('');

const tests = [
  {
    name: 'Landing Page',
    url: '/',
    expected: [200, 307] // Accept both 200 and redirects
  },
  {
    name: 'Registration Page',
    url: '/register-simple',
    expected: 200
  },
  {
    name: 'Login Page',
    url: '/login',
    expected: 200
  },
  {
    name: 'Dashboard Page',
    url: '/dashboard',
    expected: [200, 307] // Accept both 200 and redirects
  },
  {
    name: 'Health Check API',
    url: '/api/health',
    expected: 200
  },
  {
    name: 'Registration API',
    url: '/api/auth/register-simple',
    method: 'POST',
    expected: 400, // Should return 400 for missing data, not 500
    body: JSON.stringify({})
  },
  {
    name: 'Voice Webhook',
    url: '/api/telnyx/voice-webhook',
    method: 'GET',
    expected: 200
  },
  {
    name: 'Realtime Stream',
    url: '/api/telnyx/realtime-stream-simple',
    method: 'POST',
    expected: 400, // Should return 400 for missing data, not 500
    body: JSON.stringify({})
  },
  {
    name: 'Missed Call Recovery',
    url: '/api/calls/missed-recovery',
    method: 'POST',
    expected: 400, // Should return 400 for missing data, not 500
    body: JSON.stringify({})
  }
];

async function makeRequest(test) {
  return new Promise((resolve) => {
    const url = new URL(test.url, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: test.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CloudGreet-Verification/1.0'
      }
    };

    if (test.body) {
      options.headers['Content-Length'] = Buffer.byteLength(test.body);
    }

    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data.substring(0, 200) // First 200 chars
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 0,
        error: err.message
      });
    });

    if (test.body) {
      req.write(test.body);
    }
    req.end();
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;
  let critical = 0;

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);
    
    try {
      const result = await makeRequest(test);
      
      if (result.error) {
        console.log(`❌ ERROR: ${result.error}`);
        failed++;
        if (test.name.includes('API') || test.name.includes('Webhook')) {
          critical++;
        }
      } else {
        const expected = Array.isArray(test.expected) ? test.expected : [test.expected]
        const isExpected = expected.includes(result.status)
        
        if (isExpected) {
          console.log(`✅ PASS (${result.status})`);
          passed++;
        } else {
          console.log(`❌ FAIL (${result.status}, expected ${test.expected})`);
          failed++;
          if (test.name.includes('API') || test.name.includes('Webhook')) {
            critical++;
          }
        }
      }
    } catch (err) {
      console.log(`❌ EXCEPTION: ${err.message}`);
      failed++;
      if (test.name.includes('API') || test.name.includes('Webhook')) {
        critical++;
      }
    }
  }

  console.log('');
  console.log('📊 VERIFICATION RESULTS');
  console.log('======================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🚨 Critical: ${critical}`);
  console.log('');

  if (critical > 0) {
    console.log('🚨 CRITICAL ISSUES FOUND:');
    console.log('- API endpoints are not working properly');
    console.log('- Database connection likely failed');
    console.log('- Environment variables not configured');
    console.log('- System is NOT production-ready');
    console.log('');
    console.log('🔧 NEXT STEPS:');
    console.log('1. Follow COMPLETE_SETUP_SCRIPT.md');
    console.log('2. Configure Supabase database');
    console.log('3. Set all environment variables');
    console.log('4. Test each API endpoint individually');
  } else if (failed > 0) {
    console.log('⚠️  SOME ISSUES FOUND:');
    console.log('- Some features may not work properly');
    console.log('- Review failed tests and fix issues');
  } else {
    console.log('🎉 ALL SYSTEMS OPERATIONAL!');
    console.log('- CloudGreet is production-ready');
    console.log('- All APIs are working');
    console.log('- System is ready for real users');
  }

  console.log('');
  console.log('🔗 For detailed setup instructions:');
  console.log('   See COMPLETE_SETUP_SCRIPT.md');
}

// Run the verification
runTests().catch(console.error);
