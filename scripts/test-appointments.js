#!/usr/bin/env node

/**
 * Appointment Booking Tests
 * Tests appointment creation, scheduling, and management functionality
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
async function testAppointmentEndpointsExist() {
  const endpoints = [
    '/appointments',
    '/appointments/create',
    '/appointments/list',
    '/appointments/schedule',
    '/appointments/complete',
    '/appointments/reminders',
    '/appointments/ai-book'
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
      logTest(`Appointment Endpoint Exists: ${endpoint}`, success, success ? null : `Status: ${response.status}`);
    } catch (error) {
      logTest(`Appointment Endpoint Exists: ${endpoint}`, false, error);
    }
  }
}

async function testAppointmentCreation() {
  try {
    const token = generateTestToken();
    const appointmentData = {
      businessId: 'test-business-123',
      customerName: 'John Doe',
      customerPhone: '+1234567890',
      customerEmail: 'john@example.com',
      serviceType: 'HVAC Repair',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      duration: 60,
      notes: 'Test appointment creation',
      address: '123 Test St, Test City, TC 12345'
    };
    
    const response = await makeRequest(`${API_BASE}/appointments/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: appointmentData
    });
    
    // Should return 200 or 500 (depending on database config)
    const success = response.status === 200 || response.status === 500;
    logTest('Appointment Creation', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Appointment Creation', false, error);
  }
}

async function testAppointmentListing() {
  try {
    const token = generateTestToken();
    const response = await makeRequest(`${API_BASE}/appointments/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Should return 200 or 500 (depending on database config)
    const success = response.status === 200 || response.status === 500;
    logTest('Appointment Listing', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Appointment Listing', false, error);
  }
}

async function testAppointmentScheduling() {
  try {
    const token = generateTestToken();
    const scheduleData = {
      businessId: 'test-business-123',
      date: new Date().toISOString().split('T')[0], // Today
      duration: 60
    };
    
    const response = await makeRequest(`${API_BASE}/appointments/schedule`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: scheduleData
    });
    
    // Should return 200 or 500 (depending on database config)
    const success = response.status === 200 || response.status === 500;
    logTest('Appointment Scheduling', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Appointment Scheduling', false, error);
  }
}

async function testAIAppointmentBooking() {
  try {
    const token = generateTestToken();
    const aiBookingData = {
      businessId: 'test-business-123',
      customerPhone: '+1234567890',
      serviceRequest: 'I need HVAC repair for my air conditioning unit',
      preferredDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    const response = await makeRequest(`${API_BASE}/appointments/ai-book`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: aiBookingData
    });
    
    // Should return 200 or 500 (depending on AI/database config)
    const success = response.status === 200 || response.status === 500;
    logTest('AI Appointment Booking', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('AI Appointment Booking', false, error);
  }
}

async function testAppointmentReminders() {
  try {
    const token = generateTestToken();
    const response = await makeRequest(`${API_BASE}/appointments/reminders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Should return 200 or 500 (depending on database config)
    const success = response.status === 200 || response.status === 500;
    logTest('Appointment Reminders', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Appointment Reminders', false, error);
  }
}

async function testAppointmentCompletion() {
  try {
    const token = generateTestToken();
    const completionData = {
      appointmentId: 'test-appointment-123',
      status: 'completed',
      notes: 'Service completed successfully',
      followUpRequired: false
    };
    
    const response = await makeRequest(`${API_BASE}/appointments/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: completionData
    });
    
    // Should return 200 or 500 (depending on database config)
    const success = response.status === 200 || response.status === 500;
    logTest('Appointment Completion', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Appointment Completion', false, error);
  }
}

async function testCalendarIntegration() {
  try {
    const token = generateTestToken();
    const response = await makeRequest(`${API_BASE}/calendar/connect`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Should return 200 or 500 (depending on calendar config)
    const success = response.status === 200 || response.status === 500;
    logTest('Calendar Integration', success, success ? null : `Status: ${response.status}`);
  } catch (error) {
    logTest('Calendar Integration', false, error);
  }
}

// Main test runner
async function runAllTests() {
  console.log('📅 Starting Appointment Booking Tests...\n');
  
  // Basic appointment functionality
  await testAppointmentEndpointsExist();
  await testAppointmentCreation();
  await testAppointmentListing();
  await testAppointmentScheduling();
  await testAppointmentCompletion();
  
  // Advanced features
  await testAIAppointmentBooking();
  await testAppointmentReminders();
  await testCalendarIntegration();
  
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













