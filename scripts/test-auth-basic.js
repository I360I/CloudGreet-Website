#!/usr/bin/env node

/**
 * Basic Authentication Tests (No Database Required)
 * Tests JWT functionality and basic auth flows
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Utility functions
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
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

function logTest(testName, passed, error = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: testName, error: error.message || error });
    }
  }
}

// Test functions
async function testHealthCheck() {
  try {
    const response = await makeRequest(`${API_BASE}/health`);
    logTest('Health Check', response.status === 200);
  } catch (error) {
    logTest('Health Check', false, error);
  }
}

async function testJWTManager() {
  try {
    const response = await makeRequest(`${API_BASE}/test-jwt`);
    const success = response.status === 200 && response.data?.success;
    logTest('JWT Manager Test', success, success ? null : response.data);
  } catch (error) {
    logTest('JWT Manager Test', false, error);
  }
}

async function testAuthEndpointsExist() {
  const endpoints = [
    '/auth/login',
    '/auth/login-simple', 
    '/auth/register',
    '/auth/register-simple',
    '/auth/register-simple-working',
    '/auth/forgot-password',
    '/auth/reset-password'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${API_BASE}${endpoint}`, {
        method: 'POST',
        body: { test: 'data' }
      });
      
      // Should not return 404 (endpoint exists)
      const success = response.status !== 404;
      logTest(`Auth Endpoint Exists: ${endpoint}`, success, success ? null : `Status: ${response.status}`);
    } catch (error) {
      logTest(`Auth Endpoint Exists: ${endpoint}`, false, error);
    }
  }
}

async function testProtectedEndpoints() {
  const protectedEndpoints = [
    '/dashboard/data',
    '/leads/scored',
    '/appointments/list',
    '/analytics/real-insights'
  ];
  
  for (const endpoint of protectedEndpoints) {
    try {
      const response = await makeRequest(`${API_BASE}${endpoint}`);
      
      // Should return 401 for missing auth
      const success = response.status === 401;
      logTest(`Protected Endpoint: ${endpoint}`, success, success ? null : `Status: ${response.status}`);
    } catch (error) {
      logTest(`Protected Endpoint: ${endpoint}`, false, error);
    }
  }
}

async function testInvalidTokenHandling() {
  try {
    const response = await makeRequest(`${API_BASE}/dashboard/data`, {
      headers: {
        'Authorization': 'Bearer invalid-token-123'
      }
    });
    
    // Should return 401 for invalid token
    const success = response.status === 401;
    logTest('Invalid Token Handling', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Invalid Token Handling', false, error);
  }
}

async function testCORSHeaders() {
  try {
    const response = await makeRequest(`${API_BASE}/health`, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    const hasCORS = response.headers['access-control-allow-origin'] || 
                   response.headers['Access-Control-Allow-Origin'];
    logTest('CORS Headers', !!hasCORS, hasCORS ? null : 'No CORS headers found');
  } catch (error) {
    logTest('CORS Headers', false, error);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🔐 Starting Basic Authentication Tests...\n');
  
  // Basic connectivity
  await testHealthCheck();
  
  // JWT functionality
  await testJWTManager();
  
  // Auth endpoint availability
  await testAuthEndpointsExist();
  
  // Protected endpoint security
  await testProtectedEndpoints();
  
  // Token validation
  await testInvalidTokenHandling();
  
  // CORS configuration
  await testCORSHeaders();
  
  // Results summary
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 Errors:');
    testResults.errors.forEach(error => {
      console.log(`  - ${error.test}: ${error.error}`);
    });
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});










