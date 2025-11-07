#!/usr/bin/env node

/**
 * Comprehensive Authentication Flow Tests
 * Tests all authentication endpoints and flows
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test configuration
const TEST_CONFIG = {
  testUser: {
    email: 'test@cloudgreet.com',
    password: 'TestPassword123!',
    businessName: 'Test Business',
    businessType: 'HVAC',
    phone: '+1234567890',
    address: '123 Test St, Test City, TC 12345',
    website: 'https://testbusiness.com'
  },
  adminUser: {
    email: 'admin@cloudgreet.com',
    password: 'AdminPassword123!'
  }
};

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

async function testRegistration() {
  try {
    const registrationData = {
      business_name: TEST_CONFIG.testUser.businessName,
      business_type: TEST_CONFIG.testUser.businessType,
      email: TEST_CONFIG.testUser.email,
      password: TEST_CONFIG.testUser.password,
      phone: TEST_CONFIG.testUser.phone,
      address: TEST_CONFIG.testUser.address
    };
    
    const response = await makeRequest(`${API_BASE}/auth/register-simple-working`, {
      method: 'POST',
      body: registrationData
    });
    
    const success = response.status === 200 && response.data?.success;
    logTest('User Registration', success, success ? null : response.data);
  } catch (error) {
    logTest('User Registration', false, error);
  }
}

async function testLogin() {
  try {
    const response = await makeRequest(`${API_BASE}/auth/login-simple`, {
      method: 'POST',
      body: {
        email: TEST_CONFIG.testUser.email,
        password: TEST_CONFIG.testUser.password
      }
    });
    
    const success = response.status === 200 && response.data?.success && response.data?.token;
    logTest('User Login', success, success ? null : response.data);
    
    if (success) {
      return response.data.token;
    }
  } catch (error) {
    logTest('User Login', false, error);
  }
  return null;
}

async function testProtectedEndpoint(token) {
  if (!token) {
    logTest('Protected Endpoint Access', false, 'No token available');
    return;
  }
  
  try {
    const response = await makeRequest(`${API_BASE}/dashboard/data`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const success = response.status === 200;
    logTest('Protected Endpoint Access', success, success ? null : response.data);
  } catch (error) {
    logTest('Protected Endpoint Access', false, error);
  }
}

async function testInvalidToken() {
  try {
    const response = await makeRequest(`${API_BASE}/dashboard/data`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token-123'
      }
    });
    
    // Should return 401 for invalid token
    const success = response.status === 401;
    logTest('Invalid Token Rejection', success, success ? null : response.data);
  } catch (error) {
    logTest('Invalid Token Rejection', false, error);
  }
}

async function testMissingToken() {
  try {
    const response = await makeRequest(`${API_BASE}/dashboard/data`, {
      method: 'GET'
    });
    
    // Should return 401 for missing token
    const success = response.status === 401;
    logTest('Missing Token Rejection', success, success ? null : response.data);
  } catch (error) {
    logTest('Missing Token Rejection', false, error);
  }
}

async function testJWTManager() {
  try {
    const response = await makeRequest(`${API_BASE}/test-jwt`);
    const success = response.status === 200;
    logTest('JWT Manager Test', success, success ? null : response.data);
  } catch (error) {
    logTest('JWT Manager Test', false, error);
  }
}

async function testPasswordReset() {
  try {
    const response = await makeRequest(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      body: {
        email: TEST_CONFIG.testUser.email
      }
    });
    
    // Should return success or appropriate error
    const success = response.status === 200 || response.status === 404;
    logTest('Password Reset Request', success, success ? null : response.data);
  } catch (error) {
    logTest('Password Reset Request', false, error);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🔐 Starting Authentication Flow Tests...\n');
  
  // Basic connectivity
  await testHealthCheck();
  
  // JWT functionality
  await testJWTManager();
  
  // Authentication flows
  await testRegistration();
  const token = await testLogin();
  
  // Authorization tests
  await testProtectedEndpoint(token);
  await testInvalidToken();
  await testMissingToken();
  
  // Password reset
  await testPasswordReset();
  
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
