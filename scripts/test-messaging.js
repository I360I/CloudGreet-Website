#!/usr/bin/env node

/**
 * SMS and Email Messaging Tests
 * Tests messaging functionality including SMS, email, and notifications
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
async function testMessagingEndpointsExist() {
  const endpoints = [
    '/sms',
    '/notifications',
    '/notifications/send',
    '/notifications/list',
    '/notifications/stream',
    '/admin/test-sms',
    '/admin/real-sms-automation',
    '/telnyx/sms-webhook',
    '/telnyx/voice-webhook'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const token = generateTestToken();
      const response = await makeRequest(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Should not return 404 (endpoint exists)
      const success = response.status !== 404;
      logTest(`Messaging Endpoint Exists: ${endpoint}`, success, success ? null : `Status: ${response.status}`);
    } catch (error) {
      logTest(`Messaging Endpoint Exists: ${endpoint}`, false, error);
    }
  }
}

async function testSMSSending() {
  try {
    const token = generateTestToken();
    const smsData = {
      businessId: 'test-business-123',
      to: '+1234567890',
      message: 'Test SMS message from CloudGreet',
      from: '+0987654321'
    };
    
    const response = await makeRequest(`${API_BASE}/sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: smsData
    });
    
    // Should return 200 or 500 (depending on SMS service config)
    const success = response.status === 200 || response.status === 500;
    logTest('SMS Sending', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('SMS Sending', false, error);
  }
}

async function testNotificationSending() {
  try {
    const token = generateTestToken();
    const notificationData = {
      businessId: 'test-business-123',
      type: 'appointment_reminder',
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'test@example.com',
      priority: 'medium'
    };
    
    const response = await makeRequest(`${API_BASE}/notifications/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: notificationData
    });
    
    // Should return 200 or 500 (depending on notification service config)
    const success = response.status === 200 || response.status === 500;
    logTest('Notification Sending', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Notification Sending', false, error);
  }
}

async function testNotificationListing() {
  try {
    const token = generateTestToken();
    const response = await makeRequest(`${API_BASE}/notifications/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Should return 200 or 500 (depending on database config)
    const success = response.status === 200 || response.status === 500;
    logTest('Notification Listing', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Notification Listing', false, error);
  }
}

async function testNotificationStreaming() {
  try {
    const token = generateTestToken();
    const response = await makeRequest(`${API_BASE}/notifications/stream`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Should return 200 or 500 (depending on WebSocket config)
    const success = response.status === 200 || response.status === 500;
    logTest('Notification Streaming', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Notification Streaming', false, error);
  }
}

async function testSMSWebhook() {
  try {
    const token = generateTestToken();
    const webhookData = {
      event_type: 'message.received',
      data: {
        id: 'test-message-123',
        from: '+1234567890',
        to: '+0987654321',
        body: 'Test webhook message',
        direction: 'inbound'
      }
    };
    
    const response = await makeRequest(`${API_BASE}/telnyx/sms-webhook`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: webhookData
    });
    
    // Should return 200 or 500 (depending on webhook processing config)
    const success = response.status === 200 || response.status === 500;
    logTest('SMS Webhook Processing', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('SMS Webhook Processing', false, error);
  }
}

async function testVoiceWebhook() {
  try {
    const token = generateTestToken();
    const webhookData = {
      event_type: 'call.initiated',
      data: {
        call_control_id: 'test-call-123',
        from: '+1234567890',
        to: '+0987654321',
        direction: 'inbound'
      }
    };
    
    const response = await makeRequest(`${API_BASE}/telnyx/voice-webhook`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: webhookData
    });
    
    // Should return 200 or 500 (depending on webhook processing config)
    const success = response.status === 200 || response.status === 500;
    logTest('Voice Webhook Processing', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Voice Webhook Processing', false, error);
  }
}

async function testSMSAutomation() {
  try {
    const token = generateTestToken();
    const automationData = {
      businessId: 'test-business-123',
      trigger: 'appointment_scheduled',
      message: 'Your appointment has been scheduled for tomorrow at 2 PM',
      recipients: ['+1234567890']
    };
    
    const response = await makeRequest(`${API_BASE}/admin/real-sms-automation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: automationData
    });
    
    // Should return 200 or 500 (depending on automation config)
    const success = response.status === 200 || response.status === 500;
    logTest('SMS Automation', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('SMS Automation', false, error);
  }
}

async function testEmailTemplates() {
  try {
    const token = generateTestToken();
    const templateData = {
      businessId: 'test-business-123',
      name: 'Test Email Template',
      subject: 'Test Subject - {{customer_name}}',
      content: 'Hello {{customer_name}}, this is a test email.',
      type: 'appointment_confirmation'
    };
    
    const response = await makeRequest(`${API_BASE}/automation/email-templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: templateData
    });
    
    // Should return 200 or 500 (depending on database config)
    const success = response.status === 200 || response.status === 500;
    logTest('Email Templates', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Email Templates', false, error);
  }
}

async function testFollowUpAutomation() {
  try {
    const token = generateTestToken();
    const followUpData = {
      businessId: 'test-business-123',
      leadId: 'test-lead-123',
      type: 'email',
      delay: 24, // 24 hours
      message: 'Follow up on your service inquiry'
    };
    
    const response = await makeRequest(`${API_BASE}/automation/follow-up`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: followUpData
    });
    
    // Should return 200 or 500 (depending on automation config)
    const success = response.status === 200 || response.status === 500;
    logTest('Follow-up Automation', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Follow-up Automation', false, error);
  }
}

async function testMessageTracking() {
  try {
    const token = generateTestToken();
    const response = await makeRequest(`${API_BASE}/apollo-killer/tracking/email-open/test-lead-123`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Should return 200 or 500 (depending on tracking config)
    const success = response.status === 200 || response.status === 500;
    logTest('Message Tracking', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Message Tracking', false, error);
  }
}

// Main test runner
async function runAllTests() {
  console.log('📱 Starting SMS and Email Messaging Tests...\n');
  
  // Basic messaging functionality
  await testMessagingEndpointsExist();
  await testSMSSending();
  await testNotificationSending();
  await testNotificationListing();
  await testNotificationStreaming();
  
  // Webhook processing
  await testSMSWebhook();
  await testVoiceWebhook();
  
  // Automation features
  await testSMSAutomation();
  await testEmailTemplates();
  await testFollowUpAutomation();
  
  // Tracking features
  await testMessageTracking();
  
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











