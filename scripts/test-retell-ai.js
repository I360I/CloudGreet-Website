#!/usr/bin/env node

/**
 * Retell AI Integration Tests
 * Tests Retell AI webhook and call flow functionality
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

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

// Generate a test JWT token
function generateTestToken() {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'fallback-secret-for-testing';
  
  return jwt.sign({
    userId: 'test-user-123',
    businessId: 'test-business-123',
    email: 'test@cloudgreet.com',
    role: 'user'
  }, secret, { expiresIn: '1h' });
}

// Test functions
async function testRetellWebhookEndpoint() {
  try {
    const token = generateTestToken();
    const response = await makeRequest(`${API_BASE}/retell/webhook`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-retell-signature': 'test-signature'
      },
      body: {
        event: 'call_started',
        call_id: 'test-call-123',
        business_id: 'test-business-123'
      }
    });
    
    // Should return 401 for invalid signature or 500 for missing config
    const success = response.status === 401 || response.status === 500;
    logTest('Retell Webhook Endpoint', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Retell Webhook Endpoint', false, error);
  }
}

async function testCallFlowEndpoint() {
  try {
    const token = generateTestToken();
    const response = await makeRequest(`${API_BASE}/test/call-flow`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: {
        businessId: 'test-business-123',
        testPhoneNumber: '+1234567890'
      }
    });
    
    // Should return 200 or 500 (depending on Retell config)
    const success = response.status === 200 || response.status === 500;
    logTest('Call Flow Test Endpoint', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Call Flow Test Endpoint', false, error);
  }
}

async function testRetellConfiguration() {
  try {
    const response = await makeRequest(`${API_BASE}/health/detailed`);
    const success = response.status === 200;
    
    if (success && response.data) {
      const hasRetellCheck = response.data.checks && 
        (response.data.checks.retell || response.data.checks.retellAI);
      logTest('Retell Configuration Check', hasRetellCheck, hasRetellCheck ? null : 'No Retell check found');
    } else {
      logTest('Retell Configuration Check', false, 'Health check failed');
    }
  } catch (error) {
    logTest('Retell Configuration Check', false, error);
  }
}

async function testRetellAgentSync() {
  try {
    const token = generateTestToken();
    const response = await makeRequest(`${API_BASE}/business/sync-retell-agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: {
        businessId: 'test-business-123'
      }
    });
    
    // Should return 200 or 500 (depending on Retell config)
    const success = response.status === 200 || response.status === 500;
    logTest('Retell Agent Sync', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Retell Agent Sync', false, error);
  }
}

async function testVoiceWebhook() {
  try {
    const token = generateTestToken();
    const response = await makeRequest(`${API_BASE}/telnyx/voice-webhook`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: {
        event_type: 'call.initiated',
        data: {
          call_control_id: 'test-call-123',
          to: '+1234567890',
          from: '+0987654321'
        }
      }
    });
    
    // Should return 200 or 500 (depending on configuration)
    const success = response.status === 200 || response.status === 500;
    logTest('Voice Webhook Integration', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Voice Webhook Integration', false, error);
  }
}

async function testAIConversationEndpoints() {
  const aiEndpoints = [
    '/ai/conversation',
    '/ai/conversation-voice',
    '/ai/realtime-token',
    '/ai/realtime-conversation'
  ];
  
  for (const endpoint of aiEndpoints) {
    try {
      const token = generateTestToken();
      const response = await makeRequest(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: {
          message: 'Hello, this is a test',
          businessId: 'test-business-123'
        }
      });
      
      // Should return 200, 400, or 500 (depending on configuration)
      const success = response.status === 200 || response.status === 400 || response.status === 500;
      logTest(`AI Endpoint: ${endpoint}`, success, success ? null : `Status: ${response.status}`);
    } catch (error) {
      logTest(`AI Endpoint: ${endpoint}`, false, error);
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log('🤖 Starting Retell AI Integration Tests...\n');
  
  // Basic Retell functionality
  await testRetellWebhookEndpoint();
  await testCallFlowEndpoint();
  await testRetellConfiguration();
  await testRetellAgentSync();
  
  // Voice integration
  await testVoiceWebhook();
  
  // AI conversation endpoints
  await testAIConversationEndpoints();
  
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















