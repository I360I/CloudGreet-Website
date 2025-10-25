#!/usr/bin/env node

/**
 * CloudGreet System Verification Script
 * This script checks if all critical systems are working
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.VERCEL_URL || 'https://cloud-greet-website-qsng3mdn3-i360is-projects.vercel.app';






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
        
        failed++;
        if (test.name.includes('API') || test.name.includes('Webhook')) {
          critical++;
        }
      } else {
        const expected = Array.isArray(test.expected) ? test.expected : [test.expected]
        const isExpected = expected.includes(result.status)
        
        if (isExpected) {
          `);
          passed++;
        } else {
          `);
          failed++;
          if (test.name.includes('API') || test.name.includes('Webhook')) {
            critical++;
          }
        }
      }
    } catch (err) {
      
      failed++;
      if (test.name.includes('API') || test.name.includes('Webhook')) {
        critical++;
      }
    }
  }

  
  
  
  
  
  
  

  if (critical > 0) {
    
    
    
    
    
    
    
    
    
    
    
  } else if (failed > 0) {
    
    
    
  } else {
    
    
    
    
  }

  
  
  
}

// Run the verification
runTests().catch(console.error);
